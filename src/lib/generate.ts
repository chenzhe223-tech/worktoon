import { cloud, errText, getSession } from './cloud'
import * as DB from './data'
import { CancelError, drawPanels, drawPanel, extractFacts, writeStory, ensureStyle } from './ai'
import { bibleOf, buildArtDirection, GENRE_MAP, SHOT_MAP, shotPlan } from './art'
import { sanitizeSvg, svgToPngBlob, uploadPng, clearUrlCache, getSignedUrl } from './img'
import type { Comic, ComicPanel, Hero } from './types'

export const STAGES = [
  '正在整理今天的故事……',
  '正在寻找故事的关键时刻……',
  '正在绘制漫画分镜……',
  '正在为每一格生成画面……',
  '正在装订你的今日漫画……',
]

export interface GenState {
  comicId: number
  stage: number // 0..4
  label: string
  percent: number // 0..100，只在真实阶段推进时增长
  done: number
  total: number
  status: 'queued' | 'running' | 'partial' | 'completed' | 'failed' | 'canceled' | 'idle'
  error: string
  startedAt: number
}

const states = new Map<number, GenState>()
const controllers = new Map<number, AbortController>()
const listeners = new Set<() => void>()

export function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function emit() {
  listeners.forEach((f) => {
    try {
      f()
    } catch {}
  })
}

export function getState(comicId: number): GenState | undefined {
  return states.get(comicId)
}

export function isRunning(comicId: number) {
  const s = states.get(comicId)
  return !!s && (s.status === 'running' || s.status === 'queued')
}

function set(comicId: number, patch: Partial<GenState>) {
  const prev = states.get(comicId)
  const next: GenState = {
    comicId,
    stage: 0,
    label: STAGES[0],
    percent: 0,
    done: 0,
    total: 0,
    status: 'queued',
    error: '',
    startedAt: Date.now(),
    ...prev,
    ...patch,
  }
  states.set(comicId, next)
  emit()
  return next
}

export function cancel(comicId: number) {
  const c = controllers.get(comicId)
  if (c) c.abort()
  set(comicId, { status: 'canceled', label: '已取消，已完成的画面已保留', error: '' })
  DB.updateComic(comicId, { status: 'canceled' }).catch(() => {})
}

export interface GenOptions {
  comicId: number
  journalId: number | null
  raw: string
  tags: string[]
  highlight: string
  blocker: string
  mood: string
  tomorrow: string
  style: string
  genre: string
  tone: string
  length: number
  hero: Hero
}

