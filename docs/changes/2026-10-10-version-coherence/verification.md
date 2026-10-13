# 验证

## 本地

- `node scripts/platform-versions.mjs check`：PASS。
- `node scripts/check-version-consistency.mjs`：PASS，当前源码无产品版本硬编码警告。
- `node --test tests/unit/versionConsistency.test.ts`：2/2 PASS。
- 启动器相关桌面单测、内容指纹/receipt 和实际 Windows release 复验沿用同分支 `TASK-LAUNCH-001` 的最新证据；桌面缺少 receipt、输入 hash 漂移、依赖 lock 漂移或构建失败时拒绝启动旧 EXE。

## 未验证

当前没有远端发布权限和第二台安装环境，本任务不声称 hosted CI、安装包分发、自动更新或用户验收完成。合并后必须以候选合并 SHA 重新跑 CI、生成不可变工件 receipt，并在目标环境回读版本、commit/tree、EXE hash 和进程路径。
