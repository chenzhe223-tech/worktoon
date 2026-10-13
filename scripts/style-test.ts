/**
 * 画风 V2 回归测试。
 * 走的是线上同一套配置（art.ts 的 COMIC_QUALITY_BASE / 12 种画风 / Art Direction / composePanelPrompt）
 * 与同一条模型链路（ai.ts 的 buildPanelMessages），只是把结果落盘，便于逐格核对。
 *
 * 运行：npm run test:styles
 */
import { createWorkBuddyCloud } from '@tencent-ai/workbuddy-cloud-sdk'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  ART_STYLE_MAP,
  buildArtDirection,
  shotPlan,
  type ArtStyle,
} from '../src/lib/art'
import { buildPanelMessages } from '../src/lib/ai'
import { MODEL_ART } from '../src/lib/config'

const mem = new Map<string, string>()
;(globalThis as any).localStorage = {
  getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
}

const cloud = createWorkBuddyCloud({
  endpoint: 'https://worktoon.app.workbuddy.host',
  oauthRelayBaseUrl: 'https://www.workbuddy.cn/v2/as/genie-baas/oauth',
  publishableKey: 'wbpk_s00Kd07qwmB6cvq1pZg74s_bsoHV7j4OA8CFucndr1kCKXSSuptvBeR',
})

const HERO = {
  name: '小林',
  gender: '女',
  hair: '齐肩深棕色短发，侧分',
  outfit: '米白色针织衫 + 深灰色西装裤',
  features: '戴细框眼镜，表情认真，身形偏瘦',
  skin: '#F2C9A8',
  ref_path: '',
}

/** 测试故事：供应商报价分析完成（6 格，镜头由 shotPlan 固定） */
const PANELS = [
  {
    panel_number: 1,
    scene_description: '开放办公区，靠窗的工位，屏幕上并排打开三份供应商报价表，桌上摊着打印件',
    characters: '小林',
    action: '坐在工位前，一手扶着打印件，一手移动鼠标，身体前倾',
    expression: '专注，眉头微皱',
    focus: '屏幕上并排的三份报价表',
    dialogue: '',
    narration: '三家供应商的报价终于齐了。',
    visual_prompt:
      'open-plan office by a window, a desk with a monitor showing three quotation spreadsheets side by side, printed sheets and a calculator on the desk',
  },
  {
    panel_number: 2,
    scene_description: '屏幕特写，三份报价表的单价列被并排对齐，其中一行被高亮',
    characters: '无（只有手部）',
    action: '手指着屏幕上一行被高亮的数字，另一只手在计算器上按',
    expression: '',
    focus: '被高亮的那一行单价差异',
    dialogue: '',
    narration: '第三家的单价明显偏低，但规格描述含糊。',
    visual_prompt:
      'close-up of a monitor with three aligned price columns, one row highlighted, a hand pointing at the screen, a calculator nearby',
  },
  {
    panel_number: 3,
    scene_description: '小林伏案核对，桌上散着规格书、便利贴和笔',
    characters: '小林',
    action: '一手压着规格书，一手在便利贴上写字，头微微低下',
    expression: '认真，带一点疑惑',
    focus: '规格书与便利贴',
    dialogue: '',
    narration: '逐条比对规格，把疑点记下来。',
    visual_prompt:
      'medium shot, desk with specification brochures, sticky notes and a pen, the character leaning over the documents',
  },
  {
    panel_number: 4,
    scene_description: '会议室白板前，小林和两位同事站在一起看白板上的对比表',
    characters: '小林、两位同事',
    action: '小林站在白板左侧，用笔指向对比表中的一列，两位同事看向白板',
    expression: '认真讨论，语气平稳',
    focus: '白板上的对比表',
    dialogue: '这一家的低价，是因为不含运费。',
    narration: '',
    visual_prompt:
      'meeting room with a whiteboard showing a comparison table, three people standing and discussing, one pointing at a column',
  },
]

const OUT_DIR = join(process.cwd(), 'test-output')
mkdirSync(OUT_DIR, { recursive: true })

