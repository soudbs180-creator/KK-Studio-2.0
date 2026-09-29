# Intent：Web 本机伴随服务与既有浏览器数据迁移

- Task ID：`TASK-LOCAL-SERVICE-001`
- 状态：IMPLEMENTED（产品能力 PARTIAL）
- 日期与提出者：2026-09-29 / 用户继续既有三端本地化目标
- 请求来源：用户要求继续完成未完成项目，并明确 Web 端使用“本机伴随服务保存（网页需安装本地服务）”，个人数据依赖本地存储且 Web/Mobile 需要登录。
- 用户授权范围与依据：用户已授权继续实现、检查、验收、合并并同步远端；本轮不需要再次确认普通工程动作。外部 VPS 写入仍须有可用 SSH/部署凭据证据，本轮未取得。
- 关联账本、spec、plan：`docs/governance/task-ledger.json`、`docs/superpowers/specs/2026-09-29-web-local-companion-design.md`、`docs/superpowers/plans/2026-09-29-web-local-companion.md`

## 用户原意

网页登录后，项目和素材要保存到用户设备上的本机服务，而不是把浏览器 IndexedDB 当作最终数据根；连接、迁移、备份和断线时要能看懂发生了什么。Desktop、Web、Mobile 继续独立推进，Web 与 Mobile 的真实账号登录另行接入。

## AI 工程转译

交付一个只监听 loopback 的 Node 24 本机服务和 Web 设置入口：一次性配对建立 HttpOnly 会话；服务用 revision、完整 hash、暂存和备份保护项目快照与素材；旧 IndexedDB 只能由用户触发只读预检和确认导入，成功/失败都保留旧库。服务离线、认证失效、协议不兼容和并发冲突必须显式失败，不能显示“已保存”。

## 目标与非目标

- 预期结果：连接本机服务后 Web 项目快照与素材服务优先读写；用户可无损迁移旧 IndexedDB，并创建/恢复校验备份。
- 包含范围：loopback 服务/会话、文件仓库、Web 客户端、资产适配器、迁移预检/导入、备份恢复、设置 UI、浏览器和生产 smoke 验收。
- 明确不包含：真实账号/BACKEND-PLATFORM、服务安装器/自动更新、云端同步、Mobile 原生包与真机验收、VPS 生产写入和 DNS/TLS。
- 受影响平台/模块：Web 运行时、Node 本机服务、共享协议；Desktop 原生仓库保持不变，Mobile 只记录边界。
- 已有实现和规范来源：`AGENTS.md`、`AI_RULES.md`、`docs/architecture/DATA-STORAGE.md`、`docs/architecture/adr/ADR-008-platform-versions-and-local-first.md`。

## 验收条件

| ID | 用户可观察结果 | 技术证据/检查 | 适用平台 |
| --- | --- | --- | --- |
| AC-1 | 设置中可连接 loopback 服务，服务正常显示已连接 | `CompanionSettings`、真实临时服务 Playwright | Web |
| AC-2 | 服务离线/会话失效/冲突时不伪报已保存，有重试或恢复路径 | client/server 单测、390px 断线验收 | Web |
| AC-3 | 旧项目和素材先预检，再确认导入；旧 IndexedDB 不删除 | migration 单测与真实浏览器迁移验收 | Web |
| AC-4 | 素材和快照在服务重启后仍可读取，备份可校验恢复 | store/server 集成、production smoke | Web + 本机服务 |
| AC-5 | Web bundle 不携带 Node 服务入口、配对码或服务数据根 | `tests/local-service/production-smoke.mjs` | Web |

## 假设、风险和决策

- FACT（直接证据）：用户已选择本机伴随服务；现有 Web IndexedDB、Desktop 原生存储和 Mobile 未完成事实见现行治理文档。
- INFERENCE（假设及风险）：本机服务由用户单独安装/启动；本轮用 `npm run local-service` 证明运行链，安装器仍待后续任务。
- UNKNOWN / CONFLICT：RackNerd VPS 是否上传、SSH/Git/data 是否同步仍 UNKNOWN；控制面板登录不是主机写入证据。
- AI 自主决定的技术事项及理由：使用 `127.0.0.1`、HttpOnly cookie、一次性 pairing、canonical manifest、SHA-256 内容寻址和 revision CAS，减少跨源凭据与并发覆盖风险；不静默迁移以保护旧数据。
- 必须由用户决定的产品语义/范围事项（无则写无）：无；账号登录、安装器和 Mobile 已明确由关联任务负责。
- 外部条件、费用或不可逆动作及已有授权：本地代码/测试/分支/PR 动作已授权；VPS 上传、DNS、付款和真实账号写入不在本轮擅自执行。
- 不在本次范围的问题与账本 ID：`BACKEND-PLATFORM`、`T12`、`T10/T11`（VPS/部署）保持开放。
