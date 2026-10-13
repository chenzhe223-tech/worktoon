import { createWorkBuddyCloud } from '@tencent-ai/workbuddy-cloud-sdk'

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

const prompt = '一位年轻职场女性坐在办公桌前用笔记本电脑工作，日系治愈手绘风格，柔和暖色调，画面中不出现文字'

async function run(name, opts) {
  let out = ''
  try {
    for await (const chunk of cloud.llm.chat.completions.create(opts)) {
      const d = chunk?.choices?.[0]?.delta
      if (d?.content) out += d.content
      if (chunk?.choices?.[0]?.finish_reason) console.log(name, 'finish=', chunk.choices[0].finish_reason)
    }
    console.log(`[${name}] OK len=${out.length}`)
    console.log(out.slice(0, 600))
  } catch (e) {
    console.log(`[${name}] ERR`, JSON.stringify(e?.error || {}), e?.status || '', e?.message || '')
  }
  console.log('---')
}

await run('no-system', {
  model: 'hunyuan-image-alpha',
  messages: [{ role: 'user', content: prompt }],
  stream: true,
})

await run('with-system', {
  model: 'hunyuan-image-alpha',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: prompt },
  ],
  stream: true,
})

await run('img-with-size', {
  model: 'hunyuan-image-alpha',
  messages: [{ role: 'user', content: prompt }],
  stream: true,
  size: '1024x1024',
})

await run('text-model', {
  model: 'glm-5.3-flash',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: '回复“OK”两个字' },
  ],
  stream: true,
})
