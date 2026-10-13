import React, { useEffect, useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { Icon, Empty, Sheet } from '../components/ui'
import { useImageUrls } from '../lib/useImages'
import { ART_STYLES, ART_STYLE_MAP, GENRES, GENRE_MAP, thumbOf } from '../lib/art'
import { todayStr } from '../lib/data'
import type { Comic } from '../lib/types'

function ym(s: string) {
  return s.slice(0, 7)
}

export default function Collection({ go }: { go: (h: string) => void }) {
  const { comics, refreshComics, toast } = useStore()
  const [view, setView] = useState<'grid' | 'list' | 'cal'>('grid')
  const [q, setQ] = useState('')
  const [month, setMonth] = useState(() => todayStr().slice(0, 7))
  const [filter, setFilter] = useState<null | 'style' | 'genre'>(null)
  const [fStyle, setFStyle] = useState('')
  const [fGenre, setFGenre] = useState('')
  const [favOnly, setFavOnly] = useState(false)

  useEffect(() => {
    refreshComics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const months = useMemo(() => Array.from(new Set(comics.map((c) => ym(c.entry_date)))).sort().reverse(), [comics])

  const filtered = useMemo(() => {
    let list = comics
    if (view === 'cal') list = list.filter((c) => ym(c.entry_date) === month)
    if (favOnly) list = list.filter((c) => c.favorite)
    if (fStyle) list = list.filter((c) => c.style === fStyle)
    if (fGenre) list = list.filter((c) => c.genre === fGenre)
    const k = q.trim().toLowerCase()
    if (k) {
      list = list.filter((c) =>
        [c.title, c.summary, c.achievements, c.tomorrow, c.entry_date, ART_STYLE_MAP[c.style]?.name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(k),
      )
    }
    return list
  }, [comics, q, favOnly, fStyle, fGenre, month, view])

  const paths = filtered.map((c) => c.cover_path).filter(Boolean)
  const urls = useImageUrls(paths)

  const byGroup = useMemo(() => {
    const m = new Map<string, Comic[]>()
    filtered.forEach((c) => {
      const k = ym(c.entry_date)
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(c)
    })
    return Array.from(m.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [filtered])

  const calDays = useMemo(() => {
    const [y, mm] = month.split('-').map(Number)
    const first = new Date(y, mm - 1, 1)
    const start = first.getDay()
    const days = new Date(y, mm, 0).getDate()
    const cells: (number | null)[] = []
    for (let i = 0; i < start; i++) cells.push(null)
    for (let i = 1; i <= days; i++) cells.push(i)
    while (cells.length % 7 !== 0) cells.push(null)
    const map = new Map<string, Comic>()
    comics.forEach((c) => {
      if (!map.has(c.entry_date)) map.set(c.entry_date, c)
    })
    return { cells, map, y, mm }
  }, [month, comics])

  const monthCount = comics.filter((c) => ym(c.entry_date) === month).length

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-title">漫画集</div>
        <div className="spacer" />
        <span className="pill">{comics.length} 篇</span>
      </div>

      <div className="row" style={{ gap: 8, marginTop: 6 }}>
        <div className="input" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', flex: 1 }}>
          <Icon.Search style={{ width: 16, height: 16, color: 'var(--ink-3)', flex: 'none' }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索标题、摘要、日期"
            style={{ border: 'none', outline: 'none', background: 'none', width: '100%', minHeight: 42 }}
          />
        </div>
        <button className="btn btn-ghost" style={{ flex: 'none' }} onClick={() => setFilter('style')}>
          <Icon.Brush style={{ width: 16, height: 16 }} />
        </button>
      </div>

      <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <button className={`chip ${favOnly ? 'on' : ''}`} onClick={() => setFavOnly((v) => !v)}>
          ★ 只看收藏
        </button>
        {fStyle ? (
          <button className="chip on" onClick={() => setFStyle('')}>
            {ART_STYLE_MAP[fStyle]?.name} ×
          </button>
        ) : null}
        {fGenre ? (
          <button className="chip on" onClick={() => setFGenre('')}>
            {GENRE_MAP[fGenre]?.name} ×
          </button>
        ) : null}
      </div>

      <div style={{ height: 12 }} />
      <div className="seg">
        <button className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')}>封面网格</button>
        <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>按日期列表</button>
        <button className={view === 'cal' ? 'on' : ''} onClick={() => setView('cal')}>月历</button>
      </div>

      <div style={{ height: 14 }} />

      {view === 'cal' ? (
        <div>
          <div className="row" style={{ marginBottom: 10 }}>
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => {
                const [y, m] = month.split('-').map(Number)
                const d = new Date(y, m - 2, 1)
                setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
              }}
            >
              上月
            </button>
            <div className="spacer" />
            <div style={{ fontWeight: 700 }}>{month.replace('-', ' 年 ')} 月 · {monthCount} 篇</div>
            <div className="spacer" />
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => {
                const [y, m] = month.split('-').map(Number)
                const d = new Date(y, m, 1)
                setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
              }}
            >
              下月
            </button>
          </div>
          <div className="cal-head">
            {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="cal">
            {calDays.cells.map((n, i) => {
              if (n === null) return <div key={i} />
              const ds = `${calDays.y}-${String(calDays.mm).padStart(2, '0')}-${String(n).padStart(2, '0')}`
              const c = calDays.map.get(ds)
              return (
                <button
                  key={i}
                  className={`cal-cell ${c ? 'has' : ''} ${ds === todayStr() ? 'today' : ''}`}
                  onClick={() => (c ? go(`comic/${c.id}`) : toast('这天还没有漫画'))}
                >
                  {n}
                </button>
              )
            })}
          </div>
          <div style={{ height: 14 }} />
          <div className="card-soft">
            <div className="row">
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>本月漫画册</div>
                <div className="hint">{monthCount} 篇作品 · 纵向长图合集</div>
              </div>
              <div className="spacer" />
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setView('grid')
                  setMonth(month)
                }}
              >
                查看本月
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {view === 'grid' ? (
        byGroup.length === 0 ? (
          <div className="card-soft">
            <Empty
              text="没有符合条件的作品。换个筛选条件，或者去创作一篇新的。"
              action={
                <button className="btn btn-accent btn-sm" onClick={() => go('create')}>
                  开始创作
                </button>
              }
            />
          </div>
        ) : (
          byGroup.map(([k, list]) => (
            <div key={k} style={{ marginBottom: 18 }}>
              <div className="row" style={{ marginBottom: 8 }}>
                <div className="section-title">{k.replace('-', ' 年 ')} 月</div>
                <div className="spacer" />
                <span className="hint">{list.length} 篇</span>
              </div>
              <div className="grid">
                {list.map((c) => (
                  <button
                    key={c.id}
                    style={{ padding: 0, border: 'none', background: 'none', textAlign: 'left' }}
                    onClick={() => go(`comic/${c.id}`)}
                  >
                    <div className="cover">
                      {c.cover_path && urls[c.cover_path] ? (
                        <img src={urls[c.cover_path]} alt={c.title} loading="lazy" />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: 'var(--paper-2)' }} />
                      )}
                      {c.favorite ? <div className="cover-badge">★</div> : null}
                      <div className="cover-meta">
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                        <div className="cover-date">{c.entry_date}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))
        )
      ) : null}

      {view === 'list' ? (
        filtered.length === 0 ? (
          <div className="card-soft">
            <Empty text="没有符合条件的作品。" />
          </div>
        ) : (
          <div className="stack">
            {filtered.map((c) => (
              <button
                key={c.id}
                className="card"
                style={{ textAlign: 'left', display: 'flex', gap: 12, alignItems: 'center', width: '100%' }}
                onClick={() => go(`comic/${c.id}`)}
              >
                <div style={{ width: 56, height: 74, borderRadius: 10, overflow: 'hidden', flex: 'none', background: 'var(--paper-2)' }}>
                  {c.cover_path && urls[c.cover_path] ? (
                    <img src={urls[c.cover_path]} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : null}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{c.title}</div>
                  <div className="hint" style={{ marginTop: 2 }}>
                    {c.entry_date} · {ART_STYLE_MAP[c.style]?.name} · {GENRE_MAP[c.genre]?.name || '日常纪实'}
                  </div>
                  <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {c.favorite ? <span className="pill pill-orange">收藏</span> : null}
                    {c.status !== 'completed' ? <span className="pill pill-danger">未完成</span> : null}
                  </div>
                </div>
                <Icon.Chevron style={{ width: 18, height: 18, color: 'var(--ink-3)', flex: 'none' }} />
              </button>
            ))}
          </div>
        )
      ) : null}

      <Sheet open={filter === 'style'} title="按画风 / 类型筛选" onClose={() => setFilter(null)}>
        <div className="stack">
          <div>
            <div className="label" style={{ marginBottom: 8 }}>画风</div>
            <div className="chips">
              {ART_STYLES.map((s) => (
                <button key={s.id} className={`chip ${fStyle === s.id ? 'on' : ''}`} onClick={() => setFStyle(fStyle === s.id ? '' : s.id)}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 8 }}>漫画类型</div>
            <div className="chips">
              {GENRES.map((g) => (
                <button key={g.id} className={`chip ${fGenre === g.id ? 'on' : ''}`} onClick={() => setFGenre(fGenre === g.id ? '' : g.id)}>
                  {g.name}
                </button>
              ))}
            </div>
          </div>
          {months.length ? (
            <div>
              <div className="label" style={{ marginBottom: 8 }}>快速跳到月份</div>
              <div className="chips">
                {months.slice(0, 12).map((m) => (
                  <button key={m} className={`chip ${month === m ? 'on' : ''}`} onClick={() => { setMonth(m); setView('cal') }}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <button className="btn btn-primary btn-block" onClick={() => setFilter(null)}>
            查看结果（{filtered.length} 篇）
          </button>
        </div>
      </Sheet>

      <div style={{ height: 12 }} />
    </div>
  )
}
