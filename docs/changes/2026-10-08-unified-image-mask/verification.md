# Verification：统一图片编辑蒙版

- Task ID：TASK-IMAGE-EDIT-001；本地实现与运行检查 PASS，最终独立审查见 [review](review.md)。
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

## 尚未验收

真实付费 Provider 视觉质量、任意模型语义几何位移自动识别、物理手机键盘/触控及最终用户验收未发生。当前拒绝比例偏移大于 2% 的结果；不能声称自动识别所有构图位移。Mobile 原生应用未改，Web 窄屏与合成触控不等于真机验收。功能保持 PARTIAL，外部后续独立登记，不冻结已通过的本地实现。

原件为不可变归档，候选另存；可删除候选回到原图。回滚源码前保留编辑项目及素材快照，不能把 Mask 任务降级为普通生成再发送。