/** 生成流程在模块层运行，离开页面也不会中断；再次进入可查看进度。 */
export async function run(opts: GenOptions) {
  if (isRunning(opts.comicId)) return
  const ctrl = new AbortController()
  controllers.set(opts.comicId, ctrl)
  const signal = ctrl.signal

  set(opts.comicId, { status: 'running', stage: 0, label: STAGES[0], percent: 4, done: 0, total: opts.length, error: '' })

  try {
    const session = await getSession()
    if (!session) throw new Error('登录状态已失效，请重新登录')
    const uid = session.user?.id
    const style = await ensureStyle(opts.style)
    // 主角参考图：有则作为可选增强传给画面模型，取不到签名 URL 时静默退回纯文本描述
    const refUrl = opts.hero?.ref_path ? await getSignedUrl(opts.hero.ref_path).catch(() => '') : ''
    // 本篇漫画只建一次 Art Direction，所有分镜共享，杜绝画风漂移
    const ad = buildArtDirection(style, String(opts.comicId))
    // 同理，角色视觉圣经也只建一次：同一篇漫画所有分镜拿到完全一致的角色锚点
    const bible = bibleOf(opts.hero, String(opts.comicId))
    const genrePrompt = GENRE_MAP[opts.genre]?.prompt || ''

    await DB.updateComic(opts.comicId, { status: 'understanding' })
    DB.createTask({
      comic_id: opts.comicId,
      status: 'running',
      stage: 'understand',
      stage_label: STAGES[0],
      total: opts.length,
      done: 0,
      payload: { style: opts.style, genre: opts.genre, tone: opts.tone },
    }).catch(() => {})

    // 阶段一：理解工作内容
    const facts = await extractFacts({
      raw: opts.raw,
      tags: opts.tags,
      highlight: opts.highlight,
      blocker: opts.blocker,
      mood: opts.mood,
      tomorrow: opts.tomorrow,
      signal,
    })
    if (signal.aborted) throw new CancelError()
    set(opts.comicId, { stage: 1, label: STAGES[1], percent: 18 })

    // 阶段二：编写故事与分镜
    await DB.updateComic(opts.comicId, {
      status: 'storyboarding',
      title: facts.title,
      summary: facts.summary,
      achievements: facts.achievements,
      blocker: facts.blocker,
      mood: facts.mood,
      tomorrow: facts.tomorrow,
      facts: facts.facts,
    })
    set(opts.comicId, { stage: 2, label: STAGES[2], percent: 30 })

    const story = await writeStory({
      facts,
      style,
      genre: opts.genre,
      tone: opts.tone,
      length: opts.length,
      hero: opts.hero,
      signal,
    })
    if (signal.aborted) throw new CancelError()

    let panels = await DB.listPanels(opts.comicId)
    if (panels.length === 0) {
      panels = await DB.insertPanels(
        story.panels.map((p) => ({
          comic_id: opts.comicId,
          panel_number: p.panel_number,
          scene_description: p.scene_description,
          characters: p.characters,
          action: p.action,
          expression: p.expression,
          focus: p.focus,
          dialogue: p.dialogue,
          narration: p.narration,
          visual_prompt: p.visual_prompt,
          shot: p.shot,
        })),
      )
    }
    await DB.updateComic(opts.comicId, {
      title: story.title || facts.title,
      genre: opts.genre === 'auto' ? (story.genre_used ? opts.genre : opts.genre) : opts.genre,
      status: 'drawing',
    })

    // 阶段三：逐格生成画面
    set(opts.comicId, { stage: 3, label: STAGES[3], percent: 34, total: panels.length, done: 0 })

    const missing = panels.filter((p) => p.status !== 'done' || !p.image_path)
    let doneCount = panels.length - missing.length
    set(opts.comicId, { done: doneCount, total: panels.length })

    await drawPanels(
      story.panels,
      style,
      opts.hero,
      opts.genre,
      signal,
      async (i, svg, failedMsg) => {
        const row = panels[i]
        if (!row) return
        try {
          const clean = sanitizeSvg(svg) || svg
          const blob = await svgToPngBlob(clean)
          const path = cloud.storage.userPath(uid, `comics/${opts.comicId}/p${i + 1}-${Date.now()}.png`)
          await uploadPng(path, blob)
          await DB.addAsset({
            comic_id: opts.comicId,
            panel_id: row.id,
            kind: 'panel',
            path,
            mime: 'image/png',
            size_bytes: blob.size,
          })
          await DB.updatePanel(row.id, { image_path: path, status: 'done', error_message: '' })
          clearUrlCache(path)
        } catch (e: any) {
          await DB.updatePanel(row.id, {
            status: 'failed',
            error_message: errText(e, failedMsg || '这一格画面生成失败'),
          })
        }
        doneCount++
        const pct = Math.min(92, 34 + Math.round((doneCount / Math.max(1, panels.length)) * 58))
        set(opts.comicId, { done: doneCount, percent: pct })
      },
      3,
      { refUrl: refUrl || undefined, ad, genrePrompt, bible },
    )

    if (signal.aborted) throw new CancelError()

    // 阶段四：排版装订
    set(opts.comicId, { stage: 4, label: STAGES[4], percent: 96 })
    const final = await DB.listPanels(opts.comicId)
    const okPanels = final.filter((p) => p.status === 'done' && p.image_path)
    await DB.updateComic(opts.comicId, {
      status: okPanels.length === final.length ? 'completed' : 'partial',
      cover_path: okPanels[0]?.image_path || '',
      error_message: okPanels.length ? '' : '画面生成失败，可针对失败的分格单独重试',
    })
    set(opts.comicId, {
      status: okPanels.length === final.length ? 'completed' : 'partial',
      percent: 100,
      done: okPanels.length,
      total: final.length,
      label: okPanels.length === final.length ? '今日漫画已装订完成' : '部分分镜生成失败，可单独重试',
    })
  } catch (e: any) {
    if (e?.name === 'CancelError') {
      set(opts.comicId, { status: 'canceled', error: '', label: '已取消，已完成的画面已保留' })
      return
    }
    const msg = errText(e, '生成失败，请重试')
    set(opts.comicId, { status: 'failed', error: msg, label: '生成遇到问题' })
    DB.updateComic(opts.comicId, { status: 'failed', error_message: msg }).catch(() => {})
  } finally {
    controllers.delete(opts.comicId)
  }
}

