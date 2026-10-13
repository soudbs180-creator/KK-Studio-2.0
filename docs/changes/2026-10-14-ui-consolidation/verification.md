# Verification

- Task ID: `TASK-UI-CONSOLIDATE-20261014`
- 日期：2026-10-14
- 状态：冻结与当前 Web 验证通过；实际 Desktop、最终提交审查及外部验收继续收口，整体 PARTIAL。

以下是冻结阶段的历史验证，不能代替后续 UI 候选验收；该阶段没有实现新的产品 UI。当前冻结 Desktop/Web 2.1.17、Mobile规划2.1.1。完整主目录恢复输入为 `196be1de6b785b99b07d5409c0e617ecda3de43d`。本机盘点104登记树/150本地分支/103remote refs/10tags，36个dirty树；41个补充恢复refs覆盖36个来源，40个CONSISTENT、1个VOLATILE；原index/HEAD变动0。一次读取期间变动的Cherry测试文件不作为精确源副本证明。

输出目录：`D:/kk-studio/output/ui-consolidation-20261014/`。其中 inventory-agent 下 recovery-verification.json、recovery-snapshots-all.json、recovery-refs.csv、primary-snapshot.json 提供源路径、排除路径、hash、ref和tree。敏感标记文件仅留path/hash，未打印或复制秘密；原件保留。

当前版本、typecheck、build 退出0；Node首次1096项（1082通过、14既有skip、0fail）。UI标准224文件/0违规；Agent和插件build退出0。缺失插件生成输出已补齐，将重建生产dist后验证。Bundle create/verify均退出0，SHA256 `672f2a6a6b3879f8f0b2154fce4669e9b21c821a7728b4d9b272298f32d480e1`。

Lint首轮在当前工作树容器路径选择失败；正确设置 `KK_CONTAINER_ROOT=D:/kk-studio` 后发现旧生命周期门禁把日期当UTC instant，误拒绝当地2026-10-14。已先RED证明，再使用项目Asia/Shanghai日历日期；日期/完整docIndex回归21/21通过，未来日期及无效日期仍拒绝。原失败日志保留在输出目录，未关闭门禁或改写旧日期。

`npm run verify` 的 lint、typecheck、Node1099（1085通过/14skip/0fail）、Agent174（172通过/2skip/0fail）、UI224/0、全量格式检查和production build均通过；浏览器阶段因1423被其他验证占用退出1，开发阶段未执行，不能称完整verify成功。首次失败日志/exit原件保留。

端口自然释放后，生产浏览器 `npm run test:ui` 于实际preview1423运行515个spec：514 expected、1 flaky、0 unexpected/skip，command exit0。flaky为 `task-intent.spec.ts:270` 的native submit/key identity场景，首试line436等待durable状态unknown超时5000ms，自动retry通过。当前产品JS/CSS与日常primary相同，不能归为本轮日期门禁导致，也不能据此确认根因。完整首试JSON已保存 `baseline-browser-results.json`；原error-context未单独保存，后续runner清理，不能宣称该原件仍在。

拟做五次zero-retry定向复证时，1423已被另一foreign preview占用（首轮owned process已退出）；定向运行未开始，不记为PASS，不reuse旧server或kill外来任务。静态回执校验保证key mismatch应进入unknown，但跨queued/running/unknown持久化边界的超时根因仍UNKNOWN。必须复证后才能把冻结版升级为稳定集成/发布候选。

插件补齐后当前dist150文件、5,050,790 bytes，包含5份插件输出；与日常primary当前Web构建内容匹配，少生成物没有当成轻量化。正式Tauri、Hosted、安装器、真实Provider与用户产品验收仍未运行。整体UI/协议/轻量化仍未实现，任务保持PARTIAL。

原 node_modules 与 Agent node_modules 是现有 consolidation 工作树的 junction；本轮不运行会改共享依赖的根 npm ci。检查能证明这份本地工作环境，不称为全新独立依赖安装验收。

