# Intent：浏览器验收端口与服务来源契约一致性

- Task ID：TASK-VERIFY-ORIGIN-003
- 状态：PARTIAL（候选实现与有界证据；完整门禁、Hosted 与独立 review 待完成）
- 日期与授权：2026-10-10；用户授权在 PR #51 分支上自主完成治理收口，不授权合并、自动合并或发布。
- 绑定分支：`fix/TASK-VERIFY-ORIGIN-003-main-7ebf143`
- 基线：`main@7ebf143b291e344b243e1ef396d510bb91730bd3`
- 候选源代码 HEAD：`4949b3db9471113c7e70b7f78a0a35c457e30cca`

## 用户原意

浏览器验收始终针对受支持的生产来源 `http://127.0.0.1:1423`。显式传入不受支持的 `KK_TEST_PORT` 时，在 Playwright 启动前失败，避免错误端口或错误来源产生误导性绿灯。

## 范围与边界

- 包含：`playwright.config.ts`、四个目标 browser spec 及治理文档。
- 不包含：产品源代码、端口断言放宽、retry/timeout 调整、PR 合并、自动合并、发布、真实 Provider 请求。
- 证据仅限真实 `KK_TEST_PORT` 矩阵、`npm run build`、`npm run typecheck` 和四个目标 browser spec 的 16/16；完整 browser suite/npm verify、Hosted CI、独立 review 明确待办。

## 验收条件

| ID | 预期结果 | 证据 |
| --- | --- | --- |
| AC-1 | 1431/1421 在 runner 启动前拒绝；1423/未设置解析为固定 origin | 配置矩阵 |
| AC-2 | 构建和类型检查通过 | build/typecheck |
| AC-3 | 四个目标 spec 无 retry 掩盖失败 | `--retries=0`，16/16 |
| AC-4 | 结论不越过证据范围 | 本包 docs/ledger/PROGRESS |

保持任务 `PARTIAL`，不触碰 PR47/PR44 历史记录。