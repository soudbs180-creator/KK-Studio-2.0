# Verification：模型能力声明

- Task ID：TASK-MODEL-001；本地AC1–5 PASS（技术head71ddb625）；最终文档HEAD/Hosted另绑；此前PASS为固定SHA历史；日期：2026-10-08（Asia/Shanghai）。
- [Intent](intent.md) · [Spec](spec.md) · [Plan](plan.md) · [Review](review.md)。
- branch：codex/TASK-MODEL-001-capabilities；开工base21d121d2b884b2b7ced4a98eb0e03c590de5c3cd；当前base5dd6e6dddaf00cf2d5c14ae02ef5974c72238232。
- cwd：`D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-MODEL-001-capabilities`；原 checkout clean。

## 开工结果（历史）

原生 worktree 工具在容器目录报 Not a git repository，使用已 ignore 的 .worktrees Git fallback。fetch 默认失效回环代理，临时 `git -c http.proxy= fetch origin main` 成功，main 未前移。默认沙箱启动器返回 HRESULT 0x80070020，读/验证命令经自动审核在非沙箱上下文运行；未出现审核拒绝。

`npm ci --offline --no-audit --no-fund` 退出 0，依赖由现有缓存安装；npm 提示 esbuild 安装脚本未预批准，后续构建需确认实际可用。初次 npm 未在 PATH，随后使用现有仓库 Node 24 工具；未变更系统安装。

## 实施与失败先行

隔离 worktree 的基线 lint/typecheck PASS，Node 640 项中 632 PASS、8 个既有平台 skip；没有把 skip 算通过。Node/npm 使用已有工具目录，未引入依赖。后续 production build 已确认 esbuild 可用。

| 范围 | 首次失败 | 修正后结果 |
| --- | --- | --- |
| 目录报告/保存 | `red-catalog.log`：5 fail / 1 pass，缺少 image 字段，writer 未过滤未知属性 | `green-catalog.log`：12/12 |
| 共享提交门禁 | `red-submission.log`：4 fail / 6 pass，已禁止 edit、零参考图及任务总数仍可提交 | `green-submission.log`：24/24 |
| 画布参考图 | `red-canvas.log` 先暴露 Node import 扩展错误；修正 import 后 `red-canvas-behavior.log` 复现超限可连线 | `green-canvas.log`：12/12 |
| 无显式 model 的新节点 | `red-default-node.log`：11 pass / 1 fail，未使用当前命令的账号/model | `green-default-node.log` 通过；所有参考图消费者使用同一默认选择 |
| 三态设置/约束 UI | `red-ui.log`：缺少新控件；`green-ui.log` 暴露收起状态参考图按钮未禁用 | 修正入口后继续回归，没有移除约束 |
| 单张重绘 | `red-redraw-saved-draft.log`：旧 count=8、当前限额=1 会误禁单张重绘 | 重绘传入自己的 outputCount=1；`green-ui3.log` 14/14，无 retry |
| 文本兼容 | `red-text-compat.log`：图片声明误约束同账号文本模型 | 只对图片使用 image 声明，文本保留原连接许可；`green-text-retry.log` 26/26 |

`green-ui.log` 的另两项失败是测试定位器错误：status 需限定目录 fieldset，参数菜单采用实际 title；按真实组件来源修正，不删验收。首次 native 检查所有业务断言通过后，隐藏数量按钮的 computed-style 读取失败；改为实际可见 body 字号记录，`desktop-acceptance-run2.log` 通过。App 新增 native 图片复查时同步保留显式重试选项，与 Web 原有规则一致。

首轮 `verify.log`：Node 645/653（8 skip）、Agent 172/174（2 skip）通过；UI check 因 CanvasNodeLayer 317 行失败。将既有参考图集合映射按职责移入 `canvasReferences.ts`，不改变图边语义，UI check 191/0。`verify2.log` 在已有 1423 listener 处拒绝启动，未停止未知来源进程。`verify3.log` 使用 1425 后 377 pass / 4 fail；检查确认图片比较断言和本机服务允许 origin 固定 1423，属于运行配置不兼容，未放宽测试/CORS。1423 listener 自行退出后，在原配置执行 `verify4.log`；结果待回读。

## 开发模式既有失败

任务分支开发模式的四项 capability 浏览器测试均被 Vite 的 `/plugins/{html,markdown,sticky-note,svg}.js` public-import 错误遮罩阻挡。原主线 main@21d121d 用原实现和依赖在 1421 复现同样错误，见 `baseline-dev.log` 与 `.tmp/model-capabilities/baseline-dev.json`；主线源码/索引仍 clean。

