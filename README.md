# Lifewood AIGC Suite

看板 (Dashboard) · 工作流程 (Workflow) · 分镜工作室 (Storyboard Studio)

## 发布到 GitHub Pages

1. 推送到 `main` 后，GitHub Actions 自动部署（Settings → Pages → Source: **GitHub Actions**）
2. 访问：`https://liqingdao.github.io/Lifewood-AIGC-Suite-v1.1/`
3. 登录：`lifewood` / `lifewood`

```bash
git add .
git commit -m "描述修改"
git push
```

## 部署在 Cloudflare Pages（团队在线协作）

详见 **[CLOUDFLARE.md](CLOUDFLARE.md)**。

```bash
node scripts/sync-kv.mjs push   # 本地 dashboard-data.json → 线上 KV
node scripts/sync-kv.mjs pull   # 线上 KV → 本地备份
```

## 本地运行

双击 `Start Lifewood AIGC.bat`（需 [Node.js LTS](https://nodejs.org)）。详见 `开始使用 READ ME.txt`。
