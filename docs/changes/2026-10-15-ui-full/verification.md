# Verification：全页面新UI收敛与主线集成

## 2.1.29 当前本地验收

当前冻结基线为 94e129215ede7cdffe55b149e9b978e6638cc984，加本轮 CLI 卡片样式、Desktop/Web 2.1.29 与 TaskHost 测试夹具差量；最终产品/测试/版本/docs 提交尚未形成。任务 TASK-UI-FULL-20261015 保持 REVIEW / verificationResult=NOT_VERIFIED；origin/main 仍为 694a00607f6f63de1b8c43d0ebb117adf5d34f67，PR59 未合并。以下旧阶段的“当前”均指当时版本，不能覆盖本节。

完整 verify-merged-7 实际 exit0：Node 1318=1304 PASS/14 既有平台 skip，Agent 201=199 PASS/2 skip，生产 Edge 浏览器 756/756 首试 PASS，0 failure/flaky/skip/实际 retry；lint/typecheck/UI 242/0/format/build 与 development 四步骤 PASS。文档 owner 独立递归核对 756 tests/756 results 均 passed 且 retry=0。JSON start=2026-10-14T23:24:04.611Z，duration=212362.53ms；health/footguns 原 advisory 和既有警告保留。

### CLI视觉回归与漏测更正

root 人工检查 Native5 的 settings-models 截图后，发现 CLI 标题/说明/事实列表误用键值表 settings-detail-card，露出边框色背景且没有内边距；原 Native5 的 56 项未覆盖该块，不能据其 PASS 宣称该细节已验收。最小修复在 NativeCliControls 与 settings.css 为 Codex/Gemini/CodeBuddy 共用独立卡片角色，保留其他键值卡片、真实操作、busy 和安全逻辑：注册 card surface、16px 内边距、20px 容器圆角、14/20 标题/正文与长路径换行。native-cli-ui 的三类型×390/1099/1920 为有效 RED 9/9 FAIL→GREEN 9/9 PASS，均实际 retry0；这是平台 IPC 视觉 shim，不是 CLI 检测、安装、登录或真实账号验收。

### Native7实际运行与安全证据更正

官方 launcher 的 fresh Native7 使用新空 data 与 WEBVIEW2_USER_DATA_FOLDER，真实 CIM 记录独立 profile；实际 Tauri release 2.1.29、http://tauri.localhost/、CDP 9427，78 PASS/0 errors/12 截图。原 74 项流程中的无效 guard 判据被替换，额外 4 项正向自检分别在 UI 前后证实无害未知命令被 IPC HTTP route 本地拒绝、synthetic credential_get 被计数并返回 null；suppressedCredentialReads=3（synthetic=2）、harmlessProbeRejections=2，真正 UI forbiddenCommands=[]、deniedNetworkHosts=[]。保留全部卡片/设置/输入框/资源字节断言与三 CLI 实际样式检查；root 目视 settings-models 和 image-reopened，灰块已消失，有内容卡片仅对应工具栏。exact dataRoot 正常关闭，自有 PID17552 退出，9427/9349 已释放。

安全证据更正：Tauri 2.11.5 core.js 以不可写的 defineProperty 注册 invoke，历史 Native2–6 以及其他依赖同式直接赋值/audit 空数组的“凭据已抑制、forbidden 未发生、guard 有效”结论均不能作为安全证明；不改写旧收据，只保留实际视觉、资源与存储断言各自范围。Native7 改用 IPC HTTP route 的 JSON/Tauri-Response/CORS 协议，并先用不存在的无害命令证实本地拒绝，成功后才做 synthetic credential_get；前后四项正向自检才支撑当前受验动作阶段的拦截有效。该证明仅限安装 guard 到 unroute 之间的 Windows HTTP IPC 导航范围，不推广至其他 transport，不声称启动前或全进程绝无凭据访问，也不证明真实 CLI 连接、账号或产品安全验收。

Native7、Native6 与 verify-7 后 local-final-verification-7.json 的 release 均 reason=current/needsBuild=false，input SHA256=50f227e1c91fa733125481c4c041976a397726bb9c1829585048537cdec602d4，EXE SHA256=17794505f75524533467d141dd59289190aadd4e045fa50b7b3e5986cd755d5e；这证明实际内容同字节，不只依赖 mtime。Native7 verify-native-v2.mjs SHA256=13ed40a2e1590a82b1d835497825b8b34c3ef8846ef84679d74be14c7f5e77b3；当前 taskhost-lifecycle.mjs SHA256=7d8946ff03a8acf9007f7bb0490ef1a90fc9348fafe31095f04cfafaf9643ebf。

运行链：src/main.tsx → App.tsx → SettingsPanel → ModelAccessSettings → NativeCliControls/NativeCliFacts/NativeCliActions；页面级 settings.css 仍由 App 的统一样式链加载。Native7加载 /assets/index-BZUxysXr.js（SHA256 dcac1de82b97ed3411d8535d03cf6e5872b152c90657c85ae8fce9f2d4b4df6b）与 /assets/index-DTCmkkbx.css（SHA256 fff1e6834fa9b3ad954383ef42c2d550d3494cf84f5f64f82e67240f93403443），实际资源与当前dist同字节；Web生产固定1423、真实Edge、production/entry src/main.tsx，与Tauri分别留证。

### TaskHost当前无注入收据与诊断边界

当前 native-taskhost-current-4 在同一 2.1.29 EXE 上真实无注入运行：11/11 PASS、exit0、errors=[]、credentialCleanupComplete=true。测试夹具补齐 reload 后真实 storage ready、无 storage alert，以及提示词/选中模型/持久草稿四结果的一致性，原 n=4、结果/原件、重启恢复、unknown 不普通重试、幂等、秘密清理与超时断言全部保留。受控真实读取延迟 RED2=811ms 后 9 checks/partial POST0，GREEN2=815ms 后 11 PASS；actual-current-3 的失败指纹不同，根因仍 UNKNOWN，不能把受控复现等同该次根因。RED1 的只读 invoke 赋值注入无效，虽 11 PASS 也不是有效 RED。19 个自有 app PID 均退出，9349 无监听。

