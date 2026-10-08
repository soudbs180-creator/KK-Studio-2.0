# Verification：统一图片编辑蒙版

- Task ID：TASK-IMAGE-EDIT-001；本地实现 DONE，源码 head64c8b9d 独立 PASS，IM-010–013 CLOSED；最终文档提交单独补审，见[review](review.md)。历史验证保留各自范围。
- 日期：2026-10-08，Asia/Shanghai；开工 base 1af0357b088df79dc51e9b309ef310a500722cf8；整合 base 78cea37af9359fd2d9f58f2854525516deee8a06。
- cwd：本仓库 .worktrees/TASK-IMAGE-EDIT-001；branch codex/TASK-IMAGE-EDIT-001-unified-mask。
- Node 24.20.0；独立 npm ci 完成；初轮 Desktop 2.1.7 / Web 2.1.8；整合后 Desktop 2.1.8 / Web 2.1.9 / Mobile 规划 2.1.1。
- [intent](intent.md) / [spec](spec.md) / [plan](plan.md)。未推送、合并或发布。

## 首次实现检查结果（提交前工作树，历史）

| 检查                                                       | 实际结果                                                                                              |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| npm run verify                                             | exit 0：lint、版本/目标/账本/功能/Markdown、typecheck、root、Agent、UI、format、build、浏览器全部通过 |
| root                                                       | 747 项，739 PASS，原有 8 skip；无新增 skip                                                            |
| Agent                                                      | 174 项，172 PASS，原有 2 skip；无新增 skip                                                            |
| 浏览器全套                                                 | 419/419 PASS，0 retry/0 flaky                                                                         |
| 编辑/能力/对比/本机服务定向浏览器                          | 24/24 PASS，retries=0、workers=2                                                                      |
| Mask/快照/轮廓/原生恢复/项目包定向 Node                    | 59/59 PASS                                                                                            |
| UI / format                                                | 207 文件、0 违规；Prettier 全部通过                                                                   |
| cargo test                                                 | 100/100 PASS，0 ignored                                                                               |
| client:check / cargo fmt                                   | exit 0；保留既有 dead_code 编译提示                                                                   |
| fresh cargo build --release + tests/desktop/image-edit.mjs | exit 0，实际 Windows/Tauri production、隔离数据目录 PASS                                              |

完整 verify 使用 KK_TEST_PORT=1436、KK_STUDIO_COMPANION_ORIGINS=http://127.0.0.1:1436。默认 1423 被已有 PID 47832 占用，未停止其他任务。开发服务器 1421 固定端口规则没有修改。对比测试跟随已存在的 KK_TEST_PORT 契约；本机服务仅在测试进程允许该 origin，未改生产默认 CORS。

## 验收覆盖

- AC-1：真实原图上传、统一三层 Canvas、三工具 runs、缩放复位和撤销重做；第二触点取消待提交画笔与色块；390×844 工具栏拖到边界后完整在画布内；关闭、重开、刷新恢复 Mask。
- AC-2/3：5% 四边外扩、偶数、边界位移/补齐、重复合并链、3 与 4 区域切换、1000/2500 阈值及声明尺寸回退；Web native PNG mask 与原图+标注 fallback 分别通过 multipart fixture 请求。
- AC-4：RGBA 对照验证 Mask 外每一像素不变；3 区域中间失败后保留其它成功区域，仅重试失败区；4 区域整图返回比例异常保持 known failed、保留原图；拒绝首个审批取消整组排队区域，保留草稿。
- AC-5：同色色块 A/B 对应不同指令，空输入只在有效已确认指令存在时发送；native 二值 Mask 附带标注图定位；歧义/删除编号与错误快照拒绝；请求总长受 4000 字符约束且本轮指令不截断。
- AC-6：归档预览进入共享灯箱；实际 Desktop 删除原图后切相邻候选，原快照生成新候选，新幂等键且没有 retryOfTaskId；项目包带 source/mask/历史参考、草稿和上下文，经 Web/native 独立校验还原。

