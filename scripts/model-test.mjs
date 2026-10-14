/**
 * 出图模型对比：同一格、同一提示词，只换模型，看画面差异。
 * 用法：node scripts/model-test.mjs [styleId] [panelIdx]
 */
import { createRequire } from 'node:module'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const require = createRequire('C:/Users/admin/.workbuddy/binaries/node/workspace/')
const { Resvg } = require('@resvg/resvg-js')

const { ART_STYLE_MAP, buildArtDirection, shotPlan } = await import('../.tmp/art.mjs')
const { buildPanelMessages } = await import('../.tmp/ai.mjs')

const mem = new Map()
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
}

const { createWorkBuddyCloud } = await import('@tencent-ai/workbuddy-cloud-sdk')
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

const PANEL = {
  panel_number: 1,
  scene_description: '开放办公区，靠窗的工位，屏幕上并排打开三份供应商报价表，桌上摊着打印件',
  characters: '小林',
  action: '坐在工位前，一手扶着打印件，一手移动鼠标，身体前倾',
  expression: '专注，眉头微皱',
  focus: '屏幕上并排的三份报价表',
  dialogue: '',
  narration: '三家供应商的报价终于齐了。',
  visual_prompt: 'open-plan office by a window, a desk with a monitor showing three quotation spreadsheets side by side, printed sheets and a calculator on the desk',
}

const MODELS = [
  { id: 'glm-5.3-flash', label: 'GLM-5.3-Flash', credits: 'x0.06', note: '当前使用 · 基线' },
  { id: 'deepseek-v4.1-flash', label: 'Deepseek-V4.1-Flash', credits: 'x0.11', note: '原生多模态 · 略贵' },
  { id: 'hy4-preview', label: 'Hy4 preview', credits: 'x0.29', note: '混元思考模型' },
  { id: 'deepseek-v4-pro', label: 'Deepseek-V4-Pro', credits: 'x0.51', note: '旗舰' },
  { id: 'glm-5.3', label: 'GLM-5.3', credits: 'x0.79', note: '旗舰 · 最贵' },
]

const styleId = process.argv[2] || 'jp_healing'
const panelIdx = Number(process.argv[3] || 0)
const style = ART_STYLE_MAP[styleId]
if (!style) throw new Error('未知画风: ' + styleId)

const plan = shotPlan(6)
const shot = plan[panelIdx]
const ad = buildArtDirection(style, 'model-cmp')

const { system, user } = buildPanelMessages({
  panel: { ...PANEL, shot: shot.id, source_fact_ids: [] },
  style,
  hero: HERO,
  ad,
  total: 6,
  index: panelIdx,
})

const OUT = join(process.cwd(), 'test-output', 'models')
mkdirSync(OUT, { recursive: true })

