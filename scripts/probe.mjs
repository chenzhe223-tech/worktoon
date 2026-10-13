import { createWorkBuddyCloud } from '@tencent-ai/workbuddy-cloud-sdk'

// minimal browser-ish shims for node probe
const mem = new Map()
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
}

const cloud = createWorkBuddyCloud({
  endpoint: 'https://worktoon.app.workbuddy.host',
  oauthRelayBaseUrl: 'https://www.workbuddy.cn/v2/as/genie-baas/oauth',
  publishableKey: 'wbpk_s00Kd07qwmB6cvq1pZg74s_bsoHV7j4OA8CFucndr1kCKXSSuptvBeR',
})

const model = process.argv[2] || 'hunyuan-image-alpha'
const prompt = process.argv[3] || '一只橙色的小猫坐在书桌前用笔记本电脑工作，日系治愈手绘风，柔和暖色'

async function main() {
  try {
    const models = await cloud.llm.models.list()
    console.log('models ok, count=', models?.length)
  } catch (e) {
    console.log('models.list failed:', e?.message || e)
  }
  let out = ''
  try {
    for await (const chunk of cloud.llm.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt },
      ],
      stream: true,
    })) {
      const d = chunk?.choices?.[0]?.delta
      if (d?.content) out += d.content
    }
  } catch (e) {
    console.log('ERROR', e?.error?.code || '', e?.error?.message || e?.message || e)
  }
  console.log('=== OUTPUT LEN', out.length)
  console.log(out.slice(0, 1500))
}

main()