Desktop 使用 loopback HTTP fixture 与临时系统凭据，两次发送 PNG Mask；finally 删除测试凭据，不使用用户连接和数据目录。两次返回同一 PNG，覆盖去重与并发。第一候选改变 1071 个 RGBA 分量，Mask 外改变数 **0**。导出包含 4 个实际引用素材，恢复的快照/草稿一致。关闭 EXE 后在同一隔离目录重启，删除的源节点没有复活，仍为两个成功任务、两个候选，请求数保持 2。

## 首次实现实际 UI 运行链路（历史）

来源：docs/UI_INDEX.md 指定的当前四页基线与 UI_RULES/DESIGN-SYSTEM/UI_SPEC → src/styles/tokens.css → 既有 Modal、ComposerTextarea、ui-button → src/main.tsx → App → Canvas → CanvasNode/ImageCreationNode → ImageRedrawDialog → ImageEditor → ImageCanvasLayers/EditToolbar/EditComposer。生成图片通过 DemoResultNode 进入同一编辑器。App 稳定承载 ImageLightbox，图片节点删除不会卸载灯箱。App.tsx 统一导入 image-edit.css，没有组件提前导入改变顺序。

- Web 全套：Vite production preview，http://127.0.0.1:1436/。同状态取证：1435 严格端口、route /、项目重绘弹层。
- Desktop：src-tauri/target/release/kk-studio.exe --data-dir 本次隔离目录；http://tauri.localhost/、route /；实测 data-runtime-mode=production、data-runtime-entry=src/main.tsx。
- 两端实测加载 /assets/index-DMtJCHmu.js，读取响应并与当前 dist SHA-256 相同：2541249ea7a61808d7dc0ff3fdb844d0ef7d45f0c59847cf7cd354d3889c94e9。
- CSS：/assets/index-CSF9XnZa.css。Web 实测三层尺寸 1672×941、按钮高 32px/文字 14px、胶囊高 82px；默认/选中/禁用等消费现有语义 tokens。新增工具是工程补充，不声称存在完整编辑器 Figma 同稿。
- 首次 EXE SHA-256：28f46af0975dd303846eafdd000e63a9c14536827906f8d0e35f5f7aad87e790。

收据/截图/日志在本任务 .tmp/image-edit/；交付副本位于本机 D:/kk-studio/output/unified-image-mask-20261008/。包含两端 acceptance JSON、编辑/窄屏/灯箱 PNG、verify/Rust/client 日志。源码不提交测试 profile、用户数据或凭据。

## RED → GREEN 和历史勘误

基线 typecheck PASS，root 731 项（723 PASS/8 原 skip）。领域缺失、浏览器缺工具、第二触点误提交色块、native 包拒绝编辑字段均先观察失败后补实现。native 可选请求 ID/hash 为 null 的素材校验单测先 FAIL，改为省略缺失字段后 PASS。

首轮请求 fixture 用大型蓝调照片作每次输出，localStorage 恢复副本达到既有配额时不能可靠反映终态；改为 100×80 PNG 作请求/逐像素断言，大图上传交互仍保留。首轮完整 verify 留档：410 PASS/8 FAIL/1 flaky；5 项为端口/CORS 环境不匹配，空指令按钮旧断言、重复 status、持久化等待各有直接证据。更新有效输入并等待实际保存，保留能力/限额/像素断言，后续 419 PASS、0 flaky。

Desktop 脚本的目录 key、summary camelCase、按钮名称及保存等待错误按实际契约纠正，不计为产品缺陷。真实重复生成同时暴露 TaskHost/IPC 分别创建素材仓库导致排他文件锁冲突、产生 unknown；共享同一 Arc/Mutex 后，两次同 PNG 原生请求和重启通过。外部进程文件锁保护没有放宽。

## 承接主线后的组合验证

