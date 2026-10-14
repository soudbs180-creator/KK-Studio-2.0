# Verification：全页面新UI收敛与主线集成

- Task ID：TASK-UI-FULL-20261015；状态：IN_PROGRESS / NOT_VERIFIED；日期2026-10-15（Asia/Shanghai）。
- source HEAD：6bc2e3da387e0117e24fd49419d9a0d6e4b6a9d4 加本轮dirty修复；正式head尚待checkpoint。实际fetch与API确认origin/main=694a00607f6f63de1b8c43d0ebb117adf5d34f67，共同祖先1f6cbd37091326a899fa600baba53bf6efd9cf16。没有将dirty预检写成精确SHA批准。
- 版本脚本已真实递增Desktop/Web2.1.27，Mobile2.1.1规划不变；ui:check已PASS。完整verify、当前新Desktop与资源身份还未完成。历史2.1.26的635browser/38Native保持原SHA范围。
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

- `merge-tree-initial.txt`：102个预检冲突，不等于真实merge已解决。`main-conflict-decisions.json`逐路径50保留/50当前用户覆盖/2主线独有手工补回；`main-doc-preservation.md`及`main-source-preservation.md`保留精确blob/来源与功能不变量。实际merge由root后续串行完成，新冲突或新差量须重新裁决。
- main独有PROGRESS两段与CODING-STANDARDS三行按原文补回；保留其历史REVIEW/NOT_VERIFIED含义。main125任务与36功能ID在候选均有，能力状态不虚报升级；GOV003当前扩大范围维持PARTIAL。
- 当前任务evidence精确承接15份历史包verification；75个五件套文件在固定候选均存在。原任务branch/status不改，旧验证不冒充当前PASS。外部清单 `delivery-preservation-mapping.json`记录15包、原任务/分支与承接方案。
- Delivery读取Git提交。正式checkpoint与真实merge后需对实际PR base/head运行 `node scripts/check-delivery.mjs --base <完整base SHA> --head <完整head SHA> --branch fix/TASK-UI-FULL-20261015`；省略branch的本地通过不足以替代PR的HEAD_BRANCH匹配。

补充静态门禁：root的lint-premerge2退出0；health51项/advisory、footguns2项/advisory来自merge前祖先基线比较，不写成新0 findings。真正merge后的main基线与blocking行为须按新组合重验。

## 尚待完成

完整九步verify、Rust/desktop受影响门禁、当前2.1.27带Agent官方构建/实际Tauri和dist字节一致性、最终已提交base/head独立审查、精确head Hosted verify/delivery/deploy-linux/governance、普通PR合并、fetch树/祖先与post-main检查均为NOT_VERIFIED。root本轮实际GET回读：rulesets 23866924/23866923/23866925均active；stable23866925覆盖main/master/release、bypass=[]，PR approving_count=0、dismiss stale=true、threads resolved=true，strict required为verify/delivery（Actions integration15368），没有merge_queue rule，允许merge/squash/rebase。main仍694、protected=true；legacy protection.enabled=false不表示无保护，保护来自ruleset。仓库JSON中的四checks/merge_queue是配置意图，不能覆盖实际回读。当前quality没有workflow_dispatch，普通task分支push时delivery/governance按条件不运行；需PR事件。自动helper另要求四个checks/queue配置及非作者账号exact-head APPROVED，不能把它与当前托管配置或本地AI review混为一谈；不改远端配置、不伪造approval，按实际规则履行普通PR流程。

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