## 已提交冻结与补充复证

`df7379053bbd6b941da4e0c0029b1a4d56f33f57` 已提交本机源冻结和方案；产品src/src-tauri/vendor/scripts-agent/scripts-windows/config/package/public相对完整主目录快照196be1de的diff为0。Web归档150文件逐项hash与当前primary dist一致，zip逐项hash也一致。收据 `baseline-receipt-df737905.json` 绑定当时commit/tree，不改旧收据冒充后续head。

端口再次释放后，2026-10-14 的5次单worker零retry定向场景全部PASS，报告 `baseline-flaky-repeat2-results.json`；它证明该条件下可复证，不闭合12workers完整首试超时的根因。首试flaky继续保留，正式稳定验收仍开放。

开发插件原件 `development-plugins/receipt.json` 是FAIL：联接字体目录超出Vite默认fs.allow而403。仅放行真实node_modules目录，保持strict/deny与loopback/strictPort；新增真实HTTP父目录AGENTS403断言，没有放行整个主checkout。配置/开发测试修复提交为 `694e3d18e2fea39edb18bd7b9d0f589673283060`，在该已提交head重新运行开发5步骤PASS、errors0：字体与四插件实际加载/编辑/禁用恢复/危险远程拒绝/依赖父目录继续403。证据 `development-plugins-committed/receipt.json`，不使用dirty运行的旧sourceHead代替。

这两项修复只涉及文档门禁与开发服务，不改变应用产品版本或上述生产Web文件；未递增镜像版本来制造“最新发布”。UI重整仍按spec/plan实施；所有候选的稳定主线整合和Native/Hosted仍未完成。

## UI 源码候选：验证待收口

2026-10-14 在唯一任务工作树新增/更新的 UI、标签持久化、预设和使用记录已可在源码定位；新规则与 [ADR-017](../../architecture/adr/ADR-017-unified-ui-and-collection-compatibility.md) 同步。旧冻结收据仍绑定原 SHA，不更新为新候选 receipt。

browser-contract-migration.patch 只迁移5份既有浏览器合同，保留名称编辑、名称/提示词查找、定位、移除、CAS保存、重读、回焦与布局断言。补丁制作阶段只验证 TS 解析、格式化与 git apply --check；这不表示运行测试 PASS。

根执行方的定向控件/颜色/类型检查和原生契约夹具分别补命令、日志与 dirty/最终 SHA；fixture 不代表真实 Tauri UI/安装包。完整 production browser 当前尚未取得本轮最终回执，端口占用不改写为已通过。开发态、实际 Desktop、真实 Provider、Hosted、Native Mobile、安装器、用户视觉验收与体积预算分别按实际证据更新；整体 PARTIAL / NOT VERIFIED。

根执行方阶段回报（最终回执仍待收口）：Desktop/Web 2.1.18、Mobile规划2.1.1。首轮定向browser18为16通过/2失败，第二轮22为17通过/5失败，包含真实层级、手机按钮宽度与旧控件契约；修正后继续复证，早期失败保留。Node首次1127为1112通过/14既有skip/1旧圆角契约失败；更新旧断言后最终1127为1113通过/14skip/0fail，Agent174为172通过/2skip/0fail，ESLint0、UI234/0、全量格式检查通过，cargo check通过且有5个既有warnings、cargo fmt --check通过。完整browser仍在运行且已出现失败，旧Figma几何/强调色与真实缩放/发送溢出仍在修正；不预填完整PASS。这些数字由根阶段回报提供，最终命令、日志、source SHA及产物绑定由根补录。

## 2.1.18 当前组合验证（2026-10-14）

唯一任务工作树与父提交539fe0bb保持。首次全套零重试529个场景为492通过/37失败，旧契约、重复搜索名称和缩放覆盖均保留原失败。修正后定向96个场景为94通过/2失败，再修正设置标题原点与767/800搜索断点不一致。原件保存在工程外 `output/ui-consolidation-20261014/ui-stage-218` 与该工作树 `.tmp/ui-*`；不改历史baseline收据。

