# Intent：TASK-VERIFY-ORIGIN-003

- Task ID：TASK-VERIFY-ORIGIN-003
- 状态：IMPLEMENTED（验证 PARTIAL）
- 日期与提出者：2026-10-11；root，承接用户“先修正 PROJECT_STATE，再推进端口和来源契约收口”的请求
- 授权范围：当前主检出中 Playwright 配置、生产浏览器来源断言、对应单测/测试规范、治理快照和本变更包；不改产品来源白名单、不合并、不发布。
- 关联账本：`docs/governance/task-ledger.json`

## 用户原意

Playwright 不能再用不支持的端口启动后误判产品；当前项目状态、任务账本和 Git 快照要能对上，浏览器验收要明确使用受支持的生产来源。

## 目标与非目标

- 预期结果：显式非 `1423` 的 `KK_TEST_PORT` 在 Playwright 配置加载阶段失败；相关 browser fixture 和页面检查统一断言 `http://127.0.0.1:1423`。
- 包含范围：`playwright.config.ts`、六个生产 browser spec、`verificationOrigins.test.ts`、测试规范、当前快照和本变更包。
- 不包含：产品 CORS 白名单、开发端口 `1421`、真实 Provider、Tauri、Hosted CI、发布和用户验收。

## 验收条件

| ID | 用户可观察结果 | 技术证据 |
| --- | --- | --- |
| AC-1 | 运行验收时输入 `1431`/`1421` 不会启动浏览器测试并误报产品通过 | 配置矩阵单测、直接加载配置的拒绝回执 |
| AC-2 | 默认或显式 `1423` 只解析到 `http://127.0.0.1:1423` | 配置矩阵单测、Playwright 定向回归 |
| AC-3 | 关键生产页面和 Agent/image fixture 使用完整 origin 契约 | 六个 browser spec 的 exact-origin 断言和定向回归 |
| AC-4 | 当前状态与权威 ledger/Git 快照一致 | `PROJECT_STATE.md` current facts、治理检查 |

## 边界

- 本地 fixture/生产 preview 证据不等同于真实 Provider、Tauri、Hosted、发布或用户验收。
- 当前主检出存在并发脏改动；本任务只编辑上述授权路径，不重置或清理其他改动。
