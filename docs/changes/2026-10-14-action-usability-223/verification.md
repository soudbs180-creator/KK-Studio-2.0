# Verification：2.1.24按钮修复与本机交付

- Task ID：TASK-223-ACTIONS-20261014；状态：DONE/PASS（本地授权范围）。
- 产品源码：58b5c07f34718769e10b76c89d510615bea2fefc；基线6b5a2012b0cafeeb334db01f7c61df0df4124b3e；Desktop/Web2.1.24，Native Mobile2.1.1仍PLANNED。
- 最终收据的source binding须与本段产品SHA一致；运行时旧sourceHead字段与纯文档提交分别解释，不能替代产品输入哈希。64fc初始候选、0e补丁及后续失败均保留原时点范围。

## 最终本地验收

Desktop/Web2.1.24产品源码58b5c07f34718769e10b76c89d510615bea2fefc，TASK-223本地授权范围DONE/PASS。完整九步verify退出0：Node1273pass/14既有skip，Agent199pass/2既有skip，Edge608全部首试/0flaky/0skip，UI242/0，development5步骤PASS；Rust163与fmt通过。最终源码核心/UI独立审查PASS，官方CLI20项、便携CLI20项，实际Tauri官方46项、同字节便携46项通过。新依赖0，入口gzip增加1221B<16384；生产运行时4280文件/519481278B。用户确认手机布局、主题/独立背景、存储identifier/路径、原件与primary dirty/index保留；旧135任务及37功能状态逐项不变。Native Mobile2.1.1仍PLANNED；Hosted、真人CLI账号/付费Provider、签名安装器、日常资料、实体手机与用户视觉验收分别开放。

| 检查 | 当前结果 | 工程外回执 |
| --- | --- | --- |
| 完整九步 | exit0；Node1273/14旧skip，Agent199/2旧skip，Edge608首试/0flaky/0skip，UI242/0，development5步骤 | `D:\kk-studio\output\actions-ui-223-20261014\verify-source-binding-58b5c07f.json` |
| Rust/fmt | 163通过，fmt退出0；原生行为和平台版本边界按收据回读 | `D:\kk-studio\output\actions-ui-223-20261014\rust-source-binding-58b5c07f.json` |
| 独立审查 | 最终核心/UI均PASS；64fc UI CHANGES REQUIRED保留 | `D:\kk-studio\output\actions-ui-223-20261014\committed-review-core-58b5c07f.json` / `D:\kk-studio\output\actions-ui-223-20261014\committed-review-ui-58b5c07f.json` |
| 官方带Agent构建 | 当前已测产品源码与输入/EXE绑定；本机构建reason=current不是Hosted或签名证明 | `D:\kk-studio\output\actions-ui-223-20261014\desktop-release-58b5c07f.json` |
| CLI实际受控执行 | 官方20项、同字节便携20项PASS | `D:\kk-studio\output\actions-ui-223-20261014\cli-official-58b5c07f\receipt.json` / `D:\kk-studio\output\actions-ui-223-20261014\cli-portable-58b5c07f\receipt.json` |
| 实际Native | 官方46项、同字节便携46项PASS；仅本轮隔离数据/夹具范围 | `D:\kk-studio\output\actions-ui-223-20261014\native-candidate\runs\1791995547057-e10f7a79-a103-4a78-b588-e87467e4e8ca\evidence\receipt.json` / `D:\kk-studio\output\actions-ui-223-20261014\native-candidate\runs\1791995737221-d19d4666-a77d-4fdf-a03b-70c661b256ed\evidence\receipt.json` |
| 体积与运行时 | 新依赖0，入口gzip+1221B，4280文件/519481278B | `D:\kk-studio\output\actions-ui-223-20261014\final-footprint-2.1.24.json` |