首次实现提交 ba8806d25ccb35020e2a9dce6baaa1fe4dded57c 后，在本任务分支承接 main@78cea37af9359fd2d9f58f2854525516deee8a06（PR #37）。保留新的原生取消等待、unknown 重试边界、CI/harness 和双方历史记录；同一 multipart 请求支持 PNG Mask。没有合并本任务到 main。

| 检查 | 实际结果 |
| --- | --- |
| npm run verify -- -- --workers=4 --retries=0 | exit 0，完整原有流水线；CLI 参数只转发至浏览器并发和重试 |
| root / Agent | 739/747、172/174 PASS，原有 skip 8/2 保留，无新增 skip |
| 全套浏览器 | 420/420 PASS，4 workers，0 retry、0 flaky |
| 撤销/重做定向重复 | 5/5 PASS，2 workers，0 retry |
| UI / typecheck / lint / format / build | 全部 PASS，UI 207 文件、0 违规 |
| cargo test / fmt / client:check | 100/100 PASS、fmt/check exit 0 |
| fresh cargo build --release + tests/desktop/image-edit.mjs | exit 0；2 次实际 Mask 请求、4 素材项目包恢复、删除原图/再生/重启 PASS；Mask 外改变 0 |
| npm run client:taskhost:test | exit 0，主线原生生命周期 11 组 PASS，credentialCleanupComplete=true |
| Web production preview 同状态 | 1435、route /；编辑器和 390×844 截图、三层 Canvas、0 pageerror PASS |

两端实际加载 /assets/index-Buq7teU0.js，响应字节 SHA-256 与 dist 相同：c286fc5ef28daf1670aeca408e12a2beae3df0cffdc5cf4ced3471fb6f59a2d9。CSS 仍 index-CSF9XnZa.css；组合 EXE SHA-256 为 3b5e388fe2932ea3bf02576a8c69db9523a75702f2478b4f5b28b02660cb9b22。使用相同生产入口/import 链；Desktop 版本 2.1.8、Web 2.1.9，不代表发布或安装。

本组实测发生在 merge commit 前的整合工作树；native 生命周期 receipt 的 sourceHead 仍为 ba8806d，不能冒充新提交 SHA。source-manifest-integrated.json 明确记录该状态、merge parent、64 个实际源码/配置/测试文件 hash 和 EXE hash；正式提交后独立核对未变源码，再绑定审查 SHA。证据副本在本机 D:/kk-studio/output/unified-image-mask-20261008/run-integrated-78cea37/（web、desktop、taskhost、logs），不含测试 profile、数据目录或系统凭据。

组合首轮 verify exit 0 但有 1 flaky：撤销测试比较缺省 colorCounters 和空记录，并可能读取撤销前的保存副本。保留维度、region ID 和每条 run 的严格断言，只统一空计数器语义，且等待撤销实际落盘；定向 5 次无重试通过。随后 12 workers 全套多处旧页面发生 30 秒 UI 操作超时；当时本机有 178 个 msedge 和 91 个 node 进程，直接因果 UNKNOWN。保留日志，只终止唯一识别的本轮验证进程树；改为 4 workers、0 retry 后完整 420 PASS。没有放宽断言、延长超时或禁用检查。

## IM-009 验收脚本返修验证

1527b48 正式 review 为 CHANGES REQUIRED，新增测试脚本凭据 ownership/PASS 时机问题。增加 UUID provider、读为空后认领、只删本轮 ID、删后读回和清理失败传播；收据在全部 finally 成功后写。2 项有意义的拒绝/删除失败测试先 RED 后 GREEN。实际 OS 凭据预置合成值后拒绝再次认领，原值保留；完整测试收据 credentialConflictPreserved=true、credentialCleanupComplete=true。

完整 `npm run verify -- -- --workers=4 --retries=0` 再次 exit 0：root 741/749（原 skip 8）、Agent 172/174（原 skip 2）、browser 420/420，0 retry/0 flaky；lint/typecheck/UI207/format/build 全通过。随后补充 cleanup 的 browser.isConnected 检查，最新 Native 与定向 formatter 再次 exit 0；产品源码、版本、EXE/JS hash 未变，不重复声称新的产品构建。

