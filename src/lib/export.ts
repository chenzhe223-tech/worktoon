import { downloadBlob } from './img'
import { APP_CN, APP_NAME } from './config'
import { ART_STYLE_MAP, GENRE_MAP } from './art'
import type { Comic, ComicPanel } from './types'

const W = 1080
const PAD = 56

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const ch of String(text || '')) {
    if (ch === '\n') {
      lines.push(line)
      line = ''
      continue
    }
    const test = line + ch
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line)
      line = ch
    } else line = test
  }
  if (line) lines.push(line)
  return lines
}

function box(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  text: string,
  opts: { bg: string; fg: string; font: string; lh: number; pad?: number; bar?: string },
) {
  ctx.font = opts.font
  const pad = opts.pad ?? 24
  const lines = wrap(ctx, text, w - pad * 2)
  const lh = opts.lh
  const h = lines.length * lh + pad * 2
  ctx.fillStyle = opts.bg
  roundRect(ctx, x, y, w, h, 18)
  ctx.fill()
  if (opts.bar) {
    ctx.fillStyle = opts.bar
    roundRect(ctx, x, y, 8, h, 4)
    ctx.fill()
  }
  ctx.fillStyle = opts.fg
  ctx.textBaseline = 'top'
  lines.forEach((l, i) => ctx.fillText(l, x + pad + (opts.bar ? 8 : 0), y + pad + i * lh))
  return h
}

async function loadImg(url: string) {
  const img = new Image()
  await new Promise<void>((res, rej) => {
    img.onload = () => res()
    img.onerror = () => rej(new Error('图片加载失败'))
    img.src = url
  })
  return img
}

/** 把整篇漫画拼成一张真实的长图 PNG */
export async function exportLongImage(comic: Comic, panels: ComicPanel[]): Promise<Blob> {
  const list = panels.filter((p) => !p.deleted)
  if (!list.length) throw new Error('这篇漫画还没有可导出的画面')

  const pw = W - PAD * 2
  const ph = Math.round((pw * 1000) / 800)
  const imgs: (HTMLImageElement | null)[] = []
  const urls: string[] = []
  for (const p of list) {
    if (!p.image_path) {
      imgs.push(null)
      continue
    }
    try {
      const blob = await downloadBlob(p.image_path)
      const u = URL.createObjectURL(blob)
      urls.push(u)
      imgs.push(await loadImg(u))
    } catch {
      imgs.push(null)
    }
  }

  const probe = document.createElement('canvas').getContext('2d')!
  const measure = (t: string, font: string, w: number) => {
    probe.font = font
    return wrap(probe, t, w)
  }

  let H = 260
  for (let i = 0; i < list.length; i++) {
    H += ph + 30
    const p = list[i]
    if (p.narration) H += measure(p.narration, '500 30px "PingFang SC", sans-serif', pw - 48).length * 44 + 56
    if (p.dialogue) H += measure(p.dialogue, '700 34px "PingFang SC", sans-serif', pw - 96).length * 48 + 70
    H += 46
  }
  H += 420

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#FBF8F3'
  ctx.fillRect(0, 0, W, H)
  ctx.textBaseline = 'top'

  let y = 72
  ctx.fillStyle = '#E8813A'
  roundRect(ctx, PAD, y, 76, 76, 20)
  ctx.fill()
  ctx.fillStyle = '#2B2620'
  ctx.font = '800 34px "PingFang SC", sans-serif'
  ctx.fillText(APP_NAME, PAD + 96, y + 6)
  ctx.font = '500 24px "PingFang SC", sans-serif'
  ctx.fillStyle = '#9D938A'
  ctx.fillText(APP_CN, PAD + 96, y + 44)
  y += 120

  ctx.fillStyle = '#2B2620'
  ctx.font = '800 46px "PingFang SC", sans-serif'
  y += box(ctx, PAD, y, pw, comic.title || '今天的故事', {
    bg: '#FFFFFF', fg: '#2B2620', font: '800 46px "PingFang SC", sans-serif', lh: 64, pad: 26,
  }) + 18

  ctx.font = '600 26px "PingFang SC", sans-serif'
  const meta = `${comic.entry_date} · ${ART_STYLE_MAP[comic.style]?.name || comic.style} · ${
    GENRE_MAP[comic.genre]?.name || '日常纪实'
  }`
  ctx.fillStyle = '#6B6259'
  ctx.fillText(meta, PAD + 6, y)
  y += 52

  for (let i = 0; i < list.length; i++) {
    const p = list[i]
    const img = imgs[i]
    if (img) {
      ctx.save()
      roundRect(ctx, PAD, y, pw, ph, 26)
      ctx.clip()
      ctx.drawImage(img, PAD, y, pw, ph)
      ctx.restore()
      ctx.strokeStyle = '#E9E1D5'
      ctx.lineWidth = 2
      roundRect(ctx, PAD, y, pw, ph, 26)
      ctx.stroke()
      ctx.fillStyle = 'rgba(43,38,32,0.72)'
      roundRect(ctx, PAD + 20, y + 20, 58, 44, 12)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = '700 26px "PingFang SC", sans-serif'
      ctx.fillText(String(i + 1), PAD + 38, y + 30)
    } else {
      ctx.fillStyle = '#F4EEE4'
      roundRect(ctx, PAD, y, pw, ph, 26)
      ctx.fill()
      ctx.fillStyle = '#9D938A'
      ctx.font = '500 28px "PingFang SC", sans-serif'
      ctx.fillText('这一格正在重新绘制', PAD + 30, y + ph / 2)
    }
    y += ph + 22

    if (p.narration) {
      y += box(ctx, PAD, y, pw, p.narration, {
        bg: '#F4EEE4', fg: '#6B6259', font: '500 30px "PingFang SC", sans-serif', lh: 44, pad: 24, bar: '#E8813A',
      }) + 14
    }
    if (p.dialogue) {
      y += box(ctx, PAD, y, pw - 40, p.dialogue, {
        bg: '#FFFFFF', fg: '#2B2620', font: '700 34px "PingFang SC", sans-serif', lh: 48, pad: 26,
      }) + 18
    }
    y += 28
  }

  if (comic.summary) {
    ctx.fillStyle = '#2B2620'
    ctx.font = '800 30px "PingFang SC", sans-serif'
    ctx.fillText('今日工作摘要', PAD, y)
    y += 44
    y += box(ctx, PAD, y, pw, comic.summary, {
      bg: '#FFFFFF', fg: '#2B2620', font: '500 28px "PingFang SC", sans-serif', lh: 42, pad: 22,
    }) + 22
  }
  if (comic.achievements) {
    ctx.fillStyle = '#2B2620'
    ctx.font = '800 30px "PingFang SC", sans-serif'
    ctx.fillText('今日成果', PAD, y)
    y += 44
    y += box(ctx, PAD, y, pw, comic.achievements, {
      bg: '#E2F0ED', fg: '#2B2620', font: '600 28px "PingFang SC", sans-serif', lh: 42, pad: 22,
    }) + 22
  }
  if (comic.tomorrow) {
    ctx.fillStyle = '#2B2620'
    ctx.font = '800 30px "PingFang SC", sans-serif'
    ctx.fillText('明日待办', PAD, y)
    y += 44
    y += box(ctx, PAD, y, pw, comic.tomorrow, {
      bg: '#FBE6D1', fg: '#2B2620', font: '600 28px "PingFang SC", sans-serif', lh: 42, pad: 22,
    }) + 22
  }

  ctx.fillStyle = '#9D938A'
  ctx.font = '500 22px "PingFang SC", sans-serif'
  ctx.fillText(`由 ${APP_NAME} · ${APP_CN} 生成`, PAD, Math.min(y + 10, H - 60))

  urls.forEach((u) => URL.revokeObjectURL(u))
  return await new Promise<Blob>((res, rej) => {
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('长图导出失败'))), 'image/png')
  })
}

