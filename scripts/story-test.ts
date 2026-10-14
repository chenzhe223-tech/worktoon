/**
 * 故事层回归测试：验证阶段一（理解）+ 阶段二（分镜）
 * 关注点：事实绑定、景别不重复、每格有焦点与表演、不编造结果，
 *         以及人物真实感相关项：性别呈现、职业上下文、跨格角色一致性。
 *
 * 分两段：
 *  A 静态检查——只拼提示词不调模型，0 成本，随每次改动必跑；
 *  B 故事检查——真实调用模型跑两条日志，验证分镜层不出现性别/职业错配。
 *
 * 运行：npm run test:story
 */
import { createWorkBuddyCloud } from '@tencent-ai/workbuddy-cloud-sdk'
import { ART_STYLE_MAP, bibleOf, buildArtDirection, shotPlan } from '../src/lib/art'
import type { Hero } from '../src/lib/types'

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

const HERO: Hero = {
  name: '小林',
  gender: '女',
  hair: '齐肩深棕色短发，侧分',
  outfit: '米白色针织衫 + 深灰色西装裤',
  features: '戴细框眼镜，表情认真，身形偏瘦',
  skin: '#F2C9A8',
  ref_path: '',
  age: '三十出头',
  glasses: '细框眼镜',
  job: '采购 / 供应链',
  vibe: '干练利落',
}

/** 未填写任何维度时必须保持中性，不能被推断 */
const HERO_BLANK: Hero = {
  name: '我',
  gender: '不限',
  hair: '简单利落的短发',
  outfit: '简约通勤装，浅色衬衫',
  features: '表情认真',
  skin: '#F2C9A8',
  ref_path: '',
  age: '',
  glasses: '',
  job: '',
  vibe: '',
}

const STORIES = [
  {
    key: 'A',
    name: '一杯咖啡的和平条约',
    raw: '上午和老张在会上为一个方案的口径吵了起来，气氛有点僵。中午我在茶水间碰到他，递了杯咖啡，两个人把话说开了。下午他主动把修改后的方案发给我，我们确认了最终口径。',
    tags: ['团队协作'],
    highlight: '和老张把分歧说开了，确认了方案口径',
    blocker: '会上的气氛一度很僵',
    mood: '松了一口气',
    tomorrow: '按确认的口径推进下一步',
  },
  {
    key: 'B',
    name: '供应商报价分析完成',
    raw: '今天把三家供应商的报价全部收齐，逐项做了单价对比，发现第三家单价明显偏低但规格描述含糊。下午对着规格书逐条复核，确认它的低价是因为不含运费。最后整理出一份对比表和结论发给团队。',
    tags: ['项目推进'],
    highlight: '完成三家供应商报价对比分析，输出对比表和结论',
    blocker: '第三家规格描述含糊，需要逐条复核',
    mood: '小有成就',
    tomorrow: '按对比结论推进议价',
  },
]

/** 编造红线：日志里没有的结论一旦出现即为不合格 */
const FABRICATION = [
  '签约', '已签', '中标', '接受降价', '同意降价', '已节省', '省下', '降本', '完成付款', '已下单', '合同已', '客户已确认',
]

/** 女性主角不应出现的男性指代；反之亦然 */
const MALE_CODED = ['小伙子', '男人', '男生', '先生', '帅哥', '大叔']
const FEMALE_CODED = ['姑娘', '女人', '女生', '女士', '美女', '小姐姐']

/* ---------------- A 段：静态提示词检查（不调模型） ---------------- */

/** 截取「固定角色 + 角色圣经 + 职业上下文」整段，跨格必须逐字一致 */
function characterBlock(prompt: string): string {
  const s = prompt.indexOf('FIXED MAIN CHARACTER')
  const e = prompt.indexOf('[THIS PANEL]')
  return s >= 0 && e > s ? prompt.slice(s, e) : ''
}