### 工程外证据索引与剩余交付门禁

证据根目录继续为 D:/kk-studio/.analysis/ui-full-20261015/，历史文件不覆盖。

| 当前证据 | 结果与范围 |
| --- | --- |
| native-cli-red-1.log / -browser-results.json；native-cli-green-1.log / -browser-results.json | 9有效视觉FAIL→9PASS，均实际retry0；只平台视觉shim，不证明真实CLI账号 |
| verify-merged-7.log / -browser-results.json；local-final-verification-7.json | 全量exit0、756 tests/756单次passed记录；Node1304/14skip、Agent199/2skip、UI242/0、development四步骤；release current且Native6/7同字节 |
| native-7/native-ui-full.json；profile-observation.json；release-identity.json；close-owned-native.json | 78PASS/0errors/12图、前后4自检；fresh data/profile实际CIM、当前资源与EXE身份、正常关闭 |
| native-6/native-ui-full.json及原图 | 74视觉/状态/资源记录保留；其中原guard判据无效，不能据其audit空数组证明凭据拦截 |
| native-taskhost-current-3.log / receipt.json | 9checks后partial POST0失败；实际指纹与受控场景不同，根因UNKNOWN，不作PASS |
| taskhost-seed-readiness-summary.json；taskhost-seed-probe-red-1/2、green-2 | RED1注入无效；真实811ms RED2=9checks/POST0，815ms GREEN2=11PASS，分别保留 |
| native-taskhost-current-4.log / receipt.json | 同2.1.29 EXE、无注入11PASS/exit0/errors[]/credentialCleanupComplete=true；19owned app退出与9349释放另见summary |

94e 的旧 push quality38652149137 已全绿（747 浏览器首试、Rust163、Native PASS），仅证明该旧 SHA 的运行结果，不能代替当前 2.1.29 的最终门禁。仍须形成最终提交，独立 base694→head 精确 source/integration 审查与当前 SHA Hosted/Delivery，通过后普通合并 PR59、fetch 核对 main 实际树及 post-main。不得把本地收据、mergeable 或旧 SHA 绿色当作最终合并完成。

原138任务对象与 raw、功能 registry、primary dirty/index/用户资料与历史失败不变；Mobile2.1.1 仍为规划，390 仅响应式 Web。真实 CLI 账号/付费 Provider、签名安装器/发布、日常用户资料及用户最终视觉接受分别开放；sidebar 历史 flaky 原缺 trace，根因 UNKNOWN，不由本轮未复现改写。

## 原需求与历史阶段记录（原文保留，最新状态以上方为准）

- Task ID：TASK-UI-FULL-20261015；状态：REVIEW / NOT_VERIFIED（本地2.1.28验收PASS，最终SHA/Hosted/PR/main待验）；日期2026-10-15（Asia/Shanghai）。
- 最新本地组合：2d4be5fca4c2167d4bc0d500634645624f311505加最小设置草稿竞态修复、版本2.1.28与测试/docs，完整verify-6 exit0（Node1304/14skip、Agent199/2skip、Browser747首试/0实际retry、UI242/0及development四步骤）；新版官方Native56/0/10图及TaskHost11/0/凭据清理通过，实际input/EXE与verify-6后同字节。最终提交SHA/独立精确review/新Hosted/PR/main待验，旧失败与夹具边界见文末。
- 产品source HEAD（本地验收身份）：241f3050124ad7773ced0b47a55629373177205e；本地main承接提交1653966f652390d93d490f90c0b7e9a9423f4026，修复checkpoint为0f506ae10e59d90222b399bbd54298849a8ca55f。实际fetch与API确认origin/main仍为694a00607f6f63de1b8c43d0ebb117adf5d34f67，本地任务分支承接不表示远端main已落地。首次完整verify与正式review绑定165，241产品源码加本轮test-only音频定位修正已完成verify-3本地验收；最终提交HEAD及Hosted/PR/main仍待完成。
- 版本脚本已真实递增Desktop/Web2.1.27，Mobile2.1.1规划不变；165的ui:check已PASS。首次完整verify在Browser阶段失败；241完整verify-3已PASS；当前2.1.27隔离Native56checks与资源字节身份已通过，精确source/integration review241均PASS。历史2.1.26的635browser/38Native保持原SHA范围。
- 独立数据/配置身份和原件保持；primary实际254条dirty、109登记worktree只读保留，未reset/clean/清理或改原index。

## 运行与证据身份

工程外原始证据目录 `D:/kk-studio/.analysis/ui-full-20261015/`。开发启动为 `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 1421 --strictPort`；生产用build后的Vite preview固定1423，由Playwright配置起停（reuseExistingServer=false）。测试真实Edge，`http://127.0.0.1:1423/`，DOM断言production mode、entry src/main.tsx，并附CSS/JS URL、computed geometry和同态截图。

实际链：`src/main.tsx → App.tsx → StartPage / catalog page / CanvasNodeContent`；App lazy Modal renderer进入CatalogPanel、PromptLibraryPanel、SettingsPanel、AssetPanel、ShortcutsPanel、InfoPanel、TaskWorkbench；settings按稳定section ID进入11分类。完整映射与覆盖限制见[coverage](coverage.md)。

## 本轮原始 RED 与中间轮

以下运行由root执行，本记录从原log/JSON回读；数值不相加为一个全量套件。JSON时间为UTC，对应本地2026-10-15。

