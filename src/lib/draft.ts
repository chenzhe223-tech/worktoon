export interface Draft {
  raw: string
  tags: string[]
  highlight: string
  blocker: string
  mood: string
  tomorrow: string
  style: string
  genre: string
  length: number
  tone: string
  updatedAt: number
}

const KEY = 'worktoon.draft.v1'

export const emptyDraft = (p?: Partial<Draft>): Draft => ({
  raw: '',
  tags: [],
  highlight: '',
  blocker: '',
  mood: '',
  tomorrow: '',
  style: 'jp_healing',
  genre: 'auto',
  length: 6,
  tone: 'humor',
  updatedAt: Date.now(),
  ...p,
})

export function loadDraft(): Draft {
  try {
    const s = localStorage.getItem(KEY)
    if (!s) return emptyDraft()
    const j = JSON.parse(s)
    // 老版本草稿可能缺字段，用 emptyDraft 补齐后再归一化，避免 undefined 渗进渲染
    const d = { ...emptyDraft(), ...j } as any
    return {
      ...d,
      raw: String(d.raw || ''),
      highlight: String(d.highlight || ''),
      blocker: String(d.blocker || ''),
      mood: String(d.mood || ''),
      tomorrow: String(d.tomorrow || ''),
      style: String(d.style || 'jp_healing'),
      genre: String(d.genre || 'auto'),
      tone: String(d.tone || 'humor'),
      length: Number(d.length) || 6,
      tags: Array.isArray(d.tags) ? d.tags.filter((t: any) => typeof t === 'string') : [],
    }
  } catch {
    return emptyDraft()
  }
}

export function saveDraft(d: Draft) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...d, updatedAt: Date.now() }))
  } catch {}
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY)
  } catch {}
}

export function draftDirty(d: Draft) {
  return !!(d.raw.trim() || d.highlight.trim() || d.blocker.trim() || d.mood.trim() || d.tomorrow.trim() || d.tags.length)
}
