import React, { useEffect, useState } from 'react'
import { useStore } from './lib/store'
import { Toasts, Icon } from './components/ui'
import Home from './pages/Home'
import Create from './pages/Create'
import ComicSettings from './pages/ComicSettings'
import Generating from './pages/Generating'
import Reader from './pages/Reader'
import Collection from './pages/Collection'
import Me from './pages/Me'
import Login from './pages/Login'
import { tryLeave } from './lib/guard'

export function useHashRoute(): { path: string[]; raw: string; go: (h: string) => void } {
  const [raw, setRaw] = useState(() => (location.hash || '#/home').replace(/^#\/?/, ''))
  useEffect(() => {
    const on = () => setRaw((location.hash || '#/home').replace(/^#\/?/, ''))
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const go = (h: string) => {
    location.hash = h.startsWith('#') ? h : `#/${h}`
  }
  return { path: raw.split('/').filter(Boolean), raw, go }
}

const NAV = [
  { key: 'home', label: '首页', Icon: Icon.Home },
  { key: 'create', label: '创作', Icon: Icon.Plus },
  { key: 'collection', label: '漫画集', Icon: Icon.Book },
  { key: 'me', label: '我的', Icon: Icon.User },
]

export default function App() {
  const { booted, session } = useStore()
  const { path, go: rawGo } = useHashRoute()
  const go = (h: string) => {
    if (!tryLeave(h)) return
    rawGo(h)
  }
  const page = path[0] || 'home'
  const showNav = ['home', 'create', 'collection', 'me'].includes(page)

  if (!booted) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="brand" style={{ justifyContent: 'center', marginBottom: 10 }}>
            <div className="brand-mark">
              <i /><i /><i /><i />
            </div>
            <div>
              <div className="brand-name">Work<em>Toon</em></div>
              <div className="brand-cn">工作日志漫画</div>
            </div>
          </div>
          <div className="dot-pulse" style={{ justifyContent: 'center' }}>
            <i /><i /><i />
          </div>
        </div>
      </div>
    )
  }

  /* 未登录分支也必须挂 Toasts：否则登录页上的全部错误提示（无效邮箱、未取验证码、
     验证码发送失败、登录失败、微信登录不可用）都会静默丢失 —— 用户只会看到「点了没反应」。*/
  if (!session)
    return (
      <>
        <Login />
        <Toasts />
      </>
    )

  return (
    <div className="app-shell">
      {page === 'home' && <Home go={go} />}
      {page === 'create' && <Create go={go} />}
      {page === 'settings' && <ComicSettings go={go} />}
      {page === 'gen' && <Generating go={go} id={Number(path[1] || 0)} />}
      {page === 'comic' && <Reader go={go} id={Number(path[1] || 0)} />}
      {page === 'collection' && <Collection go={go} />}
      {page === 'me' && <Me go={go} />}

      {showNav && (
        <nav className="nav">
          <div className="nav-inner">
            {NAV.map((n) => {
              const IconC = n.Icon
              const on = page === n.key
              return (
                <button key={n.key} className={`nav-item ${on ? 'on' : ''}`} onClick={() => go(n.key)}>
                  <IconC />
                  <span>{n.label}</span>
                </button>
              )
            })}
          </div>
        </nav>
      )}
      <Toasts />
    </div>
  )
}
