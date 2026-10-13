import { cloud } from './cloud'
import { PANEL_W, PANEL_H } from './config'

const ALLOWED = new Set([
  'svg', 'g', 'defs', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
  'path', 'linearGradient', 'radialGradient', 'stop', 'clipPath', 'filter',
  'feGaussianBlur', 'feOffset', 'feMerge', 'feMergeNode', 'feBlend', 'feColorMatrix',
  'mask', 'pattern', 'title',
])

function walk(node: Element, strip: (el: Element) => void) {
  strip(node)
  const children = Array.from(node.children)
  for (const c of children) walk(c, strip)
}

/** 清洗并校验模型产出的 SVG，保证可安全渲染、可栅格化。 */
export function sanitizeSvg(raw: string): string | null {
  if (!raw) return null
  let start = raw.indexOf('<svg')
  if (start < 0) return null
  let end = raw.lastIndexOf('</svg>')
  if (end < 0) return null
  let code = raw.slice(start, end + 6)

  const doc = new DOMParser().parseFromString(code, 'image/svg+xml')
  if (doc.getElementsByTagName('parsererror').length) return null
  let root = doc.documentElement
  if (!root || root.nodeName.toLowerCase() !== 'svg') return null

  walk(root, (el) => {
    const tag = el.nodeName.toLowerCase()
    if (!ALLOWED.has(tag)) {
      el.remove()
      return
    }
    for (const attr of Array.from(el.attributes)) {
      const n = attr.name.toLowerCase()
      if (n.startsWith('on')) el.removeAttribute(attr.name)
      else if (n === 'href' || n === 'xlink:href') {
        if (!attr.value.trim().startsWith('#')) el.removeAttribute(attr.name)
      } else if (n === 'style' && /url\s*\(/i.test(attr.value)) {
        el.removeAttribute(attr.name)
      }
    }
  })

  root = doc.documentElement
  if (!root.getAttribute('xmlns')) root.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  root.setAttribute('width', String(PANEL_W))
  root.setAttribute('height', String(PANEL_H))
  const vb = root.getAttribute('viewBox')
  if (!vb || !/^[\d.\-\s]+$/.test(vb)) root.setAttribute('viewBox', `0 0 ${PANEL_W} ${PANEL_H}`)
  root.setAttribute('preserveAspectRatio', 'xMidYMid slice')

  const out = new XMLSerializer().serializeToString(doc)
  if (!out || out.length < 120) return null
  return out
}

export async function svgToPngBlob(svg: string): Promise<Blob> {
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  const img = new Image()
  img.decoding = 'sync'
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('插画渲染失败'))
    img.src = url
  })
  const canvas = document.createElement('canvas')
  canvas.width = PANEL_W
  canvas.height = PANEL_H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('画布不可用')
  ctx.fillStyle = '#FBF8F3'
  ctx.fillRect(0, 0, PANEL_W, PANEL_H)
  ctx.drawImage(img, 0, 0, PANEL_W, PANEL_H)
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('图片导出失败'))), 'image/png')
  })
}

export function svgDataUrl(svg: string) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

/* ---------------- 云端文件存储 ---------------- */

export async function uploadPng(path: string, blob: Blob) {
  const res = await cloud.storage.upload(path, blob, {
    contentType: 'image/png',
    cacheControl: '86400',
    upsert: true,
  })
  if (res.error) throw new Error(res.error.message || '图片上传失败')
  return res.data
}

export async function downloadBlob(path: string): Promise<Blob> {
  const res = await cloud.storage.download(path)
  if (res.error || !res.data) throw new Error(res.error?.message || '图片下载失败')
  return res.data as Blob
}

type CacheEntry = { url: string; exp: number }
const urlCache = new Map<string, CacheEntry>()

export async function getSignedUrl(path: string): Promise<string> {
  if (!path) return ''
  const hit = urlCache.get(path)
  if (hit && hit.exp > Date.now() + 60_000) return hit.url
  const { data, error } = await cloud.storage.createSignedUrl(path, 3000)
  if (error || !data?.signedUrl) throw new Error(error?.message || '图片地址获取失败')
  urlCache.set(path, { url: data.signedUrl, exp: Date.now() + 3000_000 })
  return data.signedUrl
}

export async function getSignedUrls(paths: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  const need: string[] = []
  for (const p of paths) {
    if (!p) continue
    const hit = urlCache.get(p)
    if (hit && hit.exp > Date.now() + 60_000) out[p] = hit.url
    else need.push(p)
  }
  if (need.length === 1) {
    try {
      out[need[0]] = await getSignedUrl(need[0])
    } catch {
      /* 单张失败不影响其他格 */
    }
    return out
  }
  if (need.length > 1) {
    try {
      const res = await cloud.storage.createSignedUrls(need, 3000)
      const arr = (res.data || []) as any[]
      arr.forEach((item, i) => {
        const u = item?.signedUrl || item?.signedURL
        const p = item?.path || need[i]
        if (u && p) {
          out[p] = u
          urlCache.set(p, { url: u, exp: Date.now() + 3000_000 })
        }
      })
    } catch {
      /* 批量失败时逐张降级 */
    }
    for (const p of need) {
      if (out[p]) continue
      try {
        out[p] = await getSignedUrl(p)
      } catch {
        /* 忽略，页面显示占位 */
      }
    }
  }
  return out
}

export function clearUrlCache(path?: string) {
  if (path) urlCache.delete(path)
  else urlCache.clear()
}

export function uid4() {
  return Math.random().toString(36).slice(2, 8)
}
