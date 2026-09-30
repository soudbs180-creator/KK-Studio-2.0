# Plan：KK 原生生图传输修复

- Task ID：TASK-AGENT-008；状态：本地 IMPLEMENTED，精确 head review/托管交付待完成；日期：2026-10-01
- [Intent](intent.md) / [Spec](spec.md) / [Verification](verification.md)
- Owner：root；branch：codex/TASK-AGENT-008-image-transport
- Worktree：D:/kk-studio/.worktrees/TASK-AGENT-008-image-transport
- Base：709e51d5c30c9c9216a888c22592e7870df8901e；目标：PR → origin/main。
- 开工时 clean；其余登记 worktree 和用户实际项目保留。

## 开工证据

已读取 AGENTS、AI_RULES、PROMPTING、SDLC、BRANCH-POLICY、REVIEW、VERSIONING、DEVELOPMENT、governance、MEMORY-CONTRACT、UI_INDEX、相关功能卡及真实实现。独立 npm ci 完成，Node 24.19/npm 11；基线 lint/typecheck exit 0、Codex client 40/40。PRE-EXISTING FAILURE：新账号生图完成但 Base64 SSE 超限，属于本任务修复目标。

## 顺序与恢复

1. 记录真实失败、任务和短提示词审计；补 3 MiB 元数据传输、稀疏完成/失败和普通工具 result 回归，先验证 RED。
2. 在 codex-client normalizeItem 最小修复，保留文件读取和大小保护；运行 GREEN、完整 Agent、根事件流回归。
3. 递增 Desktop/Web patch，更新功能证据但不提升未验收功能；构建本 worktree 的生产 Agent/Tauri。
4. 用独立数据根目录/profile 经 KK composer 调用真实 Codex；验证归档、连续短聊天、重连/原生重启唯一恢复，记录 EXE/dist 与素材 hash。
5. 完整 verify、相关 Rust/client 检查、自审、提交后独立上下文 AI 精确 SHA review、PR 托管门禁与授权范围内主线推广。

没有并行实现者；独立 reviewer 只读已提交 diff 和证据。若 findings 导致代码改变，对新 SHA 复验/复审。其他任务无关 dirty/index 不碰。

回滚源代码即可，无存储迁移。素材原件保留；不提高 SSE 限制、不补假图、不使用 root 生图替代 KK 调用。豆包未登录不绕过其限制；正式发布、签名及未验收 Provider 保持原状态。

## 变更记录

- 用户切换账号后原生生成成功，暴露真实回传失败，因此从排查扩展到该最小修复，符合继续调用及全面检查授权。
- 初次修复后真实生成/归档成功，续聊检查发现两个异步导入完成会重复追加归档标记（画布节点仍一张）。新增确定性并发回归先失败后通过，提交前重检生成身份；保留 run4 原始失败，以全新 run5 数据/profile 再验收，不修改旧样本来伪造成功。
- run5 真实生图、续聊、两次重连和重启均 PASS。审计脚本首次遗漏按需启动 Agent、再次遗漏从首页打开已有项目，均保留失败记录；补齐实际 GUI 操作后复验 PASS，产品默认行为未改。完整 verify（632 root /172 Agent /377 browser，原平台 skip 保留）及 Rust97/fmt/clientcheck 通过。
