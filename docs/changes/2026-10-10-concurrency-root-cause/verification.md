# Verification：IRV-CONC-001 首轮异常定位

- Task ID：TASK-VERIFY-CONCURRENCY-002
- 状态：IN PROGRESS；根因 UNKNOWN，IRV-CONC-001 OPEN/P2。
- Base：`7ebf143b291e344b243e1ef396d510bb91730bd3`；本包新增诊断工具，产品 source、现有测试断言和配置不变。
- 环境：Linux x64、Node24.19.0/npm11.9.0、Playwright1.63.0；Windows/Edge 实验由独立 CI 执行，结果另凭真实运行回执记录。
- 关联：[intent](intent.md)、[spec](spec.md)、[plan](plan.md)、[review](review.md)。

## 已证实的历史事实

`node scripts/diagnostics/analyze-concurrency-history.mjs --out <新路径>` 实际核验49份source105原件和20份并发矩阵原件的压缩/解压bytes与SHA256，69/69一致。派生数据见 [history-analysis.json](evidence/history-analysis.json)，原件未改。

source105：447测试、456尝试、438 expected/9 flaky，actualWorkers=12，默认1423、strictPort、reuseExistingServer=false、retries=1。7个首轮timedOut，2个首轮轮询失败。9个失败分属9文件/9 workers，共同执行窗口为 UTC 01:39:24.148–01:39:47.901（23.753秒）；同一窗口全部12 workers均有进行中测试，另外3项最终PASS但耗时25.395–30.362秒。这是执行重叠和耗时相关证据，**不是已测得的23.753秒停顿**。

| workers | 447项总耗时/秒 | 采样进程数峰值 | working set/GB | working set/GiB | 单测p95/ms | 首次采样距启动/ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 601.184 | 16 | 2.066 | 1.924 | 2697 | 225755 |
| 2 | 322.602 | 24 | 2.955 | 2.753 | 2756 | 25126 |
| 4 | 192.521 | 43 | 4.674 | 4.353 | 2915 | 24082 |
| 8 | 135.828 | 78 | 7.819 | 7.282 | 4053 | 22330 |
| 12 | 130.327 | 114 | 10.749 | 10.011 | 5762 | 20498 |

上表是同一source8090475/production dist/1423/retries0的既有矩阵；全部447/447一次通过。GB=10^9 bytes；GiB=2^30 bytes。旧verification把十进制GB标作GiB，本包追加勘误，不覆盖旧值。采样对象首项是PowerShell包装进程，随后才是CLI子树；新工具以Playwright PID为root，两者边界不同。旧采样间隔最大约6.49–7.48秒，并且有上述初段盲区，所以只报告**采样到的峰值**，不能声称全程瞬时峰值或解释source105历史负载。

## 假设与边界

- H1 INFERENCE：跨12 worker的时间聚集与共享调度/资源竞争相容；缺少历史CPU、分页、资源时间线、准确Edge版本及逐步trace，尚未证实。
- H2 UNKNOWN：running任务与几何轮询超时可能是各自异步链问题，也可能是共享停顿影响；`session closed`可能由测试timeout清理产生，不能当作浏览器独立崩溃证据。
- H3：历史首轮config明确1423；1431的10个失败是独立端口/来源契约条件，不能用于解释这9项首轮异常。历史启动前端口及实际dist hash未知。
- source105到当前main的产品、browser tests、root lockfile、Playwright/Vite配置diff为空。Node可执行路径历史为24.21，本次旧矩阵记录为24.20，原Edge精确版本没有保存。

## 本轮实际检查

| 检查 | 结果 | 范围 |
| --- | --- | --- |
| npm ci、git:guards | PASS | root和隔离worktree依赖安装；未改lockfile |
| baseline/current lint、typecheck、production build | PASS | 实际命令出口0，历史Rollup注释/chunk warning保留 |
| 诊断工具Node回归 | PASS，7/7 | 已有输出拒绝、端口/参数拒绝、首轮失败保留、GB/GiB、Windows BOM、临时配置服务cwd、采样器异常不能PASS；先RED再GREEN |
| Linux全量Node current | PASS，813通过/6跳过/0失败 | 串行运行819项，42443ms；完整TAP总计可核对 |
| production preview实际服务启动 | PASS，1/1 | 同一base配置和dist；临时配置显式cwd，1423返回200及构建资产；不需浏览器fixture |
| Playwright --list定向选择 | PASS，9项/9文件 | 同一file:line参数化用例再按精确title过滤 |
| Linux全量Node baseline | NOT VERIFIED | 命令出口0但日志仅138条成功且缺总计，不能冒充完整812项验收 |
| Linux Edge安装/启动 | ENVIRONMENT FAILURE | apt用户切换失败；校验官方deb SHA后提取运行，启动SIGSEGV；没有执行产品测试，不算产品FAIL |
| Windows诊断矩阵 | NOT RUN（准备中） | 全量4/12一次；历史9项1/12两轮，均retries0，独立目录，trace/steps/资源/HTTP原件 |

新工具采样影响调度/trace开销需要计入解释；跨机器PASS不排除原机瞬时因素。无产品修复、无timeout增加、无retry增加、无断言删除；原quality工作流不变。Desktop/Mobile/Provider/用户数据/发布不涉及。当前任务保持PARTIAL，CI/审查/普通合入另按真实head验收。

独立审查首次发现的新取证工具缺陷：临时配置cwd错误、隐藏目录原件上传可能被跳过、采样器异常退出可能误判通过。已分别修正显式cwd、限定include-hidden-files且缺文件报错、采样退出状态纳入失败判定，并增加回归；这些是诊断工具自身缺陷，不能认作历史flaky原因。
