import React, { useEffect, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { Icon, Sheet, Confirm } from '../components/ui'
import { ART_STYLES, GENRES, LENGTHS, TONES, thumbOf, ART_STYLE_MAP, JOBS, AGES, GLASSES, VIBES, GENDERS } from '../lib/art'
import { cloud, errText, getSession } from '../lib/cloud'
import * as DB from '../lib/data'
import { getSignedUrl, clearUrlCache, uploadPng } from '../lib/img'
import { downloadBlobFile } from '../lib/export'
import type { Hero } from '../lib/types'

const JOB_NAMES = JOBS.map((j) => j.name)
const SKINS = [
  { v: '#F2C9A8', n: '浅肤色' },
  { v: '#E8B48C', n: '自然肤色' },
  { v: '#C98B62', n: '健康肤色' },
  { v: '#9C6B45', n: '深肤色' },
  { v: '#F7D8C4', n: '白皙' },
]

/** 压缩到指定宽度的 PNG，避免原图过大拖慢上传 */
async function compressImage(file: File, maxW = 640): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, maxW / bmp.width)
  const w = Math.round(bmp.width * scale)
  const h = Math.round(bmp.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('图片处理不可用')
  ctx.drawImage(bmp, 0, 0, w, h)
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
  if (!blob) throw new Error('图片处理失败')
  return blob
}

