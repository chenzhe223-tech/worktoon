import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { StoreProvider } from './lib/store'
import './styles.css'

/* 把带时间戳的地址栏还原成干净的根路径（真身由引导页跳转而来，URL 带 ?t=...） */
try {
  if (location.search) {
    const clean = (location.pathname || '/').replace(/app\.html$/i, '') || '/'
    history.replaceState(null, '', clean + (location.hash || ''))
  }
} catch {
  /* 某些内嵌浏览器禁止改地址，忽略即可 */
}

/* 兜底：任何未捕获的异常都只进控制台，绝不把英文技术报错甩到界面上 */
window.addEventListener('unhandledrejection', (e) => {
  console.warn('[WorkToon] 未处理的异步错误', e?.reason)
})
window.addEventListener('error', (e) => {
  console.warn('[WorkToon] 未捕获的错误', e?.message || e)
})

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        // 有新版本立刻接管，避免用户被钉在旧页面上
        reg.update?.().catch(() => {})
      })
      .catch(() => {
        /* 离线能力是渐进增强，失败不影响主功能 */
      })
  })
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </React.StrictMode>,
)
