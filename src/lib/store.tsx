import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { cloud, errText, getSession } from './cloud'
import * as DB from './data'
import type { Comic, Profile } from './types'

export interface ToastItem {
  id: number
  text: string
  kind: 'info' | 'err'
}

interface StoreValue {
  booted: boolean
  session: any | null
  profile: Profile
  comics: Comic[]
  loading: boolean
  toasts: ToastItem[]
  toast: (text: string, kind?: 'info' | 'err') => void
  refreshComics: () => Promise<void>
  refreshProfile: () => Promise<void>
  patchProfile: (p: Partial<Profile>) => Promise<void>
  setSession: (s: any) => void
}

const Ctx = createContext<StoreValue>(null as any)

export function useStore() {
  return useContext(Ctx)
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [booted, setBooted] = useState(false)
  const [session, setSession] = useState<any | null>(null)
  const [profile, setProfile] = useState<Profile>(DB.DEFAULT_PROFILE)
  const [comics, setComics] = useState<Comic[]>([])
  const [loading, setLoading] = useState(false)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const seq = useRef(0)

  const toast = useCallback((text: string, kind: 'info' | 'err' = 'info') => {
    const id = ++seq.current
    setToasts((t) => [...t, { id, text, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'err' ? 4200 : 2600)
  }, [])

  const refreshProfile = useCallback(async () => {
    try {
      const p = await DB.loadProfile()
      setProfile(p)
    } catch (e) {
      console.warn('profile load failed', e)
    }
  }, [])

  const refreshComics = useCallback(async () => {
    setLoading(true)
    try {
      const list = await DB.listComics()
      setComics(list)
    } catch (e: any) {
      toast(errText(e, '作品列表加载失败'), 'err')
    } finally {
      setLoading(false)
    }
  }, [toast])

  const patchProfile = useCallback(
    async (p: Partial<Profile>) => {
      const next = { ...profile, ...p }
      setProfile(next)
      try {
        const saved = await DB.saveProfile(next)
        setProfile(saved)
      } catch (e: any) {
        toast(errText(e, '设置保存失败'), 'err')
        throw e
      }
    },
    [profile, toast],
  )

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        // 微信网页登录回调必须先于任何路由守卫处理
        const cb = await cloud.auth.handleWechatWebCallback()
        if (!alive) return
        if (cb?.error) {
          toast(errText(cb.error, '微信登录失败'), 'err')
        } else if (cb?.data) {
          history.replaceState(null, '', location.pathname + location.hash)
        }
        const s = await getSession()
        if (!alive) return
        setSession(s)
        if (s) {
          await refreshProfile()
          await refreshComics()
        }
      } catch (e) {
        console.warn('boot failed', e)
      } finally {
        if (alive) setBooted(true)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let un: any
    try {
      un = cloud.auth.onAuthStateChange((_e: string, s: any) => {
        setSession(s ?? null)
      })
    } catch {
      /* 不支持监听时忽略 */
    }
    return () => {
      try {
        const sub = un?.data?.subscription || un?.subscription || un
        sub?.unsubscribe?.()
      } catch {}
    }
  }, [])

  const value = useMemo<StoreValue>(
    () => ({
      booted,
      session,
      profile,
      comics,
      loading,
      toasts,
      toast,
      refreshComics,
      refreshProfile,
      patchProfile,
      setSession,
    }),
    [booted, session, profile, comics, loading, toasts, toast, refreshComics, refreshProfile, patchProfile],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
