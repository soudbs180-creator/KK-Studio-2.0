# Git pre-push 路径兼容 Implementation Plan

> 使用 superpowers:executing-plans 在当前隔离 worktree 自主实施；原用户已授权实施，不追加阶段审批。

**Goal:** 合法推送不因 Windows 路径格式被误杀，保护规则不减弱。

**Architecture:** shell 启动边界显式转换原生路径；策略保持不变；安装器按精确 v1 指纹执行显式升级。

**Tech Stack:** Node 24、Git、POSIX sh、Git for Windows cygpath。

**Spec:** [spec.md](spec.md)。

## Global Constraints

- 不覆盖自定义 hook，不设置或取消 `core.hooksPath`，不绕过本地或远端保护。
- 保留 stdin/cwd/远端参数；不使用 shell eval；产品版本不递增。
- PR 依赖 #47；当前 Linux 验证与 Windows Hosted 验证分别记录。

## Review Focus

- 多级空格和超过 260 字符的路径；三种真实 fixture 各验证允许与拒绝。
- 禁用 MSYS 自动参数转换；启动边界测试与 Windows 原生用例。
- 转换失败、空输出、策略或 Node 缺失；可读失败关闭。
- 已修改/不完整 v1、备份占用、写失败；不得覆盖未知文件或丢失旧钩子。
- common hooks/linked worktree；原有集成用例继续通过。

## Task 1：启动修复与可部署升级

Files：修改 `.githooks/pre-push`、`scripts/install-git-guards.mjs`；测试 `tests/unit/gitPushGuardPaths.test.ts`、`tests/unit/gitPushPolicy.test.ts`；添加不可变 v1 fixture。

- [x] 编写六个真实 Git 路径用例、原生路径启动边界及 v1 升级回归。
- [x] 运行新增测试，保留启动边界及升级拒绝的 RED 证据；真实 Linux 路径用例可能原本通过，不能声称它们复现 Windows。
- [x] 在 hook 中转换路径、添加可读失败；安装器增加显式精确 v1 升级及排他备份。
- [x] 运行所有 hook 测试，验证合法远端 refs 更新、非法 refs 不变及安装安全性。
- [x] 同步升级使用说明；添加 Windows 独立快速回归 job，不替代现有 verify/delivery。
- [x] 运行 typecheck、lint、npm test、build 与完整 verify，记录实际失败/跳过边界。
- [ ] 当前 diff 独立上下文审查，修复阻断项，提交并创建 Draft PR。
