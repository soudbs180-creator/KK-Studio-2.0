# Verification：阶段计划工作台与竞品能力比较

- Task ID：TASK-ORCH-002
- 记录状态：IN PROGRESS
- 执行时间与时区：2026-10-08，Asia/Shanghai。
- Intent / Spec / Plan / AC：本目录三份同名文件；AC-1–AC-4。
- cwd / branch：独立 worktree `TASK-ORCH-002-stage-workbench` / `codex/TASK-ORCH-002-stage-workbench`。
- 被验证 base SHA：21d121d2b884b2b7ced4a98eb0e03c590de5c3cd；初轮实现 ba9adbbe4533d3669484935490bf59a4c7de6def；独立 review 的 dfd4c12 返修后在当前候选树重新完整验证，修复 committed HEAD / 复验收据后补。
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
| 初轮独立 review，dfd4c12                                    | —      | CHANGES REQUIRED，3项finding                      | evidence/review-dfd4c12.md                               | P1排队保存假成功、P2重新审批入口、P2空结果阶段拒绝；修复复验待完成       |

## 独立审查返修后的重新验证

以下替代初轮当前状态结论，初轮和失败日志均保留。

| 检查 | 退出码 | 实际结果 | 证据 |
| --- | --- | --- | --- |
| 新 requestStageApproval 跨项目回归，修改前 | 1 | RED：Missing expected exception | evidence/review-red-project-scope.txt |
| 真实 useCreationStorage 排队原生冲突，修改前 | 1 | RED：第二次 flush 缺少拒绝；已确认版本幂等测试通过 | evidence/review-red-save-queue.txt |
| 原已确认版本重复 flush 的保存状态 | 1 | RED：saving !== saved；不是延长 native 等待解决 | evidence/review-red-acknowledged-state.txt |
| 拒绝后重新审批 / 空结果拒绝 UI，修改前 | 1 | RED：两个动作不存在；非空返工选择保护通过 | evidence/review-red-browser.txt |
| Stage / Orchestrator / 实际存储 hook 定向测试 | 0 | PASS，46/46；排队冲突拒绝、原件不写、草稿保留并可重新读取，幂等状态正确 | evidence/review-green-unit-final.txt |
| 工作台 Web 专项 --workers=2 --retries=0 | 0 | PASS，12/12；包括双击重新申请/再批准、空结果拒绝、非空必选、390/1099/1920 | evidence/review-green-browser.txt；最终源码另由全量verify重验 |
| npm run verify -- -- --workers=2 --retries=0 | 0 | PASS，根638/646、Agent172/174、浏览器389/389；无retry/flaky；原平台skip8/2保留 | evidence/verify-review-fixed.txt |
| npm run client:build -- --no-bundle，返修构建 | 0 | PASS，fresh production release；5项既有Rust dead-code warning保留 | evidence/review-native-build-2.txt |
| native 新测试前几次 | 1 | 正常审批后永久保存中被真实发现并修复；随后故障步骤不能改写原生只读invoke，调整测试传输边界 | evidence/review-native-ui.txt / review-native-ui-2.txt / review-native-ui-3.txt / review-native-ui-4.txt |
| node tests/desktop/stage-workbench.mjs，最终 | 0 | PASS，2次真实进程；拒绝/解除/重新申请/批准、结果返工、重启；实际Rust CAS冲突后排队审批拒绝且无成功提示；原件/恢复草稿保留 | evidence/review-native-ui-5.txt；evidence/desktop-acceptance-review-fixed.json |
| npm run client:check，返修后 | 0 | PASS；5项既有warning未隐藏 | evidence/native-check-review-fixed.txt |

原生故障测试只在隔离测试进程中延迟第一笔 fetch IPC 传输，原生 invoke 的不可写保护保持不变。另一写入通过真实 write_creation_snapshot 更新同一隔离数据根的 revision；释放旧请求后由 Rust 返回真实 conflict。writes=1 仅统计被测试 UI 的传输，另一个写入单独执行。截图显示内存审批变化及明确未保存错误；磁盘阶段仍为 result_review。重新读取回到磁盘原件并显示内存草稿可单独下载；没有宣称自动回滚整个内存操作。

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
- 初轮 Desktop EXE SHA-256：`5cdb9d86d50e3d97cf144b6d2da46912d2188711f7bc2f132ff32a9b7d3bd6b0`。返修后的实际 EXE 为 `896a9a0eeb683dfa79b4f3a4b884d318c273f87c69ade47d91cb4b5a2842242d`，production entry `src/main.tsx`、bundle `index-DCiDe2Qa.js`、1920×1080、无 pageerror，见新收据。
- 同状态源：现有 UI_INDEX / 工作台 / tokens；新阶段 UI 是工程补充，没有独立 Figma frame，本轮未做新 Figma 读取或精确对齐声明。
- 已人工查看 390px Web 与 Desktop 返工截图；原生截图与收据保存在 evidence，避免后续 Playwright 清理 test-results 后丢失。
- 完整 UI/生成供应商状态和用户最终产品视觉验收尚未发生。

## 外部能力与真实性

所有计划均为确定性 fixture；不等于 Agent 已自动创建计划、MCP 已注册或媒体已真实生成。竞品仅做静态拆解。真实 Provider/GPU、计费、云端、安装器发布、Mobile 与远端 CI：NOT RUN。自动执行/重规划仍属 TASK-ORCH-003，注册仍属 BACKEND-MCP-AUTO，FEAT-030 保持 PARTIAL。

## 当前结论

审批 UI 和共享编排器接线已实现；独立审查三项finding均已修复，并补已确认版本的保存状态修复。最新完整verify退出0：根638/646、Agent172/174（原平台skip8/2）、browser389/389零重试；Desktop真实保存/重启/原生冲突/草稿恢复和client:check通过。修复committed HEAD的独立复验尚待。未推送、合并或发布，main不变。