本轮不修改插件实现、不关闭 HMR overlay、不把失败算 PASS。独立问题登记为 TASK-PLUGIN-DEV-001。另用 overlay 已提供的 Escape 操作退出已记录遮罩后，实际新设置页保存了 true/false/zero/数量，`development-capability.log` 退出 0；这仅证明当前能力表单/存储在 development 生效，插件加载仍 PRE-EXISTING FAILURE。

## UI 来源与运行链

来源为 UI_INDEX 指定 Figma 四页 `505:13071/13430/13731/14180`、现行 detail 设置模板与 tokens.css。复用 provider 表单、quality-btn、计数菜单与 ReferenceStrip；没有增加局部 CSS 或修改 Figma。新三态/禁用提示是工程补充，本轮同状态 runtime 证据不冒充新 Figma 画稿验收。

入口 `index.html → src/main.tsx → App.tsx`；设置链为 `SettingsPanel → SettingsSections → ConnectionSettings → ModelProviderSettings → ProviderModelCatalog → ImageModelCapabilityFields`，画布链为 `Canvas → CanvasNodeLayer → CanvasNodeItem → CanvasNodeContent → ImageCreationNode/DemoResultNode → CreationComposer → CreationParameterControl → ImageModelParameters`。

| 模式 | 启动与 URL | 实际入口/证据 |
| --- | --- | --- |
| Development | `node node_modules/vite/bin/vite.js --port 1421 --strictPort`；`http://127.0.0.1:1421/` | data-runtime-mode=development；`/src/main.tsx`；`.tmp/model-capabilities/development-runtime.json` 与 development-settings.png；14px 控件；已记录 plugin 失败 |
| Web production preview | `npm run verify` 内 test:ui build + strict preview；`http://127.0.0.1:1423/` | 三档 390/1099/1920 capability 截图和 runtime JSON；data-runtime-mode=production，styles/JS 从实际 DOM 读取 |
| Tauri release | `npm run client:build -- --no-bundle` 后 `node tests/desktop/model-capabilities.mjs`；`http://tauri.localhost/` | 最后源码 fresh EXE + 隔离 --data-dir/WebView profile；声明恢复、数量/参考图限额、原图归档、重绘禁用、tasks=0、page errors=[]，全部 PASS |

Desktop/Web 源码版本 2.1.4/2.1.5；Mobile 规划版本仍 2.1.1。`client:check` 已退出 0，有五项既有 Rust dead-code warning。正式安装包、真实 provider、原生 Mobile、合并/发布尚未验收。

## 全量与交付

`npm run verify` 原配置最终运行 [verify4.log](evidence-manifest.json) 退出 0：Node 645/653（8 个既有 skip）、Agent 172/174（2 个既有 skip）、Edge browser 381/381；lint/typecheck/UI191/0/format/build 与治理/功能/Markdown 检查全部通过，无最终 browser flaky。没有为通过而修改图片比较或本机服务测试。

最后源码 [Tauri build](evidence-manifest.json) 和 [隔离运行](evidence-manifest.json) 退出 0，EXE SHA256 `6577c1831c9a1f691a71ee3e68da32bc59084f922534d498ac644a5ee1effb22`；实际加载 `/assets/index-Bvt1L0MZ.js`、`/assets/index-Dajq2fwF.css`，JS 字节与当前 dist 相符。完整 [native runtime](evidence/desktop-acceptance.json)、[Web runtime 1920](evidence/capabilities-runtime-1920.json)、[browser summary](evidence/browser-summary.json) 和 [源码指纹](evidence/source-fingerprint.json) 绑定这次 dirty 实现；随后提交未改产品源码。独立上下文 review 待绑定提交 SHA。

截图：[Web 390](evidence-manifest.json)、[1099](evidence-manifest.json)、[1920](evidence-manifest.json)、[native 设置](evidence-manifest.json)、[native 参数](evidence-manifest.json)、[native 重绘禁用](evidence-manifest.json)。[development runtime](evidence/development-runtime.json) 与 [main 开发失败](evidence/baseline-dev.json) 分开保留，不把遮罩后局部通过变为开发插件通过。

正式证据放本包 evidence；完整运行日志和浏览器 JSON 记录退出结果/原平台 skips。全量命令使用 Node 24.21.0/npm 12.1.1；独立诊断/原生验收脚本使用现有 Node 24.19.0，浏览器为本机 Edge/WebView2。既有 large-chunk 与 Rust dead-code warning 未屏蔽。

## 真实性边界

本轮以本地目录和受控 HTTP fixture 验证声明/校验；不触发真实付费生图。真实 provider 的正确能力、服务验收、mask/outpaint 执行、Mobile、合并/发布和用户最终产品验收尚未发生。