最新 Native 收据 .tmp/image-edit/desktop/run-1791463594856-56968/desktop-acceptance.json；两次 Mask 请求、包/删除原图/再生/重启、Mask 外 0 改动继续通过。证据副本 D:/kk-studio/output/unified-image-mask-20261008/run-credential-fixed-IM009/，含新脚本 66 文件源清单与故障/完整 verify 日志。旧 64 文件清单、原生收据及 1527b48 的审查失败结论保留；返修阶段尚待新 head 独立关闭 IM-009，后续结果如下。

## 已提交源码的独立复验

源码 head dbc88bbd1a3425c04b509730780ff50547788e67、base 78cea37af9359fd2d9f58f2854525516deee8a06；2026-10-08 20:55:05 +08:00 独立 /root/mask_review 正式 PASS，IM-001–009 全部 CLOSED。见[独立收据副本](evidence/review-dbc88bb.md)与 [review](review.md)。本地实现任务可关闭，FEAT-035 PARTIAL 和真实模型/手机后续保持开放。

reviewer 自行执行定向 Node 61/61、formatter 和本轮实际 Tauri 验收（.tmp/image-edit/desktop/run-1791463898383-70816/desktop-acceptance.json，SHA-256 699dd1f1abd070db1fd8bf597cb015184f85ff7f961fc2eb508e0c775e226284）。两次 PNG Mask、4 素材包/删除来源原图/相邻候选/再生/重启通过，Mask 外改动 0，credentialConflictPreserved 与 credentialCleanupComplete 均 true，0 errors；结束后本轮 CDP 9364 无监听。删除生成候选的恢复保护由单测验证，不混同实际删除来源原图的验收。

独立重算 66/66 清单匹配，产品源码/配置/版本相对 1527b48 没有变化，EXE 与 JS 仍匹配上述组合运行指纹。完整 verify、Rust100 与主线原生11组明确是实现者的运行结果；前轮 reviewer 的 Web11/Rust3/typecheck 依据未变产品内容继续有效。本次只收尾文档，最终提交另做精确 SHA 补审，不重复声称产品重新构建。

## IM-010–013 继续审查返修验证（最新本地结果）

用户要求继续检查合理性和合规性；7532e94 独立报告 CHANGES REQUIRED，保留于 [review](review.md)。IM-011 P1 与三项 P2 都在原任务 worktree 有界修正，不新增依赖、权限或模型服务。原审查/probes 和此前 PASS 收据不覆盖、不改写。任务暂 IN_PROGRESS，等待本次代码提交的独立关闭。

| 检查 | 实际结果 |
| --- | --- |
| `npm run verify -- -- --workers=4 --retries=0` | exit0；root 768/776（原8skip）、Agent172/174（原2skip）、browser423/423、0retry/0flaky；lint/typecheck/UI207/format/build/账本/功能/Markdown全通过 |
| `cargo fmt -- --check` / `cargo test` / `npm run client:check` | fmt/check exit0；Rust102/102、0ignored；既有5条dead_code提示保留 |
| `cargo build --release` + `node tests/desktop/image-edit.mjs` | exit0；实际新EXE清空/undo/redo、两次PNG Mask、包4素材、原图节点删除/再生/重启通过；1071分量改变、Mask外改变0 |
| 原生独立编辑标志 | 实际 get/list 读回true，重启两条回执仍true；credentialConflictPreserved/credentialCleanupComplete均true |
| `npm run client:taskhost:test` | exit0；11组、credentialCleanupComplete=true；普通图像/文本和原幂等恢复/取消/异常边界继续通过 |
| Web同状态 | production preview1436、route /；1099宽清空零区域、1920宽空输入四区发送成功DOM/PNG；390宽工具栏边界测试通过 |