| 证据文件（上述工程外目录） | 结果 | 含义 |
| --- | --- | --- |
| baseline-build.log / build-1..5.log | 已有构建PASS；后续修复仍需重建 | 构建不是运行验收 |
| red-browser.log / red-browser-results.json | 33 fail / 2 pass，0retry | 卡片动作、旧页面文字/控件几何RED |
| red-draft.log | 夹具无效：画布位置与节点不匹配 | 不是产品RED，不据此宣称修复 |
| red-draft-valid.log | 2 fail | 合法video/audio 7500字草稿重开被截断 |
| red-models.log / red-models-results.json | 3 fail | Google模型旧控件三宽RED |
| red-redraw.log / red-redraw-results.json | 3 fail | 重绘模型菜单三宽RED |
| red-menu-enter.log | No tests found | 命令选择器错误，不是产品RED |
| red-menu-enter-1.log + red-menu-enter-1/ error-context | 2 fail | Codex/Google模型搜索Enter串到提交，IME确认应不选型 |
| red-assets.log / red-assets-results.json | 6 fail | subject与asset-detail各三宽旧几何RED |
| green-1.log / green-1-browser-results.json | 28 pass / 7 fail | text输入重叠、账号后置CSS、extensions390及Comfy入口中间失败 |
| green-2.log / green-2-results.json | 36 pass / 5 fail | 含3条Google错误持久化预期、extensions390与Comfy入口；不隐藏失败 |
| green-draft.log | 2 pass / 0 fail | 修复合法7500字video/audio codec恢复 |
| green-pages-3.log / green-pages-3-results.json | 24 pass / 0 fail，0retry/flaky/skip | 页面定向GREEN |
| green-3.log / green-3-results.json | 79 pass / 0 fail，0retry/flaky/skip | 当前页面/模型/旧卡片/新卡片定向GREEN，47.2s |
| red-secondary-ui.log / red-secondary-ui-results.json | 3 pass / 3 fail，0retry | 全部设置三宽PASS；普通应用/项目菜单旧几何RED |
| green-secondary-ui.log | 30 pass / 1 fail | 全部设置与资产performance/collection/sidebar等30项PASS；1099顶栏响应式选择器串入popover使32px变40px，中间失败保留 |
| green-menu-final.log / green-menu-final-results.json | 2 pass / 0 fail | 缩选择器后应用菜单1099/1920最终GREEN，关闭对应菜单失败 |

勘误：`red-menu-enter-1-results.json` 被并行Playwright `--list`覆盖，现为23 skipped，并非同次2失败的JSON回执；保留原件，RED仅引用对应log与error-context。之后禁止所有Playwright CLI（含--list）与持端口运行并行。

Google测试勘误：原实现Google模型属于组件会话状态，配置defaultModel是重开默认来源；本轮没有授权增加持久化。green-2三失败因新增测试误设reload仍保留自定义型号；更正为同会话选型可用/菜单重开保留，未更改原持久化契约，原失败留存。真实Google登录/API调用和Provider结果不在这条UI夹具证据内。

补充：Native静态审查发现参考图添加按钮width36，root已在共享owner统一width/min-width32并扩展卡片宽度断言；该源码修正后的完整重建与新组合仍待全量验证。

## 主线保全及Delivery承接

- `merge-tree-initial.txt`保留102个预检冲突；实际merge为104个，新增DemoResultNode/ResultPreview两路径在`merge-resolution-supplement.json`补审main尺寸、标题与preview不变量后保留checkpoint实现。原`main-conflict-decisions.json`逐路径50保留/50当前用户覆盖/2主线独有手工补回；来源报告和原件继续保留。
- main独有PROGRESS两段与CODING-STANDARDS三行按原文补回；保留其历史REVIEW/NOT_VERIFIED含义。main125任务与36功能ID在候选均有，能力状态不虚报升级；GOV003当前扩大范围维持PARTIAL。
- 当前任务evidence精确承接15份历史包verification；75个五件套文件在固定候选均存在。原任务branch/status不改，旧验证不冒充当前PASS。外部清单 `delivery-preservation-mapping.json`记录15包、原任务/分支与承接方案。
- Delivery读取Git提交。正式checkpoint与真实merge后需对实际PR base/head运行 `node scripts/check-delivery.mjs --base <完整base SHA> --head <完整head SHA> --branch fix/TASK-UI-FULL-20261015`；省略branch的本地通过不足以替代PR的HEAD_BRANCH匹配。

补充静态门禁：root的lint-premerge2退出0；health51项/advisory、footguns2项/advisory来自merge前祖先基线比较，不写成新0 findings。真正merge后的main基线与blocking行为须按新组合重验。

## 尚待完成

当前241的完整九步verify、最终文档head复审、精确head Hosted verify/delivery/deploy-linux/governance、普通PR合并、fetch树/祖先与post-main检查仍为NOT_VERIFIED。241官方隔离Native56checks/资源字节一致性、精确source/integration review已PASS，范围见下方最新收据。165首次完整verify失败；该SHA单独执行的Rustfmt/test163与clientcheck通过不能补成完整verify通过。root本轮实际GET回读：rulesets 23866924/23866923/23866925均active；stable23866925覆盖main/master/release、bypass=[]，PR approving_count=0、dismiss stale=true、threads resolved=true，strict required为verify/delivery（Actions integration15368），没有merge_queue rule，允许merge/squash/rebase。main仍694、protected=true；legacy protection.enabled=false不表示无保护，保护来自ruleset。仓库JSON中的四checks/merge_queue是配置意图，不能覆盖实际回读。当前quality没有workflow_dispatch，普通task分支push时delivery/governance按条件不运行；需PR事件。自动helper另要求四个checks/queue配置及非作者账号exact-head APPROVED，不能把它与当前托管配置或本地AI review混为一谈；不改远端配置、不伪造approval，按实际规则履行普通PR流程。

所有本地fixture/响应式Web结果均不代填真人CLI/付费Provider、Comfy/GPU、安装器/签名、原生Mobile、日常资料和用户视觉接受。任何最终head变化后重核受影响验证及独立review。

## 本轮文档检查（checkpoint前）

2026-10-15，本docs writer实际运行：`npm run governance:write`及`governance:check`均139 tasks/0 violations；`snapshot:check`为4 unique documents/0；`markdown:check`为122 active files/0；`index:check`为19 ADR/0；`doc:commands:check`为139 active Markdown/0，全部exit0。读取固定6bc账本并逐对象比较，原138条任务对象全部精确保留，新增当前整合任务18项evidence（本轮verification/review/coverage +15来源verification）。这些是文档/结构检查，不是Delivery、完整verify或产品正式review。

## 用户追加纠正与证据范围收窄

