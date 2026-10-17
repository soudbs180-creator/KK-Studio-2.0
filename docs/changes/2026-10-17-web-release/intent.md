# Intent：Web 发布与正式 Release 自动同步

- Task ID：TASK-WEB-RELEASE-20261017；状态 IN_PROGRESS；2026-10-17。
- 用户授权：将 kkai.plus 更新到客户端已验收版本；保留一个回滚版本，删除更旧静态发布；保护现有业务数据和本地未提交改动。后续仅正式 Release 自动同步，普通提交和预发布不触发。
- Owner / branch / worktree：root / `fix/TASK-WEB-RELEASE-20261017` / `D:/kk-studio/.worktrees/TASK-WEB-RELEASE-20261017`。
- 固定基线：`bbc8a766740ec94d30171020cf208a6aeb3c87d4`，产品源码 `4699458de1c3437309b7cdc3f019454104c81fce`，Desktop/Web 2.1.36。
- [Spec](spec.md) / [Plan](plan.md) / [Verification](verification.md) / [Review](review.md)。

本任务只发布静态 Web 和建立受限发布通道，不修改产品源码，不接管并发聊天迁移，不部署账号、Provider 或独立 Mobile 服务，不删除数据库、上传文件、本机恢复档案或 Git 历史。
