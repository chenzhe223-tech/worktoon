/** 把 test-output 下所有 SVG 合并成一份对比预览页（不调用模型） */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = join(process.cwd(), 'test-output')
const files = readdirSync(OUT).filter((f) => f.endsWith('.svg')).sort()

const NAMES = {
  jp_healing: '日系治愈手绘风',
  us_western: '美国西部漫画风',
  cn_ink: '中国古典水墨风',
  cyber: '现代科技赛博风',
  eu_novel: '欧洲经典图像小说风',
  hero_action: '超级英雄动作风',
  manga_bw: '黑白日漫风',
  pop_retro: '复古美式波普风',
  chibi_work: 'Q 版萌系职场风',
  magazine: '现代杂志插画风',
  cn_modern: '中国现代国漫风',
  noir: '黑色电影悬疑风',
}

function metrics(svg) {
  const c = (re) => (svg.match(re) || []).length
  return {
    len: svg.length,
    path: c(/<path\b/g),
    rect: c(/<rect\b/g),
    circ: c(/<circle\b/g) + c(/<ellipse\b/g),
    grad: c(/<linearGradient\b/g) + c(/<radialGradient\b/g),
    colors: new Set((svg.match(/#[0-9a-fA-F]{6}/g) || []).map((x) => x.toLowerCase())).size,
    text: c(/<text\b/g),
  }
}

const cards = []
const rows = []
for (const f of files) {
  const id = f.replace(/-p\d+\.svg$/, '')
  const svg = readFileSync(join(OUT, f), 'utf8')
  const m = metrics(svg)
  const panel = (f.match(/-p(\d+)\.svg$/) || [])[1] || '1'
  cards.push(
    `<div class="card"><div class="hd"><h3>${NAMES[id] || id}</h3><span class="tag">第 ${panel} 格 · ${id}</span></div><div class="frame">${svg}</div></div>`,
  )
  rows.push({ id, name: NAMES[id] || id, panel, ...m })
}

const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>WorkToon 12 种画风回归测试</title>
<style>
body{margin:0;padding:22px;background:#151517;color:#ececec;font:14px/1.6 system-ui,"Microsoft YaHei";}
h1{font-size:19px;margin:0 0 6px}
.sub{color:#9c9c9c;margin-bottom:18px;font-size:13px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:18px}
.card{background:#1e1e21;border-radius:14px;padding:12px}
.hd{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:8px}
.card h3{margin:0;font-size:14px}
.tag{color:#8a8a8a;font-size:11px}
.frame{aspect-ratio:4/5;background:#fff;border-radius:10px;overflow:hidden}
.frame svg{width:100%;height:100%;display:block}
table{margin-top:26px;border-collapse:collapse;width:100%;font-size:12.5px}
td,th{border:1px solid #333;padding:6px 8px;text-align:left}
th{background:#232326}
td.num{font-variant-numeric:tabular-nums}
</style></head><body>
<h1>WorkToon 画风 V2 · 12 种风格回归测试</h1>
<div class="sub">同一故事、同一分格（供应商报价分析 · 第 1 格 · 远景），只切换画风。用于核对人物造型、构图、背景层次、色彩体系与风格一致性。全部画面由模型真实生成。</div>
<div class="grid">${cards.join('\n')}</div>
<table>
<tr><th>画风</th><th>格</th><th>SVG 长度</th><th>path</th><th>rect</th><th>circle/ellipse</th><th>渐变</th><th>用色数</th><th>text 标签</th></tr>
${rows
  .map(
    (r) =>
      `<tr><td>${r.name}</td><td>${r.panel}</td><td class="num">${r.len}</td><td class="num">${r.path}</td><td class="num">${r.rect}</td><td class="num">${r.circ}</td><td class="num">${r.grad}</td><td class="num">${r.colors}</td><td class="num">${r.text}</td></tr>`,
  )
  .join('\n')}
</table>
</body></html>`

writeFileSync(join(OUT, 'styles-preview.html'), html)
console.log('已合并', rows.length, '张 →', join(OUT, 'styles-preview.html'))
console.log(rows.map((r) => `${r.name.padEnd(12)} len=${r.len} path=${r.path} rect=${r.rect} circ=${r.circ} colors=${r.colors} text=${r.text}`).join('\n'))
