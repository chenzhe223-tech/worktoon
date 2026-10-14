import { cloud, errText } from './cloud'
import { MODEL_ART, MODEL_TEXT, PANEL_W, PANEL_H } from './config'
import {
  ART_STYLE_MAP,
  GENRE_MAP,
  TONE_MAP,
  SHOT_MAP,
  bibleOf,
  buildArtDirection,
  buildCharacterBible,
  composePanelPrompt,
  shotOf,
  shotPlan,
  type ArtDirection,
  type ArtStyle,
  type CharacterBible,
  type Shot,
} from './art'
import { sanitizeSvg } from './img'
import type { Hero } from './types'

/** 去掉可能触发网关安全拦截的字符，同时避免用户内容改写系统指令 */
export function safeInput(t: string) {
  return String(t || '')
    .replace(/[<>]/g, ' ')
    .replace(/\{\{|\}\}/g, ' ')
    .slice(0, 4000)
}

export class CancelError extends Error {
  constructor() {
    super('已取消')
    this.name = 'CancelError'
  }
}

async function llm(
  system: string,
  user: string,
  signal?: AbortSignal,
  model = MODEL_TEXT,
  userContent?: any,
) {
  let out = ''
  for await (const chunk of cloud.llm.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userContent ?? user },
    ],
    stream: true,
    signal,
  })) {
    if (signal?.aborted) throw new CancelError()
    const d: any = chunk?.choices?.[0]?.delta
    if (d?.content) out += d.content
  }
  return out
}

function parseJson(raw: string): any {
  let t = String(raw || '').trim()
  t = t.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  const s = t.search(/[\{\[]/)
  if (s < 0) throw new Error('模型没有返回可解析的内容')
  const open = t[s]
  const close = open === '{' ? '}' : ']'
  let depth = 0
  let end = -1
  for (let i = s; i < t.length; i++) {
    const ch = t[i]
    if (ch === open) depth++
    else if (ch === close) {
      depth--
      if (depth === 0) {
        end = i
        break
      }
    }
  }
  const body = end > 0 ? t.slice(s, end + 1) : t.slice(s)
  try {
    return JSON.parse(body)
  } catch {
    try {
      return JSON.parse(body.replace(/,\s*([\}\]])/g, '$1'))
    } catch {
      throw new Error('模型返回内容无法解析')
    }
  }
}

/* ---------------- 阶段一：理解工作内容 ---------------- */

export interface ExtractResult {
  title: string
  summary: string
  facts: { id: string; text: string; kind: string }[]
  achievements: string
  blocker: string
  mood: string
  tomorrow: string
}

const SYS_EXTRACT = [
  '你是一位严谨的工作日志分析助手。用户会给你一段当天的工作记录和若干补充字段。',
  '你的任务：忠实提炼当天发生了什么，输出严格 JSON 对象，不要输出解释或代码块标记。',
  'JSON 结构：',
  '{"title": 6到14字的漫画标题,',
  ' "summary": 40到90字的工作摘要,',
  ' "facts": [{"id":"f1","text":"一条客观事实","kind":"event|task|person|blocker|action|result|emotion|plan"}],',
  ' "achievements": 今日最重要的成果，没有则空字符串,',
  ' "blocker": 今日遇到的困难，没有则空字符串,',
  ' "mood": 今日心情，没有则空字符串,',
  ' "tomorrow": 明日计划，没有则空字符串}',
  '硬性规则：',
  '1. 只使用用户给出的信息，禁止推测或补全没有提到的会议、客户承诺、金额、项目结果、人物行为。',
  '2. facts 最多 8 条，每条一句话，必须是用户真的说过的事。',
  '3. 用户明确填写的成果、困难、心情、明日计划字段，直接采用原意。',
  '4. 全部使用简体中文。',
].join('\n')

