/**
 * 把同一格、同一画风的「多轮提示词版本」并排成一张对照页（不调用模型）。
 * 用法：node scripts/version-compare.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const OUT = join(process.cwd(), 'test-output')

const VERSIONS = [
  { key: 'baseline', label: '原始提示词', note: '仓库现存版本（已回退到此）' },
  { key: 'density', label: 'v1 数量型约束', note: '「至少 45 个形状 / 背景 6 元素 / 前景 2 元素」' },
  { key: 'v3', label: 'v3 避穿模', note: 'v1 改成结构型后，再加「显示器避开头部」' },
  { key: 'v4', label: 'v4 面部优先', note: 'v3 改成「面部不可遮挡、禁画后脑勺」' },
]

const STYLES = [
  { id: 'jp_healing', name: '日系治愈手绘风' },
  { id: 'chibi_work', name: 'Q 版萌系职场风' },
]

function metrics(svg) {
  const c = (re) => (svg.match(re) || []).length
  return {
    len: svg.length,
    shapes:
      c(/<rect\b/g) + c(/<circle\b/g) + c(/<ellipse\b/g) + c(/<path\b/g) +
      c(/<polygon\b/g) + c(/<polyline\b/g) + c(/<line\b/g),
    grad: c(/<linearGradient\b/g) + c(/<radialGradient\b/g),
    colors: new Set((svg.match(/#[0-9a-fA-F]{6}/g) || []).map((x) => x.toLowerCase())).size,
    text: c(/<text\b/g),
  }
}

const sections = []
const tableRows = []

for (const s of STYLES) {
  const cards = VERSIONS.map((v) => {
    const p = join(OUT, `${s.id}-p1-${v.key}.svg`)
    if (!existsSync(p)) return `<div class="card"><div class="hd"><h3>${v.label}</h3></div><div class="miss">缺文件</div></div>`
    const svg = readFileSync(p, 'utf8')
    const m = metrics(svg)
    return `<div class="card"><div class="hd"><h3>${v.label}</h3><span class="tag">${m.shapes} 形状 · 渐变 ${m.grad} · 用色 ${m.colors}</span></div><div class="frame">${svg}</div><div class="note">${v.note}</div></div>`
  })
  sections.push(`<h2>${s.name} <span class="tag">${s.id} · 第 1 格 · 远景 · 同一故事同一模型</span></h2><div class="grid">${cards.join('\n')}</div>`)

  for (const v of VERSIONS) {
    const p = join(OUT, `${s.id}-p1-${v.key}.svg`)
    if (!existsSync(p)) continue
    const m = metrics(readFileSync(p, 'utf8'))
    tableRows.push(`<tr><td>${s.name}</td><td>${v.label}</td><td class="num">${m.shapes}</td><td class="num">${m.grad}</td><td class="num">${m.colors}</td><td class="num">${m.len}</td><td class="num">${m.text}</td></tr>`)
  }
}

const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>WorkToon 提示词升级 · 四轮实测对照</title>
<style>
body{margin:0;padding:24px;background:#151517;color:#ececec;font:14px/1.6 system-ui,"Microsoft YaHei";}
h1{font-size:19px;margin:0 0 6px}
h2{font-size:15px;font-weight:500;margin:30px 0 12px}
.sub{color:#9c9c9c;margin-bottom:8px;font-size:13px;max-width:900px}
.tag{color:#8a8a8a;font-size:11.5px;font-weight:400}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px}
.card{background:#1e1e21;border-radius:14px;padding:12px}
.hd{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:8px;flex-wrap:wrap}
.card h3{margin:0;font-size:13.5px;font-weight:500}
.frame{aspect-ratio:4/5;background:#fff;border-radius:10px;overflow:hidden}
.frame svg{width:100%;height:100%;display:block}
.note{margin-top:8px;color:#8a8a8a;font-size:11.5px}
.miss{aspect-ratio:4/5;display:flex;align-items:center;justify-content:center;color:#666;background:#232326;border-radius:10px}
table{margin-top:26px;border-collapse:collapse;width:100%;font-size:12.5px}
td,th{border:1px solid #333;padding:6px 8px;text-align:left}
th{background:#232326}
td.num{text-align:right;font-variant-numeric:tabular-nums}
.foot{margin-top:26px;padding:14px 16px;background:#1e1e21;border-radius:12px;color:#b9b9b9;font-size:13px;max-width:900px}
</style></head><body>
<h1>WorkToon 提示词升级 · 四轮实测对照</h1>
<div class="sub">固定变量：同一故事（供应商报价分析）、同一分格（第 1 格 · 远景）、同一模型与参数、同一随机种子来源。唯一变量是提示词里的画面质量约束。全部画面由模型真实生成，未做任何人工修饰。</div>
${sections.join('\n')}
<table>
<tr><th>画风</th><th>提示词版本</th><th>形状数</th><th>渐变</th><th>用色</th><th>SVG 长度</th><th>text 标签</th></tr>
${tableRows.join('\n')}
</table>
<div class="foot">
读图提示：v1 请重点看桌子与椅子的结构是否断裂、物体是否悬空；v3 请重点看人物是否背对镜头、表情是否丢失；
v4 请重点看显示器的底座位置与人物头部是否仍然重叠。<br>
结论：在当前模型下，提示词约束的边际收益已经递减 —— 每收紧一条规则，模型就会牺牲另一个维度去满足它。
</div>
</body></html>`

const target = join(OUT, 'version-compare.html')
writeFileSync(target, html)
console.log('已生成', target)