/** 基本体检：模型产出的 SVG 是否真有内容 */
function inspect(svg: string) {
  const count = (re: RegExp) => (svg.match(re) || []).length
  return {
    len: svg.length,
    hasSvg: /<svg[\s\S]*<\/svg>/.test(svg),
    bgRect: /<rect[^>]*(width=["']?800|height=["']?1000)/.test(svg),
    rects: count(/<rect\b/g),
    circles: count(/<circle\b/g) + count(/<ellipse\b/g),
    paths: count(/<path\b/g),
    gradients: count(/<linearGradient\b/g) + count(/<radialGradient\b/g),
    colors: new Set((svg.match(/#[0-9a-fA-F]{6}/g) || []).map((c) => c.toLowerCase())).size,
    textTags: count(/<text\b/g),
  }
}

async function call(system: string, user: string) {
  const t0 = Date.now()
  let out = ''
  for await (const c of cloud.llm.chat.completions.create({
    model: MODEL_ART,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    stream: true,
  })) {
    const d: any = (c as any)?.choices?.[0]?.delta
    if (d?.content) out += d.content
  }
  const start = out.indexOf('<svg')
  const end = out.lastIndexOf('</svg>')
  const svg = start >= 0 && end > start ? out.slice(start, end + 6) : ''
  return { svg, ms: Date.now() - t0, raw: out.length }
}

async function main() {
  const only = process.argv.slice(2).filter((a) => !a.startsWith('-'))
  const styles: ArtStyle[] = (
    only.length
      ? only.map((id) => ART_STYLE_MAP[id]).filter(Boolean)
      : ['jp_healing', 'cn_ink', 'cyber', 'chibi_work', 'magazine'].map((id) => ART_STYLE_MAP[id])
  ) as ArtStyle[]

  const panelIdx = Number(process.env.PANEL || 0)
  const panel = PANELS[panelIdx] || PANELS[0]
  const plan = shotPlan(PANELS.length)
  const shot = plan[panelIdx]

  console.log('== 镜头节奏（6 格）==')
  console.log(plan.map((s, i) => `  第${i + 1}格 ${s.name}/${s.id}`).join('\n'))
  console.log(`\n测试格：第 ${panelIdx + 1} 格 · ${shot.name} · ${shot.en}`)
  console.log(`测试风格：${styles.map((s) => s.name).join('、')}\n`)

  const rows: any[] = []
  const files: { id: string; name: string; svg: string }[] = []

  for (const style of styles) {
    const ad = buildArtDirection(style, 'regression-1')
    const { system, user } = buildPanelMessages({
      panel: { ...panel, shot: shot.id, source_fact_ids: [] } as any,
      style,
      hero: HERO as any,
      ad,
      total: PANELS.length,
      index: panelIdx,
    })
    process.stdout.write(`[${style.id}] 生成中… `)
    try {
      const { svg, ms, raw } = await call(system, user)
      const m = inspect(svg)
      rows.push({ id: style.id, name: style.name, ms, raw, ...m, accent: ad.accent })
      if (svg) files.push({ id: style.id, name: style.name, svg })
      console.log(`ok ${(ms / 1000).toFixed(1)}s  raw=${raw}  svg=${m.len}  path=${m.paths} rect=${m.rects} circ=${m.circles} grad=${m.gradients} colors=${m.colors} text=${m.textTags}`)
      if (svg) writeFileSync(join(OUT_DIR, `${style.id}-p${panelIdx + 1}.svg`), svg)
    } catch (e: any) {
      rows.push({ id: style.id, name: style.name, error: String(e?.message || e) })
      console.log('FAIL', e?.message || e)
    }
  }

  writeFileSync(join(OUT_DIR, `metrics-p${panelIdx + 1}.json`), JSON.stringify(rows, null, 2))

  // 生成一份可直接看的对比页
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>WorkToon 画风 V2 回归测试 · 第 ${panelIdx + 1} 格（${shot.name}）</title>
<style>
body{margin:0;padding:24px;background:#141416;color:#eee;font:14px/1.6 system-ui,"Microsoft YaHei";}
h1{font-size:18px;margin:0 0 4px}
.sub{color:#9a9a9a;margin-bottom:20px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:18px}
.card{background:#1d1d20;border-radius:14px;padding:12px}
.card h3{margin:4px 0 8px;font-size:14px}
.card .meta{color:#8a8a8a;font-size:12px;margin-bottom:8px}
.frame{aspect-ratio:4/5;background:#fff;border-radius:10px;overflow:hidden}
.frame svg{width:100%;height:100%;display:block}
table{margin-top:24px;border-collapse:collapse;width:100%;font-size:12.5px}
td,th{border:1px solid #333;padding:6px 8px;text-align:left}
th{background:#232326}
</style></head><body>
<h1>WorkToon 画风 V2 回归测试</h1>
<div class="sub">同一故事、同一格（第 ${panelIdx + 1} 格 · ${shot.name} · ${shot.en}），只切换画风，用于核对人物、构图、背景、色彩与风格一致性</div>
<div class="grid">
${files
  .map(
    (f) =>
      `<div class="card"><h3>${f.name}</h3><div class="meta">${f.id}</div><div class="frame">${f.svg}</div></div>`,
  )
  .join('\n')}
</div>
<table><tr><th>画风</th><th>耗时</th><th>SVG 长度</th><th>path</th><th>rect</th><th>circle/ellipse</th><th>渐变</th><th>色数</th><th>text 标签</th><th>强调色</th></tr>
${rows
  .map(
    (r) =>
      `<tr><td>${r.name}</td><td>${r.ms ? (r.ms / 1000).toFixed(1) + 's' : '-'}</td><td>${r.len ?? '-'}</td><td>${r.paths ?? '-'}</td><td>${r.rects ?? '-'}</td><td>${r.circles ?? '-'}</td><td>${r.gradients ?? '-'}</td><td>${r.colors ?? '-'}</td><td>${r.textTags ?? '-'}</td><td>${r.accent ?? r.error ?? '-'}</td></tr>`,
  )
  .join('\n')}
</table>
</body></html>`
  writeFileSync(join(OUT_DIR, 'styles-preview.html'), html)
  console.log(`\n对比页已生成：${join(OUT_DIR, 'styles-preview.html')}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