RED→GREEN：新5项Node恢复回归先出现 succeeded/raw而预期unknown；原生marker指纹被忽略先失败；21共享Web/Rust vectors先暴露未知字段、null/false counters、无color可选字段绕过，项目包export/preflight先未拒绝；新3项浏览器先因没有清空按钮、重复计数、四区意见过长无审批而失败。修正后上述定向检查和全集全部通过，未放宽有效断言/重试或禁用检查。

IM-011 由 request/receipt/journal 的 imageEditRequired 独立证明融合角色并入指纹，Mask强制true，fallback也true。live/recovery共同校验；缺失/非法快照隔离unknown，不读raw素材、不发布新候选、不自动重发。旧连续编辑无marker时只允许其整图完整自动body与保存lastInstruction精确匹配；普通旧生成无context兼容，整图意见含局部保护文字及同字节继承“编辑输入”tag均不误判。若旧数据的context和标志也全部丢失，无法可靠识别角色，明确UNKNOWN，不宣称能保护任意多字段伪造/删除。

清空混合框选/笔刷/色块后撤销精确恢复所有runs和单调计数器，重做为空；输入和原图不变，能够创建无imageEdit的整图连续任务，刷新仍为空。空输入两区各自意见只出现一次，另一crop意见不出现；四区约2200字一次整图Mask请求成功且总长<=4000，主输入保持空。

本次 Desktop2.1.8→2.1.9、Web2.1.9→2.1.10，Mobile规划2.1.1。沿用上述 UI_INDEX→tokens/shared classes→main/App/Canvas/ImageRedrawDialog/ImageEditor 链路；清空是工程补充控件，32px/14px，selected/disabled使用同一ui-button规则，无新页面样式。实际Web/Desktop同为production入口src/main.tsx，加载/assets/index-BUvutOxY.js；响应/当前dist SHA-256均6b1431869a4b4cafe51150490aa5fcbbc79d16caf7e1527c2f83811629098d6f。CSS仍index-CSF9XnZa.css，EXE SHA-256为4749989f202dc5b35f103d542b1d02635efb4e43eeddca39c22ba051a98503bd。

本机证据 D:/kk-studio/output/unified-image-mask-20261008/run-followup-IM010-013/：RED/GREEN/完整检查日志、Web DOM/截图/423结果、Desktop收据/截图和原生11组收据；不含profile、dataRoot或凭据。source-manifest-followup.json绑定71个实际源码/配置/测试文件和30个工件hash，阶段明确为7532e94之后dirty返修。原生11组收据sourceHead仍7532e94，不冒充新已提交SHA；提交后按未变文件hash另写绑定收据。端口9364/9349/1436结束均无监听，未停止其他任务。

## 82b7490 复验后的全文识别补修（最新本地结果）

独立 82b7490 审查关闭 IM-010/012/013，但合法局部色块意见引用整图模板时，仅 endsWith 判断仍会发布 raw crop。上节所谓“完整 body 精确匹配”只证明尾部一致，不足以证明任务角色；该局限由正式失败收据及新回归纠正，原结果保留。IM-011 仍 OPEN，任务继续 IN_PROGRESS。

新增 5 项真实恢复测试（合计10项）：修实现前3项失败，结果 succeeded 而期望 unknown；其余整图兼容断言通过。修正为已知 root/current 全文重编译、recent 标签确定边界与两种预算、第二正文头歧义隔离后定向 GREEN。测试 raw 使用合法4×4 PNG，局部模板来自真实 compileEditPrompt/formatEditPrompt，编辑快照先通过 decoder，仅删 imageEdit。原件引用/列表保留，无 raw 读取或重发；引用模板的合法 root/current、实际序列化的空白 recent、截断和明确 false marker 继续恢复。

