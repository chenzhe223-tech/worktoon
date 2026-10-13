/**
 * 故事层回归测试：验证阶段一（理解）+ 阶段二（分镜）
 * 关注点：事实绑定、景别不重复、每格有焦点与表演、不编造结果。
 * 运行：npm run test:story
 */
import { createWorkBuddyCloud } from '@tencent-ai/workbuddy-cloud-sdk'

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

async function main() {
  const { extractFacts, writeStory, ensureStyle } = await import('../src/lib/ai')
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
    story.panels.forEach((p, i) => {
      if (p.shot === prevShot) dupAdjacent++
      prevShot = p.shot
      if (!p.source_fact_ids.length) noFact++
      const blob = `${p.scene_description}${p.action}${p.dialogue}${p.narration}${p.visual_prompt}`
      FABRICATION.forEach((w) => {
        if (blob.includes(w)) hits.push(`第${i + 1}格:${w}`)
      })
      console.log(
        `  第${i + 1}格 [${p.shot}] 焦点=${p.focus || '—'} 表情=${p.expression || '—'}`,
      )
      console.log(`    场景：${p.scene_description}`)
      console.log(`    动作：${p.action}`)
      if (p.dialogue) console.log(`    对白：${p.dialogue}`)
      if (p.narration) console.log(`    旁白：${p.narration}`)
      console.log(`    绑定事实：${p.source_fact_ids.join(',') || '（未绑定）'}`)
    })
    console.log(`\n检查：相邻同景别=${dupAdjacent}  未绑定事实的格=${noFact}  疑似编造=${hits.length ? hits.join(' / ') : '无'}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
