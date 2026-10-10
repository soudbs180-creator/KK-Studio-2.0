# Spec：固定生产浏览器 origin 并拒绝不支持的端口

- Task ID：TASK-VERIFY-ORIGIN-003
- 状态：PARTIAL（实现存在；验证范围受限）
- 日期：2026-10-10
- Source of truth：`playwright.config.ts` 与四个目标 browser spec

## 行为契约

1. `KK_TEST_PORT` 未设置或为 `1423` 时，配置得到 `http://127.0.0.1:1423`。
2. 显式设置为 `1431` 或 `1421` 时，配置在启动 Playwright 前抛出固定端口错误。
3. 目标 specs 对完整 `origin` 断言为 `http://127.0.0.1:1423`。
4. 不改变产品服务、retry、timeout、Provider 或用户数据。

## 目标文件与检查

- `playwright.config.ts`
- `tests/browser/image-selection-actions.spec.ts`
- `tests/browser/ui-page-rules.spec.ts`
- `tests/browser/local-service-connection.spec.ts`
- `tests/browser/local-service-migration.spec.ts`

定向 browser 命令使用 `--retries=0`；四个目标文件合计 16/16 passed。

| 输入/检查 | 预期 | 当前记录 |
| --- | --- | --- |
| `KK_TEST_PORT=1431` | 启动前拒绝 | PASS |
| `KK_TEST_PORT=1421` | 启动前拒绝 | PASS |
| `KK_TEST_PORT=1423` | 固定 origin | PASS |
| 未设置 `KK_TEST_PORT` | 默认固定 origin | PASS |
| `npm run build` | exit 0 | PASS |
| `npm run typecheck` | exit 0 | PASS |
| 四个目标 spec，`--retries=0` | 16/16 passed | PASS |

完整 browser suite、完整 `npm run verify`、Hosted CI 和独立 review 均待验证。