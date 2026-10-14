# Verification：全页面新UI收敛与主线集成

- Task ID：TASK-UI-FULL-20261015；状态：REVIEW / NOT_VERIFIED（本地验收PASS，Hosted/PR/main待验）；日期2026-10-15（Asia/Shanghai）。
- 最新本地组合：f090已提交head加snapshot可移植性scripts/tests/docs修复，完整verify-5无KK_CONTAINER_ROOT退出0；最终修复提交SHA、精确独立复审与新Hosted待验，f090首次Hosted失败仍保留。
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
