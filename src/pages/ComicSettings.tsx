import React, { useEffect, useState } from 'react'
import { useStore } from '../lib/store'
import { Icon, Sheet } from '../components/ui'
import { ART_STYLES, GENRES, LENGTHS, TONES, thumbOf, ART_STYLE_MAP } from '../lib/art'
import { loadDraft, saveDraft, clearDraft, type Draft } from '../lib/draft'
import * as DB from '../lib/data'
import * as GEN from '../lib/generate'
import { errText } from '../lib/cloud'

type Sel = { style: string; genre: string; length: number; tone: string }

export default function ComicSettings({ go }: { go: (h: string) => void }) {
  const { toast, profile, refreshComics, patchProfile } = useStore()
  const [draft, setDraft] = useState<Draft>(() => loadDraft())
  const [sel, setSel] = useState<Sel>(() => ({
    style: draft.style,
    genre: draft.genre,
    length: draft.length,
    tone: draft.tone,
  }))
  const [sheet, setSheet] = useState<null | 'style' | 'genre' | 'length' | 'tone'>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    // 草稿为空时，采用「我的」里的默认偏好
    if (!draft.raw.trim()) {
      setSel({
        style: profile.default_style,
        genre: profile.default_genre,
        length: profile.default_length,
        tone: profile.default_tone,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.default_style, profile.default_genre, profile.default_length, profile.default_tone])

  const set = (p: Partial<Sel>) => setSel((s) => ({ ...s, ...p }))

  const start = async () => {
    if (busy) return
    if (!draft.raw.trim()) {
      toast('还没有填写今天的工作内容', 'err')
      go('create')
      return
    }
    setBusy(true)
    try {
      saveDraft({ ...draft, ...sel })
      const today = DB.todayStr()
      const journal = await DB.createJournal({
        entry_date: today,
        raw_text: draft.raw,
        tags: draft.tags,
        highlight: draft.highlight,
        blocker: draft.blocker,
        mood: draft.mood,
        tomorrow: draft.tomorrow,
        status: 'submitted',
      })
      const comic = await DB.createComic({
        journal_id: journal.id,
        entry_date: today,
        style: sel.style,
        genre: sel.genre,
        tone: sel.tone,
        panel_length: sel.length,
        title: '今天的故事',
        status: 'draft',
      })
      await DB.updateJournal(journal.id, { comic_id: comic.id })
      try {
        await patchProfile({
          default_style: sel.style,
          default_genre: sel.genre,
          default_length: sel.length,
          default_tone: sel.tone,
        })
      } catch {
        /* 默认偏好写失败不阻塞生成 */
      }
      clearDraft()
      await refreshComics()
      go(`gen/${comic.id}`)
      GEN.run({
        comicId: comic.id,
        journalId: journal.id,
        raw: draft.raw,
        tags: draft.tags,
        highlight: draft.highlight,
        blocker: draft.blocker,
        mood: draft.mood,
        tomorrow: draft.tomorrow,
        style: sel.style,
        genre: sel.genre,
        tone: sel.tone,
        length: sel.length,
        hero: profile.hero,
      })
    } catch (e: any) {
      toast(errText(e, '创建失败，请重试'), 'err')
    } finally {
      setBusy(false)
    }
  }

  const styleObj = ART_STYLE_MAP[sel.style]

  return (
    <div className="page">
      <div className="page-head">
        <button className="btn btn-ghost btn-xs" onClick={() => go('create')}>
          <Icon.Chevron style={{ width: 15, height: 15, transform: 'rotate(180deg)' }} />
          返回
        </button>
        <div className="page-title">漫画设置</div>
      </div>

      <div className="stack" style={{ marginTop: 8 }}>
        {/* A 画风 */}
        <div>
          <div className="section-title" style={{ marginBottom: 8 }}>
            <Icon.Brush style={{ width: 17, height: 17 }} />
            A · 漫画画风
          </div>
          <button className="opt" onClick={() => setSheet('style')} style={{ alignItems: 'stretch' }}>
            <div className="opt-thumb" dangerouslySetInnerHTML={{ __html: thumbOf(sel.style) }} />
            <div className="opt-body">
              <div className="opt-name">{styleObj?.name || '未选择画风'}</div>
              <div className="opt-desc">{styleObj?.desc}</div>
              <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                <span className="pill pill-orange">{sel.length} 格</span>
                <span className="pill pill-purple">{GENRES.find((g) => g.id === sel.genre)?.name}</span>
                <span className="pill">{TONES.find((t) => t.id === sel.tone)?.name}</span>
              </div>
            </div>
            <Icon.Chevron style={{ width: 18, height: 18, color: 'var(--ink-3)', flex: 'none' }} />
          </button>
        </div>

        {/* B 类型 */}
        <div>
          <div className="section-title" style={{ marginBottom: 8 }}>
            <Icon.Sparkle style={{ width: 17, height: 17 }} />
            B · 漫画类型
          </div>
          <div className="chips">
            {GENRES.map((g) => (
              <button key={g.id} className={`chip ${sel.genre === g.id ? 'on' : ''}`} onClick={() => set({ genre: g.id })}>
                {g.name}
              </button>
            ))}
          </div>
        </div>

        {/* C 长度 */}
        <div>
          <div className="section-title" style={{ marginBottom: 8 }}>
            <Icon.Book style={{ width: 17, height: 17 }} />
            C · 漫画长度
          </div>
          <div className="seg">
            {LENGTHS.map((l) => (
              <button key={l.v} className={sel.length === l.v ? 'on' : ''} onClick={() => set({ length: l.v })}>
                {l.name}
              </button>
            ))}
          </div>
          <div className="hint" style={{ marginTop: 6 }}>{LENGTHS.find((l) => l.v === sel.length)?.desc}</div>
        </div>

        {/* D 语气 */}
        <div>
          <div className="section-title" style={{ marginBottom: 8 }}>
            <Icon.Edit style={{ width: 17, height: 17 }} />
            D · 漫画语气
          </div>
          <div className="chips">
            {TONES.map((t) => (
              <button key={t.id} className={`chip ${sel.tone === t.id ? 'on' : ''}`} onClick={() => set({ tone: t.id })}>
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <div className="card-soft">
          <div className="row" style={{ gap: 8 }}>
            <Icon.Sparkle style={{ width: 17, height: 17, color: 'var(--orange)' }} />
            <div style={{ fontWeight: 700, fontSize: 14 }}>生成流程</div>
          </div>
          <div className="small" style={{ color: 'var(--ink-2)', marginTop: 6, lineHeight: 1.7 }}>
            整理今天的故事 → 找关键时刻 → 写分镜 → 逐格生成画面 → 装订成篇。每一格画完就会立刻出现，可以随时离开，回来继续看进度。
          </div>
        </div>

        <button className="btn btn-accent btn-block" onClick={start} disabled={busy}>
          {busy ? <span className="spin" /> : <Icon.Sparkle style={{ width: 18, height: 18 }} />}
          开始生成 {sel.length} 格漫画
        </button>
      </div>

      {/* 画风选择弹层 */}
      <Sheet open={sheet === 'style'} title="选择漫画画风" onClose={() => setSheet(null)}>
        <div className="stack">
          {ART_STYLES.map((s) => (
            <button key={s.id} className={`opt ${sel.style === s.id ? 'on' : ''}`} onClick={() => set({ style: s.id })}>
              <div className="opt-thumb" dangerouslySetInnerHTML={{ __html: thumbOf(s.id) }} />
              <div className="opt-body">
                <div className="opt-name">{s.name}</div>
                <div className="opt-desc">{s.desc}</div>
                {sel.style === s.id ? (
                  <div className="small" style={{ marginTop: 6, color: 'var(--ink-2)', lineHeight: 1.6 }}>
                    视觉定位：{s.identity}
                    <br />
                    色彩：{s.palette}
                    <br />
                    线条：{s.line}
                    <br />
                    光影：{s.light}
                    <br />
                    构图：{s.comp}
                    <br />
                    镜头节奏：{s.camera}
                    <br />
                    夸张程度：{s.exaggeration}
                  </div>
                ) : null}
              </div>
              <span className="tick" />
            </button>
          ))}
          <button className="btn btn-primary btn-block" onClick={() => setSheet(null)}>
            确定
          </button>
        </div>
      </Sheet>
    </div>
  )
}
