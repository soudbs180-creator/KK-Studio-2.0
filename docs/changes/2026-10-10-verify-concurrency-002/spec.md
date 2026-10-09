# Spec：浏览器并发失败原因与隔离复核

- Task ID：TASK-VERIFY-CONCURRENCY-002
- 状态：IMPLEMENTED（诊断范围）
- 日期：2026-10-10
- Intent / 账本：本目录 `intent.md` / `docs/governance/task-ledger.json`
- 当前规范与实现基线：`origin/main@8090475958f1a0bdd1b4b36ada7f2aba1e4e6264`，Playwright 默认 preview 1423、`reuseExistingServer:false`、测试 timeout 30000、历史默认 retries 1；本次 CLI 显式覆盖 `--retries=0`。
- Source of truth：`playwright.config.ts`、`tests/browser`、`docs/changes/2026-10-09-windows-entry-diagnostics/verification.md`。

## 用户行为与入口

- 主流程和相邻流程：生产构建 → Vite preview 1423 → Edge Playwright 完整 447 用例；每档独立启动并在退出后保存报告。
- 页面/route/组件或 API/命令入口：`node node_modules/@playwright/test/cli.js test --workers=<N> --retries=0`，配置入口为 `playwright.config.ts`。
- loading、success、error、cancel、offline、timeout：沿用现有测试契约；本任务观察并记录首轮失败/timeout，不改变测试语义。
- 重试、幂等、stale async、unknown 受理与重启恢复：本任务禁止 retry 参与结论；历史 retry 原件单独保留。
- 键盘/焦点/IME、长文案、响应式：由完整 447 用例覆盖；不做产品行为变更。

## 架构、数据与权限

- 模块职责和依赖方向：Playwright runner 管理 worker、Vite preview 和 Edge；本任务只采集 runner 进程树及报告。
- schema/API/事件/文件格式与兼容策略：JSON reporter 原件、JSONL 进程资源收据和 SHA256 manifest；不改应用 schema。
- 数据归属、原件保留、校验和、并发/原子性：每档独立目录保存 browser JSON、console、receipt、resources；manifest 同时记录未压缩/压缩哈希。
- 凭据与日志边界、最小权限、外部传输与费用：本地 fixture，仅记录进程统计和测试输出，不记录凭据；不调用付费 Provider。
- 相关 ADR：无需新增 ADR，诊断不改变跨模块契约。

## 平台能力

| 能力 | Desktop | Web | Mobile | 降级/禁用理由 |
| --- | --- | --- | --- | --- |
| 生产浏览器并发诊断 | N/A | 已运行 Edge/Vite preview 1423 | N/A | 任务只验证 Web 浏览器，不把窄屏测试当原生 Mobile |

本轮是本地 production bundle 与 fixture 验证，不是 live Provider、Hosted CI 或发布验收。

## 生命周期与恢复

- 初始化/安装：使用 Node 24.20.0/npm 11.19.0，`npm ci --no-audit --no-fund`，再只构建一次 production dist。
- 正常使用、取消/离线：由现有完整浏览器测试覆盖；本任务不改实现。
- 升级和旧 schema：不适用。
- 损坏/写失败/进程重启：不适用；仅记录 runner/preview 的启动与退出。
- 备份、还原、回滚：历史 source105 证据保留；本任务没有产品回滚。
- 导出/卸载/退役及用户数据保留：不适用。

## 验收映射

| Intent AC | 预期状态/结果 | 检查/运行环境 | 证据要求 |
| --- | --- | --- | --- |
| AC-1 | 历史首轮失败未被覆盖 | source105 既有目录 + 当前目录 | 旧原件路径与新 manifest |
| AC-2 | 1/2/4/8/12 均无 retry 隐藏 | clean source 8090475、1423、同 dist | 每档 JSON/console/receipt |
| AC-3 | 资源/端口可比较 | Windows 24 logical CPU、约 68 GB RAM、本次进程树 | 每档 resources.jsonl + receipt |
| AC-4 | 结论保持边界 | 独立 review、ledger 状态 | verification/review 精确 SHA |

## 风险和决策

- 可自主解决的技术决定及依据：先复现再改代码；没有可重复缺陷时不增加“修复”提交。
- 待用户决定的产品语义（无则写无）：无。
- 规范冲突、外部依赖与阻断范围：Hosted/PR/main 读回依赖远端访问。Hosted/PR 当前门禁和独立 review 满足后可按普通 PR 合并；合并后的 main 回读是分支规则要求的收口动作，阻断任务 DONE/根因已确定声明，不能在合并前伪造回读。历史 Hosted 根因未知保留为有界 P2 follow-up，不得写成根因修复。
- 与 intent 的差异及授权依据：新增资源峰值收据以满足“查明条件”的可审计要求，未扩大产品范围。
- 明确未承诺的能力：不承诺历史 Hosted 失败已修复，不承诺降低 workers 是根因修复，不承诺当前 Hosted/main 通过。
