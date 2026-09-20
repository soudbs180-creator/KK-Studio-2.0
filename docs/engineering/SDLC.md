# AI-native SDLC

工作台采用 Plan → Design → Build → Test → Deploy → Maintain 的闭环。每个阶段都留下可审计 artifact：`intent.md` 说明用户问题，`spec.md` 说明状态和验收，`plan.md` 列出文件与顺序，代码和测试 diff 记录实现，`verification.md` 记录证据，发布后把事故或回归加入 `evals/`。

流程参考 [Claude 的 AI-native SDLC playbook](https://claude.com/blog/the-ai-native-sdlc-playbook)。Figma、仓库和验证结果通过链接关联；设计稿不复制成失真的第二份源文件。计划变更时同步更新 plan 和 verification，不能只改代码。
