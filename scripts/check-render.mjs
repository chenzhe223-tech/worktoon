/**
 * 端到端验收：在真实 Chromium 里跑 svgToPngBlob，确认栅格化倍率生效。
 * 依赖装在隔离工作区，用 createRequire 引用，不污染项目依赖。
 * 用法：先 npm run dev，再 node scripts/check-render.mjs [url]
 */
import { createRequire } from 'node:module'

const require = createRequire('C:/Users/admin/.workbuddy/binaries/node/workspace/')
const { chromium } = require('playwright')

const URL = process.argv[2] || 'http://localhost:5173/selfcheck.html'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
page.on('pageerror', (e) => console.log('[page error]', e.message))
page.on('console', (m) => {
  if (m.type() === 'error') console.log('[console error]', m.text())
})

await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForFunction(() => window.__result !== undefined, null, { timeout: 60000 })
const r = await page.evaluate(() => window.__result)
const crops = await page.evaluate(() => window.__crops || null)
await browser.close()

if (crops) {
  const { writeFileSync } = await import('node:fs')
  const { join } = await import('node:path')
  for (const [k, dataUrl] of Object.entries(crops)) {
    const buf = Buffer.from(String(dataUrl).split(',')[1], 'base64')
    const p = join(process.cwd(), 'test-output', `crop-${k}.png`)
    writeFileSync(p, buf)
    console.log(`裁剪图 ${k} → ${p} (${(buf.length / 1024).toFixed(0)} KB)`)
  }
}
console.log(JSON.stringify(r, null, 2))

if (!r?.ok) {
  console.error('自检未通过')
  process.exit(1)
}
const expected = `${r.expect}`
if (r.defaultOutput !== expected) {
  console.error(`倍率不符：期望 ${expected}，实际 ${r.defaultOutput}`)
  process.exit(1)
}
console.log(`\n通过：默认输出 ${r.defaultOutput}（1x 对照 ${r.oneXOutput}），体积 ${r.bytes1x} → ${r.bytes2x} B（${r.ratio}×）`)
