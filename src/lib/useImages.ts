import { useEffect, useRef, useState } from 'react'
import { getSignedUrls } from './img'

/** 批量换取云端私有图片的临时访问地址，并随时间自动失效刷新 */
export function useImageUrls(paths: string[]) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const key = paths.filter(Boolean).join('|')
  const timer = useRef<any>(null)

  useEffect(() => {
    let alive = true
    const list = key ? key.split('|') : []
    if (!list.length) {
      setUrls({})
      return
    }
    getSignedUrls(list).then((m) => {
      if (alive) setUrls(m)
    })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      getSignedUrls(list).then((m) => {
        if (alive) setUrls(m)
      })
    }, 45 * 60 * 1000)
    return () => {
      alive = false
      clearTimeout(timer.current)
    }
  }, [key])

  return urls
}
