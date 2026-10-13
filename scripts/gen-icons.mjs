import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, '..', 'public')
mkdirSync(outDir, { recursive: true })

const PAPER = [251, 248, 243]
const INK = [43, 38, 32]
const ORANGE = [232, 129, 58]
const PURPLE = [124, 107, 214]
const WHITE = [255, 255, 255]

function crc32(buf) {
  let c
  const table = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

function encodePNG(size, pixels) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  let p = 0
  for (let y = 0; y < size; y++) {
    raw[p++] = 0
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      raw[p++] = pixels[i]
      raw[p++] = pixels[i + 1]
      raw[p++] = pixels[i + 2]
      raw[p++] = pixels[i + 3]
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
  return png
}

function makeCanvas(size) {
  const px = Buffer.alloc(size * size * 4)
  return px
}

function inRoundRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || y < y0 || x > x1 || y > y1) return false
  const cx = Math.min(Math.max(x, x0 + r), x1 - r)
  const cy = Math.min(Math.max(y, y0 + r), y1 - r)
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= r * r + 0.5
}

function fill(px, size, color, test) {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!test(x, y)) continue
      const i = (y * size + x) * 4
      px[i] = color[0]
      px[i + 1] = color[1]
      px[i + 2] = color[2]
      px[i + 3] = 255
    }
  }
}

function roundRect(px, size, x0, y0, x1, y1, r, color) {
  fill(px, size, color, (x, y) => inRoundRect(x, y, x0, y0, x1, y1, r))
}

function panel(px, size, x0, y0, x1, y1, r, border, fillColor) {
  roundRect(px, size, x0 - border, y0 - border, x1 + border, y1 + border, r + border, INK)
  roundRect(px, size, x0, y0, x1, y1, r, fillColor)
}

function bubble(px, size, x0, y0, x1, y1, r, tailX, tailY) {
  roundRect(px, size, x0, y0, x1, y1, r, WHITE)
  // tail triangle
  fill(px, size, WHITE, (x, y) => {
    if (y < y1 - 4 || y > tailY) return false
    const t = (y - (y1 - 4)) / (tailY - (y1 - 4))
    const half = 26 * (1 - t) + 2
    return Math.abs(x - tailX) <= half
  })
}

function render(size) {
  const s = size / 512
  const px = makeCanvas(size)
  roundRect(px, size, 0, 0, size - 1, size - 1, 110 * s, PAPER)
  const P = (v) => Math.round(v * s)

  // three comic panels
  panel(px, size, P(56), P(96), P(252), P(286), P(20), P(11), ORANGE)
  panel(px, size, P(272), P(96), P(456), P(232), P(20), P(11), PURPLE)
  panel(px, size, P(56), P(318), P(456), P(452), P(20), P(11), WHITE)

  // speech bubble inside the bottom panel
  bubble(px, size, P(96), P(348), P(300), P(408), P(18), P(150), P(438))
  // bubble outline
  fill(px, size, INK, (x, y) => {
    const onRing =
      (inRoundRect(x, y, P(96), P(348), P(300), P(408), P(18)) &&
        !inRoundRect(x, y, P(96) + P(9), P(348) + P(9), P(300) - P(9), P(408) - P(9), P(12))) ||
      (y >= P(400) &&
        y <= P(438) &&
        Math.abs(x - P(150)) <= 26 * (1 - (y - P(400)) / (P(438) - P(400))) + 2 &&
        Math.abs(x - P(150)) >= 26 * (1 - (y - P(400)) / (P(438) - P(400))) - 8)
    return onRing
  })

  // ink dots (text lines) in bottom panel
  for (let i = 0; i < 3; i++) {
    const yy = P(370) + i * P(14)
    roundRect(px, size, P(322), yy, P(420), yy + P(7), P(4), INK)
  }

  // action star in the orange panel
  fill(px, size, WHITE, (x, y) => {
    const cx = P(154)
    const cy = P(190)
    const dx = x - cx
    const dy = y - cy
    const d = Math.sqrt(dx * dx + dy * dy)
    if (d > P(70)) return false
    const a = Math.atan2(dy, dx)
    const spikes = 5
    const wob = P(34) + P(30) * Math.abs(Math.cos(a * spikes * 0.5))
    return d <= wob
  })

  // small ink "!" in purple panel
  roundRect(px, size, P(352), P(126), P(376), P(196), P(10), WHITE)
  roundRect(px, size, P(352), P(206), P(376), P(214), P(4), WHITE)

  return px
}

for (const size of [180, 192, 512]) {
  const png = encodePNG(size, render(size))
  writeFileSync(resolve(outDir, `icon-${size}.png`), png)
  console.log('wrote icon-' + size + '.png')
}
