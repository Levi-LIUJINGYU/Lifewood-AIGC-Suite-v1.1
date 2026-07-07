# Lifewood AIGC Suite — Codex 迁移说明

> 把本文件 + 整个项目文件夹交给 Codex，即可理解架构、数据流与部署方式。

## 1. 项目是什么

**Lifewood AIGC Suite** 是 Bucked Up / Lifewood 团队的视频生产看板（纯前端 + 轻量后端），包含：

| 模块 | 文件 | 功能 |
|------|------|------|
| 主看板 | `index.html` | 7 阶段管线、视频追踪、文件同步模拟、西语状态、分析、管理 |
| 工作流程 | `workflow.html` | 管线说明、命名规则、角色分工（只读展示） |
| 分镜工作室 | `storyboard-studio.html` | AI 分镜/脚本生成（需用户自备 API Key） |
| 本地服务 | `serve.cjs` | Node 零依赖 HTTP 服务，局域网共享 + 写 `dashboard-data.json` |
| 线上服务 | `_worker.js` | Cloudflare Worker：静态资源 + KV 持久化 API |
| 数据文件 | `dashboard-data.json` | 默认/种子数据；本地模式下的持久化文件 |

**登录门控**（仅前端）：账号 `lifewood` / 密码 `lifewood`（可在浏览器改本地密码，不同步给他人）。

---

## 2. 目录结构

```
Lifewood-AIGC-Suite/
├── index.html              # 主应用（~160KB，单文件 SPA）
├── workflow.html           # 工作流程页
├── storyboard-studio.html  # 分镜 AI（~12MB，内嵌大量 base64 资源）
├── dashboard-data.json     # 团队数据（videos / team / sync_log / 目标等）
├── serve.cjs               # 本地 Node 服务器（端口 8765）
├── _worker.js              # Cloudflare Worker 入口
├── wrangler.jsonc          # CF 部署配置（KV binding: DASHBOARD_KV）
├── chart.umd.min.js        # Chart.js v4.4.1
├── logo.png
├── Start Lifewood AIGC.bat # Windows 一键启动本地服务
├── 开始使用 READ ME.txt
├── SHARING.md              # 手动导出/合并协作指南
├── README.md
├── CODEX_MIGRATION.md      # 本文件
├── .github/workflows/deploy-pages.yml  # GitHub Pages 自动部署
└── .assetsignore           # CF 静态资源忽略规则
```

**GitHub 仓库**：https://github.com/Levi-LIUJINGYU/Lifewood-AIGC-Suite-v1.1

---

## 3. 三种运行/部署模式

### A. 仅浏览器（`file://` 打开 index.html）

- 数据存在 **localStorage**（`bu_data` 等 key）
- **不会**多人同步
- 分镜 AI 在 `file://` 下可能被浏览器拦截

### B. 本地 Node 服务（推荐内网协作）

```bash
node serve.cjs
# 或双击 Start Lifewood AIGC.bat
```

- 监听 `0.0.0.0:8765`，局域网可访问
- API：
  - `GET /api/health` → `{ app: "lifewood-aigc-suite" }`
  - `GET /api/data` → 读取 `dashboard-data.json`
  - `PUT /api/data` → 写入 `dashboard-data.json`（body 需含 `videos` 数组）
- 前端检测到 health 后 `FILE_API=true`，每次 `save()` 自动 PUT

### C. Cloudflare（推荐公网团队协作）

- `_worker.js` 提供与 `serve.cjs` 相同的 `/api/*` 接口
- 数据存在 **KV**（key: `dashboard-data`，binding: `DASHBOARD_KV`）
- `wrangler.jsonc` 配置 KV Namespace ID
- 部署：`npx wrangler deploy` 或 CF Dashboard 连接 GitHub 自动部署
- 静态 HTML/JS 由 `env.ASSETS` 提供

### D. GitHub Pages（仅静态，无写入 API）

- `.github/workflows/deploy-pages.yml` 推送 `main` 后自动发布
- 可读仓库内 `dashboard-data.json`（只读回退）
- **网页内修改不会写回 GitHub**，需导出 JSON 再 commit

---

## 4. 数据模型

### 4.1 顶层 bundle（`buildBundle()` / `/api/data`）

```json
{
  "version": 1,
  "updated_at": "ISO8601",
  "custom_mode": true,
  "daily_video_goal": 20,
  "daily_stage_goal": 3,
  "daily_stage": "brief",
  "team": ["Gavin", "Ian", "Eva", "Pierce", "Vena"],
  "sync_log": [],
  "videos": [ /* 见下 */ ]
}
```

### 4.2 单条视频 `videos[]`

