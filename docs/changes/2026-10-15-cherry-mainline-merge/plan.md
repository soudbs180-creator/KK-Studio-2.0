# PR58 主线融合执行计划

> 使用现有任务工作区执行；用户已授权本计划顺序和验证后合并，普通技术修复自主继续。

**Goal:** 在保留双方有效实现与所有并发未提交内容的前提下，通过 PR58 集成当前 main。

**Architecture:** 以 main 的协议、凭据事务、UI 和恢复为主体，增量接入 Cherry 功能；不创建平行 Provider 系统，不重写共享提交历史。

**Tech Stack:** 现有 React18、TypeScript、Node24、Vite、Tauri2/Rust 与锁定依赖。

**Spec:** [spec.md](spec.md)。原功能合同见 [原规格](../2026-10-13-cherry-red-scope/spec.md)。

- [x] 固定 PR49/52/53 head、逐逻辑和测试核验替代关系；保留旧分支和规划缺口。
- [x] 捕获 PR58 clean baseline、主仓 index hash、worktree 登记；typecheck PASS，单测 1159/1145 PASS/14 SKIP/0 FAIL。
- [x] 在原 source branch merge current main，记录 86 个冲突路径，不改主仓或运行中目录。
- [ ] 逐项合并 Provider/Native/Settings/共享 UI；检查无冲突自动合并文件，清除重复字段、重复 IPC 和旧协议引用。
- [ ] 合并账本/功能卡/版本和本交付包，保留历史证据及当前主线全部任务。
- [ ] 定向测试后执行完整 verify、Rust、桌面构建及隔离 Native 回归；固定端口有占用时不终止其他任务进程。
- [ ] 冻结完整 head，独立复审；修复 blocker 后按新 SHA 重验/复审，保留首轮失败。
- [ ] 普通 push 更新 PR58，核对 Hosted/Delivery/实际远端规则，满足后 squash merge；fetch 并验新 main。

文件所有权：Provider TS/相关单测、Native/packaging、Settings/指定浏览器测试各由独立 agent 写入；root 负责 App/共享组件、其余浏览器冲突与治理。共享契约固定六种 canonical 协议、api-key/none 和可选 role/content messages。最终由 root 统一验证与提交。

Review focus: 凭据与账号隔离；旧项目/任务兼容；多轮/取消/迟到；主线 UI/Agent 草稿保留；真实 Native 与三平台证据边界。回滚保留 PR source 提交和 main 原 SHA，不 reset 用户内容。
