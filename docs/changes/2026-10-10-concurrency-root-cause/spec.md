# Spec：IRV-CONC-001 诊断实验

- Task ID：TASK-VERIFY-CONCURRENCY-002
- 状态：READY
- 基线：main `7ebf143b291e344b243e1ef396d510bb91730bd3`。
- 来源：[intent](intent.md)、历史 source105 和 workers 1/2/4/8/12 的原始 gzip 证据；现行 AGENTS/AI_RULES/SDLC/REVIEW。

诊断脚本调用现有 Playwright CLI，生成 ignored 临时配置继承原始配置。只覆盖 workers、retries=0、trace、reporter/output 路径；测试 timeout 和断言不变，固定端口 1423、strictPort、reuseExistingServer=false。非 1423 环境早期拒绝仅适用于本诊断入口，不实现 TASK-VERIFY-ORIGIN-003。

每个预先指定的独立实验均保留成功和失败，不把重复实验当作 retry；轮次按反向 worker 顺序平衡。历史组用原报告中的 9 个 file:line（实际最多 9 workers）；全量组保留完整 447 项测试，用于达到 12 个实际 workers。两组不可按相同负载比较。

输出目录必须不存在；每轮启动前确认端口空闲，若占用立即拒绝，不终止外部服务。绑定 source SHA、dirty 状态、dist 内容 hash、Node/Edge/Playwright/OS/CPU、命令和退出码；原件写入独立目录，manifest 包含 bytes/SHA256。全量 JSON、trace、控制台、步骤 begin/end、HTTP readiness/延迟、runner 调度间隔、Windows runner 子树 PID/父 PID/CPU 累计时间/working set、全机 CPU/空闲内存和采样时长各自标记边界。采样存在间隔/观测开销，不声称捕捉所有瞬时峰值。

| 假设 | 最小实验 | 判定边界 |
| --- | --- | --- |
| H1 共享 CPU/内存或浏览器调度停顿 | 全量 workers4/12；定向 workers1/12，固定构建和端口 | 只有失败与采样/步骤停顿一致才支持；跨机器通过不排除历史瞬时负载 |
| H2 某条异步链或几何观测不稳定 | 历史 9 项定向独立重复 + trace；出现失败后再单变量故障注入 | 不凭“running”或 session closed 直接判产品缺陷；关闭信息可能来自超时清理 |
| H3 端口/旧服务/启动环境不同 | 核对原 config、portBefore、HTTP 首次响应、source/dist | 历史首轮配置本身是1423；1431反例是独立条件 |

Windows hosted runner 与历史 24 CPU/约63.48 GiB 本机不同，结果不能冒充原机复现。Linux Node 检查有效；Linux Edge 启动失败只证明该执行环境不可用，不算产品测试失败。无产品行为/schema/权限/数据迁移，无需 ADR、产品版本变更或 UI 设计验收。无真实 Provider 请求。