## MC-001 修正与 main@5b0eb6a 集成记录

首轮实现提交 0d20696e 的独立审查为 CHANGES REQUIRED：MC-001（P2）要求参考图 UI 与真实归档附件去重一致，详见 review。当前分支先合并 origin/main@5b0eb6a341335c6bcdefcadf59be3ae4c2e4cdb3，再修正该 finding；这一轮的证据不会替换原 21d/0d 记录。

[图边 RED](evidence-manifest.json) 13 pass / 1 fail，真实断言为同一归档原件应允许连线而被误拒；[稳定 UI RED](evidence-manifest.json) 复现不同素材超限时重绘仍 enabled。此前 UI 准备失败涉及 upload-only 节点、卸载保存、动态 first 定位与未知模型，日志 ui1–5 保留，没有把准备失败当产品 RED，也没有删掉超限断言。

纯函数统一源图存在判断和 assetId 去重；普通生成和重绘消费完整参考图，实际连线与 hover permission 共用校验。missing/unarchived/non-image 引用保留 fail-closed，补了共享 assetId 非图片与悬空引用保护。定向 [单测 GREEN](evidence-manifest.json) 28/28；[六项 UI 诊断](evidence-manifest.json) 6/6、无 retry。该次诊断用了 1425，只代表本文件 fixture；不能替代 1423 全量验收。

修正增加控件计数后 UI check 暴露 CreationComposer 303 行；移除本修正向模型选择器传入的无消费计数参数，保持原组件和职责，没有修改行数门禁。最终 [UI check](evidence-manifest.json) 196/0。

标准 1423 端口此前由另一份不同 bundle 的 preview 使用；没有终止它。自然释放后 [完整 verify](evidence-manifest.json) 退出 0：Node 717/725（原 8 skip）、Agent 172/174（原 2 skip）、Edge 394/394、0 flaky；lint/typecheck/format/build/governance/features/Markdown 均通过。[浏览器摘要](evidence/correction-baseline5b/browser-summary.json)、[Web 1920](evidence/correction-baseline5b/capabilities-runtime-1920.json)、[源码指纹](evidence/correction-baseline5b/source-fingerprint.json) 属于此轮 dirty 修正候选。指纹为 16e62a55a239c24e48b9abe0b62d5ed4e170ba94103c1b764e6cb28d080f8026。

本轮 [client:check](evidence-manifest.json) 退出 0。第一次 [Tauri build](evidence-manifest.json)/[运行](evidence-manifest.json) 也退出 0，EXE 86f1ac471ed2a53864d7dbbc060eccea5738ebacf4e347e8169da3c032dd17bd；随后删除无消费 prop，因此该 native 产物不是最终候选，需要重建。报告输出现使用独立 run 目录，旧报告不覆盖。

full verify 完成后的 fetch 发现 main 已更新至 5dd6e6dd（阶段计划、保存恢复和版本元数据）。这是 App/shared storage 的真实变更，不能沿用上述 5b 验收；将整合后重新验证 Web/Tauri，并对精确新 base/head 独立复核。Desktop/Web 的最终 patch 需在最新主线基础上递增。

## 公开交付授权记录

初次公开 push 在执行前被自动审批审核拒绝，理由是原授权只覆盖隔离候选和独立审查，未明确覆盖公开仓库源码、测试和日志上传；当时停止了该动作，没有换接口绕过。开工段“未出现审核拒绝”只描述开工读/验证阶段。

用户随后明确“始终允许你来操作，但是你需要评估不要盲目的”。继续按现有工程授权评估精确公开目标 soudbs180-creator/KK-Studio-2.0、本任务分支和受控 fixture 证据；只有检查及独立复核满足后才推送并建立 draft PR。该授权不会被解释成直接合并、部署、付费服务执行或清理无关数据。

## 当前集成候选的最终运行证据

最新main@5dd6e6dddaf00cf2d5c14ae02ef5974c72238232（PR #35）涉及共享App、阶段审批和保存确认；逐项核对后合并为577ed3ee，三个进度文档只发生首段插入冲突，两边记录均保留。任务源码版本在最新主线基础上递增为Desktop2.1.6/Web2.1.7，Mobile规划2.1.1。主checkout现在main@5dd6e6dd且clean，由其它已授权主线工作前移；本任务仅写候选。原main未前移等旧句属于早期快照。

[完整verify](evidence-manifest.json)退出0：Node723/731、8个原skip；Agent172/174、2个原skip；Edge406/406，unexpected=0/flaky=0；lint/typecheck/UI198/0/format/build和治理/功能/Markdown门禁全部通过。[browser summary](evidence/latest-main5dd/browser-summary.json)绑定这次运行时间与577ed3ee源码基准。没有重复利用上一轮394项结果。

