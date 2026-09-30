# Review：Web 本机伴随服务与既有浏览器数据迁移

- Task ID：`TASK-LOCAL-SERVICE-001`
- 时间与时区：2026-09-29 / Asia/Shanghai
- Reviewer/context/工具或模型：独立只读 reviewer 已按最终实现 head `082d1c4` 复核；结论 PASS WITH FOLLOW-UPS，无 P0/P1。
- 独立于实现上下文：是，reviewer 只收到精确 base/head、规范路径和检查重点，没有本会话历史。
- Base SHA / head SHA / 规则版本：base `49f20c85c48b1d9f939c1b423dc542b419e18260`；候选 head `082d1c4684b31c9ea1d37f7b2a7f1e7d99d91917`；`AGENTS.md`、`AI_RULES.md` 和 `docs/engineering/REVIEW.md`。
- PR / branch / worktree：PR [#30](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/30) / `feat/TASK-LOCAL-SERVICE-001-companion` / `D:/kk-studio/.worktrees/platform-versioning`
- Intent / Spec / Plan / Verification：本目录对应文件。

## 评审范围和方式

- 读取的真实 diff、实现、规范和证据：本轮 `origin/main...HEAD` 的协议、服务、Web 适配、迁移、资产、UI、测试和五文件变更包；对照 superpowers spec/plan、ADR-008、DATA-STORAGE 与任务账本。
- 静态 review / 实际运行检查：self-review 已覆盖来源边界、session cookie、service-first fallback、hash/CAS、旧 IDB 保留、备份恢复；本地全量 unit/browser/smoke 结果见 `verification.md`。独立 reviewer 尚需按精确 head 复核。
- 未覆盖范围及原因：真实账号、安装器、Mobile、VPS 主机写入不在本轮实现或无可用访问证据。
- self-review 与独立 review 的区别：self-review 是实现者检查，不能替代独立 reviewer。

## Findings

| ID | P0–P3 | Pass | merge/release blocker | 文件/行或证据 | 重现与影响 | 处理/负责人 | 状态/复验 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SELF-1 | P1 | Task4 | 已关闭 | `client.ts`，真实浏览器迁移初次运行 | detached browser `fetch` 导致误判离线 | root：包装调用保持浏览器 this，迁移/连接 Playwright 重跑 | CLOSED/PASS |
| SELF-2 | P1 | Task4 | 已关闭 | `assetRepository.ts`，`assetStorage.test.ts` | 素材 metadata 缺 `size`，服务严格 schema 拒绝 | root：补真实 byteLength 和服务路径回归 | CLOSED/PASS |
| SELF-3 | P2 | Task4 | 已关闭 | `store.ts` migration publish | 仅检查已引用素材可能让未引用资产静默丢失 | root：发布前要求 manifest 中每个素材均已上传 | CLOSED/PASS，`2d61a4c` |
| SELF-4 | P2 | Task5 | 已关闭 | PR #30 Hosted verify lint output | 连接组件禁用注释引用未安装规则，服务/测试有未使用项和显式 any | root：移除无效注释和未使用项，JSON helper 改为泛型 | CLOSED/PASS，`8637acd` |
| SELF-5 | P1 | Task1/3 | 已关闭 | `store.ts`/`storage.ts` snapshot asset boundary | 服务端可接受 `kk-asset:` 缺失引用；Web 服务分支未 encode/hydrate | root：写入前校验所有引用资产，Web load hydrate、persist encode；新增缺失资产回归 | CLOSED/PASS，`6d0346e` |
| SELF-6 | P1 | Task5 | 已关闭 | `store.ts` backup restore | 逐文件发布失败会留下半恢复状态 | root：restore staging 回读 hash、发布失败逐目标回滚；新增故障注入回归 | CLOSED/PASS，`6d0346e` |
| SELF-7 | P1 | Task3 | 已关闭 | `client.ts` disconnect | 服务离线时断开不清除本机连接元数据 | root：finally 清理连接，设置页回到未连接并提示恢复路径 | CLOSED/PASS，`6d0346e` |
| SELF-8 | P2 | Task1/2/5 | 已关闭 | protocol/session/server/store | provenance 过宽、origin 可缺失、冲突无 currentRevision、报告未绑定会话、会话明文 Map、重复素材丢来源、列表读全 blob | root：严格 schema/敏感字段、来源必需、冲突详情、session/TTL、hash key、来源合并、metadata-only 分页 | CLOSED/PASS，`6d0346e` |
| SELF-9 | P2 | Task1/2/5 | 已关闭 | `manifest.ts`/`server.ts`/`client.ts`/`store.ts` | 来源 URL、清单时间、恢复路径和重启 stale cookie 边界仍可放宽 | root：严格 pathname/origin、ISO `createdAt`、受限恢复路径、认证探针；新增单测 | CLOSED/PASS，`082d1c4` |
| FOLLOW-2 | P2 | follow-up | 不阻断本机功能 | `snapshotCodec.ts`/`store.ts`/`protocol.ts` | 未知快照版本当前归为 `INVALID_SNAPSHOT`，可专门返回升级提示 | 后续定义 `UNSUPPORTED_SNAPSHOT` 并保持旧版本 fail-closed | OPEN |
| FOLLOW-3 | P2 | follow-up | 不阻断本机功能 | `client.ts` `checkCompanion()` | 设置页每次检查会下载完整认证快照 | 后续增加只返回 revision 的认证探针 | OPEN |
| FOLLOW-4 | P2 | follow-up | 不阻断本机功能 | `store.ts` backup listing | 备份文件/列表没有保留上限 | 后续增加有界轮换和明确恢复策略 | OPEN |
| FOLLOW-1 | P3 | follow-up | 不阻断本机功能 | `migration.ts` / store | 上传中断时可能留下未引用素材，旧 IDB 和已发布快照不受影响 | 后续 GC 任务，保留不误删 | OPEN |

## 适用门禁

| 门禁 | 真实结果 | 证据与 SHA/时间 | 未满足的影响 |
| --- | --- | --- | --- |
| Self-review | PASS，已关闭实现/门禁缺口 | `verification.md`、实现 head `082d1c4` | 不替代独立复审 |
| 独立 AI review | PASS WITH FOLLOW-UPS | reviewer 对 `082d1c4` 复核；无 P0/P1，FOLLOW-2–4 为 P2 | 后续任务跟踪，不阻断本次合并 |
| CI / 定向回归 | 本地 PASS；Hosted IN PROGRESS | 522 unit、3 browser、integration/smoke、type/UI/format/build；PR #30 head `733c70f` | Hosted 失败不得合并 |
| GitHub 实际审批数量/身份 | UNKNOWN | PR/ruleset 待回读 | 不能虚构审批 |
| 用户 UI/交互/产品验收 | 自动化 Web 交互 PASS；用户手动验收未记录 | 1920/390px browser specs | 不称用户最终视觉验收 |
| 推送/合并/发布授权 | 用户已授权合并/远端同步；尚未执行 | 当前会话用户请求 | 未发生前不能称已同步 |
| 恢复/回滚实证 | 本机临时服务 PASS；VPS NOT VERIFIED | store/server/integration/smoke | 不代表 VPS 搬迁就绪 |

## 结论

- NOT VERIFIED：本地实现门禁和独立复核通过，Hosted CI/最终合并仍待完成。
- 未关闭 blocker：Hosted quality 必须成功后才合入 main。
- 非阻断后续任务与理由：FOLLOW-2–4、真实账号、安装器/自动更新、Mobile、VPS 和迁移残留 GC 单独登记，不改变本轮本机功能的验证事实。
- 新实现 head SHA 发生后本 review 对代码提交失效；docs-only closeout 变更不改变已复核实现 `082d1c4`。
- 本结论不代替合并、发布或用户最终验收。

## 追加勘误

- 2026-09-29：独立 reviewer 对 `082d1c4` 重跑 dist、3 个 local-service browser specs（3/3）、定向 unit（41/41）、full unit（514/522，8 skip）、tsc/scoped eslint/integration/production smoke，结论 PASS WITH FOLLOW-UPS；无 P0/P1。
