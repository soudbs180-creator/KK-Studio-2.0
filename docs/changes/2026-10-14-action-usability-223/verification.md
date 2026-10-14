# Verification：2.1.23 按钮修复

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
