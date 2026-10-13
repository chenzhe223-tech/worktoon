import { createWorkBuddyCloud } from '@tencent-ai/workbuddy-cloud-sdk'
const mem = new Map()
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: () => null, length: 0 }
const cloud = createWorkBuddyCloud({
  endpoint: 'https://worktoon.app.workbuddy.host',
  oauthRelayBaseUrl: 'https://www.workbuddy.cn/v2/as/genie-baas/oauth',
  publishableKey: 'wbpk_s00Kd07qwmB6cvq1pZg74s_bsoHV7j4OA8CFucndr1kCKXSSuptvBeR',
})

const sys = [
  '你是漫画分镜插画绘制引擎。只输出一个完整的 SVG 代码片段，不要任何解释。',
  '硬性要求：',
  '- 根标签 svg 必须带 xmlns 与 viewBox="0 0 800 1000"，宽度100% 高度100%。',
  '- 扁平矢量插画，画面填满整个画布，第一层是一个覆盖全画布的背景矩形。',
  '- 禁止出现任何可读文字、字母、数字、字幕；禁止外部引用与链接。',
  '- 只使用 rect / circle / ellipse / path / polygon / polyline / line / g / defs / linearGradient / radialGradient / clipPath。',
  '- 代码必须是合法可解析的 XML。',
].join('\n')

const user = [
  '画一格漫画插画。',
  '风格：日系治愈手绘风。柔和暖色调，细腻温柔的线条，纸质颗粒感。',
  '主角设定：短发女性，深棕色头发，米白色针织衫，肤色 #F2C9A8。',
  '场景：她坐在窗边的办公桌前，专注地看着笔记本电脑屏幕，桌上有一杯热咖啡和一盆小绿植，午后阳光从窗户斜射进来。',
  '构图：中景，人物位于画面右侧三分之一处。情绪：平静专注。',
].join('\n')

const t0 = Date.now()
let out = ''
for await (const c of cloud.llm.chat.completions.create({
  model: process.argv[2] || 'glm-5.3-flash',
  messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
  stream: true,
})) {
  const d = c?.choices?.[0]?.delta
  if (d?.content) out += d.content
}
console.log('elapsed ms', Date.now() - t0, 'len', out.length)
console.log(out.slice(0, 500))
console.log('...TAIL...')
console.log(out.slice(-200))
