export type ComicStatus =
  | 'draft'
  | 'queued'
  | 'understanding'
  | 'storyboarding'
  | 'drawing'
  | 'assembling'
  | 'partial'
  | 'completed'
  | 'failed'
  | 'canceled'

export interface Profile {
  id?: number
  nickname: string
  default_style: string
  default_genre: string
  default_length: number
  default_tone: string
  hero: Hero
}

export interface Hero {
  name: string
  gender: string
  hair: string
  outfit: string
  features: string
  skin: string
  ref_path: string
}

export interface JournalEntry {
  id?: number
  comic_id?: number | null
  entry_date: string
  raw_text: string
  tags: string[]
  highlight: string
  blocker: string
  mood: string
  tomorrow: string
  status: string
}

export interface Comic {
  id: number
  journal_id: number | null
  title: string
  entry_date: string
  style: string
  genre: string
  tone: string
  panel_length: number
  summary: string
  achievements: string
  /** 今日困难。字段名必须与 comics 表列名一致 */
  blocker: string
  tomorrow: string
  mood: string
  facts: Fact[]
  cover_path: string
  favorite: boolean
  status: ComicStatus
  error_message: string
  created_at: string
  updated_at: string
}

export interface Fact {
  id: string
  text: string
  kind: string
}

export interface ComicPanel {
  id: number
  comic_id: number
  panel_number: number
  scene_description: string
  characters: string
  action: string
  dialogue: string
  narration: string
  visual_prompt: string
  /** 景别：wide / full / medium / close / insert */
  shot: string
  /** 本格视觉焦点 */
  focus: string
  /** 人物表情与肢体语言 */
  expression: string
  image_path: string
  asset_id: number | null
  status: 'pending' | 'drawing' | 'done' | 'failed'
  deleted: boolean
  error_message: string
}

export interface GenerationTask {
  id: number
  comic_id: number
  status: string
  stage: string
  stage_label: string
  total: number
  done: number
  error_message: string
  payload: any
  updated_at: string
}

export interface AssetRow {
  id: number
  comic_id: number | null
  panel_id: number | null
  kind: string
  path: string
  mime: string
  size_bytes: number
}