最终 `npm run verify` exit0：Node1132项1118通过/14既有skip/0fail，Agent174项172通过/2skip/0fail，UI235文件/0违规；lint/typecheck/全量格式/production build通过。实际preview1423、Edge、默认12workers执行532个browser场景，532 expected、0 unexpected/flaky/skipped；来源 `browser-full-verify-pass2-results.json`，入口 `/assets/index-DincjUra.js`（SHA256 abe16df06454065d1799d99775146487b228367fa27e7d9b0214dc5246439245）。开发1421的四插件与父目录403保护5步骤PASS、errors0。两者当时为539fe0bb之后的dirty候选，最终源提交和输入指纹由输出回执绑定，不把父SHA说成新UI提交。

Rust `cargo check` 和 `cargo fmt -- --check` exit0，5个既有warnings保留；标签存储17/17与项目包24/24是实际Rust fixture，不代表桌面窗口或安装器。CLI状态/Google提交40个mock场景通过，未执行真实登录或付费供应商。Gemini预设可跳转并聚焦专用Google表单；未接Responses/Messages/Azure认证和本机免密协议仍禁用，现有凭据与草稿身份保留。

相同Python gzip level6/mtime0量测冻结Web zip与当前dist：主入口279510→285940字节，增加6430字节，低于16384预算；全JS gzip368208→377867，CSS51272→52556；150文件、总字节5050790→5092262。新依赖0；没有通过漏构建插件或移除Agent功能凑指标。详见输出 `web-footprint.json`，此量测不含Native/Agent包或运行内存。

健康门禁沿用origin/main的advisory配置：相对539fe0bb仍5项（App体量/复杂度4项、PR55交付函数1项）；新统计函数与卡片操作已按职责分开，函数CC不超20。主线比较44项和Windows2项advisory未冒充零发现，未提高阈值或添加豁免。真实Desktop、安装/Hosted、Native Mobile、用户视觉验收及其他在途分支的稳定集成分别记录，不由Web PASS推导。

## 已提交候选与复审修正

UI候选提交ff454541；官方 `client:build:agent -- --no-bundle` exit0，实际Tauri和工程外portable窗口都加载2.1.18、index-DincjUra，EXE SHA256 ea81c00ffed171308babe49f8b3da8a20f60df697e17f889d83020518207773e。4269个Agent生产白名单文件111924259字节保留；Native包不作安装器/签名/真实Provider验收。

独立审查ff454541发现USAGE-001/002两项P2：编辑文本少计、部分完成/离线被显示为运行。原报告保留工程外independent-review-ff454541.md；先复现旧统计/旧界面失败，再按稳定卡片绑定和有效原始回执计数、使用“其他任务状态”及范围说明。10个统计单测通过。修复后verify exit0：Node1119pass/14skip、Agent172pass/2skip、UI235/0；533 browser为532首试通过、1flaky（sidebar-real-projects折叠分组创建后展开状态首试超时），开发5步骤PASS。原首试/重试结果不覆盖；该flaky根因仍待核对，不宣称本次零flaky。

收敛期间主目录新增已完成的凭据状态恢复和Agent执行展示，最新一致恢复输入f2b0466ad4069ef74306752ed9be3a9319c94b2f的Desktop/Web已为2.1.20。新版必须逐项携带这些代码和对应测试，再升版本验证；ff2.1.18保留为中间候选，不再称最新日常源码。刷新盘点107登记树/39dirty、39一致快照、原index变动0，872源路径与313排除路径可溯源；all-refs-current-ff454541.bundle校验通过，原工作区保持。后续在途变化按时间边界另列。

## 2.1.21 最新来源组合

