import { createWorkBuddyCloud } from '@tencent-ai/workbuddy-cloud-sdk'
import { PUBLIC_CONFIG } from './config'

// 全应用唯一的云客户端实例：Auth / Database / Storage / LLM 共用。
export const cloud = createWorkBuddyCloud({
  endpoint: PUBLIC_CONFIG.endpoint,
  oauthRelayBaseUrl: PUBLIC_CONFIG.oauthRelayBaseUrl,
  publishableKey: PUBLIC_CONFIG.publishableKey,
})

const hasCJK = (s: string) => /[\u4e00-\u9fa5]/.test(s)

/**
 * 把任何异常翻译成一句用户能看懂的中文。
 * 硬约束：**绝不把英文技术报错原样透传到界面**（例如 iOS Safari 的
 * "The request is not allowed by the user agent or the platform in the current context…"）。
 * 只有本来就写好的中文提示才允许直接显示。
 */
export function errText(e: any, fallback = '请求失败'): string {
  if (!e) return fallback
  const code = String(e?.error?.code || e?.code || '')
  const msg = String(e?.error?.message || e?.message || '')

  // 1) 云端错误码优先，最准确
  if (code === 'quota_exceeded' || code === 'quota_rate_limited') return 'AI 额度暂时用尽，请稍后再试'
  if (code === 'auth_failed' || code === 'auth_invalid' || code === 'auth_expired' || code === 'auth_missing')
    return '登录状态已过期，请重新登录'
  if (code === 'content_filtered' || code === 'content_blocked') return '内容未通过安全审核，请调整后重试'
  if (code === 'gateway_stream_interrupted' || code === 'gateway_error') return '网络中断，请重试'
  if (code === 'network_error') return '网络异常，请检查连接'
  if (code.startsWith('quota_')) return 'AI 额度暂时用尽，请稍后再试'
  if (code.startsWith('auth_')) return '登录状态已过期，请重新登录'
  if (code.startsWith('gateway_') || code.startsWith('internal_')) return '服务暂时不可用，请稍后重试'
  if (code.startsWith('request_')) return '这次请求没有被接受，请调整内容后重试'

  // 2) 浏览器 / WebView 的权限类报错（分享、剪贴板、相机等）
  if (/not allowed by the user agent|NotAllowedError|notallowed|permission denied|user denied|denied permission/i.test(msg)) {
    return '当前浏览器没有开放这个权限，请再试一次；若仍然不行，请用 Safari 或 Chrome 直接打开本页面'
  }
  if (/AbortError|The user aborted a request/i.test(msg)) return '操作已取消'
  if (/QuotaExceededError|storage quota/i.test(msg)) return '本机存储空间不足，请清理后重试'
  if (/SecurityError|The operation is insecure/i.test(msg)) return '浏览器拦截了这次操作，请关闭无痕模式或用系统浏览器打开'
  if (/Failed to fetch|NetworkError|Load failed|network connection was lost/i.test(msg)) return '网络异常，请检查连接后重试'

  // 3) 只有中文原文才直接透传；纯英文/技术栈报错一律换成通用中文
  if (msg && msg.length < 300 && !msg.startsWith('<') && hasCJK(msg)) return msg

  return fallback
}


/** 读取当前会话；无会话返回 null。所有用户数据操作前都要先过这道门。 */
export async function getSession() {
  try {
    const { data, error } = await cloud.auth.getSession()
    if (error || !data) return null
    return data
  } catch {
    return null
  }
}

export async function requireSession() {
  const s = await getSession()
  if (!s) throw new Error('请先登录')
  return s
}
