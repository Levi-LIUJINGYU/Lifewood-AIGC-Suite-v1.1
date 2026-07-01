# Lifewood AIGC Suite

看板 (Dashboard) · 工作流程 (Workflow) · 分镜工作室 (Storyboard Studio)

## 发布到 GitHub Pages（推荐）

### 第一次：创建仓库并上传

1. 在 [GitHub](https://github.com/new) 新建仓库（例如 `lifewood-aigc-suite`），**不要**勾选 “Add a README”。
2. 在本项目文件夹打开终端，执行：

```bash
cd "c:\Users\liujingyu\Downloads\Lifewood-AIGC-Suite-v1.1"
git init
git add .
git commit -m "Initial commit: Lifewood AIGC Suite"
git branch -M main
git remote add origin https://github.com/你的用户名/lifewood-aigc-suite.git
git push -u origin main
```

3. 打开仓库 **Settings → Pages**：
   - **Source** 选 **GitHub Actions**（不要选 Deploy from a branch）
4. 等 1–2 分钟，Actions 跑完后访问：

```
https://你的用户名.github.io/lifewood-aigc-suite/
```

登录账号：`lifewood` / `lifewood`

### 以后：更新网站

改完代码或 `dashboard-data.json` 后：

```bash
git add .
git commit -m "描述你的修改"
git push
```

推送到 `main` 后，GitHub Actions 会自动重新发布，刷新网页即可看到新版本。

### 数据如何同步？

| 方式 | 页面修改是否全员可见 | 说明 |
|------|---------------------|------|
| **GitHub Pages** | 需把 `dashboard-data.json` 提交并 push | 在线页读取仓库里的 JSON；浏览器内修改只存在本机，要共享请导出备份后更新 JSON 再 push |
| **Start Lifewood AIGC.bat** | 是，实时 | 局域网 Node 服务器，修改自动写入 `dashboard-data.json` |

若需要**在线实时多人编辑**，GitHub Pages 无法运行 Node 后端，请继续用启动器，或部署到 [Render](https://render.com) 等支持 Node 的平台。

## 部署在 Cloudflare Pages（推荐用于团队在线协作）

详见 **[Lifewood-AIGC-Suite/CLOUDFLARE.md](Lifewood-AIGC-Suite/CLOUDFLARE.md)**。

要点：

1. 在 CF 创建 **KV**，绑定到 Pages 项目，变量名 `DASHBOARD_KV`
2. 仓库已包含 `functions/api/data.js`，提供与本地相同的 `/api/data` 读写
3. **网页修改** → 自动写入 KV，全员刷新可见
4. **本地文件与线上同步**：
   ```bash
   cd Lifewood-AIGC-Suite
   node scripts/sync-kv.mjs push   # 本地 dashboard-data.json → 线上
   node scripts/sync-kv.mjs pull   # 线上 → 本地备份
   ```

## 本地运行（完整功能）

双击 `Lifewood-AIGC-Suite/Start Lifewood AIGC.bat`（需安装 [Node.js LTS](https://nodejs.org)）。

详见 `Lifewood-AIGC-Suite/开始使用 READ ME.txt`。
