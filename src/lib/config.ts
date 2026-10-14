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

/**
 * 栅格化倍率：SVG 出图时按这个倍数渲染成 PNG。
 *
 * 保持 1x（800×1000）。2026-10-14 实测结论：
 * 画面里只有矢量图形，既没有 <text> 也没有位图引用，而长图导出虽然画在 1080px 宽的 canvas 上
 * （968px 的格位大于 800px 的源图），但矢量在 device pixel 上会**重新栅格化**，不是把位图拉伸。
 * 浏览器实测：把 2x 与「1x 放大到同尺寸」的同一区域裁出来逐像素比对，肉眼无差异；
 * 而体积从 104 KB 涨到 248 KB（2.38 倍）。即零观感收益、纯成本，故回退到 1x。
 *
 * 什么时候才需要调大：画面里出现文字、位图素材，或将来换成真正的位图图像模型时。
 * 那时再把这里调成 2 即可，调用方无需改动。
 */
export const RENDER_SCALE = 1

export const APP_NAME = 'WorkToon'
export const APP_CN = '工作日志漫画'
export const APP_VERSION = '1.0.0'