const rows = []
for (const m of MODELS) {
  process.stdout.write(`[${m.id}] 生成中… `)
  const t0 = Date.now()
  try {
    let out = ''
    for await (const c of cloud.llm.chat.completions.create({
      model: m.id,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      stream: true,
    })) {
      const d = c?.choices?.[0]?.delta
      if (d?.content) out += d.content
    }
    const s = out.indexOf('<svg')
    const e = out.lastIndexOf('</svg>')
    const svg = s >= 0 && e > s ? out.slice(s, e + 6) : ''
    if (!svg) {
      rows.push({ ...m, ms: Date.now() - t0, error: '没有解析出 svg', raw: out.length })
      console.log('FAIL 无 svg, raw=' + out.length)
      continue
    }
    const c = (re) => (svg.match(re) || []).length
    const shapes =
      c(/<rect\b/g) + c(/<circle\b/g) + c(/<ellipse\b/g) + c(/<path\b/g) +
      c(/<polygon\b/g) + c(/<polyline\b/g) + c(/<line\b/g)
    const colors = new Set((svg.match(/#[0-9a-fA-F]{6}/g) || []).map((x) => x.toLowerCase())).size
    const grad = c(/<linearGradient\b/g) + c(/<radialGradient\b/g)
    const text = c(/<text\b/g)
    const row = {
      ...m, ms: Date.now() - t0, len: svg.length, shapes, colors, grad, text,
      path: c(/<path\b/g), rect: c(/<rect\b/g),
    }
    rows.push(row)
    writeFileSync(join(OUT, `${m.id}-p${panelIdx + 1}.svg`), svg)
    try {
      const png = new Resvg(svg, { background: '#FBF8F3', fitTo: { mode: 'width', value: 640 } }).render().asPng()
      writeFileSync(join(OUT, `${m.id}-p${panelIdx + 1}.png`), png)
    } catch (e2) {
      console.log('(渲染 PNG 失败: ' + e2?.message + ')')
    }
    console.log(`ok ${(row.ms / 1000).toFixed(1)}s  svg=${svg.length} shapes=${shapes} colors=${colors} grad=${grad} text=${text}`)
  } catch (e) {
    rows.push({ ...m, ms: Date.now() - t0, error: String(e?.message || e) })
    console.log('FAIL', e?.message || e)
  }
}

writeFileSync(join(OUT, `metrics-${styleId}-p${panelIdx + 1}.json`), JSON.stringify(rows, null, 2))

const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>出图模型对比 · ${style.name}</title>
<style>
body{margin:0;padding:24px;background:#151517;color:#ececec;font:14px/1.6 system-ui,"Microsoft YaHei";}
h1{font-size:19px;margin:0 0 6px}
.sub{color:#9c9c9c;margin-bottom:20px;font-size:13px;max-width:900px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:18px}
.card{background:#1e1e21;border-radius:14px;padding:12px}
.card h3{margin:0;font-size:14px;font-weight:500}
.badge{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:20px;background:#2c2c31;color:#b9b9b9;font-size:11px}
.base{background:#2d3a26;color:#a8d48a}
.frame{aspect-ratio:4/5;background:#fff;border-radius:10px;overflow:hidden;margin-top:8px}
.frame svg,.frame img{width:100%;height:100%;display:block;object-fit:cover}
.meta{margin-top:8px;color:#8a8a8a;font-size:11.5px;font-variant-numeric:tabular-nums}
.note{color:#6f6f6f;font-size:11.5px;margin-top:2px}
table{margin-top:26px;border-collapse:collapse;width:100%;font-size:12.5px}
td,th{border:1px solid #333;padding:6px 8px;text-align:left}
th{background:#232326}
td.num{text-align:right;font-variant-numeric:tabular-nums}
.foot{margin-top:24px;padding:14px 16px;background:#1e1e21;border-radius:12px;color:#b9b9b9;font-size:13px;max-width:900px}
</style></head><body>
<h1>出图模型对比 · ${style.name} · 第 ${panelIdx + 1} 格（${shot.name}）</h1>
<div class="sub">完全相同的提示词、相同的 Art Direction、相同的分格内容与随机种子来源，唯一变量是模型。用于判断「换更强的模型能不能真的提升画面质量」。全部画面由模型真实生成。</div>
<div class="grid">
${rows
  .map((r) => {
    const f = join(OUT, `${r.id}-p${panelIdx + 1}.svg`)
    let inner
    try {
      inner = require('node:fs').readFileSync(f, 'utf8')
    } catch {
      inner = '<div style="padding:20px;color:#888">生成失败</div>'
    }
    return `<div class="card"><h3>${r.label}<span class="badge ${r.credits === 'x0.06' ? 'base' : ''}">${r.credits}</span></h3><div class="note">${r.note}</div><div class="frame">${inner}</div><div class="meta">${r.error ? '错误：' + r.error : `${(r.ms / 1000).toFixed(1)}s · 形状 ${r.shapes} · 用色 ${r.colors} · 渐变 ${r.grad} · ${r.len} 字符`}</div></div>`
  })
  .join('\n')}
</div>
<table>
<tr><th>模型</th><th>积分倍率</th><th>耗时</th><th>SVG 长度</th><th>形状数</th><th>path</th><th>渐变</th><th>用色数</th><th>text 标签</th></tr>
${rows
  .map(
    (r) =>
      `<tr><td>${r.label}</td><td>${r.credits}</td><td class="num">${r.ms ? (r.ms / 1000).toFixed(1) + 's' : '-'}</td><td class="num">${r.len ?? '-'}</td><td class="num">${r.shapes ?? '-'}</td><td class="num">${r.path ?? '-'}</td><td class="num">${r.grad ?? '-'}</td><td class="num">${r.colors ?? '-'}</td><td class="num">${r.text ?? '-'}</td></tr>`,
  )
  .join('\n')}
</table>
<div class="foot">读图提示：重点看 —— ① 桌子的腿是否落到地上、有没有悬空；② 人物的脸是否被显示器挡住；③ 手部是否可读；④ 背景是否只有一块平涂；⑤ 四个角落是不是空白。<br>指标只做参考，最终以画面为准。</div>
</body></html>`

writeFileSync(join(OUT, `compare-${styleId}-p${panelIdx + 1}.html`), html)
console.log('\n对比页：' + join(OUT, `compare-${styleId}-p${panelIdx + 1}.html`))