限定51路径承接f2b0466的23产品/Rust文件、13测试、15原作者文档；版本镜像由本任务工具统一递增到Desktop/Web2.1.21，Mobile2.1.1保持规划。4任务追加，原129记录除本UI任务阶段说明外保留；41明确引用的历史原件4274483字节，敏感模式扫描与逐项hash校验后原样留存，不改旧SHA/结论。来源映射和复制清单保存在工程外ui-stage-218。凭据恢复12拥有文件与19decc93的比较是Git内容映射，当前组合其中2处另有本轮UI接线/测试，不能声称组合12文件全部字节一致。

Gemini桥脚本列入Agent生产白名单和release输入指纹；桌面使用resolveResource复制安全引用的绝对路径PowerShell命令，并明确采用用户安装CLI的同一Node/npm环境。随包Node不含npm，未借此增加npm或自动执行登录；Web开发指引保留源目录要求。路径含#的入口判断改为标准fileURLToPath/resolve。定向桥套47项46pass/1既有skip，实际Node/HTTP夹具不代表真实Gemini登录。

首轮2.1.21完整verify前置通过、Rust131/131与fmt通过；production543个场景为542通过/1失败/0flaky。失败为插件重载后未打标签的旧卡片被补空tags数组，内容仍完整，原精确原件断言保留。新增有效画布的单测先RED再3/3GREEN，仅保留标签字段缺省、显式标签仍规范化。新独立预检发现SEARCH-001 P2：项目类型筛选隐藏所有项目；先browser RED，再按project.kind筛选、项目页禁用无项目语义的标签且保留其他分类选择，说明“标签仅用于卡片和已加载资源”。修正后的搜索/插件两个production场景零retry通过；reviewer纯单测41/41。当前完整组合复验、实际Native及最终SHA审查仍待新回执。

第二次组合前置全部通过：Node1156项1142pass/14既有skip、Agent174项172pass/2skip、UI236/0、lint/type/format/build通过。production544 expected、0unexpected/flaky/skipped；原件browser-221-pass2-results.json，入口index-F03Lyd2x（SHA256 06fe9210c5b3f7233bd9fa046ed236a1e273a0f134db2d08cd673ad203c7b71f）。compound在development失败：首次懒加载新path依赖触发Vite优化重载、设置弹窗状态丢失。只预优化已安装@tauri-apps/api/path，未扩大fs.allow，随后实际开发5步骤PASS/errors0/父目录AGENTS403。旧FAIL与后续PASS分别留存；最终已提交compound和Native仍分别取得回执。

同算法预算当前主入口gzip289127字节，较冻结279510增加9617，低于16384；Web150文件/5105123字节，生产插件保持齐全。Node真实启动桥入口在含#和单引号路径下工作，只请求未知路径、可信Native Origin回404，没有/status/chat、CLI探测、登录或Provider请求。Native安装器、Hosted、真实供应商、Native Mobile与用户视觉验收仍开放。

## 实际桌面发现与共享层级修正

已提交0e5087e6的完整verify退出0：Node1142pass/14skip、Agent172pass/2skip、UI236/0，production544 expected且unexpected/flaky/skipped均0，development5步骤PASS。当前真实Tauri原件在工程外native-candidate/runs留存：首轮driver把CSSOM六位舍入与原生完整精度直接比较导致FAIL，改为原生上传前后坐标精确比较、DOM与原生容许0.001显示舍入；原driver和失败receipt保留。后续真实桌面确认喜欢/标签/收藏写入、固定面板独立移动与缩放、视频卡片移动后上传保持世界坐标及视频原件hash，但重载后图片工具栏挡住喜欢面板关闭按钮，真实点击被重绘按钮截获。

共享层级原为面板sticky-header+1/+2（21/22）而图片工具栏dropdown（100）。新增语义floating-panel/active token（dropdown+1、panel+1），两类面板均使用，保持低于overlay200/modal300/popover400。新增浏览器通过真实拖动使关闭按钮中心与图片工具栏重叠、elementFromPoint命中与正常关闭断言，旧dist RED，修正后面板和风险8场景零重试GREEN。不使用force click或隐藏图片工具栏绕过。后续完整组合、实际新EXE及独立最终review待新回执。