2026-10-15用户明确要求“空card只upload，内容card才toolbar”，并要求其他功能冲突与分类核对。此前79 GREEN保留当时原scope；`green-checkpoint.log`另有50 passed（47.6s，含codec同卡/别卡/无执行者SSR上下文case）。两轮均未验证新要求的逐类型空/有内容toolbar互斥与完整功能链，不能作为该用户验收PASS。尤其SSR无真实布局/命中证据；旧测试“空选中也有toolbar”即使绿色，也须按用户当前契约更正并保存原结果。root正在重新审计并补真实RED/GREEN，当前继续IN_PROGRESS/NOT_VERIFIED，不提交或合并未完成验收的结果。新必验矩阵见[spec](spec.md)及[coverage](coverage.md)。

## 新状态验收的真实RED与重试caller修复（待统一GREEN）

root实际使用build8生产dist运行并保存原log/results/artifacts：

| 新证据 | 实际运行结果 | 证明范围 |
| --- | --- | --- |
| red-card-state.log / red-card-state-results.json | 6/6 fail，均在首个toolbar count=1（期望0） | image/video三宽空态upload与内容toolbar并存，属新增用户互斥契约的真实RED |
| red-task-retry.log / red-task-retry-results.json | 4/4 fail，均按钮仍enabled | 三种合法终态受理unknown/submitted及一个live retry child fence；真正安全执行谓词与可见动作不一致 |
| red-model-state.log / red-model-state-results.json | 5 fail | 草稿loss1、Escape2是有效产品RED；Codex忙case先在连接fixture失败、APIcase先在textarea disabled假设失败，不算型号锁的有效RED，后者须核对原“后台可准备草稿”契约后更正/重证 |

重试修复获root扩展授权：新增纯taskRetryAvailability复用canRetryTask、retryableOutputIndices、retryBlockedOutputIndices；所选task本地slot沿父/子/孙关系映射到根仅用于安全过滤，返回仍为本地index。工作台顶部、单项矩阵、项目HUD和TaskDetail消费相同availability；完整tasks通过TaskPanel/Popover传入，失败筛选不会漏掉活动child；已打开详情按最新task派生。失败/partial等候选态不能重试时disabled/title及可读原因准确；status本身unknown继续没有普通重试按钮，取消链保留。App仅新增import与HUD渲染，retryTask执行函数、taskRecovery保护、新数据/schema都未改。

实际定向unit `node --test tests/unit/taskRetryAvailability.test.ts tests/unit/taskRecovery.test.ts`：34 pass/0fail/0skip（11新增可用性边界+23原保护）；全部9个owned TS/TSX/test文件ESLint、Prettier exit0。全typecheck首轮exit1来自cards-agent hasContent接线在途5错误，未修改其owner，不能记全量PASS。重试4条browser用例现已扩HUD/详情/矩阵与失败过滤保留child fence断言，新caller与所有源码修正仍须统一重建GREEN及完整verify；这些unit/静态结果不能代填该运行验收。


## 本地main承接及首次完整组合验证（165，保留失败）

root串行完成checkpoint `0f506ae10e59d90222b399bbd54298849a8ca55f`，再将固定main `694a00607f6f63de1b8c43d0ebb117adf5d34f67` 承接到任务分支 `1653966f652390d93d490f90c0b7e9a9423f4026`；两次tree均为 `256ea5d002f89fc655e3029745babcf6f8b0d05f`。104实际冲突及25自动差量逐项审计；21外移历史blob按main原blob精确保全，重复模板、旧danger颜色与旧菜单断言不回退。原125主线任务ID与36功能ID保留，当前账本139任务/37功能；原任务branch/status不改。`merge-automatic-decisions.json`、`merge-resolution-supplement.json`及原merge日志保留裁决。`delivery-merge-1.log`：704 files / 0 violations，仅证明实际base/head/branch的结构门禁。

| 本轮收据 | 实际结果与边界 |
| --- | --- |
| verify-merged-1.log / verify-merged-1-browser-results.json | 完整verify退出失败；Node1309总数中1295 PASS/14既有skip/0fail，Agent201中199 PASS/2既有skip/0fail；lint/typecheck/format/build PASS，UI242/0。Browser745：740 PASS/5 FAIL/0 flaky，失败原件及error-context均保留；不是完整PASS。 |
| 首轮Browser五失败分类 | right拖动为真实新回归；首页16:9为真实CSS回归；screen生成按钮两例期待旧40而当前标准32，属旧断言；L/G空image期待内容toolbar一例与用户新互斥规则冲突，须改用真实已上传内容。后两类测试纠正保留其原功能断言，不写成五个产品缺陷。 |
| 首轮后续步骤 | verify在Browser失败后没有执行development步骤，不能代填development receipt。health/footguns按既有advisory与基线解释，不声称0 findings。 |
| cargo-fmt-merged-1.log / cargo-test-merged-1.log / client-check-merged-1.log | Rustfmt PASS、Rust163 PASS、clientcheck PASS；clientcheck保留5个存量warnings，不声称零warning；尚未实际运行Native。 |
| 165正式source review及integration review | 均为CHANGES_REQUIRED：text纯prompt误算正文、audio坏src假可用、rightpan三项P2。该审查不批准后来241；修改后须新的精确SHA独立review。 |
| red-text-audio-state.log / red-text-audio-state-results.json | 2条真实RED：纯text prompt内容分类和坏audio src；log/JSON/error-context保留。此前red-damaged-media的image/video两条真实RED亦保留，165本轮损坏image/video已GREEN，不能据此假称audio已通过。 |
| red-codex-lock-valid.log / red-codex-lock-valid-results.json | 更正连接夹具后，已连接且执行方式disabled但模型trigger仍enabled，1条有效型号锁RED；原model-state五失败中前置不适用两例仍保留，不改写成五个有效bug。 |
| green-state-1.log / green-state-1-results.json | 105 PASS/2 FAIL/0retry；六条空态互斥含reload、五条model-state、工作台四受理/child fence含HUD/detail等PASS。两条视频夹具误点原生controls未重选，已更正为真实caption点击；收藏/喜欢/撤销/reload断言保留，原失败不覆盖。 |
| red-image-region-retry-static-valid.log / green-image-region-retry-owner-static.log | 区域重试实际组件4条有效SSR RED→4 PASS；首次缺getServerSnapshot的静态失败为夹具不适用。最终RegionRetryList组件复用共享availability，保留区域index及受理/child fence；SSR不是浏览器或Native证明。 |

