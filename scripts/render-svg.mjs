/** 把 test-output 下的 SVG 渲染成 PNG，便于人眼核对（不调用模型） */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire('C:/Users/admin/.workbuddy/binaries/node/workspace/')
const { Resvg } = require('@resvg/resvg-js')

const OUT = join(process.cwd(), 'test-output')
const jobs = process.argv.slice(2)
const files = jobs.length ? jobs : ['jp_healing-p1-baseline', 'jp_healing-p1', 'chibi_work-p1-baseline', 'chibi_work-p1']

for (const name of files) {
  const p = join(OUT, name.endsWith('.svg') ? name : `${name}.svg`)
  if (!existsSync(p)) {
    console.log('缺文件', p)
    continue
  }
  const svg = readFileSync(p, 'utf8')
  try {
    const W = Number(process.env.W || 520)
    const r = new Resvg(svg, {
      background: '#FBF8F3',
      fitTo: { mode: 'width', value: W },
    })
    const png = r.render().asPng()
    const out = join(OUT, `${name.replace(/\.svg$/, '')}${W === 520 ? '' : `@${W}`}.png`)
    writeFileSync(out, png)
    console.log(`${name} → ${(png.length / 1024).toFixed(0)} KB`)
  } catch (e) {
    console.log(`${name} 渲染失败:`, e?.message)
  }
}