- 官方及便携EXE SHA-256：`8c861eeb18ce357e0de942067c9a01c066ad90c0ac2fc7eafb07dd439e5b96fe`。
- 运行时manifest SHA-256：`e46272099dd8bc70daf23f82992b6a613c11537858806fcd2d7d6b5bc554a08b`。
- 账本136项：80 DONE、34 PARTIAL、12 TODO、4 BLOCKED、6 REVIEW，56项开放；仅223转DONE，旧135任务与37功能状态不改。
- primary当前状态248条；before的238条原dirty状态逐条保留，其他并行新增改动亦保留。HEAD51fccfc7879cf90f7caaf3ae8e10af4d97a2aa2c与空index不变，本任务未改primary；日常资料字节验收另记。本轮只读worktree登记109条，origin/main仍694a00607f6f63de1b8c43d0ebb117adf5d34f67。
- 本地源码/输入/产物与最终纯文档提交分别绑定；最终ZIP、Web、源码及恢复归档以工程外current-release回读，不把本机验收称为公开发布。最终output收据：待最终纯文档提交后由root补绑定，不预填产物完成。

## 仍开放的边界

TOML仅声明词法/受管键保守保护；多文件发布恢复副本不等于OS级崩溃事务。设置/记忆进程内版本不外推为跨窗口/外部应用完整修改版本。停止等待或失效保护不表示撤回已受理远端工作，不自动重试未知结果。手机仅响应式Web/WebView；真人CLI安装/账号登录、付费供应商、Hosted、签名安装器、日常资料、实体手机与最终用户验收均另行确认。

## 追加历史事件（按各自源码和回执，不覆盖终态）

- 0e阶段实际Native旧35项已通过，但新增390x400 light背景首个场景被video-composer遮挡，helper280点击失败；原Native receipt/failure保留，该阶段不是完整Native PASS，后续最终收据另记。
- 4874f732阶段完整verify退出1：Browser602expected/2unexpected/1flaky/0skip；UI独立审查CHANGES REQUIRED（UI223-03），短屏定向14PASS不替代完整通过。证据：complete-verify-hud.log、complete-browser-hud.json、committed-review-ui-4874f732.json。
- ab37a139阶段完整verify退出0、Browser606expected/0unexpected/0flaky/0skip；随后实际Native在31项之后上传按钮中心hit=false而失败，不属于完整Native46PASS。保留native-official-ab37a139-layout.log与对应native-candidate/runs/1791991354245-f5186fd3-d7ff-4fd6-a1e8-0452aa7fdccd/evidence/receipt.json及failure.png。
- 50271d34阶段320宽四项失败：50%画布image/video草稿上传、light/dark已上传image在20%→50%后的上传中心不可命中；Browser604expected/4unexpected/0flaky/0skip、完整verify退出1，核心/UI独立审查CHANGES REQUIRED（CORE223-GEO1/UI223-04）。21项定向PASS不替代完整通过。证据：complete-verify-palette.log、complete-browser-palette.json、committed-review-ui-50271d34.json。
- 58b5完整九步exit0：Browser608全部首试/0unexpected/0flaky/0skip，99输入一致；实际官方/便携CLI各20 PASS，EXE同字节。Native两轮均42通过后因真实系统确认窗口无法匹配而失败，tools/call未发出；保留native-official-58b5c07f及-confirm-descendants日志/receipt/failure，未删除确认或改为stub。原生最终验收仍待校准后全轮回执。
- Primary只读回读：HEAD51fccfc7与空index不变，原238条dirty状态逐条仍在，新增10条其他并行任务改动共248条，全部原处保留；没有把它们混入本任务提交或产物。数据身份路径gitdiff为空，不代替用户日常资料的字节验收。
- Native驱动校准过程保留：UIA真实确认控件为Pane/CCPushButton CommandButton_1000无InvokePattern，严格ownPID/title/class/HWND的真实BM_CLICK校准成功。无BOM模板在PowerShell File中文解码失败，改为成功probe的UTF8-BOM exact bytes e72e49…aad270；后续实际确认和tools/call已发送，但内置local插件无更新按钮导致测试断言失败。复用仓库原remote cached fixture补齐更新场景、保留禁用/停止等待/无重试/恢复全部断言，最终全轮回执另记。
- 原生补充fixture误差保留：原project-prompt image草稿本就pending，目标本地结果ready/重载/坐标已通过；全项目无pending的断言不适用。改为终态pending ID集合精确等于开始baseline，保护原草稿并拒绝全部新增pending，目标终态/原件/重载/fetch1/三项数量均保留。最终官方Native46已实际PASS（1791995547057-e10f7a79-a103-4a78-b588-e87467e4e8ca），便携全轮另验。
- 最终同字节便携Native46实际PASS（1791995737221-d19d4666-a77d-4fdf-a03b-70c661b256ed），与官方46相同源码/EXE/工具校准字节，错误为空、隔离资料/凭据/连接均清理。并保留原pending草稿身份，没有新增孤立pending。