export async function extractFacts(input: {
  raw: string
  tags: string[]
  highlight: string
  blocker: string
  mood: string
  tomorrow: string
  signal?: AbortSignal
}): Promise<ExtractResult> {
  const user = [
    `【今日工作记录】\n${safeInput(input.raw)}`,
    input.tags?.length ? `【标签】${input.tags.join('、')}` : '',
    `【今日最重要的成果】${safeInput(input.highlight)}`,
    `【今天遇到的困难】${safeInput(input.blocker)}`,
    `【今天的心情】${safeInput(input.mood)}`,
    `【明天准备做什么】${safeInput(input.tomorrow)}`,
  ]
    .filter(Boolean)
    .join('\n')

  const raw = await llm(SYS_EXTRACT, user, input.signal)
  const j = parseJson(raw)
  const facts = Array.isArray(j.facts) ? j.facts.slice(0, 8) : []
  return {
    title: String(j.title || '').slice(0, 40) || '今天的故事',
    summary: String(j.summary || '').slice(0, 300),
    facts: facts.map((f: any, i: number) => ({
      id: String(f?.id || `f${i + 1}`),
      text: String(f?.text || '').slice(0, 160),
      kind: String(f?.kind || 'event'),
    })),
    achievements: String(j.achievements || '').slice(0, 200),
    blocker: String(j.blocker || '').slice(0, 200),
    mood: String(j.mood || '').slice(0, 60),
    tomorrow: String(j.tomorrow || '').slice(0, 200),
  }
}

/* ---------------- 阶段二：编写故事与分镜 ---------------- */

export interface StoryPanel {
  panel_number: number
  scene_description: string
  characters: string
  action: string
  dialogue: string
  narration: string
  visual_prompt: string
  /** 景别：由镜头节奏表固定下发，避免连续同构图 */
  shot: string
  /** 本格视觉焦点 */
  focus: string
  /** 人物表情与肢体语言 */
  expression: string
  source_fact_ids: string[]
}

const SYS_STORY = [
  '你是一位漫画编剧，负责把真实的工作日志改编成有开头、发展、结尾的短篇漫画。',
  '输出严格 JSON 对象，不要输出解释或代码块标记。',
  'JSON 结构：',
  '{"title": 漫画标题,',
  ' "genre_used": 实际采用的故事类型,',
  ' "panels": [{"panel_number":1,"scene_description":"画面里有什么","characters":"出场人物","action":"人物在做什么、肢体语言","expression":"人物表情与情绪","focus":"这一格的视觉焦点（人或物）","dialogue":"对白，可为空","narration":"旁白，可为空","visual_prompt":"英文画面描述","source_fact_ids":["f1"]}]}',
  '硬性规则：',
  '1. 故事必须有开头、发展、结尾；重点突出当天最值得记住的一件事。',
  '2. 每一格的对白不超过 26 个中文字符，旁白不超过 34 个中文字符。',
  '3. 信息不足时走真实克制的日常纪实路线，禁止编造会议、客户承诺、金额、项目成果或人物行为。',
  '4. 可以对场景做创意视觉表达，但核心工作事实必须准确；使用视觉隐喻时必须让人能看出它对应哪件真实工作。',
  '5. visual_prompt 用英文撰写，描述构图、人物动作表情、环境道具、光线；明确要求画面中不出现任何文字。',
  '6. 全部角色使用用户设定的主角形象，除非事实里明确提到其他人。',
  '7. 每一格必须绑定到 source_fact_ids 里至少一条真实事实；画面内容必须来自这些事实，不得凭空设计场景。',
  '8. 每一格必须写清楚人物的动作、肢体语言和表情，禁止"站着""看着"这类没有表演力的描述。',
  '9. 每一格必须有一个明确的视觉焦点（一个人、一个动作或一件关键道具），并写进 focus。',
  '10. 我会为每一格指定景别，你必须按指定的景别来写画面描述：远景交代环境、全景呈现完整动作、中景表现互动、近景表现情绪、特写突出文件或手部等细节。',
  '11. 禁止连续两格使用相同的构图、相同的景别和相同的正面站立姿势。',
  '12. 背景必须来自真实工作场景（办公室、工位、电脑、报价表、文件、会议桌、窗、灯光、绿植等），不得出现与工作无关的奇幻、科幻或战斗场面。',
  '13. 不得虚构结果：不得写供应商已接受报价、项目已签约、预算已节省等日志里没有的进展。',
  '14. 主角的性别、年龄感与外貌严格采用下面给定的主角形象，不得自行推断、改写或在各格之间改变；未填写的维度必须保持中性、不指定。',
  '15. 主角职业只用于挑选与之相称的场景、道具、服装和动作，不得据此编造该职业的成果、客户、金额或进展。',
].join('\n')