| 检查 | 实际结果 |
| --- | --- |
| 相关 Node / 完整 `npm run verify -- -- --workers=4 --retries=0` | 91/91定向；完整exit0：root773/781（原8skip）、Agent172/174（原2skip）、browser423/423、0retry/0flaky；lint/typecheck/UI207/format/build/version/治理/功能/Markdown通过 |
| Rust fmt / tests / client check | exit0；102/102、0ignored；原5条dead_code提示保留 |
| 独立失败脚本的作者验证副本 | 保留原完整PNG/crop/透明Mask/标注附件，仅更改结果断言；unknown、无result、无raw读取/重发，原件引用保留，exit0。未修改reviewer原脚本或失败日志 |
| fresh release + Desktop / 原生生命周期 | 新EXE构建exit0；Desktop两次Mask请求、包4素材、clear undo/redo、删除来源原图/再生/重启通过；1071分量改变、Mask外0；marker重启true、凭据冲突保留及清理true。主线11组通过 |
| Web同状态 | 本次严格production preview1423、route /、入口src/main.tsx；1099宽清空editor及1920宽四区成功DOM/PNG已查看；实际Web/Desktop均加载index-CufFqG9V.js，SHA一致 |

本次为同一未发布候选的 IM-011 返修，版本保持 Desktop2.1.9/Web2.1.10/Mobile规划2.1.1。新JS SHA-256 63ec6afa3c49e7523c90864b2cfa8462e008165ed5e1e92bb0fa2c1c52353295，CSS仍index-CSF9XnZa.css；新EXE SHA-256 bd7cb954db4cffd16966e620519839d9c88987acfd2c03240185e9b1b485f066。原生编辑收据 .tmp/image-edit/desktop/run-1791470224687-90084/，生命周期 test-results/desktop/taskhost-lifecycle/1791470243665-55df6773-9596-440a-a048-d42e152bc7bc/；后者sourceHead仍82b7490（真实dirty-run起点），不重写为新提交。

新证据目录 D:/kk-studio/output/unified-image-mask-20261008/run-followup-IM011-parser/ 保存 RED/GREEN/完整检查、失败脚本的验证副本、Web DOM/PNG、Desktop收据/截图和11组收据，不含profile/dataRoot/凭据；源码/工件清单及提交绑定单独生成。旧报告、清单、绑定和产物证据保留。结束本次owned1423/9364/9349均无监听，无其他进程终止。本地通过不是独立关闭，仍待新 head 复验。

## 17ef724 之后的整个前缀补修（最新实现结果与独立关闭）

17ef724 独立复验纠正上节兼容结论：known root 中的完整自动正文引用也能造成角色歧义；仅核对全文和recent仍不足。有效完整PNG/local编译/decoder/reconcile证明raw4×4被发布，IM-011保持P1 OPEN。新prefix补修的12项恢复用例先2项RED（succeeded而期望unknown），再93项相关Node GREEN；完整保护断言未放宽。原root/current完整模板成功用例保留输入与成功断言，明确原生false确证角色；新增legacy普通root措辞/current引用成功及root/recent完整正文unknown双分支，依据独立实证更正旧假设。新增双编译结构用例实际assert两个formatter产出相同字符串，再仅删imageEdit验证保护，不能把文本匹配当作独立角色证明。新证据run-followup-IM011-prefix保留RED/GREEN，后续完整验证单列；此前报告、清单、平台中止和superseded结果均保留。

| 最新检查 | 实际结果 |
| --- | --- |
| 相关Node / 完整verify（4workers、0retry） | 93/93；完整exit0：775/783root（原8skip）、172/174Agent（原2skip）、423/423browser零retry/flaky；lint/type/UI207/format/build/version/治理/功能/Markdown通过 |
| Rust fmt / tests / client check | exit0；102/102、0ignored，既有5条dead_code提示 |
| 双编译结构完整PNG探针的作者验证副本 | unknown、无raw读/发布/重发、原件引用不变，exit0；原17ef失败脚本和日志未改 |
| fresh release / 实际Desktop / 原生生命周期 | exit0；两次PNG Mask、clear undo/redo、4素材包、删除来源原图/再生/重启、marker仍true；1071分量改变、Mask外0，凭据冲突保留/清理true；主线11组通过 |
| Web运行链路 | 严格production preview1436，route /、src/main.tsx；最新1099清空editor及1920四区成功DOM/PNG，工程补充控件仍32px/14px；390回归通过 |
| 独立准确源码 SHA 复验 | 64c8b9d168308ff1aefff39daf7126c56e354eef：PASS，011 P1 CLOSED，010/012/013保持CLOSED，无新增P1/P2；reviewer自行执行93定向、四个完整PNG保护探针及type/format/diff，未把作者完整流水线算作独立执行 |

