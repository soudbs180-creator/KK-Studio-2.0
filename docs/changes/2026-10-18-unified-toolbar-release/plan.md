# Plan：正式发布链

- Task ID：TASK-CANVAS-RELEASE-20261018；IN_PROGRESS；[Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Verification](verification.md) / [Review](review.md)。
- Branch：fix/TASK-CANVAS-RELEASE-20261018；worktree：D:/kk-studio/.worktrees/TASK-UNIFIED-RELEASE-20261018；base：97ef182b10c076c81611dea24e0b1c07c127dd49。

1. 读取规则、远端/PR/数据与实际安装包身份，保留原运行和恢复证据。
2. 整合最小工具栏修复、必要的成熟聊天迁移及收据保留、平台版本展示和下载入口；用既有版本 helper 对齐 2.1.41。
3. 运行本地 verify/Mobile/Native 与真实数据只读及隔离副本验证，保存失败和成功日志。
4. 提交并取得独立当前 head 审查，推送任务分支创建 PR；Hosted/Delivery 通过后正常 squash 合并。
5. 等 main CI，通过不可变 tag 构建 Windows 安装器，验证工件、安装和数据保留；发布同 tag 的 GitHub Release，现有 Web workflow 部署组合产物。
6. 回读生产 desktop/mobile、setup 下载和当前客户端；更新外部发布收据，不为了自引用 SHA 改写已审 head。

## 恢复与风险

旧独立工作树在测试时被外部 Antigravity 清理，源码从独立 patch、逐文件 SHA 和已提交候选恢复到新锁定目录；原失败日志保留。不得重复使用被删除目录或声称中断的全量测试通过。原默认数据与 profiles 的外部备份仍保留。发布失败保持上一生产指针；不回写旧格式覆盖新格式，不改历史 tag。
