# Cloudflare 部署与数据同步

看板在 Cloudflare Pages 上通过 **Pages Functions + KV** 保存数据，接口与本地 `serve.cjs` 相同（`/api/health`、`/api/data`），网页修改会**自动写入 KV**，全员刷新即可看到最新数据。

## 一、首次部署（一次性）

### 1. 创建 KV 命名空间

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. **Workers & Pages** → **KV** → **Create a namespace**
3. 名称例如：`lifewood-dashboard`
4. 复制 **Namespace ID**

### 2. 配置项目

1. 把 `wrangler.toml` 里的 `REPLACE_WITH_YOUR_KV_NAMESPACE_ID` 换成上面的 ID
2. **Workers & Pages** → 你的 Pages 项目 → **Settings** → **Functions**
3. **KV namespace bindings** → Add:
   - Variable name: `DASHBOARD_KV`
   - KV namespace: 选刚创建的命名空间

### 3. 连接 Git 并发布

- **Build output directory**: `Lifewood-AIGC-Suite`（若仓库根目录就是该文件夹则填 `.`）
- **Build command**: 留空（纯静态）
- 推送代码后 Cloudflare 自动部署

### 4. 验证

打开 `https://你的域名/api/health`，应返回：

```json
{"ok":true,"app":"lifewood-aigc-suite","version":1}
```

打开看板，右上角应显示 **「已保存 · 服务器」**（不是「数据来自 GitHub」）。

---

## 二、数据如何同步？

| 场景 | 做法 |
|------|------|
| **日常：网页上改数据** | 无需操作。保存后写入 KV，同事刷新或重新登录即可 |
| **本地 JSON → 线上（覆盖）** | `node scripts/sync-kv.mjs push` |
| **线上 → 本地备份** | `node scripts/sync-kv.mjs pull` |
| **首次上线** | 部署后第一次打开 `/api/data` 会自动把仓库里的 `dashboard-data.json` 导入 KV |
| **改网页代码** | `git push`，Cloudflare 自动重新部署（**不会**覆盖 KV 里已有数据） |

### 同步脚本前置条件

```bash
npm install -g wrangler
wrangler login
cd Lifewood-AIGC-Suite
node scripts/sync-kv.mjs push   # 或 pull
```

也可设置环境变量 `KV_NAMESPACE_ID` 而不改 `wrangler.toml`。

---

## 三、与 Git / 本地的关系

```
浏览器编辑 ──PUT──► Cloudflare KV ◄── 全员读取 GET /api/data
                         ▲
                         │ sync-kv.mjs push / pull
                         ▼
              本地 dashboard-data.json（备份 / 迁移用）
```

- **线上真实数据源**：KV（运行时）
- **Git 里的 `dashboard-data.json`**：模板 / 备份，首次部署时导入 KV，之后以 KV 为准
- 需要把线上数据固化进 Git：先 `pull`，再 `git commit` + `push`

---

## 四、常见问题

**右上角显示「数据来自 GitHub」**  
说明 `/api/health` 未生效。检查 KV 是否绑定为 `DASHBOARD_KV`，Functions 是否已部署。

**push 会覆盖同事在线改的数据吗？**  
会。只在迁移或恢复备份时使用 `push`；日常请直接在线编辑。

**能用 R2 代替 KV 吗？**  
可以，但需改 `functions/api/data.js`。当前数据量用 KV 足够（单 key 最大 25MB）。
