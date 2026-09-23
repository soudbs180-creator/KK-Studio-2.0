# 功能卡片模板（FEAT-XXX）

> 复制本文件为 `feat-<kebab-name>.md`，并在 `features.registry.json` 登记。一个功能一张卡，卡片是该功能的唯一人类可读入口；任务进度以 `docs/governance/task-ledger.json` 为权威，卡片只做产品能力视角的映射，不复制任务状态。

# <功能中文名>（FEAT-XXX）

- 状态：REAL / PARTIAL / PROTOTYPE / PLANNED（定义见 `docs/features/README.md`；状态必须与 registry 一致）
- 领域：creation / canvas / intelligence / platform / system / backend / future
- 最近更新：YYYY-MM-DD
- 关联任务：<账本任务 ID，逗号分隔；至少一个，未完成功能必须挂开放任务，排除 DONE/OBSOLETE>

## 用户可见入口

- UI 入口（route、按钮、设置分区）与用户能做什么：
- Desktop / Web / Mobile 差异：

## 代码位置

- 前端：`src/...`
- 桌面 Rust：`src-tauri/src/...`（无则写“无”）
- 服务端：`src/features/generation-server/...`（无则写“无”）
- 数据/存储：localStorage key / IndexedDB / `%APPDATA%/kk-studio` / 系统凭据库 / SQLite 表

## 测试与证据

- registry 填 platforms（web/desktop/service 中实际适用项），REAL 还要逐平台 runtimeEvidence: [{ platform, path }] 与至少一个 DONE/PASS 任务。平台不适用时在卡片解释；静态门禁只验证引用结构，独立审核验证证据内容。

- 单测：`tests/unit/...`
- 浏览器回归：`tests/browser/...`
- Rust 测试 / 实机验收：
- 变更与验证证据：`docs/changes/...`、`docs/evidence/...`

## 当前能力

- 已真实可用（REAL）的子能力，逐条列出：
- 明确标注哪些只是本地 fixture / Prototype / NOT VERIFIED：

## 差距与后端化

- “UI 已显示但后端未接”的点：
- “已实现但未验证”的点（含 Web/Desktop 差异）：
- 变成 REAL 还缺什么（链路、服务、凭据、部署），对应哪个任务/哪一波（见 `docs/features/BACKEND-ROADMAP.md`）：
- 外部依赖与阻断条件：

## 变更记录

- YYYY-MM-DD：创建卡片 / 状态变更（附任务或变更目录链接）。