## 正式审查修复后的定向GREEN（241，完整验收待续）

当前源码 `241f3050124ad7773ced0b47a55629373177205e` 相对165修改12个文件（8个产品源码/CSS、4个测试），修复三项P2、首页ratio，并纠正旧fixture。`green-review-fixes-1.log` / `green-review-fixes-1-results.json` 实际14/14 PASS，0retry，12.9s：middle/rightpan、stationary右键Escape、screen320/390生成32、L/G真实uploaded image、首页16:9、多宽audio READY、纯text prompt以及损坏image/video/audio。仅关闭这14条定向运行范围；root下一步执行完整verify-2；随后已取得的当前Native及精确source/integration review回执见下。最终文档head及Hosted/PR/main仍待回执。


## 241的官方隔离Native与正式复审（完整verify-2待续）

root实际从 `start-kk-studio.bat --background --data-dir` 独立目录启动当前Desktop2.1.27，release compile约37s。工程外 `native-1/native-ui-full.json` 为56 checks PASS / 0 errors，10张截图；脚本先核对隔离storageRoot并安装guard，实际production资源字节与当前dist一致。包括image-empty toolbar=0、uploaded无主upload、重开archiveID保留与唯一toolbar；无外部/Agent请求、零forbidden IPC。`native-1/close-owned-native.json` 对exact data root正常关闭PASS。root实际目视检查empty/reopened/settings-update三张Native图；不代填用户最终视觉接受。

`native-1/release-identity.json` 回读reason=current/version2.1.27：EXE SHA256 `37a823904195419b8e70a07161492ab3c623849021b068b5776103dfb8d5cfd2`，input SHA256 `79c3a8e5ad3634347e1428358b740193bb88c7545dcdfec8b5d3bb11c861f832`。最新实际运行 `verify-native.mjs` SHA256为 `cddfa00f7a9925c74bb33715a8ac80c4e66320a1c617985e5bc1397a1d276df5`；早先9f6a版本仅为未运行中间脚本，保留其历史范围。

root正式回读source241与integration241 review均PASS，三项P2 CLOSED；这是精确源码/集成静态复审，不是独立动态/Native/Hosted审查。当前完整verify-2尚无回执，整体任务仍IN_PROGRESS / NOT_VERIFIED；Hosted/PR/main未执行，远端main仍694。

本阶段docs writer实际复核：governance:write/check139 tasks/0、snapshot4/0、markdown122/0、index19/0、doc:commands139/0，全部exit0；原6bc的138条历史任务对象精确保留，仅更新当前整合任务验证/下一步。以上文档门禁不代填产品或Hosted门禁。


## 最终本地收据（verify-3 PASS，待最终文档head与托管交付）

`verify-merged-2.log`保留746 PASS/1 FAIL/0flaky：唯一失败是新增hidden audio与播放modal使旧全局audio selector匹配2个元素，并非实际播放故障。root仅将generation-flow媒体定位至可见预览dialog audio，并增加hidden audio paused=true，保留readyState>=2及play后currentTime>0；`green-audio-play-scope`严格2 PASS/0retry，图片上传/重绘/草稿与音频实际播放均通过。该test-only修正待提交，产品source HEAD仍241。

`verify-merged-3.log`实际exit0：Node1309总数中1295 PASS/14既有skip/0fail；Agent201中199 PASS/2既有skip/0fail；生产Browser747/747 PASS（2.7m，JSON expected747/unexpected0/flaky0/skipped0，无实际retry）；lint/typecheck/UI242/0/format/build全PASS。development收据sourceHead=241f3050124ad7773ced0b47a55629373177205e，四插件发现、编辑渲染、禁用重开启用、unsafe远端请求前拒绝四步骤PASS。

verify-2/3重建后Nativeinspect仍current，EXE/input SHA与前述Native56检查收据一致；产品源码和Rust未变，原Rustfmt/163test/clientcheck及Native56收据继续适用。精确source241/integration241 review PASS不变。当前转REVIEW，本地授权范围验收PASS；整体verificationResult保持NOT_VERIFIED，远端main仍694。当前已提交241加dirty docs及test-only定位修正，最终HEAD由root提交后绑定文档/测试补审、显式branch Delivery、Hosted/PR/main与post-main；历史失败及所有前置无效勘误保留。


## f090首次Hosted阻断与可移植性修复（verify-4待验）

最终交付提交 `f09051ecbd2cfb92f7be834eb5a216c049dfcafc` 已建立ready的[PR59](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/59)，精确f090独立aggregate review PASS；Gitguards push/PR PASS，Hosted governance/delivery/deploy-linux PASS。但[quality38641803780](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/38641803780)的verify在`snapshot:check`、产品测试之前FAIL：默认父目录扫描意外要求未入库的 `../docs/plans/KK-Studio-功能台账与四向推进-2026-10-09.md`。这不是产品播放/UI失败，也不是Hosted全绿；main仍694、PR未合并。旧verify-3/Native与独立review记录保留原范围，不能批准后续修复SHA。

root正在修复scripts与CLI回归测试：默认只核对仓库内快照，仓库snapshots/current/lifecycle规则始终必需；仅显式`KK_CONTAINER_ROOT`扩展外部范围，显式空值、缺失或malformed仍fail-closed。产品/Rust/Native2.1.27的源与字节不变。`red-hosted-snapshot-portability.log`首轮因重复source夹具不适用，原件保留；有效`red-hosted-snapshot-portability-valid.log`为2 FAIL/3 PASS（含clean clone与显式blank），`green-hosted-snapshot-portability.log`当前23 PASS，仅定向证明。root仍在扩CLI不变量守卫，完整verify-4将不设外部环境变量运行，当前PENDING，未记PASS。新提交SHA、独立补审、新Hosted及main/post-main继续待验，任务维持REVIEW/整体NOT_VERIFIED。


