# Team sharing guide — manual (Export / Merge)

This dashboard stores data **in each person's own browser**, so there is no automatic
syncing. Use this simple workflow to work as a team without overwriting each other.
分享指南（中文见下方）。

## Roles
- **Keeper** — ONE person owns the master copy of the data (suggest: Gavin or Vena).
- **Everyone else** — edits only the videos assigned to them, then sends their "slice" to the Keeper.

## Setup (once)
1. **Send the app:** share `Bucked-Up-Dashboard.zip`. Each person **extracts it** (right‑click → Extract All) and opens `index.html`.
2. **Send the starting data:** the Keeper clicks **Export backup** and sends everyone the `.json`.
   Each person clicks **Import** once to load the same baseline.
3. **Divide the work:** decide who owns which videos (e.g. by product, by Task ID range,
   or by PIC). Tip: assign a **PIC** to each step in the popup so you can filter to your own.

## Daily loop
**Each team member:**
1. Update your videos (set each stage's status, set PICs, names, descriptions, priority, flags, notes).
   In production, simply naming files per the convention keeps the dashboard current automatically.
2. Narrow to just your videos — use the **filters** (e.g. PIC = your name) or tick the
   row checkboxes to select them.
3. Click **Export slice** → this saves only *your* videos to a `.json`.
4. Send that file to the Keeper.

**The Keeper:**
1. Click **Merge** and pick a teammate's slice file. It updates **only the videos in that file**
   (matched by Task ID) and leaves everyone else's work untouched. Repeat for each teammate.
2. After merging everyone, click **Export backup** → send the fresh master back out as the new baseline.

## Rules to avoid clashes
- **Only the Keeper uses Merge / Import.** Team members only **Export slice**.
- **Each video has one owner.** Two people editing the same video will still clash — divide cleanly.
- **Import = replace everything; Merge = combine by Task ID.** Team members should never click Import on
  a teammate's file (it would wipe their own data).
- Back up before big changes — **Reset** auto-downloads a backup and offers one‑click Undo.

> Want true live collaboration (everyone on one link, edits appear instantly, no files to pass around)?
> That's the online version described in `README.md` — ask to have it set up when you're ready.

---

# 团队分享指南 — 手动（导出 / 合并）

本看板的数据保存在**每个人自己的浏览器**中，不会自动同步。请按以下流程协作，避免互相覆盖。

## 角色
- **管理员（Keeper）** — 由**一人**保管主数据（建议 Gavin 或 Vena）。
- **其他成员** — 只编辑分配给自己的视频，然后把自己的「部分」发给管理员。

## 初始设置（一次）
1. **分发应用：** 发送 `Bucked-Up-Dashboard.zip`，每人**解压**（右键 → 全部解压）后打开 `index.html`。
2. **分发初始数据：** 管理员点击**导出备份**并发给所有人；每人点击一次**导入**以载入相同基线。
3. **分工：** 约定谁负责哪些视频（按产品、按任务编号区间或按负责人 PIC）。建议在弹窗中为每个步骤指定 **PIC**，方便筛选出自己的视频。

## 日常流程
**每位成员：**
1. 更新你的视频（设定每个阶段的状态、PIC、名称、描述、优先级、标记、备注）。在生产环境中，只要按命名规则命名文件，看板会自动保持最新。
2. 用**筛选**（如 PIC = 你的名字）或勾选行复选框，只显示/选中你的视频。
3. 点击**导出部分** → 仅保存*你的*视频为 `.json`。
4. 把该文件发给管理员。

**管理员：**
1. 点击**合并**并选择某成员的文件。它只会按**任务编号**更新该文件中的视频，其他人的工作保持不变。对每位成员重复。
2. 全部合并后，点击**导出备份** → 把最新主数据作为新基线发回给大家。

## 避免冲突的规则
- **只有管理员使用 合并 / 导入。** 成员只用**导出部分**。
- **每个视频只有一个负责人。** 两人编辑同一视频仍会冲突，请清晰分工。
- **导入＝整体替换；合并＝按任务编号合并。** 成员切勿对同事的文件点击「导入」（会覆盖自己的数据）。
- 大改动前先备份 —— **重置**会自动下载备份并提供一键撤销。

> 想要真正的实时协作（所有人打开同一链接、修改即时同步、无需传文件）？
> 那是 `README.md` 中描述的在线版本 —— 准备好后可以请人帮你部署。
