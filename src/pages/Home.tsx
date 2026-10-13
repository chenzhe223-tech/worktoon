import React, { useEffect, useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { Icon, Empty } from '../components/ui'
import { useImageUrls } from '../lib/useImages'
import { ART_STYLE_MAP, GENRE_MAP } from '../lib/art'
import { todayStr, DEFAULT_PROFILE } from '../lib/data'
import * as GEN from '../lib/generate'
import type { Comic } from '../lib/types'

function streakOf(dates: string[]) {
  const set = new Set(dates)
  let n = 0
  const d = new Date()
  // 今天没记录时，从昨天开始算，避免把连续天数清零
  if (!set.has(todayStr(d))) d.setDate(d.getDate() - 1)
  for (let i = 0; i < 400; i++) {
    const s = todayStr(d)
    if (!set.has(s)) break
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}

export default function Home({ go }: { go: (h: string) => void }) {
  const { comics, profile, session, refreshComics } = useStore()
  const today = todayStr()
  const [, force] = useState(0)

  useEffect(() => {
    const un = GEN.subscribe(() => force((x) => x + 1))
    return () => {
      un()
    }
  }, [])

  useEffect(() => {
    refreshComics()
    // 恢复未完成的生成任务
    comics
      .filter((c) => ['draft', 'partial', 'failed', 'drawing', 'understanding', 'storyboarding'].includes(c.status))
      .forEach((c) => {
        if (!GEN.isRunning(c.id)) GEN.resumeIfNeeded(c, profile.hero || DEFAULT_PROFILE.hero).catch(() => {})
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  const todayComic = comics.find((c) => c.entry_date === today)
  const recent = useMemo(() => comics.slice(0, 6), [comics])
  const streak = useMemo(() => streakOf(comics.map((c) => c.entry_date)), [comics])

  const last7 = useMemo(() => {
    const out: { d: string; label: string; has: boolean; id?: number }[] = []
    const map = new Map<string, Comic>()
    comics.forEach((c) => {
      if (!map.has(c.entry_date)) map.set(c.entry_date, c)
    })
    const base = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(base)
      d.setDate(d.getDate() - i)
      const s = todayStr(d)
      const c = map.get(s)
      out.push({
        d: s,
        label: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()],
        has: !!c,
        id: c?.id,
      })
    }
    return out
  }, [comics])

  const paths = recent.map((c) => c.cover_path).filter(Boolean)
  const urls = useImageUrls(paths)

  const running = comics.find((c) => GEN.isRunning(c.id))
  const genState = running ? GEN.getState(running.id) : undefined

  return (
    <div className="page">
      <div className="page-head">
        <div className="brand">
          <div className="brand-mark">
            <i /><i /><i /><i />
          </div>
          <div>
            <div className="brand-name">Work<em>Toon</em></div>
            <div className="brand-cn">工作日志漫画</div>
          </div>
        </div>
        <div className="spacer" />
        <button className="btn btn-ghost btn-xs" onClick={() => go('collection')}>
          <Icon.Search style={{ width: 15, height: 15 }} />
          找作品
        </button>
      </div>

      <div style={{ height: 8 }} />

      <div className="card">
        <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.35 }}>
          今天的故事，
          <br />
          准备好了吗？
        </div>
        <div className="hint" style={{ marginTop: 6 }}>
          {todayComic ? '今天已经有一篇漫画了，可以继续修改或重画。' : '花 1 分钟写下今天做了什么，剩下的交给我。'}
        </div>
        <div style={{ height: 14 }} />
        {todayComic ? (
          <div className="row" style={{ gap: 10 }}>
            <button className="btn btn-accent" style={{ flex: 1 }} onClick={() => go(`comic/${todayComic.id}`)}>
              <Icon.Book style={{ width: 17, height: 17 }} />
              看今天的漫画
            </button>
            <button className="btn btn-ghost" style={{ flex: 'none' }} onClick={() => go('create')}>
              <Icon.Edit style={{ width: 16, height: 16 }} />
              再写一篇
            </button>
          </div>
        ) : (
          <button className="btn btn-accent btn-block" onClick={() => go('create')}>
            <Icon.Plus style={{ width: 18, height: 18 }} />
            {comics.length ? '创作今天的漫画' : '开始第一篇漫画'}
          </button>
        )}
      </div>

      {running && genState ? (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="row">
            <span className="dot-pulse"><i /><i /><i /></span>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{genState.label}</div>
          </div>
          <div style={{ height: 10 }} />
          <div className="progress">
            <i style={{ width: `${genState.percent}%` }} />
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <span className="hint">
              {genState.done}/{genState.total || '—'} 格
            </span>
            <div className="spacer" />
            <button className="btn btn-ghost btn-xs" onClick={() => go(`gen/${running.id}`)}>
              查看进度
            </button>
          </div>
        </div>
      ) : null}

      <div style={{ height: 14 }} />
      <div className="stats">
        <div className="stat">
          <div className="stat-num mono-num">{streak}<em>天</em></div>
          <div className="stat-label">连续记录</div>
        </div>
        <div className="stat">
          <div className="stat-num mono-num">{comics.length}<em>篇</em></div>
          <div className="stat-label">累计漫画</div>
        </div>
        <div className="stat">
          <div className="stat-num mono-num">{comics.filter((c) => c.favorite).length}<em>篇</em></div>
          <div className="stat-label">收藏作品</div>
        </div>
      </div>

      <div style={{ height: 20 }} />
      <div className="section-title">
        <Icon.Calendar style={{ width: 17, height: 17 }} />
        最近 7 天
      </div>
      <div style={{ height: 10 }} />
      <div className="week">
        {last7.map((d) => (
          <button
            key={d.d}
            className="week-day"
            onClick={() => (d.id ? go(`comic/${d.id}`) : go('create'))}
            style={{ background: 'none', border: 'none', padding: 0 }}
          >
            <div className={`week-dot ${d.has ? 'on' : ''} ${d.d === today && !d.has ? 'today' : ''}`}>
              {d.has ? <Icon.Check style={{ width: 16, height: 16 }} /> : Number(d.d.slice(-2))}
            </div>
            <div className="week-label">{d.label}</div>
          </button>
        ))}
      </div>

      <div style={{ height: 22 }} />
      <div className="row">
        <div className="section-title">
          <Icon.Book style={{ width: 17, height: 17 }} />
          最近创作
        </div>
        <div className="spacer" />
        {comics.length ? (
          <button className="btn btn-ghost btn-xs" onClick={() => go('collection')}>
            全部
            <Icon.Chevron style={{ width: 14, height: 14 }} />
          </button>
        ) : null}
      </div>
      <div style={{ height: 10 }} />

      {recent.length === 0 ? (
        <div className="card-soft">
          <Empty
            text="还没有作品。写下今天的第一条工作记录，看看它会变成什么样的漫画。"
            action={
              <button className="btn btn-accent btn-sm" onClick={() => go('create')}>
                <Icon.Plus style={{ width: 15, height: 15 }} />
                开始创作
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid">
          {recent.map((c) => (
            <button
              key={c.id}
              style={{ padding: 0, border: 'none', background: 'none', textAlign: 'left' }}
              onClick={() => go(`comic/${c.id}`)}
            >
              <div className="cover">
                {c.cover_path && urls[c.cover_path] ? (
                  <img src={urls[c.cover_path]} alt={c.title} loading="lazy" />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'grid',
                      placeItems: 'center',
                      background: 'var(--paper-2)',
                      color: 'var(--ink-3)',
                      fontSize: 12,
                    }}
                  >
                    {c.status === 'completed' ? '暂无封面' : '生成中'}
                  </div>
                )}
                {c.favorite ? <div className="cover-badge">★</div> : null}
                <div className="cover-meta">
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                  <div className="cover-date">
                    {c.entry_date} · {ART_STYLE_MAP[c.style]?.name || c.style}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <div style={{ height: 8 }} />
      <div className="hint" style={{ textAlign: 'center', paddingBottom: 8 }}>
        默认画风：{ART_STYLE_MAP[profile.default_style]?.name || '日系治愈手绘风'} ·{' '}
        {GENRE_MAP[profile.default_genre]?.name || 'AI 自动匹配'}
      </div>
    </div>
  )
}