[client:check](evidence-manifest.json)、[最终Tauri build](evidence-manifest.json)、[原生运行](evidence-manifest.json)均退出0。EXE SHA256为`0af389bf09a5810c5d5ee57f7dcb07b884d237cefda7d3f38563eb699853951c`，实际加载index-ByBcWj1e.js/index-C6I0Rp3I.css，JS字节与本树dist一致。原生声明恢复、数量/零参考图、禁用重绘、保留原件/tasks=0/pageerrors=[]有[完整runtime](evidence/latest-main5dd/desktop-acceptance.json)及[设置](evidence-manifest.json)、[参数](evidence-manifest.json)、[重绘](evidence-manifest.json)截图；输出在独立run目录，没有覆盖首轮。5项既有Rust warning和Vite large-chunk提示保留。

Web [390](evidence/latest-main5dd/capabilities-settings-390.png)、[1099](evidence-manifest.json)、[1920](evidence-manifest.json)与各runtime JSON来自这次严格1423 preview。根/独立review抽查同状态截图，不把工程补充字段冒充新增Figma设计。Development严格1421再次[运行](evidence-manifest.json)：既有插件遮罩仍存在，记录后按官方Esc操作退出，真实能力字段/持久化局部通过；[runtime](evidence/latest-main5dd/development-runtime.json)明确pluginLoading=PRE-EXISTING FAILURE。

当前[源码指纹](evidence/latest-main5dd/source-fingerprint.json)为`8e58bd273069b7f578f52943107f1d648a75593060d55f59cc698267fa1f2373`，包含前端、原生源码/manifest、版本源与npm锁；正式实现提交后独立复核需重算匹配。后续仅文档/收据变化时复验文档门禁并补审新head，产品源码或构建输入变化则重新生成相应产物。独立修正关闭、draft PR/Hosted检查、用户产品验收及实际发布按事实追加，当前不预写PASS。

## 独立审查闭环与交付范围

2026-10-08 15:02 独立上下文对base5dd6e6dd..head6da9920e补审PASS，MC-001关闭，没有新增finding；独立87/87定向单测、389源码hash与最新Web/native证据复核通过，完整收据见review。该结论没有代填公开授权、GitHub身份审批、用户最终验收或合并发布。最终文档/状态收口后，将对新head只读增量补审，再以准确head建立本任务draft PR并回读Hosted checks；实际结果保存在PR描述及交付收据。本地技术AC完成，功能卡仍PARTIAL，外部Provider/蒙版/扩图、开发插件独立问题与Mobile边界不变。

公开目标已只读核对为soudbs180-creator/KK-Studio-2.0、public、default main，当前Git凭据有push权限；凭据只经既有credential manager在内存交给GitHub，未写入目录或日志。计划仅fast-forward推本任务分支，不推main、不自审批、不合并/部署。待上传证据来自隔离fixture/profile，API地址为example.test、测试key为fixture占位，未包含真实供应商凭据；GitHub辅助脚本及认证数据位于被ignore的.tmp，不加入提交。首次自动审核拒绝及后续用户授权记录保持原文，不以替换接口规避拒绝。

最终文档收口门禁的原始输出见[lint与文档检查](evidence-manifest.json)和[delivery结构检查](evidence-manifest.json)。仅文档变化没有复用成产品源码复验；最终HEAD增量审查及Hosted检查以PR收据记录。

## 首轮Hosted的非零flaky与新增受控RED

原draft PR#36 head2797687c，两轮workflow结论success；PR run37742566288的verify job113196446265原始记录为405pass+1flaky，本任务“不同素材超限禁用重绘”首次enabled，retry通过。97项Rust测试与客户端/release构建成功。记录：[原始job日志](evidence-manifest.json)、[browser JSON](evidence/draft-refresh5dd/logs/first-ci-browser-results.json)、[局部error-context](evidence/draft-refresh5dd/logs/first-ci-error-context.txt)。后者不含原图/目录现场，原flaky唯一根因UNKNOWN。

新增“无变化通知保留草稿”在旧production真实RED，edit由supported变unknown；[1423首尝试](evidence-manifest.json)因外部端口占用未运行，不当RED。真实[1425定向RED](evidence-manifest.json)不替代全量标准端口验收。修后一次未重新build的[旧bundle尝试](evidence-manifest.json)仍失败，明确不是GREEN；重建后[7例×4次定向](evidence-manifest.json)28pass、retries=0。独立预审识别显示字段依赖遗漏，[显示刷新RED](evidence-manifest.json)保留；补齐依赖后重建production，[最终8例×4次定向](evidence-manifest.json)32pass、retries=0；它只证明定向范围，完整1423与native见下一节。

