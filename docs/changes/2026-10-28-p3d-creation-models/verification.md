# TASK-MOD-P3D 实际验证

Provider 元数据、凭据与跨窗口锁归 integrations/providers，旧路径导出同一实现；文本流解析归领域层，解除长环。旧入口至少保留一个正式发布周期，TASK-MOD-P3-COMPAT 仍 TODO。R4 阶段 10→4。

PARTIAL；实现与限定回归已完成，独立审查及主线交付未完成。比较基线 `6ac48d6ce9c2867e953fe56ebf2f05fd55e475bb`；当前分支 `refactor/TASK-MOD-P3-feature-cycles`，复用既有隔离树，不使用子代理。

完整依赖图包含 type-only、动态与传递依赖；R4 阶段 16→15→12→10→4→0，R1 405→367，R2=11、R3=10、R5=0、R6=2、R7=0、R8=0。只收缩已解决的 baseline 项，没有放宽守卫。迁移证明包含212个函数体AST一致、六份UI结构一致、新纯核心/infra/runtime无间接feature依赖。Codex成功返回的分发错误另以真实RED/GREEN记录，不归入原函数搬迁证明。

| 检查 | 实际结果与证据 |
| --- | --- |
| 根单元/部署测试 | 2354 pass / 0 fail / 20 skip，`tests-closure.log`；新增Codex成功/拒绝均不落入API的2项回归 |
| 类型与其他端 | 根/契约/Mobile通过：`types-closure.log`；Mobile373 pass，Agent204 pass / 2 skip，原日志保留 |
| 快速治理与格式 | `lint-closure.log`、`format-closure.log`记录最终运行；结果须以日志及外部回执为准 |
| 本机服务 | HTTP重启/备份恢复通过；实际StoragePort接线后Edge生产smoke通过，`local-service-storage-port-edge.log` |
| ON/OFF生产Edge | ON `7b6fc87e-d613-461e-8563-8ffdcf5b19cf`，OFF `558e5d6d-6da6-4a08-89e2-586339628a14`，固定1423、1 worker、0 retry，各3/3通过（两种inpaint与Agent卡片刷新恢复/切API） |
| 双路径严格对拍 | 每路径恰1次HTTP；dispatch OFF=0/ON=1。仅归一化明确ID/时钟/blob；任务、资产、溯源、HTTP、DOM相同；两场景前后4张PNG SHA完全一致、差异0像素。`parity-closure/comparison.json`；不覆盖P2旧1像素失败证据 |
| CSS/包体 | CSS仍为P2同字节的index-BOfoKQ7k.css；主入口gzip约260.75KB，对比P2 257.65KB约+3.10KB，低于预算，构建大chunk警告保留 |
| 核心浏览器40项 | 31 pass / 9 fail。模型能力8项在新构建父P2 run `e0d0f6a3-3d3d-462f-8251-b6ca6ac830fa` 逐项错误及位置一致；另1窄屏HUD失败此前P2已有。未删断言、未跳过，完整verify未绿 |

日志、原始run目录、SHA清单与最终源码回执在容器 `output/p3-decoupling-2026-10-28/`。源码检查点7550ac2a后继续补真实StoragePort及Codex分发修复；浏览器报告metadata保存检查点SHA，实际脏树源码/构建指纹由最终回执绑定，不能将其冒充干净提交构建。

保留中间失败：首次28个接线/夹具问题、同名R8、UI barrel的CSS顺序、并行build导致EPERM、旧“储存/登录账号/本地”测试定位及P2旧PNG差异。已修复项有新日志，旧日志不改。未验证：独立审查、Tauri/安装包、真实Provider、Hosted、完整verify及main合入；四份原文总范围没有全部完成。