/** 单格重绘 */
export async function redrawPanel(comicId: number, panel: ComicPanel, hero: Hero, styleId: string) {
  const session = await getSession()
  if (!session) throw new Error('请先登录')
  const uid = session.user?.id
  const all0 = await DB.listPanels(comicId)
  const idx = Math.max(0, all0.findIndex((p) => p.id === panel.id))
  const shot = (panel as any).shot || shotPlan(all0.length || 6)[idx]?.id || 'medium'
  const storyPanel = {
    panel_number: panel.panel_number,
    scene_description: panel.scene_description,
    characters: panel.characters,
    action: panel.action,
    expression: (panel as any).expression || '',
    focus: (panel as any).focus || panel.scene_description,
    dialogue: panel.dialogue,
    narration: panel.narration,
    visual_prompt: panel.visual_prompt,
    shot,
    source_fact_ids: [] as string[],
  }
  const style = await ensureStyle(styleId)
  const { drawPanel } = await import('./ai')
  const refUrl = hero?.ref_path ? await getSignedUrl(hero.ref_path).catch(() => '') : ''
  const ad = buildArtDirection(style, String(comicId))
  // 与本篇其他格共用同一份角色圣经，单格重绘不会画成另一个人
  const bible = bibleOf(hero, String(comicId))
  const svg = await drawPanel({
    panel: storyPanel,
    style,
    hero,
    genre: '',
    signal: undefined,
    refUrl: refUrl || undefined,
    ad,
    bible,
    shot: SHOT_MAP[shot] || shotPlan(all0.length || 6)[idx],
    total: all0.length || 6,
    index: idx,
  })
  const clean = sanitizeSvg(svg) || svg
  const blob = await svgToPngBlob(clean)
  const path = cloud.storage.userPath(uid, `comics/${comicId}/p${panel.panel_number}-${Date.now()}.png`)
  await uploadPng(path, blob)
  await DB.addAsset({
    comic_id: comicId,
    panel_id: panel.id,
    kind: 'panel',
    path,
    mime: 'image/png',
    size_bytes: blob.size,
  })
  await DB.updatePanel(panel.id, { image_path: path, status: 'done', error_message: '' })
  clearUrlCache(path)
  const all = await DB.listPanels(comicId)
  const ok = all.filter((p) => p.status === 'done' && p.image_path)
  await DB.updateComic(comicId, {
    status: ok.length === all.length ? 'completed' : 'partial',
    cover_path: ok[0]?.image_path || '',
  })
  return path
}

