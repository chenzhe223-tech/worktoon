// 云端公共配置：唯一来源是 workbuddy_cloud_service 返回的 publicConfig。
// 这四个值都是可公开的前端配置，不含任何密钥权限。
export const PUBLIC_CONFIG = {
  endpoint: 'https://worktoon.app.workbuddy.host',
  oauthRelayBaseUrl: 'https://www.workbuddy.cn/v2/as/genie-baas/oauth',
  publishableKey: 'wbpk_s00Kd07qwmB6cvq1pZg74s_bsoHV7j4OA8CFucndr1kCKXSSuptvBeR',
}

// 文本模型：故事提炼 / 分镜编写 / 分镜提示词
export const MODEL_TEXT = 'glm-5.3-flash'
// 画面模型：逐格绘制 SVG 分镜画面
export const MODEL_ART = 'glm-5.3-flash'

export const PANEL_W = 800
export const PANEL_H = 1000

export const APP_NAME = 'WorkToon'
export const APP_CN = '工作日志漫画'
export const APP_VERSION = '1.0.0'
