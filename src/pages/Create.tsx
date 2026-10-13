import React, { useEffect, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { Icon, Sheet } from '../components/ui'
import { draftDirty, loadDraft, saveDraft, clearDraft, type Draft } from '../lib/draft'
import { setGuard } from '../lib/guard'
import { MOODS, TAGS } from '../lib/art'

export default function Create({ go }: { go: (h: string) => void }) {
  const { toast, profile } = useStore()
  const [d, setD] = useState<Draft>(() => loadDraft())
  const [saved, setSaved] = useState(true)
  const [more, setMore] = useState(false)
  const [pending, setPending] = useState<string | null>(null)
  const stateRef = useRef(d)
  stateRef.current = d

  const patch = (p: Partial<Draft>) => {
    setD((x) => ({ ...x, ...p }))
    setSaved(false)
  }

  // 自动落盘：刷新或关掉页面也不会丢内容
  useEffect(() => {
    const t = setTimeout(() => {
      if (draftDirty(d)) saveDraft(d)
    }, 400)
    return () => clearTimeout(t)
  }, [d])

  useEffect(() => {
    setGuard((to: string) => {
      if (to.startsWith('settings')) return true
      if (!draftDirty(stateRef.current) || saved) return true
      setPending(to)
      return false
    })
    return () => setGuard(null)
  }, [saved])

  useEffect(() => {
    const onBefore = (e: BeforeUnloadEvent) => {
      if (draftDirty(stateRef.current) && !saved) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onBefore)
    return () => window.removeEventListener('beforeunload', onBefore)
  }, [saved])

  const doSave = () => {
    saveDraft(d)
    setSaved(true)
    toast('草稿已保存')
  }

  const goSettings = () => {
    if (!d.raw.trim()) {
      toast('先写几句今天发生了什么吧', 'err')
      return
    }
    saveDraft(d)
    setSaved(true)
    go('settings')
  }

  const toggleTag = (t: string) => {
    const has = d.tags.includes(t)
    patch({ tags: has ? d.tags.filter((x) => x !== t) : [...d.tags, t].slice(0, 4) })
  }

  const words = d.raw.replace(/\s/g, '').length

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-title">记录今天</div>
        <div className="spacer" />
        {!saved ? <span className="pill pill-orange">未保存</span> : <span className="pill">已保存</span>}
      </div>

      <div className="stack">
        <div className="field">
          <textarea
            className="textarea"
            placeholder="今天发生了什么？随便写几句，剩下的交给我。"
            value={d.raw}
            onChange={(e) => patch({ raw: e.target.value.slice(0, 2000) })}
            style={{ minHeight: 150 }}
          />
          <div className="row">
            <span className="hint">已输入 {words} 字 · 最少 10 字即可生成</span>
            <div className="spacer" />
            {d.raw ? (
              <button className="btn btn-ghost btn-xs" onClick={() => patch({ raw: '', tags: [] })}>
                清空
              </button>
            ) : null}
          </div>
        </div>

        <div className="field">
          <div className="label">给今天贴个标签（可不选）</div>
          <div className="chips">
            {TAGS.map((t) => (
              <button key={t} className={`chip ${d.tags.includes(t) ? 'on' : ''}`} onClick={() => toggleTag(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {!more ? (
          <button className="btn btn-ghost btn-block" onClick={() => setMore(true)}>
            <Icon.Plus style={{ width: 16, height: 16 }} />
            继续补充：成果 / 困难 / 心情 / 明日计划（可跳过）
          </button>
        ) : (
          <div className="card">
            <div className="row" style={{ marginBottom: 10 }}>
              <div className="label" style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                补充信息（都可以跳过）
              </div>
              <div className="spacer" />
              <button className="btn btn-ghost btn-xs" onClick={() => setMore(false)}>
                收起
              </button>
            </div>
            <div className="stack">
              <div className="field">
                <div className="label">今日最重要的成果</div>
                <input
                  className="input"
                  placeholder="例如：敲定了供应商短名单"
                  value={d.highlight}
                  onChange={(e) => patch({ highlight: e.target.value.slice(0, 200) })}
                />
              </div>
              <div className="field">
                <div className="label">今天遇到的困难</div>
                <input
                  className="input"
                  placeholder="例如：报价口径不一致，需要重新核对"
                  value={d.blocker}
                  onChange={(e) => patch({ blocker: e.target.value.slice(0, 200) })}
                />
              </div>
              <div className="field">
                <div className="label">今天的心情</div>
                <div className="chips">
                  {MOODS.map((m) => (
                    <button key={m} className={`chip ${d.mood === m ? 'on' : ''}`} onClick={() => patch({ mood: d.mood === m ? '' : m })}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <div className="label">明天准备做什么</div>
                <input
                  className="input"
                  placeholder="例如：发出澄清邮件并等回复"
                  value={d.tomorrow}
                  onChange={(e) => patch({ tomorrow: e.target.value.slice(0, 200) })}
                />
              </div>
            </div>
          </div>
        )}

        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={doSave}>
            <Icon.Download style={{ width: 16, height: 16 }} />
            保存草稿
          </button>
          <button className="btn btn-accent" style={{ flex: 1.4 }} onClick={goSettings}>
            <Icon.Sparkle style={{ width: 17, height: 17 }} />
            生成今日漫画
          </button>
        </div>

        <div className="hint" style={{ lineHeight: 1.6 }}>
          你的工作日志默认只有本人可见，不会被公开或分享。AI 只会依据你写下的内容改编，不会凭空编造成果或承诺。
        </div>
      </div>

      <Sheet
        open={!!pending}
        title="要保存这份草稿吗？"
        onClose={() => setPending(null)}
      >
        <div className="hint" style={{ marginBottom: 14 }}>
          当前内容还没保存。离开后可以先在草稿里继续，也可以直接丢弃。
        </div>
        <div className="stack">
          <button
            className="btn btn-primary btn-block"
            onClick={() => {
              saveDraft(stateRef.current)
              setSaved(true)
              const t = pending
              setPending(null)
              if (t) go(t)
            }}
          >
            保存草稿并离开
          </button>
          <button
            className="btn btn-ghost btn-block"
            onClick={() => {
              clearDraft()
              setD({ ...stateRef.current, raw: '', tags: [], highlight: '', blocker: '', mood: '', tomorrow: '' })
              setSaved(true)
              const t = pending
              setPending(null)
              if (t) go(t)
            }}
          >
            不保存，直接离开
          </button>
          <button className="btn btn-ghost btn-block" onClick={() => setPending(null)}>
            继续编辑
          </button>
        </div>
      </Sheet>
    </div>
  )
}