/** 全篇重新生成（保留原始工作日志与分镜文本，只重画画面） */
export async function redrawAll(comicId: number, hero: Hero, styleId: string) {
  const style = await ensureStyle(styleId)
  const session = await getSession()
  if (!session) throw new Error('请先登录')
  const uid = session.user?.id
  const panels = await DB.listPanels(comicId)
  const refUrl = hero?.ref_path ? await getSignedUrl(hero.ref_path).catch(() => '') : ''
  // 与首次生成使用同一份 Art Direction（同 comicId + 同画风 → 同结果）
  const ad = buildArtDirection(style, String(comicId))
  const bible = bibleOf(hero, String(comicId))
  await DB.updateComic(comicId, { status: 'drawing', style: styleId })
  set(comicId, { status: 'running', stage: 3, label: STAGES[3], percent: 35, total: panels.length, done: 0, error: '' })
  const ctrl = new AbortController()
  controllers.set(comicId, ctrl)
  let done = 0
  try {
    await drawPanels(
      panels.map((p, i) => ({
        panel_number: p.panel_number,
        scene_description: p.scene_description,
        characters: p.characters,
        action: p.action,
        dialogue: p.dialogue,
        narration: p.narration,
        // 重绘沿用首次生成时写入的脚本字段，缺省则按镜头节奏表补齐
        shot: (p as any).shot || shotPlan(panels.length)[i]?.id || 'medium',
        focus: (p as any).focus || p.scene_description,
        expression: (p as any).expression || '',
        visual_prompt: p.visual_prompt,
        source_fact_ids: [] as string[],
      })),
      style,
      hero,
      '',
      ctrl.signal,
      async (i, svg, failedMsg) => {
        const row = panels[i]
        if (!row) return
        try {
          const clean = sanitizeSvg(svg) || svg
          const blob = await svgToPngBlob(clean)
          const path = cloud.storage.userPath(uid, `comics/${comicId}/p${i + 1}-${Date.now()}.png`)
          await uploadPng(path, blob)
          await DB.addAsset({ comic_id: comicId, panel_id: row.id, kind: 'panel', path, mime: 'image/png', size_bytes: blob.size })
          await DB.updatePanel(row.id, { image_path: path, status: 'done', error_message: '' })
          clearUrlCache(path)
        } catch (e: any) {
          await DB.updatePanel(row.id, { status: 'failed', error_message: errText(e, failedMsg || '重绘失败') })
        }
        done++
        set(comicId, { done, percent: Math.min(94, 35 + Math.round((done / Math.max(1, panels.length)) * 58)) })
      },
      3,
      { refUrl: refUrl || undefined, ad, bible },
    )
    const all = await DB.listPanels(comicId)
    const ok = all.filter((p) => p.status === 'done' && p.image_path)
    await DB.updateComic(comicId, { status: ok.length === all.length ? 'completed' : 'partial', cover_path: ok[0]?.image_path || '' })
    set(comicId, { status: ok.length === all.length ? 'completed' : 'partial', percent: 100, done: ok.length, total: all.length, label: '重绘完成' })
  } catch (e: any) {
    set(comicId, { status: 'failed', error: errText(e, '重绘失败'), label: '重绘遇到问题' })
    throw e
  } finally {
    controllers.delete(comicId)
  }
}

export async function resumeIfNeeded(comic: Comic, hero: Hero) {
  if (isRunning(comic.id)) return
  const running = ['draft', 'queued', 'understanding', 'storyboarding', 'drawing', 'partial', 'failed']
  if (!running.includes(comic.status)) return
  const panels = await DB.listPanels(comic.id)
  const missing = panels.filter((p) => p.status !== 'done' || !p.image_path)
  if (panels.length === 0) return
  if (missing.length === 0) {
    await DB.updateComic(comic.id, { status: 'completed', cover_path: panels[0]?.image_path || '' })
    return
  }
  const journal = comic.journal_id ? await DB.getJournal(comic.journal_id).catch(() => null) : null
  await run({
    comicId: comic.id,
    journalId: comic.journal_id,
    raw: journal?.raw_text || '',
    tags: journal?.tags || [],
    highlight: journal?.highlight || '',
    blocker: journal?.blocker || '',
    mood: journal?.mood || '',
    tomorrow: journal?.tomorrow || '',
    style: comic.style,
    genre: comic.genre,
    tone: comic.tone,
    length: comic.panel_length || panels.length,
    hero,
  })
}
