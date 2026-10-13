# WorkToon · 工作日志漫画

每天花 1~3 分钟写下今天的工作，AI 把它变成一篇属于你的 4 / 6 / 8 格漫画，长期积累成个人漫画集。

- 在线使用：<https://worktoon.app.workbuddy.host/>
- 源码仓库：<https://github.com/chenzhe223-tech/worktoon>
- 移动端优先：iOS Safari / Android Chrome / 鸿蒙浏览器，单手可操作，无横向溢出
- PWA：可添加到主屏幕，具备基础离线能力

---

## 它怎么工作

生成过程分 5 个阶段，不是"一句话变一张图"：

1. **理解**：从工作日志里提炼客观事实（禁止推测与编造）
2. **分镜**：写成有开头、发展、结尾的漫画脚本，每格绑定真实事实，并分配景别
3. **出图**：逐格生成画面（画完一格就立刻显示，不用等全部完成）
4. **排版**：对白与旁白由网页用真实文字组件叠加，可编辑 —— 图片里不画任何文字
5. **保存**：作品、分镜、图片全部落到云端，换设备也不丢

生成过程在模块层运行，**离开页面不会中断**；刷新、关掉再回来都能接着看进度。哪一格不满意可以单独重画。

---

## 技术栈

| 层 | 选型 |
| --- | --- |
| 前端 | React 18 + TypeScript + Vite 5 |
| 样式 | 手写 CSS 设计系统（CSS 变量 + 移动优先，无 UI 框架依赖） |
| 后端 | WorkBuddy 云服务（Auth / Database / Storage / LLM 一体式 Serverless） |
| 数据库 | PostgreSQL（PostgREST 风格访问），6 张表 + RLS 行级权限隔离 |
| 路由 | hash 路由（便于静态托管） |

### 数据模型（6 个实体）

`profiles` · `journal_entries` · `comics` · `comic_panels` · `generation_tasks` · `assets`

全部带 `owner_id TEXT DEFAULT auth.uid()` 并开启 RLS，用户只能读写自己的数据。

---

## 12 种画风

每种画风都有**独立的视觉定位、色彩体系、线条、光影、构图、镜头节奏、专属提示词与专属排除项**，不是同一套提示词换名字：

日系治愈手绘风 · 美国西部漫画风 · 中国古典水墨风 · 现代科技赛博风 · 欧洲经典图像小说风 · 超级英雄动作风 · 黑白日漫风 · 复古美式波普风 · Q 版萌系职场风 · 现代杂志插画风 · 中国现代国漫风 · 黑色电影悬疑风

提示词组装采用固定五段式，避免提示词无限膨胀：

```
公共质量规范 + 当前画风规范 + 本篇 Art Direction + 固定角色描述 + 本格内容 + 排除项
```

- `COMIC_QUALITY_BASE`：所有画风共享的质量底线（人物造型、环境层次、真实性、18 条排除项）
- `buildArtDirection(style, seed)`：一篇漫画只生成一次，所有分镜共享，杜绝画风漂移
- `shotPlan(n)`：镜头节奏表（远景 / 全景 / 中景 / 近景 / 特写），保证相邻格景别不重复

---

## 本地运行

```bash
npm install
npm run dev          # 开发
npm run build        # 构建（产物在 dist/）
npm run start        # 本地预览构建产物
```

回归测试（会真实调用模型）：

```bash
npm run test:styles  # 12 种画风出图 + 体检 + 生成对比页（test-output/styles-preview.html）
npm run test:story   # 分镜层检查：事实绑定 / 景别不重复 / 是否编造
```

PWA 图标由脚本生成：仓库只保留 `public/icon.svg`，PNG 不入库，clone 后执行：

```bash
node scripts/gen-icons.mjs     # 生成 public/icon-180.png / 192 / 512
```

### 接入你自己的云服务

修改 `src/lib/config.ts`：

```ts
export const PUBLIC_CONFIG = {
  endpoint: '<你的应用域名>',
  oauthRelayBaseUrl: '<OAuth 中继地址>',
  publishableKey: '<可公开的前端密钥>',
}
```

---

## ⚠️ 部署注意事项（重要）

1. **不能部署到 GitHub Pages / Vercel 等第三方静态托管当作线上应用使用。**
   后端接口走 `/.cloud/` 路径，由 WorkBuddy 托管平台在应用自己的域名下提供代理。
   实测从 `*.github.io` 跨域调用会返回 **403 且不放行 CORS**，登录、数据库、图片生成会全部失效。
   要让它真正跑起来，需要托管在能提供 `/.cloud` 代理的环境（当前是 WorkBuddy 应用托管）。

2. **入口是「恒定引导页 + 带时间戳真身」**：
   `index.html` 内容永不改动，只做跳转 `location.replace('./app.html?t=' + Date.now())`；
   真身 `app.html` 每次构建都变。这样即便中间层缓存了首页，用户也总能拿到最新版本。
   Service Worker 只缓存带 hash 的静态资源，**绝不缓存 HTML**。

3. **`publishableKey` 是设计上可公开的前端密钥**，放在仓库里是正常的（前端必须拿到它）。
   但请注意：本仓库公开后，任何人都能拿这个 key 调用你的云端额度。
   如需避免，请改为私有仓库，或自行申请云服务并替换 `src/lib/config.ts`。

---

## 已知限制

- 云端当前**没有可用的图像生成模型**（`hunyuan-image-alpha` 报参数错误，`/llm/images/generations` 路由不存在）。
  画面链路是：大模型逐格生成 SVG 矢量插画 → 前端清洗 → Canvas 栅格化成 PNG → 上传云端存储。
  画面由模型真实生成，不是占位图，但细腻度比不上真正的图像模型。
- 跨格、跨日的人物一致性仍是弱项。Art Direction、固定角色描述与可选参考图能提升稳定性，但做不到绝对一致。
- 单格生成约 70~90 秒，6 格约 6~8 分钟。

---

## 目录结构

```
worktoon/
├─ app.html                 Vite 入口（真身）
├─ public/
│  ├─ index.html            恒定引导页（内容永不改动）
│  ├─ sw.js                 Service Worker
│  └─ manifest.webmanifest  PWA 清单
├─ src/
│  ├─ lib/art.ts            12 种画风配置 + 公共质量基准 + Art Direction + 提示词组装
│  ├─ lib/ai.ts             阶段一理解 / 阶段二分镜 / 阶段三出图
│  ├─ lib/generate.ts       生成状态机（离开页面不中断）
│  ├─ lib/data.ts           全部数据库访问
│  ├─ lib/export.ts         长图导出 / 分享 / 下载
│  ├─ pages/                7 个页面
│  └─ components/ui.tsx     图标与基础组件
├─ scripts/                 图标生成与回归测试脚本
└─ test-output/             画风回归测试产物（未入库，跑 test:styles 后生成）
```

---

## 许可

MIT
