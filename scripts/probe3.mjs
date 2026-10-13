const KEY = 'wbpk_s00Kd07qwmB6cvq1pZg74s_bsoHV7j4OA8CFucndr1kCKXSSuptvBeR'
const EP = 'https://worktoon.app.workbuddy.host/.cloud/llm/chat/completions'
const prompt = '一位年轻职场女性坐在办公桌前用笔记本电脑工作，日系治愈手绘风格，柔和暖色调，画面中不出现文字'

async function call(name, body) {
  try {
    const res = await fetch(EP, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-wb-webapp-access-key': KEY,
      },
      body: JSON.stringify(body),
    })
    const text = await res.text()
    console.log(`[${name}] status=${res.status}`)
    console.log(text.slice(0, 900))
  } catch (e) {
    console.log(`[${name}] ERR`, e.message)
  }
  console.log('---')
}

await call('stream-false', {
  model: 'hunyuan-image-alpha',
  messages: [{ role: 'user', content: prompt }],
  stream: false,
})

await call('stream-false-sys', {
  model: 'hunyuan-image-alpha',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: prompt },
  ],
  stream: false,
})

await call('stream-false-size', {
  model: 'hunyuan-image-alpha',
  messages: [{ role: 'user', content: prompt }],
  stream: false,
  size: '1024x1024',
  n: 1,
})