后续失败边界：`green-hosted-snapshot-portability-2.log`为24 PASS。完整verify-4在lint因新fixture的未使用解构变量停止，root改为clone env后delete，未抑制规则；本轮未执行Browser。误拷的前次报告已保留并改名`verify-merged-4-inherited-browser-results-NOT-RUN.json`，不作为新运行结果。当前完整verify-5在不设KK_CONTAINER_ROOT下运行，尚无最终回执，不记PASS；只有成功exit0后的对应新JSON才可记录。


## 可移植性修复最终本地收据（verify-5 PASS，新SHA托管待验）

`verify-merged-5.log`实际exit0，不设KK_CONTAINER_ROOT：snapshot3/0、external not configured；Node1315总数中1301 PASS/14既有skip/0fail，Agent201中199 PASS/2既有skip/0fail；生产Browser747 PASS（2.9m），对应新`verify-merged-5-browser-results.json`已存在；完整lint/typecheck/UI242/0/format/build及development四步骤PASS，development sourceHead为f090加dirty tooling。`snapshot-explicit-container.log`4/0、external1 PASS，显式配置外部容器亦验证。前轮verify-4的lint失败、未运行Browser及继承JSON NOT-RUN、f090 Hosted snapshot失败均保留，不覆盖为通过。

`release-identity-after-portability.json`仍current，input79c3a8e5/EXE37a82390与原完整SHA一致；产品/Rust/Native源码字节不变，Desktop/Web2.1.27、Mobile2.1.1规划均不变，原Native56/Rust163/精确source241审查保持其范围。独立source dirty预检实际CLI24 PASS与offline AI-evals PASS只是本次有限离线范围，不是多模型或新提交exact-SHA批准。当前最新修复的完整本地验收PASS，整体REVIEW/NOT_VERIFIED；root待提交修复最终HEAD，再独立exact-SHA复审/推送/回读新Hosted，PR59未合并、main仍694。


## c498后续Hosted发布夹具失败（修复与短TEMP Node/静态待验）

交付head `c49852fbc17020ebda96266938d64cc50e45eef8` 在Hosted前独立exact aggregate review PASS；但[quality38643592443](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/38643592443)实际FAIL：snapshot3/0已通过，Node1315总计1294 PASS/8 FAIL/13 skip（Windows额外symlink case可用），Browser/Rust尚未运行。8失败来自agentPackage Windows发布夹具的 `C:\Users\RUNNER~1...` 非canonical临时根，被既有canonical/no-link guard拒绝；不是产品UI验收失败，也不表示Hosted通过。原verify-5本地PASS保留原范围。

source agent仅获tests/unit/agentPackage.test.ts写入权，拟用realpath规范本次拥有的fixture根；安全脚本保持、回滚断言不放宽。该修复及证明仍PENDING；root计划在同8.3短TEMP/TMP下运行完整npm test与lint/typecheck/format（short-temp-verification），当前PENDING；产品源码/Native哈希未变，既有verify-5 Browser747保留未变产品范围，新Hosted仍执行完整verify/Rust/Native。新修复head独立补审/Hosted/PR59普通合并/main/post-main继续待验；任务REVIEW/整体NOT_VERIFIED，main仍694、PR59未合并。


## 真实8.3 TEMP复现及最终短TEMP本地收据（新SHA/Hosted待验）

`short-temp-root.json`记录实际8.3 TEMP `C:\Users\Administrator\AppData\Local\Temp\KK-CI-~1`。`agent-package-short-temp-red-1.log`11项3 PASS/8 FAIL，实际复现Hosted的8失败；`agent-package-short-temp-green-1.log`11/11 PASS、0skip，junction、unowned stage、identity swap和rollback保护均运行。源码差量仅`tests/unit/agentPackage.test.ts`拥有的fixture根await realpath（4+/1-）；产品安全脚本不变、断言不放宽。

首轮`short-temp-test-1.log`1315总数为1299 PASS/2 FAIL/14skip，agentPackage全部修复；两失败仅原gitPushGuardPaths fixture因本次自建TEMP过深，canonical cwd/config路径越过Win32前置条件。`short-temp-git-path-canary.log`保留同两失败，不归作产品新bug，也未改Git guard。换用本次owned较浅actual8.3根 `C:\KK-UI-~1\full\LONG-T~1`（canonical `C:\kk-ui-temp-20261015\full\long-temp-name`），收据`short-temp-root-3.json`；canary2为7 PASS/3 Linux-emulation skip/0fail，保留policy路径>260、cwd+config<260原测试条件。

最终`short-temp-test-2.log`1315总数1301 PASS/14既有platform skip/0fail；`short-temp-lint-2.log`、`short-temp-typecheck-2.log`、`short-temp-format-check-2.log`全部exit0。该轮为short-temp-verification（完整Node及静态），不是完整verify-6；产品/config/Rust未变，原Browser747/0实际retry、Native56、Rust163仅沿用未变产品范围。当前修复本地PASS，最终提交head/独立exact-SHA审查/新Hosted完整门禁/PR59/main/post-main继续PENDING；整体REVIEW/NOT_VERIFIED，main仍694。


## 54a2 Hosted首次ready超时及启动夹具修复（新HEAD待验）

交付head `54a2d71285f024b2bc7e4f1a66b592bc5ec0a91b` 独立aggregate review PASS、Delivery706/0；但[quality38645328109](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/38645328109) verify实际FAIL：Node1315总数1301 PASS/1 FAIL/13skip，仅generationServerRestart首次ready（line156→until29）CONDITION_TIMEOUT约6747ms。尚未POST、调用Provider、恢复、Browser或Rust；旧fixture未输出捕获的child日志，Hosted当次child alive/crash UNKNOWN，不能声称已确定slow CI。c498当次gateway2726ms/全Node64802ms与54全Node312748ms仅是variance线索。54 push run38645320833仍在旧head完整验证，其结果PENDING，不因产品未变忽略后续失败。

