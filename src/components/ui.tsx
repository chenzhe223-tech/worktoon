import React, { useEffect } from 'react'
import { useStore } from '../lib/store'

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export const Icon = {
  Home: (p: any) => (
    <svg viewBox="0 0 24 24" {...S} {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9.5 21v-6h5v6" /></svg>
  ),
  Plus: (p: any) => (
    <svg viewBox="0 0 24 24" {...S} {...p}><path d="M12 5v14M5 12h14" /></svg>
  ),
  Book: (p: any) => (
    <svg viewBox="0 0 24 24" {...S} {...p}><path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v18H5.5A1.5 1.5 0 0 1 4 19.5z" /><path d="M8 3v18" /><path d="M12 8h6M12 12h6" /></svg>
  ),
  User: (p: any) => (
    <svg viewBox="0 0 24 24" {...S} {...p}><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20.5c1.4-3.6 4-5.4 7.5-5.4s6.1 1.8 7.5 5.4" /></svg>
  ),
  Star: (p: any) => (
    <svg viewBox="0 0 24 24" {...S} {...p}><path d="m12 3.6 2.6 5.4 5.9.8-4.3 4.1 1.1 5.8-5.3-2.9-5.3 2.9 1.1-5.8L3.5 9.8l5.9-.8z" /></svg>
  ),
  Trash: (p: any) => (
    <svg viewBox="0 0 24 24" {...S} {...p}><path d="M4 6.5h16M9.5 6.5V4.8h5v1.7" /><path d="M6.5 6.5 7.4 20h9.2l.9-13.5" /><path d="M10.2 10v6M13.8 10v6" /></svg>
  ),
  Refresh: (p: any) => (
    <svg viewBox="0 0 24 24" {...S} {...p}><path d="M20 12a8 8 0 1 1-2.6-5.9" /><path d="M20 4.5V10h-5.4" /></svg>
  ),
  Download: (p: any) => (
    <svg viewBox="0 0 24 24" {...S} {...p}><path d="M12 3.5v11" /><path d="m7.5 10.5 4.5 4.5 4.5-4.5" /><path d="M4.5 20h15" /></svg>
  ),
  Share: (p: any) => (
    <svg viewBox="0 0 24 24" {...S} {...p}><circle cx="18" cy="5.5" r="2.6" /><circle cx="6" cy="12" r="2.6" /><circle cx="18" cy="18.5" r="2.6" /><path d="m8.3 10.8 7.4-4M8.3 13.2l7.4 4" /></svg>
  ),
  Edit: (p: any) => (
    <svg viewBox="0 0 24 24" {...S} {...p}><path d="M4 20h4l10-10-4-4L4 16z" /><path d="m14.5 5.5 4 4" /></svg>
  ),
  Close: (p: any) => (
    <svg viewBox="0 0 24 24" {...S} {...p}><path d="m6 6 12 12M18 6 6 18" /></svg>
  ),
  Chevron: (p: any) => (
    <svg viewBox="0 0 24 24" {...S} {...p}><path d="m9 5 7 7-7 7" /></svg>
  ),
  Sparkle: (p: any) => (
    <svg viewBox="0 0 24 24" {...S} {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><path d="m6.5 6.5 2.5 2.5M15 15l2.5 2.5M17.5 6.5 15 9M9 15l-2.5 2.5" /></svg>
  ),
  Search: (p: any) => (
    <svg viewBox="0 0 24 24" {...S} {...p}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
  ),
  Calendar: (p: any) => (
    <svg viewBox="0 0 24 24" {...S} {...p}><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></svg>
  ),
  Brush: (p: any) => (
    <svg viewBox="0 0 24 24" {...S} {...p}><path d="M17 3.5 21 7.5 10.5 18 5 19.5 6.5 14z" /><path d="M9 8.5 15.5 15" /></svg>
  ),
  Check: (p: any) => (
    <svg viewBox="0 0 24 24" {...S} {...p}><path d="m5 12.5 4.5 4.5L19 7" /></svg>
  ),
  Undo: (p: any) => (
    <svg viewBox="0 0 24 24" {...S} {...p}><path d="M4 9h10a5.5 5.5 0 1 1 0 11H8" /><path d="m8 4.5-4 4.5 4 4.5" /></svg>
  ),
  Copy: (p: any) => (
    <svg viewBox="0 0 24 24" {...S} {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M15 6.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h.5" /></svg>
  ),
}

export function Toasts() {
  const { toasts } = useStore()
  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind === 'err' ? 'err' : ''}`}>
          {t.text}
        </div>
      ))}
    </div>
  )
}

export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title?: string
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="mask" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="sheet-bar" />
        <div className="row" style={{ marginBottom: 10 }}>
          <div className="sheet-title">{title}</div>
          <div className="spacer" />
          <button className="btn btn-ghost btn-xs" onClick={onClose} aria-label="关闭">
            <Icon.Close style={{ width: 16, height: 16 }} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Confirm({
  open,
  title,
  desc,
  okText = '确认',
  danger,
  onOk,
  onCancel,
}: {
  open: boolean
  title: string
  desc?: string
  okText?: string
  danger?: boolean
  onOk: () => void
  onCancel: () => void
}) {
  if (!open) return null
  return (
    <div className="mask" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="sheet" style={{ paddingBottom: 'calc(20px + var(--safe-b))' }}>
        <div className="sheet-bar" />
        <div className="sheet-title">{title}</div>
        {desc ? <div className="hint" style={{ marginBottom: 16 }}>{desc}</div> : <div style={{ height: 10 }} />}
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>
            取消
          </button>
          <button
            className="btn"
            style={{ flex: 1, background: danger ? 'var(--danger)' : 'var(--ink)', color: '#fff' }}
            onClick={onOk}
          >
            {okText}
          </button>
        </div>
      </div>
    </div>
  )
}

export function Empty({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="empty">
      <svg width="86" height="66" viewBox="0 0 86 66" fill="none">
        <rect x="4" y="8" width="34" height="42" rx="6" fill="#F4EEE4" stroke="#E9E1D5" strokeWidth="2" />
        <rect x="48" y="8" width="34" height="20" rx="6" fill="#FBE6D1" stroke="#E9E1D5" strokeWidth="2" />
        <rect x="48" y="34" width="34" height="16" rx="6" fill="#ECE8FB" stroke="#E9E1D5" strokeWidth="2" />
        <circle cx="21" cy="26" r="7" fill="#E8813A" opacity="0.35" />
        <path d="M11 44q10-9 20 0" stroke="#9D938A" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
      <div style={{ marginBottom: action ? 12 : 0 }}>{text}</div>
      {action}
    </div>
  )
}

export function Loading({ text }: { text?: string }) {
  return (
    <div className="row" style={{ justifyContent: 'center', padding: 18, color: 'var(--ink-3)', gap: 8 }}>
      <span className="dot-pulse">
        <i /><i /><i />
      </span>
      {text ? <span style={{ fontSize: 13 }}>{text}</span> : null}
    </div>
  )
}
