/**
 * 通过本地 MCP 代理把源码推送到 GitHub。
 * 走 MCP 而不是逐个 Read 文件，是为了不把几百 KB 内容灌进对话上下文。
 *
 * 用法：node scripts/gh-push.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

/* ---------- 从环境里取 github MCP 的端点与凭据 ---------- */
const cfgRaw = process.env.CODEBUDDY_MCP_CONFIG
if (!cfgRaw) throw new Error('找不到 CODEBUDDY_MCP_CONFIG')
const cfg = JSON.parse(cfgRaw)
const gh = cfg.mcpServers?.github
if (!gh) throw new Error('MCP 配置里没有 github')
const MCP_URL = gh.url
const BEARER = gh.headers?.Authorization?.replace(/^Bearer\s+/, '')
if (!MCP_URL || !BEARER) throw new Error('github MCP 端点或凭据缺失')

let sessionId = ''
let seq = 0

async function rpc(method, params) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    ...(gh.headers || {}),
  }
  if (sessionId) headers['Mcp-Session-Id'] = sessionId
  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: ++seq, method, params }),
  })
  const sid = res.headers.get('mcp-session-id')
  if (sid) sessionId = sid
  const text = await res.text()
  // Streamable HTTP 可能返回 SSE，也可能是纯 JSON
  const chunks = text.split(/\r?\n\r?\n/)
  for (const c of chunks) {
    const line = c.split(/\r?\n/).find((l) => l.startsWith('data:'))
    if (line) {
      try {
        return JSON.parse(line.slice(5).trim())
      } catch {}
    }
  }
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text.slice(0, 500) }
  }
}

async function main() {
  const init = await rpc('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'worktoon-push', version: '1.0' },
  })
  console.log('initialize:', init?.result?.serverInfo?.name || JSON.stringify(init).slice(0, 120))
  await rpc('notifications/initialized', {})

  const list = await rpc('tools/list', {})
  const tools = (list?.result?.tools || []).map((t) => t.name)
  console.log('可用工具:', tools.join(', ') || '(空)')
  const toolName = tools.find((n) => /push_files/.test(n))
  if (!toolName) throw new Error('没有 push_files 工具')
  return toolName
}

/* ---------- 收集文件 ---------- */
const ROOT = process.cwd()
const SKIP_DIRS = new Set(['node_modules', 'dist', '.tmp', '.git', '.apptest-backup', 'test-output'])
const SKIP_FILES = new Set(['.gitignore.tmp'])

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const rel = relative(ROOT, p).split(sep).join('/')
    if (SKIP_DIRS.has(name) || SKIP_FILES.has(rel)) continue
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (st.size < 900_000) out.push({ path: rel, abs: p, size: st.size })
  }
  return out
}

const toolName = await main()
const all = walk(ROOT)
console.log(`待推送 ${all.length} 个文件，共 ${(all.reduce((n, f) => n + f.size, 0) / 1024).toFixed(0)} KB`)

const OWNER = 'chenzhe223-tech'
const REPO = 'worktoon'
const BRANCH = 'main'

// 分批：单批不超过 15 个文件且不超过 700KB，避免请求体过大
const batches = []
let cur = []
let curSize = 0
for (const f of all) {
  if (cur.length >= 15 || curSize + f.size > 700_000) {
    batches.push(cur)
    cur = []
    curSize = 0
  }
  cur.push(f)
  curSize += f.size
}
if (cur.length) batches.push(cur)

console.log(`分 ${batches.length} 批推送`)

for (let i = 0; i < batches.length; i++) {
  const files = batches[i].map((f) => ({ path: f.path, content: readFileSync(f.abs, 'utf8') }))
  const msg =
    batches.length === 1
      ? 'WorkToon: 工作日志漫画应用首次提交'
      : `WorkToon: 源码提交（第 ${i + 1}/${batches.length} 批）`
  console.log(`\n[${i + 1}/${batches.length}] 推送 ${files.length} 个文件：${files.map((f) => f.path).join(', ').slice(0, 160)}…`)
  const r = await rpc('tools/call', {
    name: toolName,
    arguments: { owner: OWNER, repo: REPO, branch: BRANCH, message: msg, files },
  })
  if (r?.error) {
    console.error('  失败:', JSON.stringify(r.error).slice(0, 400))
    process.exit(1)
  }
  const txt = r?.result?.content?.[0]?.text
  console.log('  结果:', String(txt || JSON.stringify(r).slice(0, 300)).slice(0, 300))
}

console.log('\n全部推送完成 → https://github.com/chenzhe223-tech/worktoon')