已实证的是测试计时缺口：`gateway-startup-delay-red-1.log` actual child preload7s、首次ready6553ms，同一栈RED；`gateway-startup-delay-green-1.log`两次冷启动各7s、真实restart15297ms<原20s，4/4 PASS，含exit/error/abort三个负向。source agent只修改`tests/unit/generationServerRestart.test.ts`（84+/14-）：每child stdout完整own-port marker后显式HTTP200+health identity握手；早退/error/原test signal abort拒绝。原20s、postsubmit/recovery until60×100及全部断言保持，产品无变更。`gateway-startup-focused-green-1.log`普通focused21 PASS；这些不能倒推Hosted当次child的真实状态。

真实8.3 TEMP最终`gateway-final-test-1.log`1318总数1304 PASS/14既有platform skip/0fail；`gateway-final-lint-1.log`、`gateway-final-typecheck-1.log`、`gateway-final-format-check-1.log`全部exit0。此为完整Node+静态检查，不是完整verify-6；Browser747/0实际retry、Native56、Rust163仅沿用未变产品范围。新修复HEAD待提交、独立exact-SHA复审和新Hosted完整门禁待验；旧54 push结果亦待回读。任务REVIEW/整体NOT_VERIFIED，PR59未合并、main仍694。

## 2.1.28设置竞态修复阶段（首轮文档冻结时，保留当时待验范围）

以下为2026-10-15新增事实；此前各轮收据保留原SHA与版本范围，不合并为一次全量PASS。当前提交基线为 `2d4be5fca4c2167d4bc0d500634645624f311505`，其上有最小产品/测试及Desktop/Web2.1.28版本候选；尚无最终提交SHA。Mobile2.1.1仍为规划，main `694a00607f6f63de1b8c43d0ebb117adf5d34f67` / PR59未合并，任务REVIEW / 整体NOT_VERIFIED。

| 新阶段 / 工程外证据 | 实际结果与边界 |
| --- | --- |
| [54 push38645320833](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/38645320833) / hosted-54-verification-evidence.zip | Repository verification exit0，完整Node/Agent/Rust163/clientcheck/build通过；Browser746 PASS、1 flaky、0最终失败。sidebar-real-projects“移动到折叠的项目组后目标文件夹自动显示”首试目标文件夹缺失、30s超时，retry1通过；原缺trace，根因UNKNOWN。后续Native在旧“配置供应商”按钮定位30s失败，receipt只有8项检查且passed=false，不算Hosted全绿。 |
| [2d push38647654947](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/38647654947) / hosted-2d-verification-evidence.zip | Browser746 PASS、1 FAIL、0 flaky，目录刷新保留草稿case初试/retry均FAIL：expected Updated draft-image-b，received Draft account A a；不是重试通过。先前2d exact aggregate review PASS / Delivery707/0不覆盖这次运行缺陷或后续dirty修复。 |
| race-red-1.log / race-red-1-browser-results.json | 诊断运行期间测试源在2026-10-14T22:50:20.475Z发生修改；原件保留，仅取具体case诊断证据，不作为整轮单一冻结源码的RED/GREEN收据。 |
| settings-race-red-2.log / settings-race-red-2-browser-results.json | 冻结旧产品并对真实select连续change B→A，无中间让出事件循环；3/3 FAIL、0retry/flaky/skip，有效复现同一目录草稿污染。 |
| ProviderModelCatalog最小修复 / settings-draft-race-source-audit.md | 仅字段同步effect从useEffect改为useLayoutEffect，事件订阅/status清理仍原effect；使draft key、refs与字段在下一次交互前同步。dirty比较、账号/协议/auth/model隔离键、保存与trim校验均保留，无新schema/凭据或Provider能力。测试保留全部业务断言，不用增加等待隐藏竞态。 |
| settings-race-version-bump.log / settings-race-build-green-1.log | 版本脚本真实递增Desktop/Web2.1.27→2.1.28，Mobile2.1.1不变；2.1.28生产build通过，构建不代替Native验收。 |
| settings-race-green-1.log / settings-race-green-1-browser-results.json | 修复后完整settingsDraftRetention七case×六次=42 PASS、0 FAIL/flaky/skip/实际retry（24.5s）；覆盖dirty/刷新、账号隔离、规范化及分类切换与不外发/不持久化凭据。仅此定向浏览器范围。 |
| sidebar-probe-2026-10-14T22-53-58.559Z/results.json | full_pages隔离probe原seed五个cold contexts全部PASS，含CPU4x一轮；trusted创建click后folder0→1为2/2/12/2/2ms，groups identity始终1、无remount，0 pageerror、blockedrequests=[]，自有preview已关闭。只证明本轮不复现，不确认原Hosted根因或已修复。 |
| native-taskhost-current-1/receipt.json / native-taskhost-current-1.log | fixture对齐真实“模型接入…”/“API Key（官方）”及精确模型菜单；用既有原生快照CAS准备四结果草稿，保留所有生成/重启/幂等/未知态/秘密断言与超时。实际Desktop/Web2.1.27 release、sourceHead2d、fixture SHA256 4058265f8d38c14ab6cbacf8b73c57dff08ed99117dd2b8845c32c3a2acf8b85：11/11 PASS、exit0、errors=[]、credentialCleanupComplete=true；5个自有进程均退出，9349/9426/1423/1421端口均释放。这是旧release2.1.27证据，不能代填2.1.28。 |

工程外证据统一位于 `D:/kk-studio/.analysis/ui-full-20261015/`。2.1.28完整verify、fresh Desktop/Native及资源身份、最终提交SHA独立source/integration复审、新Hosted/PR/main/post-main均PENDING。sidebar原flaky根因UNKNOWN继续由root诊断，不用本地成功改写历史失败；真实Provider、用户资料/视觉接受、签名安装器及Native Mobile仍分别开放。