export async function writeStory(input: {
  facts: ExtractResult
  style: ArtStyle
  genre: string
  tone: string
  length: number
  hero: Hero
  signal?: AbortSignal
}): Promise<{ title: string; genre_used: string; panels: StoryPanel[] }> {
  const g = GENRE_MAP[input.genre]
  const t = TONE_MAP[input.tone]
  const user = [
    `【今天的事实清单】\n${input.facts.facts.map((f) => `- ${f.id} (${f.kind}) ${f.text}`).join('\n')}`,
    `【工作摘要】${input.facts.summary}`,
    input.facts.achievements ? `【今日成果】${input.facts.achievements}` : '',
    input.facts.blocker ? `【今日困难】${input.facts.blocker}` : '',
    input.facts.mood ? `【心情】${input.facts.mood}` : '',
    input.facts.tomorrow ? `【明日计划】${input.facts.tomorrow}` : '',
    `【漫画类型】${g ? g.name + '：' + g.prompt : '日常纪实'}`,
    `【语气】${t ? t.name + '：' + t.prompt : '冷静纪实'}`,
    `【画风】${input.style.name}：${input.style.prompt}`,
    `【镜头节奏偏好】${input.style.camera}`,
    `【主角形象】姓名/称呼：${input.hero.name}；性别：${input.hero.gender || '不限'}；年龄感：${input.hero.age || '不限'}；发型：${input.hero.hair}；服装：${input.hero.outfit}；眼镜：${input.hero.glasses || '不指定'}；外貌特征：${input.hero.features}；气质：${input.hero.vibe || '不限'}；职业：${input.hero.job || '未填写'}`,
    `【形象一致性】上面没填的维度一律保持中性、不指定，不要替用户推断；已填的维度在全部格子里必须完全一致。`,
    `【格数】必须恰好 ${input.length} 格`,
    '【指定景别（按顺序，必须严格遵守）】',
    ...shotPlan(input.length).map((s, i) => `第 ${i + 1} 格：${s.name}（${s.en}）——${s.hint}`),
  ]
    .filter(Boolean)
    .join('\n')

  const raw = await llm(SYS_STORY, user, input.signal)
  const j = parseJson(raw)
  const plan = shotPlan(input.length)
  let panels: StoryPanel[] = Array.isArray(j.panels) ? j.panels : []
  panels = panels.slice(0, input.length).map((p: any, i: number) => ({
    panel_number: i + 1,
    scene_description: String(p?.scene_description || '').slice(0, 300),
    characters: String(p?.characters || input.hero.name || '').slice(0, 200),
    action: String(p?.action || '').slice(0, 300),
    expression: String(p?.expression || '').slice(0, 200),
    focus: String(p?.focus || '').slice(0, 200),
    dialogue: String(p?.dialogue || '').slice(0, 60),
    narration: String(p?.narration || '').slice(0, 80),
    visual_prompt: String(p?.visual_prompt || '').slice(0, 700),
    shot: plan[i]?.id || 'medium',
    source_fact_ids: Array.isArray(p?.source_fact_ids) ? p.source_fact_ids.map(String) : [],
  }))
  if (panels.length === 0) throw new Error('分镜生成失败，请重试')
  while (panels.length < input.length) {
    const i = panels.length
    panels.push({
      panel_number: i + 1,
      scene_description: panels[i - 1]?.scene_description || '工作场景',
      characters: input.hero.name || '我',
      action: '继续推进当天的工作',
      expression: '专注',
      focus: '手头的工作',
      dialogue: '',
      narration: '一天就这样继续着。',
      visual_prompt: panels[i - 1]?.visual_prompt || 'a person working at a desk',
      shot: plan[i]?.id || 'medium',
      source_fact_ids: [],
    })
  }
  return { title: String(j.title || input.facts.title || '今天的故事').slice(0, 40), genre_used: String(j.genre_used || ''), panels }
}

/* ---------------- 阶段三：逐格生成画面 ---------------- */

const SYS_ART = [
  '你是漫画分镜插画绘制引擎。直接输出一个完整的 SVG 代码片段，不要任何解释，不要代码块标记。',
  '硬性要求：',
  `- 根标签 svg 必须带 xmlns 与 viewBox="0 0 ${PANEL_W} ${PANEL_H}"。`,
  '- 第一层必须是覆盖整个画布的背景矩形，画面要填满，不要出现空白边缘。',
  '- 画面中禁止出现任何可读文字、字母、数字、图标字母；对白与旁白由网页另外叠加。',
  '- 只使用 rect / circle / ellipse / path / polygon / polyline / line / g / defs / linearGradient / radialGradient / clipPath / pattern。',
  '- 禁止外部引用、禁止链接、禁止位图引用。',
  '- 输出必须是合法可解析的 XML，标签必须闭合。',
  '',
  '画面质量底线（必须体现在画面元素的组织上，而不是靠文字描述）：',
  '- 人物必须是经过设计的完整造型：有脸型、五官、有体积的发型、有轮廓和褶皱的服装、自然站姿或坐姿、可读的手部动作、明确的表情。禁止圆形脑袋加线条身体。',
  '- 画面必须有前景 / 中景 / 背景三个层次：主体最清晰，关键道具次之，背景细节适度简化但必须存在。',
  '- 背景必须来自真实工作场景：办公室窗、工位、电脑、文件、货架、会议桌、台灯、绿植、城市景观或工作道具。禁止用星星、爱心、光斑、随机渐变去填空白。',
  '- 留白只能用于强化构图、情绪与焦点，不能当作背景偷懒。',
  '- 人物占画面高度的三分之一以上（特写格除外，特写格以手部或关键道具为主体）。',
  '- 必须有一个明确的视觉焦点，其余元素服从这个焦点。',
].join('\n')

