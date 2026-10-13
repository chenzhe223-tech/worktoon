/**
 * 生成「提示词改前 vs 改后」并排对比页（不调用模型，只读 test-output 落盘文件）。
 * 约定基线文件名：<style>-p1-baseline.svg，新版文件名：<style>-p1.svg
 * 用法：node scripts/ab-preview.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const OUT = join(process.cwd(), 'test-output')

const GROUPS = [
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
    path: c(/<path\b/g),
    grad: c(/<linearGradient\b/g) + c(/<radialGradient\b/g),
    colors: new Set((svg.match(/#[0-9a-fA-F]{6}/g) || []).map((x) => x.toLowerCase())).size,
    text: c(/<text\b/g),
  }
}

const blocks = []
const rows = []
for (const g of GROUPS) {
  const before = join(OUT, `${g.id}-p1-baseline.svg`)
  const after = join(OUT, `${g.id}-p1.svg`)
  if (!existsSync(before) || !existsSync(after)) {
    console.log(`跳过 ${g.id}：缺文件`)
    continue
  }
  const b = readFileSync(before, 'utf8')
  const a = readFileSync(after, 'utf8')
  const mb = metrics(b)
  const ma = metrics(a)
  rows.push({ name: g.name, mb, ma })
  blocks.push(`
  <div class="pair">
    <div class="pair-hd"><h2>${g.name}</h2><span class="tag">${g.id} · 第 1 格 · 远景 · 同一提示词仅改动复杂度约束</span></div>
    <div class="cols">
      <figure><figcaption>改前 <em>旧提示词</em></figcaption><div class="frame">${b}</div>
        <div class="m">形状 ${mb.shapes} · path ${mb.path} · 渐变 ${mb.grad} · 用色 ${mb.colors} · ${mb.len} 字符</div></figure>
      <figure><figcaption>改后 <em>新版复杂度硬约束</em></figcaption><div class="frame">${a}</div>
        <div class="m">形状 ${ma.shapes} · path ${ma.path} · 渐变 ${ma.grad} · 用色 ${ma.colors} · ${ma.len} 字符</div></figure>
    </div>
  </div>`)
}

const pct = (x, y) => (y === 0 ? '—' : `${x >= y ? '+' : ''}${(((x - y) / y) * 100).toFixed(0)}%`)

const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>WorkToon 画质升级 · 改前 vs 改后</title>
<style>
body{margin:0;padding:24px;background:#151517;color:#ececec;font:14px/1.6 system-ui,"Microsoft YaHei";}
h1{font-size:19px;margin:0 0 6px}
.sub{color:#9c9c9c;margin-bottom:22px;font-size:13px}
.pair{margin-bottom:30px;background:#1b1b1e;border:1px solid #2a2a2e;border-radius:16px;padding:16px}
.pair-hd{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:12px}
.pair-hd h2{margin:0;font-size:15px;font-weight:500}
.tag{color:#8a8a8a;font-size:11.5px}
.cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}
figure{margin:0}
figcaption{font-size:13px;margin-bottom:6px;color:#cfcfcf}
figcaption em{color:#9c9c9c;font-style:normal;font-size:11.5px}
.frame{aspect-ratio:4/5;background:#fff;border-radius:10px;overflow:hidden}
.frame svg{width:100%;height:100%;display:block}
.m{margin-top:6px;color:#8a8a8a;font-size:11.5px;font-variant-numeric:tabular-nums}
table{margin-top:10px;border-collapse:collapse;width:100%;font-size:12.5px}
td,th{border:1px solid #333;padding:6px 8px;text-align:left}
th{background:#232326}
td.num{text-align:right;font-variant-numeric:tabular-nums}
.up{color:#7FBF6A}
</style></head><body>
<h1>WorkToon 画质升级 · 改前 vs 改后</h1>
<div class="sub">同一故事（供应商报价分析）、同一分格（第 1 格 · 远景）、同一模型与参数，唯一变量是新增的「画面密度与复杂度硬约束」。全部画面由模型真实生成。</div>
${blocks.join('\n')}
<table>
<tr><th>画风</th><th>指标</th><th>改前</th><th>改后</th><th>变化</th></tr>
${rows
  .map(
    (r) => `
<tr><td rowspan="4">${r.name}</td><td>独立绘制形状数</td><td class="num">${r.mb.shapes}</td><td class="num">${r.ma.shapes}</td><td class="num up">${pct(r.ma.shapes, r.mb.shapes)}</td></tr>
<tr><td>path（复杂曲线）</td><td class="num">${r.mb.path}</td><td class="num">${r.ma.path}</td><td class="num up">${pct(r.ma.path, r.mb.path)}</td></tr>
<tr><td>渐变定义数</td><td class="num">${r.mb.grad}</td><td class="num">${r.ma.grad}</td><td class="num up">${pct(r.ma.grad, r.mb.grad)}</td></tr>
<tr><td>用色数</td><td class="num">${r.mb.colors}</td><td class="num">${r.ma.colors}</td><td class="num up">${pct(r.ma.colors, r.mb.colors)}</td></tr>`,
  )
  .join('\n')}
</table>
</body></html>`

const target = join(OUT, 'ab-preview.html')
writeFileSync(target, html)
console.log('已生成', target)
console.log(
  rows
    .map(
      (r) =>
        `${r.name.padEnd(14)} 形状 ${r.mb.shapes}→${r.ma.shapes} (${pct(r.ma.shapes, r.mb.shapes)})  path ${r.mb.path}→${r.ma.path} (${pct(r.ma.path, r.mb.path)})  渐变 ${r.mb.grad}→${r.ma.grad}  用色 ${r.mb.colors}→${r.ma.colors} (${pct(r.ma.colors, r.mb.colors)})`,
    )
    .join('\n'),
)