本次待验阶段文档初稿检查：governance:write/check为139任务/0 violations，snapshot:check为3 unique documents/0（未配置外部容器），markdown:check为122 active files/0，index:check为19 ADR/0，doc:commands:check为140 active Markdown/0，git diff --check exit0；仅TASK-UI-FULL-20261015对象变化，原138对象及其原始文本保留，TASK_LEDGER.md由生成器更新且仅当前任务行/段变化。日志docs-convergence-checks-1.log与docs-convergence-preservation-1.json在工程外证据目录。这些是文档结构门禁，不是当前产品完整验证或独立精确SHA批准。

## 2.1.28最终本地组合验收（最新，REVIEW / 整体NOT_VERIFIED）

本轮已完成当前dirty组合的真实本地验收：提交基线 `2d4be5fca4c2167d4bc0d500634645624f311505` 加最小ProviderModelCatalog字段同步layout修复、Desktop/Web2.1.28及当前测试/docs；最终提交SHA尚未形成。Mobile2.1.1仍规划。root再次fetch确认origin/main为 `694a00607f6f63de1b8c43d0ebb117adf5d34f67`，PR59未合并。

| 最新工程外收据 | 实际结果与证明范围 |
| --- | --- |
| verify-merged-6.log | 完整npm run verify实际exit0：Node1318总数=1304 PASS/14既有platform skip/0 FAIL；Agent201=199 PASS/2既有skip/0 FAIL；lint/typecheck、UI242文件/0违规、format、build、production Browser及development四步骤全部PASS。lint中code-health42/advisory与footguns2/advisory保留，不写成0 findings；CHANGELOG drift warning同样保留。 |
| verify-merged-6-browser-results.json / verify6-browser-independent-readback.json | JSON startTime=2026-10-14T22:59:53.196Z、duration=190200.396ms；expected747/unexpected0/flaky0/skipped0。文档owner独立递归遍历747 tests及747 result records，全部passed、每case恰一记录，retry>0记录=0；确认实际retry0，未将配置上允许retry误写成发生重试。 |
| native-5/native-ui-full.json / native-5/release-identity.json | 官方2.1.28重建34.34s后真实Tauri production、src/main.tsx、tauri.localhost：56 checks PASS、errors=[]、10截图。root目视image-empty/image-reopened/settings-update三图，版本显示2.1.28；这是root目视结果，文档owner仅独立回读收据。自有data为native-5/desktop-official/data，root实查CIM WebView参数 --user-data-dir 指向native-5/webview-profile/EBWebView，使用真正fresh profile。 |
| native-5/profile-observation.json | root将当时live CIM输出人工转录（kind=manual transcription），非自动机器收据或新运行；WebView PID20432/parent3988、PID72696/parent20432的 --user-data-dir 均为native-5/webview-profile/EBWebView。捕获时间仅界定为Native5验证之后、正常关闭2026-10-14T22:58:40.551Z之前，不编造精确时刻；证据边界保持。 |
| native-5/close-owned-native.json | exact dataRoot匹配、正常关闭passed=true/errors=[]，不接管或清理default profile。 |
| native-taskhost-current-2/receipt.json / native-taskhost-current-2.log | 同一真实2.1.28 EXE：11/11 PASS、exit0、errors=[]、credentialCleanupComplete=true；Desktop/Web2.1.28、Mobile2.1.1，5次自有app均CDP ready且记录退出，root实查均已退出。取消三阶段、幂等、四结果耐久intent与进程恢复、unknown slot无普通重试、文本恢复及秘密隔离断言均保持。与先前旧release2.1.27的current-1收据分别保存。 |
| local-final-verification-6.json | verify-6重新build后release仍reason=current、needsBuild=false，input与EXE哈希与Native5精确一致，unchangedProductSinceNative5=true；不是仅以mtime推断。input SHA256=28c2f285e8aad35a686080aee9e50c4119704c8630113e329c4d2324b6084121；EXE SHA256=638b5df5345f47943b1d0061f1fea00bcdf037871200d0d38d3f51fa3e6bc722。 |

### Native2/3/4前置夹具失败（原件保留，不能洗成产品PASS）

- native-2只更新expectedVersion metadata，漏改校验中的旧2.1.27常量；5 checks后拒绝，未完成验收。其exact dataRoot实例正常关闭。
- native-3在HTTP/CDP ready前连接，0 checks、ECONNREFUSED；不是产品检查结果。其exact dataRoot实例正常关闭。
- native-4复用native-3同一自有project data，共49 checks；未设置WEBVIEW2_USER_DATA_FOLDER，实际使用default WebView既有image-test配置，因此“未配置时生成disabled”夹具前提不成立而FAIL。这不是干净profile的验收成功，也未据此改产品或删default profile。无生成/Provider请求，IPC guard拒绝凭据mutation/runtime。
- native-5统一所有版本常量、明确fresh WebView profile/env并等待HTTP-ready，从新空profile完整重跑，才取得上方56 PASS收据。native2/3/5正常close均按exact dataRoot；上述失败收据与截图保持。

### 2d PR quality补充（保留Hosted失败）

[quality38647660224](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/38647660224)最终FAIL：Node1305 PASS/13skip、Agent199 PASS/2skip、Rust163/fmt/check/build PASS；Browser746 PASS/1 settings flaky，首次草稿目录刷新失败、retry通过，已确认同一设置竞态。后续Native仍在旧配置供应商菜单line567失败，仅8 checks。该运行与2d push38647654947的746 PASS/1 FAIL且retry FAIL分别记录，不合并成Hosted全绿。旧54 sidebar flaky原缺trace根因UNKNOWN，本地五cold contexts与当前747首试通过仅证明本轮未复现，不宣称已修复。

当前本地2.1.28组合PASS不等于最终提交HEAD批准、Hosted成功或main落地。仍须形成最终head、运行固定base694→head独立source/integration审查和精确Hosted门禁，再普通合并PR59、fetch校验main/post-main；任务REVIEW / verificationResult=NOT_VERIFIED。真实付费Provider、用户资料/视觉最终接受、签名安装器、Native Mobile及其他功能成熟度沿用原开放范围，原138历史任务不改。

终稿文档后的静态/局部门禁结果以工程外docs-convergence-final-checks-1.log实际exit回读；不再重跑Browser，受验产品/测试未被本docs批次修改。
