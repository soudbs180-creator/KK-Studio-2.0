# Release：KK Studio 2.1.0 源码上传候选

- Task ID / PR：REL-2.1.0 / PR 待远端创建
- 记录状态：SOURCE UPLOADED；PR/CI/main/tag 待完成
- 目标平台/环境：Windows 本地 Git checkout；目标远端 `origin` 的任务分支
- 版本、main/source commit、tree SHA：版本 2.1.0；main 基线 `3c4d012846e53095bd4f11343a1cd2ef61aa3bbd`；已上传并独立补审的源码 commit `15f1f2792ab9cc7d3202c9ff97b040b7e013254d` / tree `ae2bbbb79ad80783194268dae41882258571a6cf`。本交付记录的后续提交会使分支 HEAD 前移，以 `git ls-remote` 回读为准。
- 构建机器/工具版本与时间：Windows PowerShell；本次不生成安装包，实际检查命令补录。
- Web bundle / 安装包 / EXE / 部署包 hash：本地 Web `dist/assets/index-BbPXZEcM.js` SHA-256 `F76DEC0D77D4036E243FA72516ADE2C8E4F9071B6E4847A13C3CA03DB5A9C5BD`，未作为发布包提交；安装包、EXE、部署包 NOT GENERATED。
- CI / verification / 当前 SHA 独立 review：本地单测、浏览器、类型、lint、构建和 Rust check 已通过；独立补审在 `15f1f27` 确认 P1 关闭、无未解决 P0/P1，Desktop 插件 P2 保持开放；Hosted CI 待完成。
- 用户验收和发布授权：用户明确授权源码上传和版本更新；正式产品验收/生产发布未发生。

## 发布前核对

- 正确 remote、目标 main 与最新 PR/CI/ruleset 回读：`origin/chore/TASK-CONSOLIDATE-200` 已上传并与首次推送的本地 HEAD 一致；`origin/main` 仍为 `3c4d012`，PR/CI/ruleset 尚未验证。
- 来源无未整合任务，工作树与发布包可追溯：当前 dirty 候选包含多项此前未提交任务；本次提交绑定全部当前授权内容，历史 worktree 不清理。
- 所有 merge/release blockers：main 直接推送禁止；安装包和真实桌面发布未验证；Desktop 插件 CSP 缺口登记 PLUGIN-DESKTOP-001，不能宣称插件桌面验收。
- Desktop/Web/Mobile 的实际发布范围和 Prototype 能力：本次只上传源码和元数据；真实 Provider、ComfyUI、云端账号/计费继续保持现有 Prototype/PARTIAL 边界。
- schema/兼容、升级、备份与恢复实证：存储 key、identifier 和 schema 版本不变；既有恢复归档保留。
- 凭据/权限、资源与费用边界：不把凭据写入提交；只使用现有 Git 远端权限。
- 变更说明和用户可观察结果：应用元数据和版本显示为 2.1.0，CHANGELOG 记录兼容功能候选。

## 执行计划与实录

| 步骤 | 命令/工具和目标 | 已有授权范围 | 实际结果/退出码 | 时间/证据 |
| --- | --- | --- | --- | --- |
| 1 | 更新版本源、文档和 change package | 用户已授权 | 已执行 | 2026-09-23 |
| 2 | 本地 lint/typecheck/test/build/native 检查（按可执行命令） | “上传并且检查” | 367 Node、299 browser + plugin 定向2、78 Rust、Agent 126 passed/2 skipped、typecheck/lint/UI/build 通过；历史证据的行尾空白单独披露 | 2026-09-23 |
| 3 | `git add -- <明确路径>`、审阅 staged diff、commit | 用户已授权 | `b3081c8` 源码候选、`c3fbcb8` 交付补录、`56468c3` HTTPS 安全修复和 `15f1f27` 重定向封锁已提交 | 2026-09-23 |
| 4 | GitHub Desktop 发布分支；`git push -u origin chore/TASK-CONSOLIDATE-200` | 用户已授权 | Desktop 因其进程 PATH 缺少 `node` 被现有 pre-push hook 拒绝；终端保留钩子正常执行，Git push 退出码 0 | 2026-09-23 |
| 5 | `git ls-remote --heads origin chore/TASK-CONSOLIDATE-200` 回读 | 只读核验 | 首次远端 HEAD `15f1f2792ab9cc7d3202c9ff97b040b7e013254d`，与当时本地 HEAD 一致；`origin/main` 仍为 `3c4d012` | 2026-09-23 |
| 6 | PR/CI/main merge/tag | 分支策略要求额外门禁 | NOT EXECUTED | 待远端工具和平台门禁 |

## 发布后验证与监控

- 实际 runtime、URL/版本/hash：远端源码分支为 `https://github.com/soudbs180-creator/KK-Studio-2.0/tree/chore/TASK-CONSOLIDATE-200`；本地 Web bundle hash 见上，不生成新原生 runtime 包。
- 主路径、错误、离线/恢复、原件一致性：不改变既有实现；相关历史证据保留原 SHA 含义。
- 健康指标、监控：未配置；本次不是生产部署。
- 安装/升级/重启/回滚验证：NOT RUN；待独立桌面发布任务。
- 未验证边界：PR/CI、main 合并、不可变 tag、安装包、签名和真实服务。

## 回滚与保留

- 触发条件、旧产物/数据备份位置与 hash：回滚到提交前 `cf344ddcdf039c6e62aeb9c65106e2a2339c0bb4` 或工程外恢复归档；不覆盖 `%APPDATA%/kk-studio`。
- runbook、权限、授权边界：Git 新提交修正；不 force push、不删除分支。
- 还原演练及还原后的校验：本次不重复执行，沿用恢复归档既有证据并标注历史范围。
- 用户只使用最新稳定入口；保留 Git 历史、不可变 tags、证据和必要回滚产物。
- 短期分支清理：未授权，保持现状。

## 收口

- 实际发布/回滚状态：源码任务分支已上传；不等同正式发布。
- 用户可操作入口：远端任务分支；PR/合并需后续平台操作。
- 任务账本/PROJECT_STATE/PROGRESS/HANDOFF：本目录和项目状态文档同步补录。
- 后续监控或缺陷任务：T5/T6/T7、真实服务、安装恢复和 Hosted CI 按现有账本继续。