/**
 * 主角参考图一致性方案说明：
 * 底层模型对「图像输入」的支持并不稳定，因此这里采用「可选增强」策略——
 * 传入 refUrl 时，先尝试把主角参考图作为多模态输入一并提交，让模型照着参考图的
 * 发型/服装/配色来画；若模型不接受图片或返回异常，自动退回纯文本形象描述路径。
 * 两条路径都会再次强调同一段固定形象描述，以尽量维持跨格、跨日的一致性。
 * 注意：这不等于绝对一致，只是当前模型能力下可用的最佳方案。
 */
export async function drawPanel(input: {
  panel: StoryPanel
  style: ArtStyle
  hero: Hero
  genre: string
  signal?: AbortSignal
  refUrl?: string
  /** 本篇漫画固定的艺术指导，所有分镜共享 */
  ad?: ArtDirection
  /** 本篇漫画固定的角色视觉圣经，所有分镜共享，保证跨格同一个人 */
  bible?: CharacterBible
  /** 本格景别，缺省时按格序推导 */
  shot?: Shot
  /** 分镜总数，用于推导景别 */
  total?: number
  index?: number
  genrePrompt?: string
}): Promise<string> {
  const { system, user } = buildPanelMessages(input)
  const userText =
    user +
    (input.refUrl
      ? '\n【主角参考图】消息里附带了主角的参考图。请让人物的发型、服装配色、体型比例尽量与参考图一致；参考图只用于形象对齐，不要照搬它的场景。'
      : '')

  const multimodal = input.refUrl
    ? [
        { type: 'text', text: userText },
        { type: 'image_url', image_url: { url: input.refUrl } },
      ]
    : null

  const attempt = async (sys: string, withRef: boolean) => {
    const raw = await llm(
      sys,
      userText,
      input.signal,
      MODEL_ART,
      withRef && multimodal ? (multimodal as any) : undefined,
    )
    return sanitizeSvg(raw)
  }

  const retrySys =
    SYS_ART + '\n上次输出不可用。请重新输出：只能有一个 svg 根标签，标签全部闭合，不要输出任何其他内容。'

  // 1) 带参考图（若模型不支持图片输入会抛错，自动降级）
  let svg = ''
  try {
    svg = await attempt(SYS_ART, true)
  } catch (e: any) {
    if (e?.name === 'CancelError' || input.signal?.aborted) throw e
    svg = ''
  }
  // 2) 纯文本重画
  if (!svg) {
    try {
      svg = await attempt(retrySys, false)
    } catch (e: any) {
      if (e?.name === 'CancelError' || input.signal?.aborted) throw e
      svg = ''
    }
  }
  if (!svg) throw new Error('这一格画面生成失败')
  return svg
}

/**
 * 组装单格的 system / user 提示词。
 * 单独导出是为了能用同一套提示词做离线回归测试，测试与线上走的是同一份配置。
 */