## 已提交2.1.21最终产品检查

产品源7a463742894f9250eafd39c3570e81eaf83eba65，tree bcf6e83a420ff133e8b810508049e005ea04f139，检查和Native启动期间工作树干净。npm run verify退出0：Node1156项1142pass/14既有skip、Agent174项172pass/2既有skip、UI236文件/0违规；lint/type/format/build通过。实际preview1423、Edge、1920默认及窄屏规格545expected、0unexpected/flaky/skipped；工程外browser-221-panels-final-results.json。开发1421五步骤PASS/errors0，父目录AGENTS仍403，receipt sourceHead绑定7a。健康advisory与origin导入配置保持：脚本比较历史base1f6cbd37报告50项advisory，Windows2项；未提高阈值或增加豁免，不能把lint出口0表述成健康零发现。Rust131/131、fmt通过的源与当前Rust相同；CSS增量未改Rust。

官方client:build:agent -- --no-bundle退出0，5个既有Rust warnings保留；EXE SHA256 a252ff41d46346032a5e669405ce4b6ca2344b9c767f60313f35e32cc0f08d02，release input SHA256 b51693ca7445557f52b559a844914ccf31857a70ec16192fb1d9794d9bb1df19。writeDesktopReleaseReceipt后inspectDesktopRelease needsBuild=false/reason=current，表示本机构建输入身份，不是Hosted/签名/安装验收。Agent生产白名单4270文件包含gemini-bridge.mjs，source/manifest/实际设置命令字节一致。

实际Tauri release以--data-dir独立数据目录、隔离WebView profile和独占CDP9350运行，http://tauri.localhost/生产入口加载index-CtztK-ZP.js（SHA256 d46c0fe63329ce2139eb7be9a837d8ea29fcd6cd4a4eeab19a7a60276adc6b5e）及index-CJt9EWbb.css。App→Workspace→Canvas/CanvasCollectionsPanels；App→SettingsPanel→StorageOverview/ModelProviderSettings/GoogleAgentSettings为当前渲染链。9项PASS：EXE/源/真实存储root/加载bundle；顶部喜欢/标签/收藏及自定义标签写入；独立面板固定360×480、拖动与缩放；视频移动后的原生世界坐标上传前后精确一致，DOM舍入容许0.001、图/视频原件hash一致；JSON重载恢复；设置真实modal命中隔离；存储真实路径与未报告配额；Gemini预设真实聚焦API表单；CLI子页及随包绝对命令/manifest身份。原面板普通关闭不再被图片工具栏遮挡。9张同状态截图、errors空、cleanupComplete=true，未使用IPC mock/force click/hide toolbar。原件路径ui-stage-218/native-candidate/runs/1791924003594-f21e8fdf-b4a8-4fd6-825c-cf85fb0ca84d/evidence/receipt.json，driver SHA25680de073ec9e6d24b9651e3edc7f765476a54e83534d0f8599ad34fd259ca0c4f；原失败和旧driver仍保留。

相同gzip算法当前主入口289135B，冻结279510B，增9625B<16384预算；Web150文件/5105233B，CSS gzip52844B，新依赖0、插件完整。0e→7a独立已提交增量source review CLEAR，报告independent-review-7a463742.md；0e全组合独立审查41单测和历史source报告保留。最终doc-head不改产品树，工程外产物收据同时绑定最终完整HEAD和已验证code-head，保存不同原件SHA，不能把7a运行收据改写为未来docs HEAD。

边界：Native使用隔离资料，未接OpenAI Responses/Anthropic/Azure/免密Ollama真实协议仍禁用；未执行真实CLI登录/付费Provider、用户日常资料验收、安装器/签名/Hosted或Native Mobile。Mobile2.1.1仍规划；在途源只恢复留存，未作为全部已集成分支。当前本地UI候选与输出可供用户验收，整体任务保持PARTIAL以承接这些开放范围。
