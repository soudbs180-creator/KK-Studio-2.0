# Plan：上传 KK Studio 2.1.0 源码候选

- Task ID：REL-2.1.0
- 状态：IMPLEMENTED
- 日期：2026-09-23
- Intent / Spec / ADR：本目录 `intent.md`、`spec.md`；无 ADR。
- Owner / branch / worktree：当前 agent / `chore/TASK-CONSOLIDATE-200` / `D:/kk-studio/KK-Studio-2.0`。
- Base / HEAD SHA 与远端目标：`origin/main@3c4d012846e53095bd4f11343a1cd2ef61aa3bbd`；开始时 HEAD `cf344ddcdf039c6e62aeb9c65106e2a2339c0bb4`；`origin`。
- Git dirty/index 状态、并行任务与文件归属：开始前 160+ 个 tracked/untracked 路径为此前各任务回传的 dirty 候选；其他 worktree 保持原状，不重置、不清理、不移动。

## 开工证据

- 已读取的规则、账本、规范和实现：`AGENTS.md`、`AI_RULES.md`、`docs/engineering/{PROMPTING,SDLC,BRANCH-POLICY,REVIEW}.md`、`docs/governance/PROJECT_STATE.md`、版本相关源码和 Git 状态。
- 依赖/工具版本与安装：复用当前 `node_modules`；Node 版本以检查输出为准；未执行 npm install 以免改变工作树。
- 基线 lint/typecheck/相关测试：本轮重新执行并在 `verification.md` 记录；历史文档中的数字不作为当前 SHA 证明。
- PRE-EXISTING FAILURE 与关联任务：初始 dirty tree 来自 TASK-AGENT/UI/DS 等已记录候选；不把历史“未提交”写成正式远端状态。
- 计划中 AI 自主事项：同步版本、保留历史证据、运行本地门禁、提交明确 diff、推送任务分支并回读远端 SHA。
- 必需外部条件与已存在的用户授权：用户已明确授权上传代码和版本更新；Git 远端凭据由本机 Git 管理。

## 实施顺序

| 步骤 | 文件/模块 | 改动和目的 | 依赖 | 验证 |
| --- | --- | --- | --- | --- |
| 1 | package/npm/Tauri/VERSION | 将运行时版本统一为 2.1.0 | 当前 dirty tree 盘点 | 精确版本搜索 |
| 2 | App/Account/Plugin/MCP | 使用同一 `appVersion`，消除 2.0.0 硬编码 | 步骤 1 | typecheck/unit 定向检查 |
| 3 | README/RELEASE/CHANGELOG/docs change | 记录用户可见变更和未验证边界 | 步骤 1–2 | 文档/治理检查 |
| 4 | staged diff/self-review | 复核路径、凭据、历史证据和存储身份 | 步骤 1–3 | staged diff、secret/marker 搜索 |
| 5 | commit/push | 上传当前候选到 `origin/chore/TASK-CONSOLIDATE-200` | 步骤 4 | push 输出、`ls-remote` |

## 并行与冲突

- 可独立的任务/文件、各自 worktree：无；本次版本元数据与当前 dirty 候选必须串行提交。
- 同文件写入的串行顺序：先版本源文件，再文档状态，最后 staged review。
- 整合负责人、目标 branch/base 和同步策略：当前 agent；目标为任务分支，基线为 origin/main；不直接写 main。
- 冲突后重新验证的范围：版本文件、变更文档、Git tree 和受影响定向测试。

## 风险与恢复

- 最危险的失败场景与预防：把历史 2.0.0 证据当成当前版本或把用户数据/凭据加入提交；通过精确路径更新、secret 搜索和 staged diff 预防。
- 数据备份/原件保护/回滚或补偿：提交前保留 dirty tree；原提交 `cf344dd...` 与工程外恢复归档不改动。
- 触发恢复的条件及 runbook：版本检查或 push 失败时保留本地提交/差异，修正后新增提交；不 force push。
- 高风险外部动作的授权、权限和费用边界：只推送现有 Git 远端；不改生产、账号、账单或远端规则。
- 不选择的方案及理由：不直接推送 main 或创建不可回写的 v2.1.0 tag，等待 PR/CI/main 条件满足。

## 验证和交付

- 定向回归：版本搜索、typecheck、unit、lint/format/ui/build/verify（按实际结果记录）。
- 完整验证与必要 Rust/native/live 检查：本次源码上传会执行适用本地检查；真实 Provider、签名安装包、Hosted CI 不由本地替代。
- UI 的 Figma/DOM/截图、1421/1423/Tauri 证据：版本文案不改变 UI 几何；不新增运行态证据，沿用历史证据并标注其 SHA 范围。
- 独立 reviewer 与当前 SHA 审查：本轮保留 self-review；没有第二账号/独立 AI 上下文时明确 NOT VERIFIED。
- 文档、账本、PROJECT_STATE/HANDOFF/PROGRESS 更新：追加当前 2.1.0 上传候选和实际提交信息。
- PR、用户产品验收、发布和回滚记录：push 后若无 GitHub CLI/PR 工具则记录 BLOCKED；不伪造已合并。
- 暂不可验证项及准确状态：安装包、tag、PR/CI/main merge、真实服务均 NOT VERIFIED/PENDING。

## 计划变更记录

- 2026-09-23：开始时确认远端没有当前任务分支、`gh` CLI 不可用；保持 Git CLI push 路径，PR/CI 结果以远端回读为准。
