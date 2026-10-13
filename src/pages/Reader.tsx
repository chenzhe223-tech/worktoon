import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { Icon, Sheet, Confirm, Loading } from '../components/ui'
import * as DB from '../lib/data'
import * as GEN from '../lib/generate'
import { useImageUrls } from '../lib/useImages'
import { ART_STYLES, ART_STYLE_MAP, GENRES, GENRE_MAP, TONES, TONE_MAP, thumbOf } from '../lib/art'
import { exportLongImage, shareBlobFile, downloadBlobFile, isWeChatWebView } from '../lib/export'
import { errText } from '../lib/cloud'
import { cloud } from '../lib/cloud'
import type { Comic, ComicPanel } from '../lib/types'

export default function Reader({ go, id }: { go: (h: string) => void; id: number }) {
  const { toast, profile, refreshComics } = useStore()
  const [comic, setComic] = useState<Comic | null>(null)
  const [panels, setPanels] = useState<ComicPanel[]>([])
  const [tick, setTick] = useState(0)
  const [editPanel, setEditPanel] = useState<ComicPanel | null>(null)
  const [editDraft, setEditDraft] = useState({ dialogue: '', narration: '', scene_description: '' })
  const [more, setMore] = useState<null | 'more' | 'style' | 'genre' | 'tone' | 'edit'>(null)
  const [confirmDel, setConfirmDel] = useState(false)
  const [busy, setBusy] = useState<string>('')
  const [exporting, setExporting] = useState(false)
  /** 微信内置浏览器的长按保存兜底：展示整篇长图，用户长按即可保存 / 转发 */
  const [previewUrl, setPreviewUrl] = useState('')
  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl('')
  }
  const metaRef = useRef({ title: '', summary: '', achievements: '', tomorrow: '' })

  const load = async () => {
    const c = await DB.getComic(id)
    setComic(c)
    const ps = await DB.listPanels(id)
    setPanels(ps)
    if (c) metaRef.current = { title: c.title, summary: c.summary, achievements: c.achievements, tomorrow: c.tomorrow }
  }

  useEffect(() => {
    load().catch(() => {})
    const un = GEN.subscribe(() => setTick((x) => x + 1))
    return () => {
      un()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    const t = setInterval(() => {
      if (GEN.isRunning(id) || (comic && ['drawing', 'understanding', 'storyboarding', 'partial'].includes(comic.status))) {
        load().catch(() => {})
      }
    }, 3000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, comic?.status, comic?.updated_at])

  const visible = useMemo(() => panels.filter((p) => !p.deleted), [panels])
  const paths = useMemo(() => visible.map((p) => p.image_path).filter(Boolean), [visible])
  const urls = useImageUrls(paths)

  const running = GEN.isRunning(id)
  const st = GEN.getState(id)

  if (!comic) return <Loading text="正在打开漫画" />

  const hero = profile.hero

  const saveMeta = async () => {
    setBusy('meta')
    try {
      await DB.updateComic(id, metaRef.current)
      await load()
      await refreshComics()
      toast('已保存修改')
      setMore(null)
    } catch (e: any) {
      toast(errText(e, '保存失败'), 'err')
    } finally {
      setBusy('')
    }
  }

  const toggleFav = async () => {
    try {
      await DB.updateComic(id, { favorite: !comic.favorite })
      await load()
      await refreshComics()
      toast(comic.favorite ? '已取消收藏' : '已收藏')
    } catch (e: any) {
      toast(errText(e, '操作失败'), 'err')
    }
  }

  const redrawOne = async (p: ComicPanel) => {
    if (busy) return
    setBusy(`p${p.id}`)
    try {
      await GEN.redrawPanel(id, p, hero, comic.style)
      await load()
      toast(`第 ${p.panel_number} 格已重绘`)
    } catch (e: any) {
      toast(errText(e, '重绘失败'), 'err')
    } finally {
      setBusy('')
    }
  }

  const redrawAll = async () => {
    setBusy('all')
    setMore(null)
    try {
      toast('开始重绘全部画面')
      await GEN.redrawAll(id, hero, comic.style)
      await load()
      await refreshComics()
      toast('全篇重绘完成')
    } catch (e: any) {
      toast(errText(e, '重绘失败'), 'err')
    } finally {
      setBusy('')
    }
  }

  const changeStyle = async (styleId: string) => {
    setBusy('style')
    try {
      await DB.updateComic(id, { style: styleId })
      await load()
      setMore(null)
      toast('画风已更换，可全篇重绘应用新画风')
    } catch (e: any) {
      toast(errText(e, '更换失败'), 'err')
    } finally {
      setBusy('')
    }
  }

  const exportImage = async (share: boolean) => {
    if (exporting) return
    setExporting(true)
    try {
      const blob = await exportLongImage(comic, visible)
      const name = `WorkToon-${comic.entry_date}-${(comic.title || 'comic').replace(/[\\/:*?"<>|]/g, '')}.png`
      // 微信 / QQ 内置浏览器：系统分享不可用（NotAllowedError），静默下载也常被拦。
      // 改为全屏展示长图，让用户长按保存或转发 —— 这是 iOS 内置浏览器唯一稳定的出路。
      if (isWeChatWebView()) {
        setPreviewUrl(URL.createObjectURL(blob))
        return
      }
      if (share) {
        const r = await shareBlobFile(blob, name, `${comic.title} · ${comic.entry_date}`)
        toast(
          r === 'shared'
            ? '已调起分享'
            : r === 'canceled'
              ? '已取消分享'
              : '长图已保存，可在「文件 / 下载」里查看',
        )
      } else {
        downloadBlobFile(blob, name)
        toast('长图已保存')
      }
    } catch (e: any) {
      toast(errText(e, '导出失败'), 'err')
    } finally {
      setExporting(false)
      setMore(null)
    }
  }

  const removeComic = async () => {
    setBusy('del')
    try {
      const assets = await DB.listAssets(id)
      const paths = assets.map((a) => a.path).filter(Boolean)
      for (let i = 0; i < paths.length; i += 20) {
        await cloud.storage.remove(paths.slice(i, i + 20)).catch(() => {})
      }
      await DB.deleteComic(id)
      await refreshComics()
      toast('作品已删除')
      go('collection')
    } catch (e: any) {
      toast(errText(e, '删除失败'), 'err')
    } finally {
      setBusy('')
      setConfirmDel(false)
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <button className="btn btn-ghost btn-xs" onClick={() => go('collection')}>
          <Icon.Chevron style={{ width: 15, height: 15, transform: 'rotate(180deg)' }} />
          返回
        </button>
        <div className="spacer" />
        <button className="btn btn-ghost btn-xs" onClick={toggleFav}>
          <Icon.Star style={{ width: 15, height: 15, fill: comic.favorite ? 'var(--orange)' : 'none' }} />
          {comic.favorite ? '已收藏' : '收藏'}
        </button>
        <button className="btn btn-ghost btn-xs" onClick={() => setMore('more')}>
          <Icon.Edit style={{ width: 15, height: 15 }} />
          更多
        </button>
      </div>

      {running || ['drawing', 'understanding', 'storyboarding', 'partial'].includes(comic.status) ? (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="row">
            <span className="dot-pulse"><i /><i /><i /></span>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{st?.label || '还有分镜在生成中'}</div>
          </div>
          <div style={{ height: 10 }} />
          <div className="progress">
            <i style={{ width: `${st?.percent ?? 40}%` }} />
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <span className="hint">页面会自动刷新进度</span>
            <div className="spacer" />
            <button className="btn btn-ghost btn-xs" onClick={() => go(`gen/${id}`)}>
              查看生成页
            </button>
          </div>
        </div>
      ) : null}

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.3 }}>{comic.title}</div>
        <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <span className="pill">{comic.entry_date}</span>
          <span className="pill pill-orange">{ART_STYLE_MAP[comic.style]?.name || comic.style}</span>
          <span className="pill pill-purple">{GENRE_MAP[comic.genre]?.name || '日常纪实'}</span>
          <span className="pill">{TONES.find((t) => t.id === comic.tone)?.name || ''}</span>
          <span className="pill">{visible.length} 格</span>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="card-soft">
          <div className="empty">
            这篇漫画还没有画面。
            <div style={{ marginTop: 12 }}>
              <button className="btn btn-accent btn-sm" onClick={() => go(`gen/${id}`)}>
                去生成
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="stack">
        {visible.map((p, i) => (
          <div key={p.id} className="panel-card">
            <div className="panel-img">
              {p.image_path && urls[p.image_path] ? (
                <img className="img-fade" src={urls[p.image_path]} alt={`第 ${i + 1} 格`} loading="lazy" />
              ) : (
                <div className="skeleton" style={{ width: '100%', height: '100%' }} />
              )}
              <div className="panel-no">{i + 1}</div>
            </div>
            <div style={{ padding: '12px 13px 13px' }}>
              {p.status === 'failed' ? (
                <div className="row" style={{ marginBottom: 8 }}>
                  <span className="pill pill-danger">这一格生成失败</span>
                  <div className="spacer" />
                  <button className="btn btn-ghost btn-xs" disabled={!!busy} onClick={() => redrawOne(p)}>
                    <Icon.Refresh style={{ width: 14, height: 14 }} />
                    重试
                  </button>
                </div>
              ) : null}
              {p.dialogue ? <div className="bubble">{p.dialogue}</div> : null}
              {p.narration ? <div className="narration" style={{ marginTop: p.dialogue ? 12 : 0 }}>{p.narration}</div> : null}
              <div className="row" style={{ marginTop: 12, gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => {
                    setEditPanel(p)
                    setEditDraft({ dialogue: p.dialogue, narration: p.narration, scene_description: p.scene_description })
                  }}
                >
                  <Icon.Edit style={{ width: 13, height: 13 }} />
                  编辑对白
                </button>
                <button className="btn btn-ghost btn-xs" disabled={!!busy} onClick={() => redrawOne(p)}>
                  <Icon.Refresh style={{ width: 13, height: 13 }} />
                  重画这一格
                </button>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={async () => {
                    await DB.updatePanel(p.id, { deleted: true })
                    await load()
                    toast('已删除这一格')
                  }}
                >
                  <Icon.Trash style={{ width: 13, height: 13 }} />
                  删除
                </button>
              </div>
            </div>
          </div>
        ))}

        {panels.some((p) => p.deleted) ? (
          <div className="card-soft">
            <div className="row">
              <div className="small" style={{ fontWeight: 700 }}>已删除的分镜</div>
              <div className="spacer" />
              <span className="hint">{panels.filter((p) => p.deleted).length} 格</span>
            </div>
            <div style={{ height: 8 }} />
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {panels
                .filter((p) => p.deleted)
                .map((p) => (
                  <button
                    key={p.id}
                    className="btn btn-ghost btn-xs"
                    onClick={async () => {
                      await DB.updatePanel(p.id, { deleted: false })
                      await load()
                      toast('已恢复这一格')
                    }}
                  >
                    <Icon.Undo style={{ width: 13, height: 13 }} />
                    恢复第 {p.panel_number} 格
                  </button>
                ))}
            </div>
          </div>
        ) : null}

        {comic.summary ? (
          <div className="card">
            <div className="section-title" style={{ marginBottom: 8 }}>
              <Icon.Book style={{ width: 17, height: 17 }} />
              今日工作摘要
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--ink-2)' }}>{comic.summary}</div>
            {comic.achievements ? (
              <div className="narration" style={{ marginTop: 10, borderLeftColor: 'var(--teal)' }}>
                今日成果：{comic.achievements}
              </div>
            ) : null}
            {comic.tomorrow ? (
              <div className="narration" style={{ marginTop: 8, borderLeftColor: 'var(--purple)' }}>
                明日待办：{comic.tomorrow}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* 单格编辑 */}
      <Sheet open={!!editPanel} title={`编辑第 ${editPanel?.panel_number ?? ''} 格`} onClose={() => setEditPanel(null)}>
        <div className="stack">
          <div className="field">
            <div className="label">对白（会显示在气泡里）</div>
            <textarea
              className="textarea"
              style={{ minHeight: 70 }}
              value={editDraft.dialogue}
              onChange={(e) => setEditDraft({ ...editDraft, dialogue: e.target.value.slice(0, 60) })}
            />
          </div>
          <div className="field">
            <div className="label">旁白</div>
            <textarea
              className="textarea"
              style={{ minHeight: 70 }}
              value={editDraft.narration}
              onChange={(e) => setEditDraft({ ...editDraft, narration: e.target.value.slice(0, 80) })}
            />
          </div>
          <div className="field">
            <div className="label">分镜描述（用于重画这一格）</div>
            <textarea
              className="textarea"
              style={{ minHeight: 80 }}
              value={editDraft.scene_description}
              onChange={(e) => setEditDraft({ ...editDraft, scene_description: e.target.value.slice(0, 300) })}
            />
          </div>
          <button
            className="btn btn-primary btn-block"
            disabled={!!busy}
            onClick={async () => {
              if (!editPanel) return
              setBusy('edit')
              try {
                await DB.updatePanel(editPanel.id, {
                  dialogue: editDraft.dialogue,
                  narration: editDraft.narration,
                  scene_description: editDraft.scene_description,
                })
                await load()
                toast('已保存这一格')
                setEditPanel(null)
              } catch (e: any) {
                toast(errText(e, '保存失败'), 'err')
              } finally {
                setBusy('')
              }
            }}
          >
            {busy === 'edit' ? <span className="spin" /> : null}
            保存修改
          </button>
        </div>
      </Sheet>

      {/* 更多操作 */}
      <Sheet open={more === 'more'} title="作品操作" onClose={() => setMore(null)}>
        <div className="stack">
          <button className="btn btn-ghost btn-block" onClick={() => setMore('edit')}>
            <Icon.Edit style={{ width: 16, height: 16 }} />
            编辑标题与摘要
          </button>
          <button className="btn btn-ghost btn-block" onClick={() => setMore('style')}>
            <Icon.Brush style={{ width: 16, height: 16 }} />
            更换画风
          </button>
          <button className="btn btn-ghost btn-block" onClick={() => setMore('genre')}>
            <Icon.Sparkle style={{ width: 16, height: 16 }} />
            更换漫画类型
          </button>
          <button className="btn btn-ghost btn-block" disabled={!!busy} onClick={redrawAll}>
            <Icon.Refresh style={{ width: 16, height: 16 }} />
            全篇重新生成画面
          </button>
          <button className="btn btn-ghost btn-block" disabled={exporting} onClick={() => exportImage(true)}>
            <Icon.Share style={{ width: 16, height: 16 }} />
            分享 / 下载长图
          </button>
          <button className="btn btn-ghost btn-block" disabled={exporting} onClick={() => exportImage(false)}>
            <Icon.Download style={{ width: 16, height: 16 }} />
            仅保存到本地
          </button>
          <button className="btn btn-danger btn-block" onClick={() => { setMore(null); setConfirmDel(true) }}>
            <Icon.Trash style={{ width: 16, height: 16 }} />
            删除这篇作品
          </button>
        </div>
      </Sheet>

      <Sheet open={more === 'edit'} title="编辑标题与摘要" onClose={() => setMore(null)}>
        <div className="stack">
          <div className="field">
            <div className="label">标题</div>
            <input
              className="input"
              defaultValue={comic.title}
              onChange={(e) => (metaRef.current.title = e.target.value.slice(0, 40))}
            />
          </div>
          <div className="field">
            <div className="label">今日工作摘要</div>
            <textarea
              className="textarea"
              style={{ minHeight: 80 }}
              defaultValue={comic.summary}
              onChange={(e) => (metaRef.current.summary = e.target.value.slice(0, 300))}
            />
          </div>
          <div className="field">
            <div className="label">今日成果</div>
            <input
              className="input"
              defaultValue={comic.achievements}
              onChange={(e) => (metaRef.current.achievements = e.target.value.slice(0, 200))}
            />
          </div>
          <div className="field">
            <div className="label">明日待办</div>
            <input
              className="input"
              defaultValue={comic.tomorrow}
              onChange={(e) => (metaRef.current.tomorrow = e.target.value.slice(0, 200))}
            />
          </div>
          <button className="btn btn-primary btn-block" disabled={!!busy} onClick={saveMeta}>
            {busy === 'meta' ? <span className="spin" /> : null}
            保存修改
          </button>
        </div>
      </Sheet>

      <Sheet open={more === 'style'} title="更换画风" onClose={() => setMore(null)}>
        <div className="stack">
          {ART_STYLES.map((s) => (
            <button key={s.id} className={`opt ${comic.style === s.id ? 'on' : ''}`} onClick={() => changeStyle(s.id)}>
              <div className="opt-thumb" dangerouslySetInnerHTML={{ __html: thumbOf(s.id) }} />
              <div className="opt-body">
                <div className="opt-name">{s.name}</div>
                <div className="opt-desc">{s.desc}</div>
              </div>
              <span className="tick" />
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={more === 'genre'} title="更换漫画类型" onClose={() => setMore(null)}>
        <div className="stack">
          {GENRES.map((g) => (
            <button
              key={g.id}
              className={`opt ${comic.genre === g.id ? 'on' : ''}`}
              onClick={async () => {
                await DB.updateComic(id, { genre: g.id })
                await load()
                setMore(null)
                toast('类型已更新，可全篇重绘')
              }}
            >
              <div className="opt-body">
                <div className="opt-name">{g.name}</div>
                <div className="opt-desc">{g.desc}</div>
              </div>
              <span className="tick" />
            </button>
          ))}
        </div>
      </Sheet>

      <Confirm
        open={confirmDel}
        title="删除这篇作品？"
        desc="漫画画面、分镜和对应的工作日志都会被删除，删除后无法恢复。"
        okText="删除"
        danger
        onOk={removeComic}
        onCancel={() => setConfirmDel(false)}
      />

      {/* 长按保存兜底（微信等内置浏览器）：全屏展示长图 */}
      {previewUrl ? (
        <div className="save-mask" onClick={closePreview}>
          <div className="save-card" onClick={(e) => e.stopPropagation()}>
            <img className="save-img" src={previewUrl} alt="长按保存" />
            <div className="save-tip">长按图片，可保存到相册或转发给朋友</div>
            <button className="btn btn-ghost btn-block" onClick={closePreview}>
              关闭
            </button>
          </div>
        </div>
      ) : null}

      <div style={{ height: 10 }} />
    </div>
  )
}
