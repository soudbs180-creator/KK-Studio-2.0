# Intent：统一工具栏修复与三端正式发布

- Task ID：TASK-CANVAS-RELEASE-20261018；2026-10-18；Owner root-release；IN_PROGRESS；交付包角色：current。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Verification](verification.md) / [Review](review.md)。
- 用户授权：把本次修复提交并合并 main，统一版本重新发包，kkai.plus 和手机网页版同步更新，保留原项目和配置。
- 实际远端 base 为 97ef182b10c076c81611dea24e0b1c07c127dd49；不采用本地 main 的其他未推送整合。
- 范围：图片选择工具栏回归、当前用户 v3 聊天/归档收据的兼容依赖、三端版本 2.1.41 与平台标识、包含 Windows Agent 的单一安装包，以及现有组合 Web 发布链。
- 沿用 [ADR-022](../../architecture/adr/ADR-022-project-chats-and-v3-migration.md) 的成熟迁移实现；只保留现有归档收据，不引入未完工的图片实验入口或 CommandBus。
- 不改变应用 identifier、数据根目录、凭据 service、数据库名和域名，不把本地持久化称为跨设备同步。