## 草稿刷新修正的最新本地验收（16:27，独立审查待完成）

[完整verify](evidence-manifest.json)退出0：root723/731、8个原skip；Agent172/174、2个原skip；browser408/408，unexpected=0/flaky=0/skipped=0；UI198/0，lint/typecheck/format/build及治理/功能/Markdown门禁通过。[browser summary](evidence/draft-refresh5dd/browser-summary.json)记录2026-10-08T08:23:10Z起、标准1423、dirty候选尚未提交；不是首轮Hosted结果。

[clientcheck](evidence-manifest.json)、[fresh Tauri build](evidence-manifest.json)、[隔离native验收](evidence-manifest.json)均退出0。EXE SHA256为db354e2bbd14f5891a5c1b6e3b5584e2f3576c0525b4aa86f50ebed0be4351c5；实际index-D7y589oD.js/index-C6I0Rp3I.css，JS SHA256为8c39cd503fd883c447769915c20cf1c952e10fd3bb1134015b352c491e227829；[native runtime](evidence/draft-refresh5dd/desktop-acceptance.json)确认与dist字节一致、隔离数据根/profile、errors=[]。原生本轮新增受控provider通知后四个未保存字段保持断言，再保存并重载、限制数量/零参考图、禁用重绘、原图归档和tasks=0。

Web同状态证据来自本轮严格1423：[390设置](evidence-manifest.json)、[1099设置](evidence-manifest.json)、[1920设置](evidence-manifest.json)、[1920 runtime](evidence/draft-refresh5dd/capabilities-runtime-1920.json)。根上下文目视抽查390设置与[native参数](evidence-manifest.json)；全部实际DOM/截图来自当前bundle。Development严格1421的[本轮日志](evidence-manifest.json)和[runtime](evidence/draft-refresh5dd/development-runtime.json)记录相同通知后字段保持与真实持久化局部PASS；既有public插件遮罩仍FAIL，记录后Esc，仅局部验收，不改称整套开发模式通过。

本轮[源码指纹](evidence/draft-refresh5dd/source-fingerprint.json)为2ebaab3d83bcf31fa33dbd94f8ee817b20baf5f1bf8661447beb64a5ac44735a、389文件（UTF8/LF归一），编译输入在全部检查期间固定。5项既有Rust warning与large-chunk提示保留。新提交正式独立审查、MC-002/MC-003关闭及当前SHA Hosted结果待完成；不以历史PASS或重试替代。

## 独立复核与交付边界

16:31对实际base5dd6e6dd..head71ddb625正式技术补审PASS，MC-002/MC-003关闭，MC-001保持关闭，无新增finding。独立87/87单测、389源码/产物hash匹配，完整收据见[review](review.md)和[review-product.json](evidence/draft-refresh5dd/review-product.json)。[该技术HEAD delivery结构门禁](evidence-manifest.json)退出0，162文件、0违规；结构检查不代替审查质量。

本地AC完成与线上交付分别记账：最终文档HEAD仍需只读补审，推送后回读新SHA Hosted verify/delivery及浏览器原始结果，不能沿用2797687c的success。最终精确HEAD、补审结论及当前Hosted结果记录于draft PR#36描述与本地忽略的交付收据，避免通过不断回填自己的commit SHA制造循环。未合并发布；真实Provider等后续边界保留。


## 2026-10-28 原始日志外置查找说明

本包62份原始日志已按ORG-5迁至容器output，原始字节、sha256、Git源及原链接目的地逐项记于[evidence manifest](evidence-manifest.json)。上文32个日志链接现指向该清单，链接文字、历史结论、失败记录与数字保持原意；清单中的sourcePath/references.originalTarget保留原身份。PNG、JSON回执及交付文档仍留仓。迁出仅发生于当前候选任务树，尚未主线整合；本说明不是历史验收或当前Hosted状态的新结论。


## 2026-10-30 历史原始证据外置说明

本次ORG-6将历史E2截图/原始日志/录屏外置到容器output；原引用现指向[2026-10-08-model-capabilities manifest](evidence-manifest.json)。原始sourcePath、commit/blob、sha256、大小与原链接目的地逐项可查；原图片嵌入改为同文字的清单链接。原结论、失败、时间和数字未重写，不代表当前功能重新验收或main已合流。E1摘要、JSON、关键图及活跃运行资料仍留仓；恢复仅写新空目录并复核字节。