async function staticChecks() {
  console.log('\n================ A · 提示词静态检查（不调用模型） ================')
  const { buildPanelMessages } = await import('../src/lib/ai')
  const style = ART_STYLE_MAP.jp_healing
  const ad = buildArtDirection(style, 't-static')
  const plan = shotPlan(6)
  const fail: string[] = []
  const ok = (cond: boolean, msg: string) => {
    if (!cond) fail.push(msg)
  }

  const run = (hero: Hero, seed: string) => {
    const bible = bibleOf(hero, seed)
    const blocks = plan.map((shot, i) => {
      const { user } = buildPanelMessages({
        panel: {
          panel_number: i + 1,
          scene_description: `测试场景 ${i + 1}`,
          characters: hero.name,
          action: '核对一份报价对比表',
          expression: '专注',
          focus: '报价对比表',
          dialogue: '',
          narration: '',
          visual_prompt: 'a person reviewing a quotation table',
          shot: shot.id,
          source_fact_ids: [],
        },
        style,
        hero,
        ad,
        bible,
        shot,
        total: 6,
        index: i,
      })
      return characterBlock(user)
    })
    return blocks
  }

  // 1) 跨格一致性：全部 6 格的角色段必须逐字相同
  const full = run(HERO, 't-static')
  ok(full.length === 6 && full.every((b) => b && b === full[0]), '跨格角色段不一致')
  console.log(`  跨格角色段一致：${full.every((b) => b === full[0]) ? '是' : '否'}（${full.length} 格逐字比对）`)

  // 2) 角色圣经必须存在，且发色/体型固定
  ok(full[0].includes('CHARACTER BIBLE FOR THIS COMIC'), '缺少角色视觉圣经')
  ok(/Hair colour: #[0-9A-Fa-f]{6}/.test(full[0]), '角色圣经缺少固定发色')
  ok(full[0].includes('Body build:'), '角色圣经缺少体型数据库')

  // 3) 性别呈现：女 → feminine；且中文选项不得泄漏进英文提示词
  ok(full[0].includes('feminine presentation'), '女性主角未翻译成 feminine presentation')
  ok(!full[0].includes('不限'), '中文性别选项泄漏进了英文提示词')
  ok(full[0].includes('Apparent age: 三十出头'), '年龄感未下发')
  ok(full[0].includes('Eyewear: 细框眼镜'), '眼镜未下发')
  ok(full[0].includes('Temperament: 干练利落'), '气质未下发')

  // 4) 职业上下文：有职业时下发，且带防编造约束
  ok(full[0].includes('[OCCUPATION CONTEXT]'), '未下发职业上下文')
  ok(full[0].includes('procurement and sourcing specialist'), '职业英文锚点缺失')
  ok(full[0].includes('Do NOT invent occupation-specific outcomes'), '职业上下文缺少防编造约束')

  // 5) 未填写维度必须保持中性、不下发
  const blank = run(HERO_BLANK, 't-static')
  ok(blank.every((b) => b && b === blank[0]), '中性主角跨格角色段不一致')
  ok(blank[0].includes('gender is NOT specified'), '未指定性别未走中性规则')
  ok(!blank[0].includes('Apparent age'), '未填年龄却下发了年龄')
  ok(!blank[0].includes('Eyewear'), '未填眼镜却下发了眼镜')
  ok(!blank[0].includes('Temperament'), '未填气质却下发了气质')
  ok(!blank[0].includes('[OCCUPATION CONTEXT]'), '未填职业却下发了职业上下文')
  console.log(`  中性主角：性别=${blank[0].includes('gender is NOT specified') ? '中性未推断' : '异常'}  职业上下文=${blank[0].includes('[OCCUPATION CONTEXT]') ? '误下发' : '未下发'}`)
  console.log(`  职业上下文：${full[0].includes('[OCCUPATION CONTEXT]') ? '已下发' : '缺失'}  防编造约束：${full[0].includes('Do NOT invent occupation-specific outcomes') ? '有' : '无'}`)

  if (fail.length) {
    console.log(`\n  ❌ 静态检查未通过：${fail.join(' / ')}`)
    return false
  }
  console.log('\n  ✅ 静态检查全部通过')
  return true
}

async function main() {
  const { extractFacts, writeStory, ensureStyle } = await import('../src/lib/ai')
  const staticOk = await staticChecks()
  const style = await ensureStyle('jp_healing')
  const length = 6

  for (const s of STORIES) {
    console.log(`\n================ ${s.key} · ${s.name} ================`)
    const facts = await extractFacts({
      raw: s.raw,
      tags: s.tags,
      highlight: s.highlight,
      blocker: s.blocker,
      mood: s.mood,
      tomorrow: s.tomorrow,
    })
    console.log(`标题：${facts.title}`)
    console.log(`摘要：${facts.summary}`)
    console.log('事实清单：')
    facts.facts.forEach((f) => console.log(`  ${f.id} [${f.kind}] ${f.text}`))

    const story = await writeStory({
      facts,
      style,
      genre: 'daily',
      tone: 'warm',
      length,
      hero: HERO as any,
    })
    console.log(`\n分镜（${story.panels.length} 格）：`)
    let prevShot = ''
    let dupAdjacent = 0
    let noFact = 0
    const hits: string[] = []
    const genderHits: string[] = []
    story.panels.forEach((p, i) => {
      if (p.shot === prevShot) dupAdjacent++
      prevShot = p.shot
      if (!p.source_fact_ids.length) noFact++
      const blob = `${p.scene_description}${p.action}${p.dialogue}${p.narration}${p.visual_prompt}`
      FABRICATION.forEach((w) => {
        if (blob.includes(w)) hits.push(`第${i + 1}格:${w}`)
      })
      // 主角为女性：分镜文本不应出现男性化指代
      if (HERO.gender === '女') {
        MALE_CODED.forEach((w) => {
          if (blob.includes(w)) genderHits.push(`第${i + 1}格:${w}`)
        })
      } else if (HERO.gender === '男') {
        FEMALE_CODED.forEach((w) => {
          if (blob.includes(w)) genderHits.push(`第${i + 1}格:${w}`)
        })
      }
      console.log(
        `  第${i + 1}格 [${p.shot}] 焦点=${p.focus || '—'} 表情=${p.expression || '—'}`,
      )
      console.log(`    场景：${p.scene_description}`)
      console.log(`    动作：${p.action}`)
      if (p.dialogue) console.log(`    对白：${p.dialogue}`)
      if (p.narration) console.log(`    旁白：${p.narration}`)
      console.log(`    绑定事实：${p.source_fact_ids.join(',') || '（未绑定）'}`)
    })
    console.log(`\n检查：相邻同景别=${dupAdjacent}  未绑定事实的格=${noFact}  疑似编造=${hits.length ? hits.join(' / ') : '无'}  性别错配=${genderHits.length ? genderHits.join(' / ') : '无'}`)
  }
  console.log(`\n================ 汇总 ================`)
  console.log(`静态检查：${staticOk ? '通过' : '未通过'}`)
  if (!staticOk) process.exitCode = 1
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
