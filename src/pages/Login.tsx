import React, { useState } from 'react'
import { cloud, errText } from '../lib/cloud'
import { useStore } from '../lib/store'
import { Icon } from '../components/ui'
import { APP_CN, APP_NAME } from '../lib/config'

type Tab = 'phone' | 'email'

export default function Login() {
  const { toast, setSession, refreshProfile, refreshComics } = useStore()
  const [tab, setTab] = useState<Tab>('phone')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [pwd, setPwd] = useState('')
  const [phoneErr, setPhoneErr] = useState('')
  const [sent, setSent] = useState<null | { v: string; id: string; exist: boolean; to: string }>(null)
  const [busy, setBusy] = useState(false)
  const [count, setCount] = useState(0)

  const tick = () => {
    setCount(60)
    const t = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(t)
          return 0
        }
        return c - 1
      })
    }, 1000)
  }

  const afterLogin = async () => {
    const s = await cloud.auth.getSession()
    setSession(s?.data ?? null)
    await refreshProfile()
    await refreshComics()
    toast('欢迎回来')
  }

  const sendCode = async () => {
    if (busy) return
    setBusy(true)
    try {
      if (tab === 'phone') {
        if (!/^1\d{10}$/.test(phone)) {
          setPhoneErr('请输入正确的 11 位手机号')
          return
        }
        setPhoneErr('')
        const r = await cloud.auth.sendOtp({ phone })
        if (r.error) {
          toast(errText(r.error, '验证码发送失败'), 'err')
          return
        }
        setSent({ v: 'phone', id: r.data.verificationId, exist: r.data.isExistingUser, to: phone })
      } else {
        if (!/^\S+@\S+\.\S+$/.test(email)) {
          toast('请输入正确的邮箱地址', 'err')
          return
        }
        const r = await cloud.auth.sendOtp({ email })
        if (r.error) {
          toast(errText(r.error, '验证码发送失败'), 'err')
          return
        }
        setSent({ v: 'email', id: r.data.verificationId, exist: r.data.isExistingUser, to: email })
      }
      tick()
      toast('验证码已发送')
    } catch (e: any) {
      toast(errText(e, '验证码发送失败'), 'err')
    } finally {
      setBusy(false)
    }
  }

  const submit = async () => {
    if (busy) return
    if (!sent) {
      toast('请先获取验证码', 'err')
      return
    }
    const to = tab === 'phone' ? phone : email
    if (sent.to !== to) {
      toast('手机号/邮箱已变更，请重新获取验证码', 'err')
      return
    }
    if (code.trim().length < 4) {
      toast('请输入验证码', 'err')
      return
    }
    setBusy(true)
    try {
      const base: any = {
        verificationId: sent.id,
        isExistingUser: sent.exist,
        token: code.trim(),
      }
      if (tab === 'phone') base.phone = to
      else {
        base.email = to
        if (!sent.exist) {
          if (pwd.length < 8) {
            toast('新用户请设置至少 8 位密码', 'err')
            return
          }
          base.password = pwd
        }
      }
      const r = await cloud.auth.verifyOtp(base)
      if (r.error) {
        toast(errText(r.error, '验证码不正确'), 'err')
        return
      }
      await afterLogin()
    } catch (e: any) {
      toast(errText(e, '登录失败'), 'err')
    } finally {
      setBusy(false)
    }
  }

  const wechat = async () => {
    if (busy) return
    setBusy(true)
    try {
      const r = await cloud.auth.signInWithOAuth({ provider: 'wechat', redirectTo: location.origin })
      if (r.error) {
        toast(errText(r.error, '微信登录暂不可用'), 'err')
        return
      }
      location.assign((r.data as any).url)
    } catch (e: any) {
      toast(errText(e, '微信登录暂不可用'), 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <div className="brand" style={{ justifyContent: 'center' }}>
          <div className="brand-mark">
            <i /><i /><i /><i />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div className="brand-name">Work<em>Toon</em></div>
            <div className="brand-cn">{APP_CN}</div>
          </div>
        </div>
        <svg className="hero-art" viewBox="0 0 300 190" fill="none" style={{ marginTop: 14 }}>
          <rect x="10" y="14" width="128" height="150" rx="14" fill="#fff" stroke="#E9E1D5" strokeWidth="2" />
          <rect x="150" y="14" width="140" height="70" rx="14" fill="#FBE6D1" stroke="#E9E1D5" strokeWidth="2" />
          <rect x="150" y="94" width="140" height="70" rx="14" fill="#ECE8FB" stroke="#E9E1D5" strokeWidth="2" />
          <circle cx="72" cy="74" r="26" fill="#F6D6B8" />
          <path d="M44 70q28-32 56 0" fill="#6B4F3A" />
          <path d="M40 150q34-40 68 0z" fill="#A8C3A0" />
          <circle cx="60" cy="76" r="3" fill="#2B2620" />
          <circle cx="86" cy="76" r="3" fill="#2B2620" />
          <path d="M62 92q14 10 26 0" stroke="#2B2620" strokeWidth="3" fill="none" strokeLinecap="round" />
          <rect x="168" y="34" width="104" height="8" rx="4" fill="#E8813A" opacity="0.55" />
          <rect x="168" y="52" width="76" height="8" rx="4" fill="#9D938A" opacity="0.5" />
          <rect x="168" y="114" width="104" height="8" rx="4" fill="#7C6BD6" opacity="0.5" />
          <rect x="168" y="132" width="64" height="8" rx="4" fill="#9D938A" opacity="0.5" />
          <path d="M232 150l6 14 14 6-14 6-6 14-6-14-14-6 14-6z" fill="#E8813A" opacity="0.7" />
        </svg>
        <div style={{ fontSize: 13.5, color: 'var(--ink-2)', maxWidth: 280, margin: '0 auto' }}>
          每天 1 分钟记录工作，剩下的交给 AI —— 生成属于你的 4~8 格工作日志漫画。
        </div>
      </div>

      <div className="card">
        <div className="seg" style={{ marginBottom: 14 }}>
          <button className={tab === 'phone' ? 'on' : ''} onClick={() => { setTab('phone'); setSent(null); setCode('') }}>
            手机号登录
          </button>
          <button className={tab === 'email' ? 'on' : ''} onClick={() => { setTab('email'); setSent(null); setCode('') }}>
            邮箱登录
          </button>
        </div>

        <div className="stack">
          <div className="field">
            <div className="label">{tab === 'phone' ? '手机号' : '邮箱'}</div>
            <input
              className="input"
              inputMode={tab === 'phone' ? 'numeric' : 'email'}
              placeholder={tab === 'phone' ? '请输入 11 位手机号' : 'you@example.com'}
              value={tab === 'phone' ? phone : email}
              onChange={(e) => {
                if (tab === 'phone') {
                  setPhone(e.target.value)
                  if (phoneErr) setPhoneErr('')
                } else setEmail(e.target.value)
              }}
            />
            {tab === 'phone' && phoneErr ? <div className="hint" style={{ color: 'var(--danger)' }}>{phoneErr}</div> : null}
          </div>

          <div className="field">
            <div className="label">验证码</div>
            <div className="row" style={{ gap: 8 }}>
              <input
                className="input"
                inputMode="numeric"
                placeholder="6 位验证码"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                style={{ flex: 1 }}
              />
              <button className="btn btn-ghost" onClick={sendCode} disabled={busy || count > 0} style={{ flex: 'none', minWidth: 104 }}>
                {count > 0 ? `${count}s` : sent ? '重发' : '获取验证码'}
              </button>
            </div>
          </div>

          {tab === 'email' && sent && !sent.exist ? (
            <div className="field">
              <div className="label">设置密码</div>
              <input
                className="input"
                type="password"
                placeholder="新用户需设置至少 8 位密码"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
              />
            </div>
          ) : null}

          <button className="btn btn-primary btn-block" onClick={submit} disabled={busy}>
            {busy ? <span className="spin" /> : null}
            {sent && sent.exist ? '登录' : '注册并登录'}
          </button>

          <div className="row" style={{ gap: 10 }}>
            <div className="divider" style={{ flex: 1 }} />
            <span className="hint">或</span>
            <div className="divider" style={{ flex: 1 }} />
          </div>

          <button className="btn btn-ghost btn-block" onClick={wechat} disabled={busy}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 4c-3.9 0-7 2.5-7 5.6 0 1.8 1.1 3.4 2.8 4.4L4.2 16l2.6-1.3c.7.2 1.4.3 2.2.3h.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              <path d="M22 14.4c0-3-2.9-5.4-6.5-5.4S9 11.4 9 14.4c0 3 2.9 5.4 6.5 5.4.8 0 1.6-.1 2.3-.3l2.3 1.1-.6-1.9c1.3-.9 2.1-2.3 2.1-3.9Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              <circle cx="6.5" cy="9" r=".9" fill="currentColor" />
              <circle cx="12.5" cy="9" r=".9" fill="currentColor" />
              <circle cx="13.5" cy="14" r=".8" fill="currentColor" />
              <circle cx="18" cy="14" r=".8" fill="currentColor" />
            </svg>
            微信登录
          </button>

          <div className="hint" style={{ textAlign: 'center', lineHeight: 1.6 }}>
            登录即表示你同意：你的工作日志仅本人可见，默认不公开、不分享。
          </div>
        </div>
      </div>

      <div className="hint" style={{ textAlign: 'center', marginTop: 16 }}>
        {APP_NAME} · {APP_CN}
      </div>
    </div>
  )
}