```json
{
  "id": 1,
  "project_id": "AIGC001",
  "video_id": "VID001",
  "product": "Creatine Monohydrate",
  "type": "T1",
  "name": "",
  "description": "",
  "priority": "high",
  "flag": false,
  "revisions": 0,
  "reason": "",
  "notes": "",
  "en": { "status": {}, "pic": {}, "completed_at": {}, "latest_file_name": "", ... },
  "es": { "status": {}, "pic": {}, "completed_at": {}, ... }
}
```

### 4.3 七个阶段 `STAGES`

`brief → script → voice → music → video → review → distribution`

### 4.4 状态 `STATUSES`

`not_started | in_progress | uploaded | reviewing | approved | rejected | completed`

**完成判定**：`approved` 或 `completed`（`DONE` 集合）。

### 4.5 localStorage 常用 key

| Key | 含义 |
|-----|------|
| `bu_data` | 视频数组缓存 |
| `bu_auth` | 是否已登录 |
| `bu_team` | 团队成员 |
| `bu_daily_video_goal` / `bu_daily_stage_goal` | 每日目标 |
| `bu_daily_stage` | 阶段产量统计所选阶段 |
| `bu_lang` | `en` / `zh` |

---

## 5. 前端核心逻辑（index.html）

| 函数/变量 | 作用 |
|-----------|------|
| `initData()` | 启动时探测 `/api/health`，成功则 `FILE_API=true` 并加载服务器数据 |
| `save()` / `persistToFile()` | 写 localStorage + 防抖 PUT 到服务器 |
| `buildBundle()` | 打包当前全部状态用于保存/导出 |
| `applyBundle(b)` | 从服务器/导入文件恢复状态 |
| `renderPipeline()` | 图一：各阶段完成数卡片（`stageDoneCount`，共 200 轨道） |
| `renderStageChart()` | 图二：分组柱状图，**左灰=计划**（`DAILY_STAGE_GOAL`），**右绿=完成**（`stageDoneCount`），柱内数字 |
| `buildStepEditor()` | 视频详情弹窗；EN/ES 标题行有**批量状态/批量负责人**下拉 |
| `modalBatchStatus()` / `modalBatchPic()` | 批量设置某语言轨道全部阶段 |

### 图表约定（近期已实现）

- 生产管线卡片：每阶段 `n / 200`（英+西合计完成数）
- 阶段柱状图：与卡片同源 `stageDoneCount()`；Y 轴留 25% 余量；柱内白/深绿数字

---

## 6. API 契约（serve.cjs 与 _worker.js 一致）

```
GET  /api/health  → { ok: true, app: "lifewood-aigc-suite", version: 1 }
GET  /api/data    → 完整 bundle JSON
PUT  /api/data    → body: bundle（必须含 videos[]）→ { ok: true, count, updated_at? }
```

---

## 7. 部署检查清单（Cloudflare）

1. 创建 KV Namespace，ID 写入 `wrangler.jsonc` → `kv_namespaces[0].id`
2. Pages/Workers 项目绑定 `DASHBOARD_KV`
3. `main` 指向 `./_worker.js`，`assets.directory` 为 `./`
4. 访问 `/api/health` 确认返回 `lifewood-aigc-suite`
5. 打开看板，右上角应显示「已保存 · 服务器」类提示（`FILE_API` 生效）

---

## 8. 开发约定

- **单文件为主**：业务逻辑集中在 `index.html` 的 `<script>` 内，无构建步骤
- **中英文**：`I18N.en` / `I18N.zh`，`t(key)` 取文案
- **改完推送**：`git add . && git commit && git push`（仓库 main 分支）
- **最小改动**：不要引入不必要的框架；与现有风格保持一致

---

## 9. 给 Codex 的常用任务示例

- 「修改阶段图表样式/数据口径」→ 搜 `renderStageChart`、`stageDoneCount`
- 「增加字段并持久化」→ 改 `buildBundle` / `applyBundle` / `dashboard-data.json` 结构，并确认 PUT 仍合法
- 「CF 部署问题」→ 查 `_worker.js`、`wrangler.jsonc`、KV binding
- 「局域网多人编辑」→ 用 `serve.cjs`，确保 `FILE_API` 与 `0.0.0.0` 监听
- 「视频详情批量操作」→ `buildStepEditor`、`modalBatchStatus`

---

## 10. 已知限制

- 登录仅为前端遮挡，**不是**服务端鉴权
- GitHub Pages **不能**运行 Node/KV 写入 API
- `storyboard-studio.html` 体积很大（内嵌图片），git/zip 较慢属正常
- 两人同时编辑同一视频：后保存者覆盖（last-write-wins）

---

*打包日期：2026-07-07 · 对应 Git commit 请以仓库 `main` 最新为准*
