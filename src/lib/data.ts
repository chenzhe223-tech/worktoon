import { cloud } from './cloud'
import type { AssetRow, Comic, ComicPanel, GenerationTask, Hero, JournalEntry, Profile } from './types'

function unwrap<T>(r: { data: T; error: any }): T {
  if (r.error) throw r.error
  return r.data
}

export const DEFAULT_HERO: Hero = {
  name: '我',
  gender: '不限',
  hair: '简单利落的短发',
  outfit: '简约通勤装，浅色衬衫',
  features: '戴细框眼镜，表情认真',
  skin: '#F2C9A8',
  ref_path: '',
}

export const DEFAULT_PROFILE: Profile = {
  nickname: '',
  default_style: 'jp_healing',
  default_genre: 'auto',
  default_length: 6,
  default_tone: 'humor',
  hero: DEFAULT_HERO,
}

export function todayStr(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/* ---------------- Profile ---------------- */

export async function loadProfile(): Promise<Profile> {
  const { data, error } = await cloud.database
    .from('profiles')
    .select('*')
    .order('id', { ascending: false })
    .limit(1)
  if (error) throw error
  const row = (data || [])[0]
  if (!row) return { ...DEFAULT_PROFILE }
  return {
    id: row.id,
    nickname: row.nickname || '',
    default_style: row.default_style || DEFAULT_PROFILE.default_style,
    default_genre: row.default_genre || 'auto',
    default_length: row.default_length || 6,
    default_tone: row.default_tone || 'humor',
    hero: { ...DEFAULT_HERO, ...(row.hero || {}) },
  }
}

export async function saveProfile(p: Profile): Promise<Profile> {
  const payload: any = {
    nickname: p.nickname,
    default_style: p.default_style,
    default_genre: p.default_genre,
    default_length: p.default_length,
    default_tone: p.default_tone,
    hero: p.hero,
    updated_at: new Date().toISOString(),
  }
  if (p.id) {
    const { data, error } = await cloud.database.from('profiles').update(payload).eq('id', p.id).select()
    if (error) throw error
    if (!data || data.length === 0) throw new Error('资料保存失败，请重新登录')
    return { ...p }
  }
  const { data, error } = await cloud.database.from('profiles').insert(payload).select()
  if (error) throw error
  return { ...p, id: (data as any[])[0]?.id }
}

/* ---------------- Journal ---------------- */

export async function createJournal(j: JournalEntry) {
  const { data, error } = await cloud.database
    .from('journal_entries')
    .insert({
      comic_id: j.comic_id ?? null,
      entry_date: j.entry_date,
      raw_text: j.raw_text,
      tags: j.tags || [],
      highlight: j.highlight || '',
      blocker: j.blocker || '',
      mood: j.mood || '',
      tomorrow: j.tomorrow || '',
      status: j.status || 'draft',
    })
    .select()
  if (error) throw error
  return (data as any[])[0]
}

export async function updateJournal(id: number, patch: Partial<JournalEntry>) {
  const { error } = await cloud.database.from('journal_entries').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function getJournal(id: number) {
  const { data, error } = await cloud.database.from('journal_entries').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data as any
}

/* ---------------- Comics ---------------- */

export async function listComics(limit = 300): Promise<Comic[]> {
  const { data, error } = await cloud.database
    .from('comics')
    .select('*')
    .order('entry_date', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit)
  if (error) throw error
  return ((data || []) as any[]).map(normalizeComic)
}

export function normalizeComic(row: any): Comic {
  return {
    ...row,
    // 云端老数据可能缺后加的列，这里统一兜底，避免页面读到 undefined 直接崩
    blocker: row.blocker || '',
    mood: row.mood || '',
    tomorrow: row.tomorrow || '',
    summary: row.summary || '',
    achievements: row.achievements || '',
    cover_path: row.cover_path || '',
    error_message: row.error_message || '',
    title: row.title || '今天的故事',
    status: row.status || 'draft',
    facts: Array.isArray(row.facts) ? row.facts : [],
    favorite: !!row.favorite,
  } as Comic
}

export async function getComic(id: number): Promise<Comic | null> {
  const { data, error } = await cloud.database.from('comics').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) return null
  return normalizeComic(data)
}

export async function createComic(c: Partial<Comic>) {
  const { data, error } = await cloud.database
    .from('comics')
    .insert({
      journal_id: c.journal_id ?? null,
      title: c.title || '今天的故事',
      entry_date: c.entry_date || todayStr(),
      style: c.style || 'jp_healing',
      genre: c.genre || 'auto',
      tone: c.tone || 'humor',
      panel_length: c.panel_length || 6,
      summary: c.summary || '',
      achievements: c.achievements || '',
      tomorrow: c.tomorrow || '',
      mood: c.mood || '',
      facts: c.facts || [],
      cover_path: c.cover_path || '',
      favorite: false,
      status: c.status || 'draft',
      error_message: '',
    })
    .select()
  if (error) throw error
  return normalizeComic((data as any[])[0])
}

export async function updateComic(id: number, patch: Partial<Comic>) {
  const body: any = { ...patch, updated_at: new Date().toISOString() }
  delete body.id
  delete body.owner_id
  const { error } = await cloud.database.from('comics').update(body).eq('id', id)
  if (error) throw error
}

export async function deleteComic(id: number) {
  const { error: e1 } = await cloud.database.from('comic_panels').delete().eq('comic_id', id)
  if (e1) throw e1
  const { error: e2 } = await cloud.database.from('generation_tasks').delete().eq('comic_id', id)
  if (e2) throw e2
  const { error: e3 } = await cloud.database.from('assets').delete().eq('comic_id', id)
  if (e3) throw e3
  const { data, error } = await cloud.database.from('comics').delete().eq('id', id).select()
  if (error) throw error
  if (!data || (data as any[]).length === 0) throw new Error('没有可删除的作品')
}

/* ---------------- Panels ---------------- */

export async function listPanels(comicId: number): Promise<ComicPanel[]> {
  const { data, error } = await cloud.database
    .from('comic_panels')
    .select('*')
    .eq('comic_id', comicId)
    .order('panel_number', { ascending: true })
  if (error) throw error
  return (data || []) as ComicPanel[]
}

export async function insertPanels(rows: Partial<ComicPanel>[]) {
  const payload = rows.map((r) => ({
    comic_id: r.comic_id,
    panel_number: r.panel_number,
    scene_description: r.scene_description || '',
    characters: r.characters || '',
    action: r.action || '',
    dialogue: r.dialogue || '',
    narration: r.narration || '',
    visual_prompt: r.visual_prompt || '',
    // 镜头节奏与表演指示落库，重绘单格 / 全篇时沿用同一套脚本
    shot: (r as any).shot || 'medium',
    focus: (r as any).focus || '',
    expression: (r as any).expression || '',
    image_path: '',
    status: 'pending',
    deleted: false,
  }))
  let { data, error } = await cloud.database.from('comic_panels').insert(payload).select()
  // 老库还没有 shot/focus/expression 列时自动降级，不阻塞生成
  if (error && /shot|focus|expression/.test(String(error.message || ''))) {
    const fallback = payload.map(({ shot, focus, expression, ...rest }: any) => rest)
    const r2 = await cloud.database.from('comic_panels').insert(fallback).select()
    data = r2.data
    error = r2.error
  }
  if (error) throw error
  return (data || []) as ComicPanel[]
}

export async function updatePanel(id: number, patch: Partial<ComicPanel>) {
  const body: any = { ...patch, updated_at: new Date().toISOString() }
  delete body.id
  delete body.owner_id
  const { error } = await cloud.database.from('comic_panels').update(body).eq('id', id)
  if (error) throw error
}

export async function deletePanels(comicId: number) {
  const { error } = await cloud.database.from('comic_panels').delete().eq('comic_id', comicId)
  if (error) throw error
}

/* ---------------- Tasks ---------------- */

export async function createTask(t: Partial<GenerationTask>) {
  const { data, error } = await cloud.database
    .from('generation_tasks')
    .insert({
      comic_id: t.comic_id,
      status: t.status || 'queued',
      stage: t.stage || 'understand',
      stage_label: t.stage_label || '',
      total: t.total || 0,
      done: t.done || 0,
      payload: t.payload || {},
    })
    .select()
  if (error) throw error
  return (data as any[])[0] as GenerationTask
}

export async function updateTask(id: number, patch: Partial<GenerationTask>) {
  const body: any = { ...patch, updated_at: new Date().toISOString() }
  delete body.id
  delete body.owner_id
  const { error } = await cloud.database.from('generation_tasks').update(body).eq('id', id)
  if (error) throw error
}

export async function latestTask(comicId: number): Promise<GenerationTask | null> {
  const { data, error } = await cloud.database
    .from('generation_tasks')
    .select('*')
    .eq('comic_id', comicId)
    .order('id', { ascending: false })
    .limit(1)
  if (error) throw error
  return ((data || [])[0] as GenerationTask) || null
}

/* ---------------- Assets ---------------- */

export async function addAsset(a: Partial<AssetRow>) {
  const { data, error } = await cloud.database
    .from('assets')
    .insert({
      comic_id: a.comic_id ?? null,
      panel_id: a.panel_id ?? null,
      kind: a.kind || 'panel',
      path: a.path || '',
      mime: a.mime || 'image/png',
      size_bytes: a.size_bytes || 0,
    })
    .select()
  if (error) throw error
  return (data as any[])[0] as AssetRow
}

export async function listAssets(comicId: number): Promise<AssetRow[]> {
  const { data, error } = await cloud.database.from('assets').select('*').eq('comic_id', comicId)
  if (error) throw error
  return (data || []) as AssetRow[]
}

export async function removeAssetRows(ids: number[]) {
  if (!ids.length) return
  const { error } = await cloud.database.from('assets').delete().in('id', ids)
  if (error) throw error
}

/** 删除当前用户的全部作品数据（我的 → 隐私与数据管理） */
export async function purgeAllUserData(userId: string) {
  const comics = await listComics(1000)
  for (const c of comics) {
    await deleteComic(c.id).catch(() => {})
  }
  try {
    const list = await cloud.storage.list(`users/${userId}`, { limit: 200, offset: 0 })
    const files = (list.data || []) as any[]
    const paths = files.map((f) => `users/${userId}/${f.name}`).filter(Boolean)
    for (let i = 0; i < paths.length; i += 20) {
      await cloud.storage.remove(paths.slice(i, i + 20)).catch(() => {})
    }
  } catch {
    /* 文件清理失败不阻塞账号数据清理 */
  }
  const { error } = await cloud.database.from('journal_entries').delete().neq('id', 0)
  if (error) throw error
}
