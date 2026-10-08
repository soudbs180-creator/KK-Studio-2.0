# Verification：阶段计划工作台与竞品能力比较

- Task ID：TASK-ORCH-002
- 记录状态：IN PROGRESS
- 执行时间与时区：2026-10-08，Asia/Shanghai。
- Intent / Spec / Plan / AC：本目录三份同名文件；AC-1–AC-4。
- cwd / branch：独立 worktree `TASK-ORCH-002-stage-workbench` / `codex/TASK-ORCH-002-stage-workbench`。
- 被验证 base SHA：21d121d2b884b2b7ced4a98eb0e03c590de5c3cd；实现源代码commit ba9adbbe4533d3669484935490bf59a4c7de6def；独立review后补。
- 工具：Windows、Node v24.20.0、npm、Playwright msedge、Tauri 2 release；仅使用本地 fixture，没有供应商调用。

## 实际命令和结果

| 命令/检查                                                   | 退出码 | 结果                                             | 证据路径                                                 | 范围与限制                                                              |
| ----------------------------------------------------------- | ------ | ------------------------------------------------ | -------------------------------------------------------- | ----------------------------------------------------------------------- |
| npm ci --no-audit --no-fund                                 | 0      | PASS                                             | .npm-install-stage.log                                   | 隔离 worktree 依赖；保留 esbuild install-script 提示                    |
| npm run typecheck；node --test stagePlan/orchestrator 基线  | 0      | PASS，40/40                                      | .stage-baseline.log                                      | 修改前的领域/类型基线                                                   |
| 新增跨项目决定/解除阻断回归，修改前运行                     | 1      | RED，2 项 Missing expected exception             | .stage-red-unit.log                                      | 捕获同计划 ID 的项目切换误写                                            |
| 项目范围校验后领域回归                                      | 0      | PASS，42/42                                      | .stage-green-unit.log                                    | 既有 CAS、结果返工、依赖与非法工具操作保留                              |
| Stage UI 实现前生产浏览器回归                               | 1      | RED，6 项入口缺失                                | .stage-red-browser.log                                   | 全部停在等待阶段计划 tab                                                |
| Stage UI 初次运行                                           | 1      | 4 PASS / 2 FAIL                                  | .stage-green-browser.log                                 | 操作后选择跳到下一审批，修正为保留操作阶段                              |
| 相邻 Agent/工作台与 Stage 回归                              | 1      | 18 PASS / 1 FAIL                                 | .stage-green-browser-2.log                               | 重载默认回首页，测试改为从项目库重开；相邻路径通过                      |
| 保存失败专项初次运行                                        | 1      | 9 PASS / 1 FAIL                                  | .stage-browser-final.log                                 | 故障注入早于初始项目保存，改为等待已保存后注入                          |
| Stage 浏览器专项 --retries=0                                | 0      | PASS，10/10                                      | .stage-browser-final-2.log                               | 审批、返工、刷新、保存失败、离线、键盘、390/1099/1920                   |
| ESLint . --max-warnings 0                                   | 0      | PASS                                             | .stage-lint.log                                          | 最终全套仍待重跑                                                        |
| npm run version:bump -- --platform desktop,web --kind patch | 0      | PASS                                             | 平台版本文件                                             | Desktop 2.1.4 / Web 2.1.5；Mobile 保持 2.1.1                            |
| npm run client:build -- --no-bundle                         | 0      | PASS                                             | .stage-native-build.log                                  | release EXE；5 项既有 Rust dead-code warning，未隐藏                    |
| Desktop 新测试初次/第二次运行                               | 1      | FAIL，测试进程关闭方式                           | .stage-native-ui.log / .stage-native-ui-2.log            | Node signal 退出码与 CDP 关闭时序；改用仓库既有 CloseMainWindow 方法    |
| node tests/desktop/stage-workbench.mjs                      | 0      | PASS                                             | .stage-native-ui-3.log；evidence/desktop-acceptance.json | 真实 release、隔离数据目录、2 次进程启动；审批/返工/重启保存，无生成    |
| npm run verify                                              | 0      | PASS：根634/642、Agent172/174、浏览器386+1 flaky | evidence/verify-initial.txt                              | 根8项/Agent2项原平台skip；ui-motion动画等待首次超时后重试通过，保留失败 |
| Playwright全量 --workers=2 --retries=0                      | 0      | PASS，387/387，零重试、零flaky                   | evidence/browser-no-retry.txt                            | 首轮动画等待超时记录保留；本次完整回归未改变任何断言                    |
| npm run client:check                                        | 0      | PASS                                             | evidence/native-check.txt                                | 5项既有Rust dead-code warning                                           |
| 独立 review                                                 | —      | NOT RUN                                          | review.md                                                | 必须对最终 committed HEAD 审查                                          |

## 验收覆盖

| AC   | 平台/状态                     | 观察结果                                                          | 证据                                          | 结果 |
| ---- | ----------------------------- | ----------------------------------------------------------------- | --------------------------------------------- | ---- |
| AC-1 | Web production，390/1099/1920 | 阶段、状态、工作项、进度可读，审批按钮可操作                      | Stage 专项、截图                              | PASS |
| AC-2 | Web IndexedDB / Desktop 原生  | 审批后刷新/进程重启保留；结果返工原 prompt 不变；无新增任务       | 浏览器与 native fixture                       | PASS |
| AC-3 | 真实编排器 / Web 存储故障     | 旧项目/CAS 操作拒绝；失败持续显示、无假保存成功；离线本地操作通过 | 单测 + 故障注入                               | PASS |
| AC-4 | 静态比较 / 治理               | 31项证据映射原feature/task；registry仍34项、ledger仍92项          | comparison.md；governance/features零violation | PASS |

## UI / 运行态证据

- Web：Vite preview 1423、production dist；Desktop：当前 worktree release EXE，`http://tauri.localhost/`，runtime mode=production、entry=src/main.tsx。
- 原生数据根在本 worktree target/stage-workbench-acceptance 下，独立 WebView profiles；未访问用户正常数据目录。
- Desktop EXE SHA-256：`5cdb9d86d50e3d97cf144b6d2da46912d2188711f7bc2f132ff32a9b7d3bd6b0`；实际 1920×1080 viewport；无 pageerror。
- 同状态源：现有 UI_INDEX / 工作台 / tokens；新阶段 UI 是工程补充，没有独立 Figma frame，本轮未做新 Figma 读取或精确对齐声明。
- 已人工查看 390px Web 与 Desktop 返工截图；原生截图与收据保存在 evidence，避免后续 Playwright 清理 test-results 后丢失。
- 完整 UI/生成供应商状态和用户最终产品视觉验收尚未发生。

## 外部能力与真实性

所有计划均为确定性 fixture；不等于 Agent 已自动创建计划、MCP 已注册或媒体已真实生成。竞品仅做静态拆解。真实 Provider/GPU、计费、云端、安装器发布、Mobile 与远端 CI：NOT RUN。自动执行/重规划仍属 TASK-ORCH-003，注册仍属 BACKEND-MCP-AUTO，FEAT-030 保持 PARTIAL。

## 当前结论

审批UI和共享编排器接线已实现；全套verify退出0，随后全量浏览器387/387零重试通过。根634/642、Agent172/174（原平台skip8/2）、Desktop原生保存/重启及client:check通过。最终HEAD独立review尚待。未推送、合并或发布，main不变。
