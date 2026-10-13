/* WorkToon Service Worker
 * 策略要点（都为了同一件事：永远不要给用户一个旧版本的页面）：
 * 1. HTML 一律走网络，只有在完全离线时才回落缓存 —— 页面骨架绝不被缓存钉住。
 * 2. 带 hash 的静态资源（assets/index-xxxx.js 等）是不可变的，可以放心缓存加速。
 * 3. /.cloud/ 是后端接口，绝不拦截。
 * 4. 缓存名带版本号；新 SW 立刻接管并清掉旧缓存，避免历史版本残留。
 */
const CACHE = 'worktoon-v3'
const OFFLINE_KEEP = ['./manifest.webmanifest', './icon.svg', './icon-180.png', './icon-192.png']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(OFFLINE_KEEP))
      .catch(() => {}),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('message', (e) => {
  if (e.data === 'skip-waiting') self.skipWaiting()
})

function isHtml(req, url) {
  if (req.mode === 'navigate' || req.destination === 'document') return true
  return /\.html?$/i.test(url.pathname) || url.pathname === '/' || url.pathname.endsWith('/')
}

function isImmutableAsset(url) {
  return /\/assets\/[^/]+-[A-Za-z0-9_-]{6,}\.(js|css|woff2?|png|jpe?g|svg|webp)$/i.test(url.pathname)
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.includes('/.cloud/')) return

  // HTML：网络优先，且缓存里不留 HTML
  if (isHtml(req, url)) {
    event.respondWith(
      fetch(req).catch(async () => {
        const hit = await caches.match(req)
        return hit || Response.error()
      }),
    )
    return
  }

  // 不可变资源：缓存优先
  if (isImmutableAsset(url)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res && res.ok) {
              const copy = res.clone()
              caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
            }
            return res
          }),
      ),
    )
    return
  }

  // 其它同源 GET（图标、清单等）：网络优先，失败回落缓存
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
        }
        return res
      })
      .catch(() => caches.match(req).then((hit) => hit || Response.error())),
  )
})