export function buildPanelMessages(input: {
  panel: StoryPanel
  style: ArtStyle
  hero: Hero
  genre?: string
  ad?: ArtDirection
  bible?: CharacterBible
  shot?: Shot
  total?: number
  index?: number
  genrePrompt?: string
}): { system: string; user: string } {
  const { panel, style, hero } = input
  const ad = input.ad || buildArtDirection(style, 'default')
  const shot =
    input.shot || SHOT_MAP[panel.shot] || shotOf(input.total || 6, input.index ?? panel.panel_number - 1) || SHOT_MAP.medium

  // 结构化组装：公共质量规范 + 画风专属规范 + 本篇艺术指导 + 固定角色 + 本格内容 + 排除项
  const user = composePanelPrompt({
    style,
    ad,
    hero: {
      name: hero.name,
      gender: hero.gender,
      hair: hero.hair,
      outfit: hero.outfit,
      features: hero.features,
      skin: hero.skin || '#F2C9A8',
      age: hero.age || '',
      glasses: hero.glasses || '',
      job: hero.job || '',
      vibe: hero.vibe || '',
    },
    panel: {
      shot,
      scene: panel.scene_description,
      characters: panel.characters,
      action: [panel.action, panel.expression ? `表情：${panel.expression}` : ''].filter(Boolean).join('；'),
      focus: panel.focus || panel.scene_description,
      emotion: panel.narration || panel.dialogue || '平静',
      visualPrompt: panel.visual_prompt,
      narration: panel.narration,
      dialogue: panel.dialogue,
    },
    genrePrompt: input.genrePrompt || '',
    bible: input.bible || bibleOf(hero, 'default'),
  })

  return { system: SYS_ART, user }
}

/** 兜底画面：模型连续失败时，用同一套风格与主角设定程序化生成，保证作品完整可读 */
export function fallbackPanelSvg(panel: StoryPanel, style: ArtStyle, hero: Hero): string {
  const c = style.c
  const W = PANEL_W
  const H = PANEL_H
  const id = Math.random().toString(36).slice(2, 7)
  const skin = hero.skin || '#F2C9A8'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${c.bg}"/><stop offset="1" stop-color="${c.a1}" stop-opacity="0.45"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg${id})"/>
  <rect x="60" y="120" width="240" height="180" rx="10" fill="${c.a2}" opacity="0.35"/>
  <rect x="420" y="150" width="320" height="220" rx="12" fill="${c.bg}" stroke="${c.ink}" stroke-width="6" opacity="0.85"/>
  <rect x="120" y="640" width="560" height="26" rx="8" fill="${c.ink}" opacity="0.55"/>
  <g transform="translate(400 470)">
    <ellipse cx="0" cy="250" rx="190" ry="120" fill="${c.a2}" opacity="0.7"/>
    <path d="M-150 240 q150 -150 300 0 z" fill="${c.a1}"/>
    <ellipse cx="0" cy="-40" rx="92" ry="104" fill="${skin}"/>
    <path d="M-98 -56 q98 -120 196 0 q-16 -110 -98 -110 q-82 0 -98 110 z" fill="${c.ink}"/>
    <circle cx="-34" cy="-40" r="9" fill="${c.ink}"/>
    <circle cx="34" cy="-40" r="9" fill="${c.ink}"/>
    <path d="M-26 -6 q26 22 52 0" stroke="${c.ink}" stroke-width="6" fill="none" stroke-linecap="round"/>
  </g>
  <circle cx="140" cy="200" r="46" fill="${c.a1}" opacity="0.5"/>
  <circle cx="690" cy="760" r="70" fill="${c.a2}" opacity="0.4"/>
</svg>`
}

/** 并发绘制多格，每完成一格立刻回调，便于逐格点亮进度 */
export async function drawPanels(
  panels: StoryPanel[],
  style: ArtStyle,
  hero: Hero,
  genre: string,
  signal: AbortSignal | undefined,
  onDone: (index: number, svg: string, failed?: string) => void,
  concurrency = 3,
  opts?: { refUrl?: string; ad?: ArtDirection; genrePrompt?: string; bible?: CharacterBible },
) {
  const ad = opts?.ad || buildArtDirection(style, 'default')
  const bible = opts?.bible || bibleOf(hero, 'default')
  const total = panels.length
  let cursor = 0
  const worker = async () => {
    while (true) {
      if (signal?.aborted) return
      const i = cursor++
      if (i >= panels.length) return
      try {
        const svg = await drawPanel({
          panel: panels[i],
          style,
          hero,
          genre,
          signal,
          refUrl: opts?.refUrl,
          ad,
          bible,
          shot: SHOT_MAP[panels[i].shot] || shotOf(total, i),
          total,
          index: i,
          genrePrompt: opts?.genrePrompt,
        })
        onDone(i, svg)
      } catch (e: any) {
        if (e?.name === 'CancelError' || signal?.aborted) return
        onDone(i, fallbackPanelSvg(panels[i], style, hero), errText(e, '这一格画面生成失败'))
      }
    }
  }
  const n = Math.min(concurrency, panels.length)
  await Promise.all(Array.from({ length: n }, () => worker()))
}

export async function ensureStyle(styleId: string): Promise<ArtStyle> {
  return ART_STYLE_MAP[styleId] || ART_STYLE_MAP.jp_healing
}