export function downloadBlobFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 800)
}

/**
 * 分享结果：
 *  shared    已调起系统分享
 *  downloaded 分享不可用 / 被拒绝，已降级为直接下载
 *  canceled   用户收起了分享面板（不算错误，不需要提示）
 */
export type ShareResult = 'shared' | 'downloaded' | 'canceled'

/** 微信 / QQ 等内置浏览器：系统分享不可用，静默下载也常被拦，需要「长按保存」兜底 */
export function isWeChatWebView(): boolean {
  return /MicroMessenger/i.test(navigator.userAgent)
}

export async function shareBlobFile(blob: Blob, filename: string, title: string): Promise<ShareResult> {
  const nav: any = navigator as any

  // iOS Safari 要求分享必须在「用户手势」的有效期内调用。
  // 本函数是在 await 导出长图之后才执行的，手势往往已经失效，
  // 此时 share() 会抛 NotAllowedError（就是那句英文报错），所以先用 userActivation 预判，
  // 失效就直接走下载，不去触发那个异常。
  const activation = (nav.userActivation as { isActive?: boolean } | undefined) || undefined
  const gestureAlive = activation ? activation.isActive !== false : true

  let canShareFiles = false
  try {
    canShareFiles = !!(nav.canShare && nav.share && nav.canShare({ files: [new File([blob], filename, { type: 'image/png' })] }))
  } catch {
    // canShare 本身也可能抛错（部分 WebView），一律当作不可用
    canShareFiles = false
  }

  if (canShareFiles && gestureAlive) {
    try {
      await nav.share({ files: [new File([blob], filename, { type: 'image/png' })], title, text: title })
      return 'shared'
    } catch (e: any) {
      if (e?.name === 'AbortError') return 'canceled'
      // NotAllowedError 等一律降级为下载，绝不把英文异常抛到界面
    }
  }

  downloadBlobFile(blob, filename)
  return 'downloaded'
}
