import React, { useEffect, useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { Icon, Loading } from '../components/ui'
import * as DB from '../lib/data'
import * as GEN from '../lib/generate'
import { errText } from '../lib/cloud'
import { ART_STYLE_MAP, GENRE_MAP, TONE_MAP } from '../lib/art'
import type { Comic } from '../lib/types'

export default function Generating({ go, id }: { go: (h: string) => void; id: number }) {
  const { toast, refreshComics, profile } = useStore()
  const [comic, setComic] = useState<Comic | null>(null)
  const [tick, setTick] = useState(0)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => GEN.subscribe(() => setTick((x) => x + 1)), [])

  useEffect(() => {
    let alive = true
    DB.getComic(id)
      .then((c) => alive && setComic(c))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [id, tick])

  const st = GEN.getState(id)
  const running = GEN.isRunning(id)

  useEffect(() => {
    if (!comic) return
    if (!running && ['draft', 'partial', 'failed', 'drawing', 'understanding', 'storyboarding'].includes(comic.status)) {
      // 页面重新进入：恢复状态，但不重复启动
      GEN.resumeIfNeeded(comic, profile.hero).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comic?.id, comic?.status, running])

  const percent = st?.percent ?? (comic?.status === 'completed' ? 100 : 6)
  const stageIdx = st?.stage ?? 0
  const done = comic?.status === 'completed'

  const steps = useMemo(() => GEN.STAGES.map((s, i) => ({ text: s, i })), [])

  const retry = async () => {
    if (!comic) return
    setBusy(true)
    setErr('')
    try {
      await GEN.resumeIfNeeded(comic, profile.hero)
    } catch (e: any) {
      setErr(errText(e, '重试失败'))
    } finally {
      setBusy(false)
    }
  }

  if (!comic) return <Loading text="正在准备你的漫画" />

  return (
    <div className="page">
      <div className="page-head">
        <button className="btn btn-ghost btn-xs" onClick={() => go('home')}>
          <Icon.Close style={{ width: 15, height: 15 }} />
          回到首页
        </button>
        <div className="page-title">生成中</div>
      </div>

      <div className="stack" style={{ marginTop: 10 }}>
        <div className="card">
          <div className="row">
            {done ? (
              <Icon.Check style={{ width: 18, height: 18, color: 'var(--teal)' }} />
            ) : (
              <span className="dot-pulse"><i /><i /><i /></span>
            )}
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              {done ? '今日漫画已装订完成' : st?.label || GEN.STAGES[0]}
            </div>
          </div>
          <div style={{ height: 12 }} />
          <div className="progress">
            <i style={{ width: `${percent}%` }} />
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <span className="hint mono-num">
              {Math.round(percent)}%
              {st?.total ? ` · ${st.done}/${st.total} 格` : ''}
            </span>
            <div className="spacer" />
            {running ? (
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => {
                  GEN.cancel(id)
                  toast('已取消，已完成的画面会保留')
                }}
              >
                取消生成
              </button>
            ) : null}
          </div>
        </div>

        <div className="card-soft">
          {steps.map((s) => {
            const cur = !done && s.i === stageIdx
            const passed = done || s.i < stageIdx
            return (
              <div key={s.i} className="row" style={{ padding: '6px 0', opacity: cur || passed ? 1 : 0.4 }}>
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    background: passed ? 'var(--teal)' : cur ? 'var(--orange)' : 'var(--paper)',
                    color: passed || cur ? '#fff' : 'var(--ink-3)',
                    border: '1px solid var(--line)',
                    flex: 'none',
                  }}
                >
                  {passed ? '✓' : s.i + 1}
                </span>
                <span style={{ fontSize: 13.5, fontWeight: cur ? 700 : 500 }}>{s.text}</span>
              </div>
            )
          })}
        </div>

        <div className="card">
          <div className="row" style={{ gap: 8, marginBottom: 6 }}>
            <span className="pill pill-orange">{ART_STYLE_MAP[comic.style]?.name || comic.style}</span>
            <span className="pill pill-purple">{GENRE_MAP[comic.genre]?.name || '日常纪实'}</span>
            <span className="pill">{comic.panel_length} 格</span>
            <span className="pill">{TONE_MAP[comic.tone]?.name || ''}</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{comic.title}</div>
          <div className="hint" style={{ marginTop: 4 }}>{comic.entry_date}</div>
          {comic.summary ? (
            <div className="narration" style={{ marginTop: 10 }}>{comic.summary}</div>
          ) : null}
        </div>

        {err || st?.error || comic.error_message ? (
          <div className="card" style={{ borderColor: 'var(--danger)' }}>
            <div style={{ fontWeight: 700, color: 'var(--danger)', fontSize: 14 }}>
              {err || st?.error || comic.error_message}
            </div>
            <div className="hint" style={{ marginTop: 4 }}>
              原始工作日志和已生成的分镜都已保留，可以只重试失败的部分。
            </div>
            <div style={{ height: 10 }} />
            <div className="row" style={{ gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => go(`comic/${id}`)}>
                先看已完成的
              </button>
              <button className="btn btn-accent" style={{ flex: 1 }} disabled={busy} onClick={retry}>
                {busy ? <span className="spin" /> : <Icon.Refresh style={{ width: 16, height: 16 }} />}
                重试
              </button>
            </div>
          </div>
        ) : null}

        {done ? (
          <button
            className="btn btn-accent btn-block"
            onClick={() => {
              refreshComics()
              go(`comic/${id}`)
            }}
          >
            <Icon.Book style={{ width: 18, height: 18 }} />
            阅读今日漫画
          </button>
        ) : (
          <button className="btn btn-ghost btn-block" onClick={() => go(`comic/${id}`)}>
            边生成边看已完成的分镜
          </button>
        )}
      </div>
    </div>
  )
}
