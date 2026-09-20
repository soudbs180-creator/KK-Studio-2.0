# 参与开发

先读 [AGENTS](AGENTS.md)、[AI_RULES](AI_RULES.md)、[SDLC](docs/engineering/SDLC.md)、[分支规则](docs/engineering/BRANCH-POLICY.md)与[审核](docs/engineering/REVIEW.md)，再读当前治理状态和任务产物。

用户以自然语言提出目标；AI负责工程转译、技术选择、测试与独立审查，普通已授权任务不逐阶段等待审批。用户决定设计/交互和产品验收，高影响外部动作按具体授权。

从最新origin/main创建独立任务worktree。原dirty根目录及历史本地main不是自动可合并基线，不能reset/clean/stash或广泛stage他人改动。任务分支默认codex/TASK-ID-slug，一个逻辑目标一个PR；禁止直接推稳定线、force push和默认删引用。

新clone执行 npm ci 与 npm run git:guards；本地hook只能补充，不能替代远端保护。运行 npm run verify；受影响原生路径还要client:check、Rust与Tauri证据。PR必须有完整变更包、review、PROGRESS和ledger，CI delivery检查结构。

默认squash合并，合并后核对PR/head/main SHA与完整项目树。用户验收后可按明确清理授权收敛已合并短期分支，但保留main、历史记录、不可变tag和回滚产物。单owner不伪造第二账号approval；独立AI上下文与平台人审不同。