export default function Me({ go }: { go: (h: string) => void }) {
  const { profile, comics, session, toast, patchProfile, refreshComics, setSession } = useStore()
  const [nick, setNick] = useState(profile.nickname || '')
  const [hero, setHero] = useState<Hero>(profile.hero)
  const [sheet, setSheet] = useState<null | 'style' | 'hero'>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [refUrl, setRefUrl] = useState('')
  const [exporting, setExporting] = useState(false)
  const [purgeOpen, setPurgeOpen] = useState(false)
  const [purging, setPurging] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setHero(profile.hero)
    setNick(profile.nickname || '')
  }, [profile.hero, profile.nickname])

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!hero.ref_path) {
        setRefUrl('')
        return
      }
      try {
        const u = await getSignedUrl(hero.ref_path)
        if (alive) setRefUrl(u)
      } catch {
        if (alive) setRefUrl('')
      }
    })()
    return () => {
      alive = false
    }
  }, [hero.ref_path])

  const stats = (() => {
    const fav = comics.filter((c) => c.favorite).length
    const days = new Set(comics.map((c) => c.entry_date)).size
    const panels = comics.reduce((n, c) => n + (c.panel_length || 0), 0)
    return { total: comics.length, fav, days, panels }
  })()

  const styleObj = ART_STYLE_MAP[profile.default_style]
  /** 预设职业以外的自由填写值：填了就以它为准 */
  const customJob = hero.job && !JOB_NAMES.includes(hero.job) ? hero.job : ''

  const saveHero = async (next?: Hero) => {
    const h = next || hero
    setSaving(true)
    try {
      await patchProfile({ hero: h })
      toast('主角设定已保存')
    } catch (e: any) {
      toast(errText(e, '主角设定保存失败'), 'err')
    } finally {
      setSaving(false)
    }
  }

  const onPick = async (file?: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast('请选择图片文件', 'err')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      toast('图片太大了，请选择 8MB 以内的图片', 'err')
      return
    }
    setUploading(true)
    try {
      const s = await getSession()
      if (!s) throw new Error('登录状态已失效，请重新登录')
      const blob = await compressImage(file)
      const path = cloud.storage.userPath(s.user.id, `hero/ref-${Date.now()}.png`)
      await uploadPng(path, blob)
      // 删掉旧参考图，避免用户目录堆积
      if (hero.ref_path && hero.ref_path !== path) {
        cloud.storage.remove([hero.ref_path]).catch(() => {})
        clearUrlCache(hero.ref_path)
      }
      clearUrlCache(path)
      setRefUrl(await getSignedUrl(path).catch(() => ''))
      await saveHero({ ...hero, ref_path: path })
    } catch (e: any) {
      toast(errText(e, '参考图上传失败'), 'err')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  /** 清空主角档案：回到出厂默认，并一并删掉已上传的参考图 */
  const resetHeroAll = async () => {
    const old = hero.ref_path
    try {
      await saveHero({ ...DB.DEFAULT_HERO })
      if (old) {
        cloud.storage.remove([old]).catch(() => {})
        clearUrlCache(old)
      }
      setRefUrl('')
    } catch {
      /* 已在 saveHero 中提示 */
    }
  }

  const removeRef = async () => {
    const old = hero.ref_path
    try {
      await saveHero({ ...hero, ref_path: '' })
      if (old) {
        cloud.storage.remove([old]).catch(() => {})
        clearUrlCache(old)
      }
      setRefUrl('')
    } catch {
      /* 已在 saveHero 中提示 */
    }
  }

  const exportData = async () => {
    setExporting(true)
    try {
      const out: any = {
        app: 'WorkToon',
        exported_at: new Date().toISOString(),
        nickname: profile.nickname,
        comics: [],
      }
      for (const c of comics) {
        const panels = await DB.listPanels(c.id).catch(() => [])
        const journal = c.journal_id ? await DB.getJournal(c.journal_id).catch(() => null) : null
        out.comics.push({ ...c, journal, panels })
      }
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' })
      downloadBlobFile(blob, `worktoon-${DB.todayStr()}.json`)
      toast(`已导出 ${comics.length} 篇作品`)
    } catch (e: any) {
      toast(errText(e, '导出失败，请重试'), 'err')
    } finally {
      setExporting(false)
    }
  }

  const doPurge = async () => {
    setPurging(true)
    try {
      const s = await getSession()
      if (!s) throw new Error('登录状态已失效，请重新登录')
      await DB.purgeAllUserData(s.user.id)
      await refreshComics()
      toast('全部作品已清空')
      setPurgeOpen(false)
    } catch (e: any) {
      toast(errText(e, '清空失败，请重试'), 'err')
    } finally {
      setPurging(false)
    }
  }

  const doLogout = async () => {
    try {
      await cloud.auth.signOut()
    } catch {
      /* 服务端退出失败也要清理本地状态 */
    }
    setSession(null)
    setLogoutOpen(false)
    go('home')
  }

  const account = session?.user?.phone || session?.user?.email || ''
  const initial = (profile.nickname || account || 'W').trim().slice(0, 1).toUpperCase()

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-title">我的</div>
        <div className="spacer" />
        <button className="btn btn-ghost btn-xs" onClick={() => setLogoutOpen(true)}>
          退出登录
        </button>
      </div>

      {/* 账号卡 */}
      <div className="card stack" style={{ marginTop: 8 }}>
        <div className="row" style={{ gap: 12 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: 'linear-gradient(135deg,var(--orange),var(--purple))',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontSize: 22,
              fontWeight: 800,
              flex: 'none',
            }}
          >
            {initial}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <input
              className="input"
              value={nick}
              placeholder="给自己起个昵称"
              maxLength={16}
              onChange={(e) => setNick(e.target.value)}
              onBlur={() => {
                if (nick !== (profile.nickname || '')) patchProfile({ nickname: nick }).catch(() => {})
              }}
            />
            <div className="hint" style={{ marginTop: 4 }}>
              {account ? `账号：${account}` : '已登录'}
            </div>
          </div>
        </div>

        <div className="stats">
          <div className="stat">
            <div className="stat-num">{stats.total}</div>
            <div className="stat-label">篇作品</div>
          </div>
          <div className="stat">
            <div className="stat-num">{stats.days}</div>
            <div className="stat-label">记录天数</div>
          </div>
          <div className="stat">
            <div className="stat-num">{stats.panels}</div>
            <div className="stat-label">累计分格</div>
          </div>
          <div className="stat">
            <div className="stat-num">{stats.fav}</div>
            <div className="stat-label">收藏</div>
          </div>
        </div>
      </div>

      {/* 默认创作偏好 */}
      <div className="section-title" style={{ margin: '18px 0 8px' }}>
        <Icon.Brush style={{ width: 17, height: 17 }} />
        默认创作偏好
      </div>
      <div className="stack">
        <button className="opt" onClick={() => setSheet('style')} style={{ alignItems: 'stretch' }}>
          <div className="opt-thumb" dangerouslySetInnerHTML={{ __html: thumbOf(profile.default_style) }} />
          <div className="opt-body">
            <div className="opt-name">{styleObj?.name || '未选择画风'}</div>
            <div className="opt-desc">下次创作默认使用这个画风</div>
          </div>
          <Icon.Chevron style={{ width: 18, height: 18, color: 'var(--ink-3)', flex: 'none' }} />
        </button>

        <div className="card">
          <div className="label">默认类型</div>
          <div className="chips" style={{ marginTop: 8 }}>
            {GENRES.map((g) => (
              <button
                key={g.id}
                className={`chip ${profile.default_genre === g.id ? 'on' : ''}`}
                onClick={() => patchProfile({ default_genre: g.id }).catch(() => {})}
              >
                {g.name}
              </button>
            ))}
          </div>
          <div className="divider" />
          <div className="label">默认长度</div>
          <div className="seg" style={{ marginTop: 8 }}>
            {LENGTHS.map((l) => (
              <button
                key={l.v}
                className={profile.default_length === l.v ? 'on' : ''}
                onClick={() => patchProfile({ default_length: l.v }).catch(() => {})}
              >
                {l.name}
              </button>
            ))}
          </div>
          <div className="divider" />
          <div className="label">默认语气</div>
          <div className="chips" style={{ marginTop: 8 }}>
            {TONES.map((t) => (
              <button
                key={t.id}
                className={`chip ${profile.default_tone === t.id ? 'on' : ''}`}
                onClick={() => patchProfile({ default_tone: t.id }).catch(() => {})}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 主角设定 */}
      <div className="section-title" style={{ margin: '18px 0 8px' }}>
        <Icon.User style={{ width: 17, height: 17 }} />
        我的主角形象
      </div>
      <div className="card stack">
        <div className="row" style={{ gap: 12 }}>
          <div
            style={{
              width: 64,
              height: 80,
              borderRadius: 12,
              overflow: 'hidden',
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
              display: 'grid',
              placeItems: 'center',
              flex: 'none',
            }}
          >
            {refUrl ? (
              <img src={refUrl} alt="主角参考图" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Icon.User style={{ width: 26, height: 26, color: 'var(--ink-3)' }} />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{ width: '100%' }}
            >
              {uploading ? <span className="spin" /> : <Icon.Download style={{ width: 16, height: 16 }} />}
              上传参考图
            </button>
            {hero.ref_path ? (
              <button
                className="btn btn-ghost btn-sm"
                onClick={removeRef}
                style={{ width: '100%', marginTop: 8, color: 'var(--danger)' }}
              >
                <Icon.Trash style={{ width: 16, height: 16 }} />
                移除参考图
              </button>
            ) : (
              <div className="hint" style={{ marginTop: 8 }}>还没有参考图，先用文字设定</div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => onPick(e.target.files?.[0])}
            />
          </div>
        </div>

        <div className="hint">
          参考图会作为形象参考传给画面模型，帮助对齐发型、服装与配色。需要说明的是：底层模型无法保证每一格绝对一致，
          参考图只是提升一致性的手段之一。头像与形象都只属于你自己，不会被公开。
        </div>

        <div className="field">
          <div className="label">称呼</div>
          <input
            className="input"
            value={hero.name}
            maxLength={12}
            placeholder="漫画里怎么称呼你"
            onChange={(e) => setHero({ ...hero, name: e.target.value })}
          />
        </div>

        <div>
          <div className="label">性别</div>
          <div className="chips" style={{ marginTop: 8 }}>
            {GENDERS.map((g) => (
              <button key={g} className={`chip ${hero.gender === g ? 'on' : ''}`} onClick={() => setHero({ ...hero, gender: g })}>
                {g}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="label">职业</div>
          <div className="hint" style={{ marginTop: 4, marginBottom: 6 }}>
            用于匹配画面里的场景、道具、服装与动作；不会据此编造成果
          </div>
          <div className="chips" style={{ marginTop: 6 }}>
            <button className={`chip ${!hero.job ? 'on' : ''}`} onClick={() => setHero({ ...hero, job: '' })}>
              未填写
            </button>
            {JOBS.map((j) => (
              <button
                key={j.id}
                className={`chip ${hero.job === j.name ? 'on' : ''}`}
                onClick={() => setHero({ ...hero, job: j.name })}
              >
                {j.name}
              </button>
            ))}
          </div>
          <input
            className="input"
            style={{ marginTop: 8 }}
            value={customJob}
            maxLength={20}
            placeholder="上面没有？直接输入你的职业"
            onChange={(e) => setHero({ ...hero, job: e.target.value })}
          />
        </div>

        <div>
          <div className="label">年龄感</div>
          <div className="chips" style={{ marginTop: 8 }}>
            {AGES.map((a) => (
              <button key={a} className={`chip ${(hero.age || '不限') === a ? 'on' : ''}`} onClick={() => setHero({ ...hero, age: a })}>
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <div className="label">发型</div>
          <input
            className="input"
            value={hero.hair}
            maxLength={30}
            placeholder="例如：简单利落的短发"
            onChange={(e) => setHero({ ...hero, hair: e.target.value })}
          />
        </div>

        <div className="field">
          <div className="label">常穿服装</div>
          <input
            className="input"
            value={hero.outfit}
            maxLength={40}
            placeholder="例如：浅色衬衫 + 深色外套"
            onChange={(e) => setHero({ ...hero, outfit: e.target.value })}
          />
        </div>

        <div>
          <div className="label">眼镜</div>
          <div className="chips" style={{ marginTop: 8 }}>
            {GLASSES.map((g) => (
              <button key={g} className={`chip ${(hero.glasses || '不戴') === g ? 'on' : ''}`} onClick={() => setHero({ ...hero, glasses: g })}>
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <div className="label">外貌特征</div>
          <input
            className="input"
            value={hero.features}
            maxLength={40}
            placeholder="例如：表情认真，身形偏瘦"
            onChange={(e) => setHero({ ...hero, features: e.target.value })}
          />
        </div>

        <div>
          <div className="label">气质</div>
          <div className="chips" style={{ marginTop: 8 }}>
            {VIBES.map((v) => (
              <button key={v} className={`chip ${(hero.vibe || '不限') === v ? 'on' : ''}`} onClick={() => setHero({ ...hero, vibe: v })}>
                {v}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="label">肤色</div>
          <div className="row" style={{ gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
            {SKINS.map((s) => (
              <button
                key={s.v}
                onClick={() => setHero({ ...hero, skin: s.v })}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: s.v,
                  border: hero.skin === s.v ? '3px solid var(--ink)' : '2px solid var(--line)',
                  padding: 0,
                }}
                aria-label={s.n}
              />
            ))}
            <span className="hint">{SKINS.find((s) => s.v === hero.skin)?.n || '自定义'}</span>
          </div>
        </div>

        <button className="btn btn-primary btn-block" onClick={() => saveHero()} disabled={saving}>
          {saving ? <span className="spin" /> : <Icon.Check style={{ width: 18, height: 18 }} />}
          保存主角设定
        </button>
        <button
          className="btn btn-ghost btn-block"
          onClick={resetHeroAll}
          disabled={saving}
          style={{ color: 'var(--danger)' }}
        >
          <Icon.Trash style={{ width: 16, height: 16 }} />
          重置主角档案（清空全部设定与参考图）
        </button>
      </div>

      {/* 数据与隐私 */}
      <div className="section-title" style={{ margin: '18px 0 8px' }}>
        <Icon.Download style={{ width: 17, height: 17 }} />
        数据与隐私
      </div>
      <div className="card stack">
        <div className="small" style={{ color: 'var(--ink-2)', lineHeight: 1.7 }}>
          你的工作日志与漫画默认仅自己可见，服务端按账号做了权限隔离，其他人无法读取。分享漫画时只会带出漫画画面，
          不会附带你写的原始工作日志。
        </div>
        <button className="btn btn-ghost btn-block" onClick={exportData} disabled={exporting}>
          {exporting ? <span className="spin" /> : <Icon.Download style={{ width: 18, height: 18 }} />}
          导出我的全部数据（JSON）
        </button>
        <button
          className="btn btn-danger btn-block"
          onClick={() => setPurgeOpen(true)}
          disabled={purging || comics.length === 0}
        >
          {purging ? <span className="spin" /> : <Icon.Trash style={{ width: 18, height: 18 }} />}
          清空全部作品与图片
        </button>
      </div>

      {/* 关于 */}
      <div className="section-title" style={{ margin: '18px 0 8px' }}>
        <Icon.Sparkle style={{ width: 17, height: 17 }} />
        关于 WorkToon
      </div>
      <div className="card-soft">
        <div className="row" style={{ gap: 8, marginBottom: 6 }}>
          <div className="brand">
            <div className="brand-mark">
              <i /><i /><i /><i />
            </div>
            <div className="brand-name">
              Work<em>Toon</em>
            </div>
          </div>
          <span className="pill pill-orange">v1.0</span>
        </div>
        <div className="small" style={{ color: 'var(--ink-2)', lineHeight: 1.8 }}>
          WorkToon 把每天的工作记录变成属于你的漫画。写下几句话，AI 会依次完成：理解今天发生了什么 →
          编写分镜故事 → 逐格生成画面 → 排版装订 → 保存。对白和旁白都是网页里的真实文字，可以随时修改；
          哪一格不满意，可以单独重画。
        </div>
        <div className="small" style={{ color: 'var(--ink-3)', marginTop: 10, lineHeight: 1.8 }}>
          画面由大模型逐格生成，风格会受画风设定影响；同一篇作品的每一格可能略有差异，这是当前模型能力的真实边界。
        </div>
      </div>

      <div style={{ height: 24 }} />

      {/* 画风选择 */}
      <Sheet open={sheet === 'style'} title="选择默认画风" onClose={() => setSheet(null)}>
        <div className="stack">
          {ART_STYLES.map((s) => (
            <button
              key={s.id}
              className={`opt ${profile.default_style === s.id ? 'on' : ''}`}
              onClick={() => patchProfile({ default_style: s.id }).catch(() => {})}
            >
              <div className="opt-thumb" dangerouslySetInnerHTML={{ __html: thumbOf(s.id) }} />
              <div className="opt-body">
                <div className="opt-name">{s.name}</div>
                <div className="opt-desc">{s.desc}</div>
                {profile.default_style === s.id ? (
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

      <Confirm
        open={purgeOpen}
        title="清空全部作品？"
        desc="将删除你的全部工作日志、漫画、分格与云端图片，且无法恢复。建议先导出数据。"
        okText="确认清空"
        danger
        onOk={doPurge}
        onCancel={() => setPurgeOpen(false)}
      />
      <Confirm
        open={logoutOpen}
        title="退出登录？"
        desc="退出后仍可用同一账号重新登录，作品不会丢失。"
        okText="退出"
        onOk={doLogout}
        onCancel={() => setLogoutOpen(false)}
      />
    </div>
  )
}