## 历史阶段记录（旧PARTIAL/待完成只表示当时阶段）

### 历史Verification：2.1.23 按钮修复

- Task ID：TASK-223-ACTIONS-20261014；状态：PARTIAL。
- 基线6b5a2012，typecheck PASS；当前审计和失败探针保存在工程外D:/kk-studio/output/actions-ui-223-20261014。
- CLI实际定向51/51；独立预检发现转义根键与成功视频Undo悬挂，两项先RED再修复，补审root相关46/46及CLI19/19 PASS，typecheck与当前基线健康0新增问题。
- 实际production1423回归已复现短屏越界、隐藏颜色入口、上传反馈遮挡数量选项、首击生成落空、握手/插件交叉busy及伴随服务父子busy。短屏/背景/分类3宽、图片unknown取消和视频键盘删除/撤销已通过；新增视频屏幕删除经实际适应视图后1/1 PASS，第四轮相关9/10的旧定位失败保留。
- 测试自身定位错误（动态last误选新结果、适应视图含快捷键文字的exact匹配、插件卸载多实例、reload需重新进项目）和fixture漏GET /v1/assets均已纠正，历史失败保留，不当产品已修复证据。
- `complete-verify-release.log/.exit`：完整九步退出0；Node1282项1268通过/14既有跳过，Agent201项199通过/2既有跳过，production Edge595全部首试通过/0flaky/0意外/0跳过，UI242/0，格式与development5步骤通过。输入路径/哈希在verify-release-inputs.json逐项固定并在结束回读不变；实际模式为1423production preview、1421development。
- Rust当前版本163/163通过，fmt退出0；无原生行为源码更改，仅平台版本递增。当前基线健康45文件0新增问题；主线历史advisory仍按原规则保留，未调大基线。
- 三类失败过程保留：输出目录内临时夹具导致长路径/保护区失败，过短目录不满足原长路径校准，恢复系统临时目录后19项16通过/3既有跳过；一次1423启动被strictPort拒绝，回读端口空闲后新服务串行验收，未复用或杀外来服务；数量选择自动关闭造成6项旧回归失败，保留原滑杆/回焦方式并修复自身按钮点击前的过早重排，相关19项首试通过。旧背景测试同步可见菜单交互，未弱化切换/关闭断言。
- 正式提交/Native/便携、独立源码审查和产物回读待完成。手机仅响应式Web/WebView；夹具不代表真实供应商能力。
- 64fc6885为保留候选：官方Agent桌面构建退出0，收据reason=current，但独立UI审查随后发现两处P2，不能当最终输出。工程外boundary-red-ordered记录390/1920六项真实浏览器RED：数量/参数L/G穿透与loading撤销后的success/cancel再Redo恢复pending。首轮Undo未隐藏卡的定位过程亦保留；结算历史必须覆盖已隐藏结果且不得插入、移动或恢复删除源。
- 后续root修复：快捷键识别真实数量/参数弹层；准确本地结果IDs显式结算current/past/future中的现有pending，保留Redo、历史草稿/坐标/连线及正在apply的fingerprint。纯历史12/12、typecheck、UI242/0、相对6b健康48文件0新增问题通过；fresh1423真实浏览器13/13首试，包括390/1920隐藏→成功/取消→重做→重载和原删除/取消回归。strictPort拒绝的一次启动日志保留，未复用或杀外来监听；最终全量与新SHA补审尚待完成。
- 修复后完整九步`complete-verify-final-current.log/.exit`实际退出0：Node1287项1273通过/14既有跳过；Agent201项199通过/2既有跳过；Edge601全部首试通过、0意外/0flaky/0跳过；UI242/0、格式、lint、typecheck与development5步骤通过。94个当前输入在起止逐项哈希一致，记录在verify-current-inputs.json。development的sourceHead字段为运行时提交前64fc基线，不能当最终产品身份；新源码绑定需回读产品输入哈希和独立审查。首次完整verify在1423启动预检失败保留为exit1，未将其冒称PASS。
- 0e470bc2两项补审PASS、官方build收据current、official/portable CLI各20实际PASS；Native前35继承项实际通过后，390×400浅色新增背景检查被选中视频编辑器拦截，整轮FAIL并保留隔离profile/receipt/failure.png。浏览器新增390/844×light/dark四项中390两项RED、844两项PASS。根因为HUD常态z20低于screen editor101，只有展开菜单才升102；修复复用既有menu token常态升层，不移节点或改数据。重新全量/产品SHA/Native及最终输出仍待新回执，0e不能当最后已交付版本。
- 4874f732全量FAIL保留：602首试/2意外/1flaky，独立UI审查CHANGES REQUIRED。添加资源菜单旧z60和上下文菜单旧z70低于editor101/HUD102，导致手机第二张图片无法加入和短屏连接菜单触摸滚动消失。两类body portal命令菜单改用既有popover token；连接/对比与短屏14等定向20项通过，另保存几何首次读取旧视口宽度1279>390失败，改为有界等待实际尺寸并保留原边界/命中断言。上下文/保存连续三轮18项首试通过，native保存重试的旧flaky仅在后续实际全量首试和运行证据通过后关闭，不靠增大超时或删除断言。
- ab37a139完整九步exit0、606全部首试与两份独立补审PASS，official/portable CLI各20实际PASS；仍非最终Native交付。Native首轮38项后第四短屏采样遇resize后的自动视图变更，驱动在resize/关闭覆盖层后等待两帧布局再取不平移基线，原断言保留；次轮旧31项后上传按钮被screen editor遮挡，失败均保留。候选操作栏升层虽上传可达，反向遮住390短屏参数的2项失败亦保留；root最终沿用原层级，在共享定位函数纳入编辑器/底部工具的实际矩形、上下搜索最近可用行。21项真实浏览器首试PASS含320/390展开编辑器、32px/R8实际filechooser、草稿/世界坐标及编辑器控件、原顶部拖动/重选/缩放；健康51文件0新增问题，最终新源码全量与Native待回执。

