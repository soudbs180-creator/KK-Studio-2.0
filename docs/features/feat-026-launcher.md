# Windows 启动器与分享包（FEAT-026）

- 状态：PARTIAL
- 领域：system
- 最近更新：2026-09-21
- 关联任务：T7

## 用户可见入口

- `start-kk-studio.bat`（启动）、`verify-kk-studio.cmd`（环境/验证）、`启动 KK Studio.lnk`；分享包按 `docs/engineering/LAUNCHER.md` 制作。

## 代码位置

- 启动脚本：仓库根 `start-kk-studio.bat`、`verify-kk-studio.cmd`
- 桌面发布：`scripts/windows/desktop-release.mjs`
- 文档：`docs/engineering/LAUNCHER.md`
- 分享产物目录：`releases/`（只放最新分享产物，禁止打入 node_modules/凭据/编译缓存/恢复归档）

## 测试与证据

- 单测：`tests/unit/desktopRelease.test.ts`、`tests/deploy/release-scripts.test.mjs`

## 当前能力

- 启动/验证脚本与发布脚本可用并被测试覆盖。

## 差距与后端化

- T7：Desktop 安装、恢复、回滚的实机验收未做；未产出验收过的安装包。

## 变更记录

- 2026-09-21：创建卡片，状态 REAL（脚本），安装验收归 T7。

## 本轮证据勘误（2026-09-22）

状态按 [本轮验证与勘误](../changes/2026-09-21-text-and-rule-audit/verification.md) 纠正为 PARTIAL；保留早期记录的历史含义，不当作现行完成结论。