实际Web/Desktop均加载index-BC59cAkv.js，响应与dist SHA-256 bb763f27d3ea8cfd4d26e3fbb2f7429b08eecf82946736ca0a69975207f3a829；CSS仍index-CSF9XnZa.css。新EXE SHA-256 b4cbcaaf7fe7614977960275aecdfae440cb31e95ecb870e1d2e0131e5a80d7d，版本仍Desktop2.1.9/Web2.1.10。编辑收据.tmp/image-edit/desktop/run-1791472855015-2544/，原生11组test-results/desktop/taskhost-lifecycle/1791472863296-5d3b85b9-85c8-4301-bb72-b0049753d2a4/；sourceHead仍17ef（真实dirty-run起点），源码/工件清单和提交绑定另存，不改历史SHA。新证据在D:/kk-studio/output/unified-image-mask-20261008/run-followup-IM011-prefix，不含profile/dataRoot/凭据。source-manifest-prefix.json SHA-256 526219d931b360dd7a3264e4c0fa019b1f8b79d0e5cd584f2fa9a4d084d6923a，71源码/22工件；commit-binding-prefix-64c8b9d.json绑定clean源码提交，独立再次重算全部匹配。本次owned1436/9364/9349均已无监听，没有终止其他任务进程。

2026-10-08 23:38:25+08，/root/mask_review 正式[源码复审PASS](evidence/review-followup-64c8b9d.md)，IM-011独立关闭。原件SHA-256 855f6314206d167203463f93998b6d2a0e6bcc5345ebe7a92fe9f4a3db334af8；外部新probes目录review-followup-probes-64c8b9d保留其93定向及完整PNG/type/format/diff、字节核对。首次额外断言误把generationStatus视为不可变而exit1，原件保留；独立校正探针要求预期error并保护所有其余source字段通过，不能把该断言错误解释成产品失败或删除失败证据。此次没有放宽tracked测试、增加skip/retry或虚构付费模型/真机结果。收尾仅改文档和生成视图；最终已提交文档head另做一致性补审，外部review-followup-final-head.md与旧review-final-head.md分开保存。

文档收尾 lint/version/goals、103任务治理、35功能与102活动Markdown检查通过。最初DONE验证描述含其它功能的PARTIAL字样，被治理器拒绝；已将完成任务字段限定为本地实现证据，FEAT-035卡片的PARTIAL与VERIFY-002的TODO及原验收内容保留，没有修改检查器。额外docs JSON格式检查暴露基线账本既有的Prettier差异，不在项目format:check范围内；撤回整文件格式重排，保留原JSON.stringify格式，独立比较其他102条任务内容未变。勘误在本机prefix-closure-ledger-format-scope.json；最终lint日志prefix-closure-final-doc-checks.log，源码与构建无新变化。

## 外部验收边界（保留）

真实付费 Provider 视觉质量、任意模型语义几何位移自动识别、物理手机键盘/触控及最终用户验收未发生。当前拒绝比例偏移大于 2% 的结果；不能声称自动识别所有构图位移。Mobile 原生应用未改，Web 窄屏与合成触控不等于真机验收。功能保持 PARTIAL，外部后续独立登记，不冻结已通过的本地实现。

原件为不可变归档，候选另存；可删除候选回到原图。回滚源码前保留编辑项目及素材快照，不能把 Mask 任务降级为普通生成再发送。