## 窄屏右侧 HUD 避让补充

- `50271d34` 完整 `npm run verify` exit 1：604 通过、4 失败，均为 320px 的上传按钮中心命中失败；99 个输入哈希稳定。21 项定向通过不能覆盖完整回归。
- 工程外复制原测试的实际 DOM 采样确认：工具栏位于 x256/y54，上传仍为 32×32/R8，但中心命中 `IMG > BUTTON.chat-reopen.only-narrow > DIV.canvas-hud-right`。共享定位遗漏 HUD 右操作区；补入该实际矩形，保持层级、世界坐标、数据身份及原命中断言。
- 原失败日志与 DOM/截图保留于工程外 `geometry-diagnostics/`；后续实际完整验证和原生收据单独记录。
- 手机 `.canvas-hud-right` 是 `display: contents`，容器无矩形；独立补审指出须测量其实际 `.chat-reopen` 按钮。仅加入容器的候选仍失败，保留 `palette-hudright-green.log`；最终使用实际按钮选择器。
- 实际按钮避让后 `palette-chat-green.log/.exit` 32 项全部首试通过，含原 4 个 320px 回归和 320/390 展开编辑器的真实 filechooser、短屏菜单及桌面工具栏；typecheck exit 0。完整回归与新产物仍待独立收据。
