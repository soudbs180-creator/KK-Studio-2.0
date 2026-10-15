# 验证记录

总状态：IMPLEMENTING / NOT VERIFIED。未运行真实生成、登录、云恢复；不宣称原计划已完成。

基线 d95e4c44 / 2.1.34，隔离工作区 TASK-KK-UNIFIED-20261015。基线依赖为 canonical node_modules 链接；DESIGN 接入后 root 改为专属实体依赖，详见[依赖隔离记录](baseline-alignment.md#5-依赖隔离约束与本轮更新)，共享目标未安装或改写。

- 基线 typecheck：PASS，2026-10-15，`.tmp/unified-baseline/typecheck.log`。
- 基线 npm test：1357 total / 1341 pass / 2 fail / 14 skip，exit1；原件 `.tmp/unified-baseline-tests.log`。两失败为新工作区缺 Agent dist；补 vendor 依赖 junction、agent:build PASS，desktopAgentRuntime 3/3复测PASS，未重写失败日志。
- 治理记录初检：147 tasks / 0 violations。
- Native worktree 创建失败：Not a git repository；git fallback 成功，保留原工作树。
- App attach 手动工作树失败：The checkout exists but is not a managed worktree；未影响 Git 隔离。

证据仅适用于记录的版本和实际检查范围。Desktop、Web、真实服务、CI 及用户验收分别记录。

- 集成候选源码版本：Desktop/Web 2.1.35，Mobile 2.1.1保持；通过 version:bump 生成镜像，version:check/consistency PASS。CHANGELOG旧发布2.1.0落后警告保留，不把未发布候选写为release；实际产物尚未重建。

## 项目生命周期首轮（working-tree组合源码，未提交验收）

- Desktop/Web候选2.1.35，plugins:build及production build PASS；Vite既有>500kB chunk警告保留，未关闭或放宽阈值。实际preview固定http://127.0.0.1:1423，路由项目库，App→LibraryPage→CatalogPageBody→ProjectLibraryContent→SidebarProjectEntry/ProjectEntryMenu。
- Cargo全量：169/169 PASS，`.tmp/project-lifecycle-cargo.log`。此前冷编译先因无dist失败，未算测试RED；后续正式build后存储/包新增实际RED→GREEN见实现者日志。
- 三组Edge首轮：26例，23PASS/3FAIL，exit1，含相同失败重试，未宣称PASS。`.tmp/project-lifecycle-browser.log`，独立证据run98b43647-695d-4d61-92c0-9c6cf1604b8a。
- 三失败原因：conflict新测试期待旧文案，实际显示读取保护；旧分组测试期待刷新后文件夹消失，与持久分组冲突；旧组恢复测试期待重新收纳，与已批准解除归属/恢复空组冲突。保留核心保护断言，依据ADR020更新过时语义后重测，禁止延长等待或放宽保护。
- 已查看390和1920同状态项目菜单截图；1099截图和运行script/DOM几何附于同run。该证据不等于320px全应用响应式或实际Native界面验收。

## 已提交子范围与边界

- 项目生命周期 `13efa3fe`，组编辑竞态修复 `00e00e40`：真实 delayed-IDB 保存中切项目、组输入首字覆盖曾分别 RED，修复后保持原断言。最终生产 preview 1423，源码 `7442c4fb`，三组 Edge **27/27 PASS，retries=0、flaky=0**，run `479f97c5-7d94-483a-b85e-219ab719c44b`；`.tmp/project-lifecycle-browser-7442c4fb.log`。Native 存储/包测试 169/169 已通过，实际 Native UI 未验。
- 依赖防复发 `314ac750` → `11e991bf` → `5705fc73`：保留最初 RED、DEP-01 绕过和 DEP-02 缓存启动回归；最终定向 **44 PASS / 1 既有 skip**，真实共享 junction 只读探针 callback=0。未执行依赖安装/删除；旧事故影响 UNKNOWN。
- 组合源码 `3b49f605` 全量 Node：1414 total / **1400 PASS / 14 skip / 0 fail**，`.tmp/unified-node-3b49f605.log`。此结论不覆盖后续新增产品代码。
- 12AI 异步适配器 `3b49f605`，持久认领修复 `7442c4fb`：R1 先复现无回执时双 POST；改为未绑定持久化端口即在读密钥/HTTP 前拒绝，定向 **73/73 PASS**，type/lint/format/health 通过。工厂尚无生产调用方；真实生成、宿主原子认领、UI 归档仍未接通。
- 加载期候选 `9d4a0058` 已由外部提交 `56cb1381` 纳入；原 6 PASS / 新 8 RED 复现，沿 `TASK-HOME-LOAD-DRAFT-20261015` 修复中，未当作通过。
- 加载草稿产品修复 `46e30fb0`，真实浏览器增量 `5ddda4fb`：26 个 hook 用例连同存储/任务邻域共 **79/79 PASS**，type/lint/format/UI/health 通过；原 RED、额外 retry/过期 read/CAS ACK RED 均保留。显式事件 patch 跨 StartComposer→StartPage→App；未改字段读原件，附件只移除已见引用，读取与写入共用原 queue，最终 sequence 再核对；冲突前草稿单独保全。最初实际生产 Edge 2/2（run aa51d04f，91733429 + 已冻结且与46e逐字节匹配的产品源码）后，5ddda4fb 上四组相邻浏览器 **23/23 首试 PASS / retries=0 / flaky=0**，`.tmp/home-loading-browser-neighbors-5ddda4fb.log`。截图及实际 bundle `index-C9bW13aN.js` 已回读；精确提交独审进行中，未标任务整体 DONE。
- 硬件只读检测确认 Ultra 7 270K Plus / 可用总 RAM 63.5GiB / RTX5080 独立显存16303MiB，空闲9743MiB仅为瞬时样本。用户 ComfyUI 目录静态发现 H3 T2V/I2V 四权重，R2V ref2va 缺失；未启动、生成、下载或修改原目录。Qwen 模型建议源及固定权重摘要保存在忽略的 `.tmp/qwen-hardware-research.md`，尚非安装或性能验收。

## 写入来源核对

`56cb1381` 为当前实现者之外的提交，包含先前未提交文档及加载 RED 候选。只读确认主仓已切 main@d95e4c44、保全目录存在；未声称备份完整恢复通过。用户明确本会话独占当前隔离分支写入后恢复实施；保留外部提交，不重复主仓切换或清理。

## 组合浏览器与新增保护

- `80f6ce4d` 关闭 LOAD-01，27hook/81邻域及精确差量复审通过。重建 production 后在 `f1b549b6` 上跑本机服务格式/UI忙锁/首页加载/项目生命周期四组：12例11PASS/1FAIL，run96dacf86-6468-4d0d-9f5e-c963f5a00659。失败仅是新测试将“health可达但IO失败”误期待为“服务离线”；实际“检查失败”正确，修正该精确期望后定向复测，未放宽写入/草稿/无隐式IDB断言。原日志 `.tmp/combined-guard-browser-first.log` 保留。
- 硬件基础 `f1b549b6`：TS11、Rust7、显式实际探测1、进程归属回归1及cargo check通过；报告 `.tmp/local-hardware-20261015-a/live-validated-final.json`。同机空闲显存由9.46GiB降至约8.4GiB后，推荐9B变4B；驱动610.88/compute12.0仅报告元数据，未初始化CUDA、下载模型或验证推理。尚未独审/UI接入，不标完整LOCAL可用。
- 新用户 ModelScope 16G HiFi、加速节点及2K混合计费研究已完成只读核对，报告 `.tmp/h3-16g-research.md`、固定revision190e955f54f0b3ffc68929bc5bcf75ad825201af。单模式64.73GB、两模式93.13GB为LFS声明；16G是运行显存目标，不是下载量或本机性能验收。Sol attention等为第三方加速节点，未安装；现有Hub0.34.1不能推断兼容。官方2K再生成要求24fps、特定帧数/像素范围和完整条件，960×544预览不合格；HiFi产物是否获官方接受未知。再生成$0.05/输出秒另计原始输入，不能无条件称更便宜。原README按字节枚举错误保留，正确UTF8原件 `.tmp/h3-16g-readme-decoded.md`。

## 最新精确修复与 DESIGN 基础

- CF-01 修复 `6c639e8a`：有效旧主文件也须在写入/恢复前核对已有bak；实际两个RED转GREEN，相关115/115通过，精确独审SPEC/QUALITY Approved。格式与IO界面回归修正夹具后2/2首试、0flaky，run `7ff6c64f-74ed-4c11-bdd0-1fcc967c50ae`；不写服务、不改变浏览器旧数据、不另建IDB库、重读仍保留当前内存草稿。初轮11/12保留；未验证真实ACL拒绝与完整Native共仓库。
- LOCAL-HW-01 修复 `d3e8838f`：同名GPU逐个填充独立槽位，CIM与nvidia-smi不同顺序不再覆盖第一个观测；四组collect夹具RED→GREEN，Rust8/TS11通过，独立精确复审CLOSED/Approved。不将两张显卡显存相加；无CUDA初始化/模型推理/UI验收。
- DESIGN基础 `e5e4b345`：指定脏候选先冻结并保留，承接26文件；当前runtime tokens与CSS不改，新增根DESIGN、AST同步/校验、官方工具及共享组件预览。固定dev依赖安装在本任务实体目录，未操作canonical或vendor链接目标。46/46单测、preview8/8首试、定向静态检查通过；官方lint保留25项orphan警告，不据此删runtime颜色。最终run `dcd38593-db23-4c6a-b453-f238dfe1ebcb`，实际1423、JS `index-DbiAhh8O.js`。390/1099/1920无横向溢出，连续缩放保留输入/选择/主题；root回读390与共享状态截图。精确提交独立复审中，完整App页面/Native/最终verify尚未通过此证据验收。
- DS-01 `0770df7c`：上述基础独审实际发现完整多行selector换行漂移，原先hash回归不足以证明跨平台投影；两项完整CSS/提交LF回归先RED后GREEN，41/41相关测试与精确差量独审通过。独立git show同提交DESIGN+tokens（纯LF）检查0error，官方25warnings保留。此三文件逻辑修复未新跑浏览器，e5预览仍只覆盖当时冻结来源。
- 本地包计划 `7e06c171`：Qwen现有推荐目录单源化，固定main+匹配F16 projector的大小/摘要/许可；重新读取三个固定revision的HF LFS metadata，六制品与目录一致，未下载权重。HiFi两模式与共享原件去重；广告16GB/32GB机器容量候选与当前free资源警示分开，canStart始终false/运行未验。原9PASS+新3RED保留，最终18/18定向PASS，focused strict TS/lint/format通过，精确独审中。设置页面消费新增字段；真实安装/启动/峰值/视频/2K仍未验收。
- 本地包精确独审 `7e06c171` Approved；root后续 `aecb59c1` 对合法partial GPU数据保守处理：已知8GB+未知CUDA容量返回unknown，存在已知符合单卡才candidate，已知RAM不足仍below。新增实际RED后19/19相关PASS，精确差量独审Approved并独立九种组合验证；不相加多卡显存，canStart始终false。原18测试/当时审核状态保留为历史时点。

## 组合检查首轮（仍在实施，非最终提交批准）

`39bbdc3f` 加并发设置候选的组合源码 typecheck通过；全量Node 1514total /1499PASS /1FAIL /14skip，exit1，日志 `.tmp/unified-node-39bb-combination.log`。失败为未修改的desktopAgentRuntime真实子进程在5秒观察窗口内未给ready，stderr为空；同源码定向3/3首试通过（真实服务用例约740ms），日志 `.tmp/desktop-runtime-diagnostic-39bb.log`。尚未证明根因，不能将该全量记PASS或修改超时掩盖。待产品冻结/资源独占后定位及重验；当前仍NOT VERIFIED。

- Native权威 `06acda64`：14文件绑定source-manifest-final.json，Rust200PASS/1既有硬件probe ignore、check/fmt通过。四域真实OS互斥、独立进程/崩溃释放、唯一TaskHost Arc、缺原件身份保留、旧journal恢复排除及有界激活均有隔离证据；未启动用户数据或新GUI。独审发现NAT-AUTH-01有效main+corrupt unusedbak启动回归，原实现者修复中；不把200PASS作为验收完成。
- 设置候选（尚未提交）：production101/101视觉/交互及69/69保护/响应式首试通过，root查看390模型接入/数据管理截图；冻结自查又发现local编辑误挑Comfy记录/旧authMode覆盖，原实现者补真实RED修复，不以先前通过替代此反例。仍待冻结哈希/提交/独立review，不能标设置完成。
- DS-01修复后正式重跑 `npm run test:design`：41Node及8/8实际Edge首试通过，run `c76d19a5-4e66-4788-a46c-e06a5149195c`，实际1423，JS `index-BC-WFaQq.js`；`.tmp/design-after-ds01-06ac.log`。仍是开发预览，不代替App全局页面/Native证据。
- 仅对源码默认Comfy端口8188进行一次有界只读 `/system_stats` 请求，ECONNREFUSED；未扫描其他端口、启动进程或生成，不能据此判断用户模型包不可用。

## 冻结组合与实际 Desktop 验收准备

- Native修复 `df9f79e1`：NAT-AUTH-01 两类真实RED转GREEN，全量Rust204PASS/1既有硬件ignore，精确独审CLOSED、SPEC/QUALITY PASS；独立20权威/4激活用例通过。未使用的损坏bak保留原字节并在原写入链归档，备份IO/未来格式保护仍在。此结论不含实际GUI或Web共仓库。
- 设置 `f32baad8` 精确50文件已提交；21Node及上述101/69/20生产浏览器证据分别保留。独审发现SET-UI-01/P2：localOnly变更遗留远程分类、详情或旧回调。集中三文件修复 `0ad43b20`：实际组件4项RED转GREEN，旧filter回调新增RED转GREEN；11相关Node、14实际Edge首试通过，run `05257dd6-6fbc-4f56-90fc-e993daf5131c`。修复提交独审进行中，首轮新测试歧义匹配导致12PASS/2FAIL的记录不删除。
- 模型阶段A `28c64fcc` 精确30文件已提交：四渠道、搜索筛选、精确型号行与连接channel/priority元数据；原source/connectionId/凭据身份不变。84Node、24浏览器及调用方136PASS/2夹具FAIL、精确3项复测通过分别记录于实现报告；不是一次162项洁净运行。旧Agent场景localhost应选择“本地”、Figma标题结构过时两夹具经核对后修正。独立审查进行中。真实同模型合并、执行优先级、动态参数、主Agent及模型调用授权仍待实施。
- 产品冻结在 `0ad43b2036ac6bf5e408905bc5fa23983bc9bf7a` 后，全量 `npm test`：1522total / **1508PASS /14skip /0fail**，exit0，`.tmp/unified-node-0ad43b20.log`，约23.9秒。此前1514项组合运行失败原件保留，单次新运行不构成旧启动超时根因证明。
- root新增独立 `tests/desktop/repository-authority.mjs`，唯一证据目录/数据根/WebView profile/CODEX_HOME；通过当前checkout的 `start-kk-studio.bat --background --data-dir` 检查构建收据后验实际窗口、重复启动、拒绝网页激活、重开草稿及全局记忆不变。语法/格式已查，首次重建与实际GUI正在进行；尚不据此记录PASS。
- 设置修复 `0ad43b20` 精确独审关闭SET-UI-01，独立25相关Node及同scope正常操作、旧callback busy保护通过，SPEC/QUALITY PASS。模型阶段A仍在复审；完整产品仍IMPLEMENTING。

## 2026-10-16 组合修复与原生运行边界

- 模型 `f472c8f0` 集中五文件修复MODEL-A-01/P2（过滤后迁移旧family置顶丢隐藏型号）、MODEL-A-02/P2（禁用账号渠道无可读原因）：原Menu探针及实际Browser两项RED→GREEN，49Node、23/23生产Edge首试/0retry/0flaky通过。精确独审52Node及原探针新旧源码GREEN/RED，两个finding及token备注CLOSED，阶段A SPEC/QUALITY PASS；B/C仍待实施。
- 0ad源码旧Native四轮失败保留：8bb720为CDP不可达；ab984有额外输入（来源UNKNOWN）；7ee086和15d8焦点false。15d8完成同PID/epoch、非最小化、快照原字节、重开身份/草稿及全局记忆不变，但整轮exit1/PARTIAL。EXE a80c4ce2/input137df0e3与receipt另保全于独立`.tmp/native-0ad-artifact-d98df9ea-d054-4a9d-aa5b-ae13d8fa4e3f`，SHA一致。管道等待和输入来源均不作为已证实根因。
- `55a0ac51` 精确三文件独审关闭NAT-GUI-01（CDP前失败未记录自有进程清理状态）及NAT-GUI-02（重复激活依赖模拟Alt后备路径）。Windows只请求一次原生前台，拒绝则任务栏提示；没有新增输入注入/强抢焦点，非Windows旧行为保留。脚本记录完整root参数/创建时间、harness SHA、同PID、epoch/快照hash，finally检查pending并保持失败。cargo fmt/check和4激活用例通过，6项dead-code warnings保留；不据此声称初次建窗的依赖路径已改变。
- 新实际Native绑定 `55a0ac51f87d6f4ccbbc333acfbc99b19512960b`，run `90314c39-d035-4c99-b613-953ac36d8d70`；Desktop2.1.35、`http://tauri.localhost/`、`index-D1sP1AYs.js`。EXE `6ac913a2eb6eb159c71b7123b3de58fb2f0b17157df687dbc5b5f7e105490cc8`、input `8ce972b03d26e9528b5751032652c467ce21db7896394815eb7e866e3797d36b`，harness与提交rawhash一致。63040→63040同仓库/epoch/快照；退出后46508保留仓库身份、更新epoch、恢复草稿，清理无自有残留、全局记忆不变。实际截图及收据已独立回读。唯一focus断言仍失败，Win32两次采样均属其他前台进程；整轮exit1/PARTIAL。真实用户前台入口及具体拒绝条件仍NOT VERIFIED，禁止强抢前台换取通过。
- `npm run verify` 在55a0冻结产品源码（root文档随后更新）运行：lint/typecheck、Node1508PASS/14skip、Agent199PASS/2skip、ui/format及production build通过；浏览器run `7cd6110b-a21e-40e7-8d21-7d23865578be` 为811项、804PASS/7FAIL/0flaky/0skip，原配置retry1的失败复试均保留。失败涉及旧项目硬删除期望、两处Figma绝对锚点、通用禁用控件、账号菜单、更新入口及菜单生命周期；正在对照新规范逐项诊断，未改断言掩盖。完整verify exit1，后续DESIGN/development未运行，不可称全量通过。

## 2026-10-16 全量 UI 失败修复与下一阶段

- `8e17cb1373726a0fca305d8c70d2f4c38019b235` 精确九文件关闭上述七项失败。实际几何诊断证明新增垃圾箱独立行使侧栏项目整体下移51px；将入口、计数及选中状态收进既有排序菜单，保留五个radio及两个常驻按钮。未修改 `frame-accuracy.spec.ts` 的坐标、0.1容差或Git blob；最终五个锚点误差均为0。原诊断与同状态截图分别保存在 `.tmp/unified-triage-55a0-3bc86e82-a942-4548-8f86-91429cd66f42` 和 `.tmp/unified-settings-fix-final-frame-22cb1b61-ed56-4648-bdfe-ece789a1c482`。
- 其余夹具按已批准的软删除、通用折叠、账号/版本入口更新，取消、异步确认、CAS、完整同ID恢复、禁用原因、IME、菜单互斥和焦点断言保留或增强。新垃圾箱交互在旧bundle实际RED；首轮新用例83PASS/4FAIL也保留，修正窄屏命中、选择器和checkbox可访问名称后，九文件 **87/87首试PASS，0retry/flaky/skip**，run `7ae27546-4cde-4e3d-9ac0-cde58153d548`。冻结受测源码元数据HEAD为0a80be70，九文件与8e17提交blob逐一一致；中间6a72仅含ADR文档。
- 本轮实际Vite preview仍为 `http://127.0.0.1:1423`，JS `index-DsHqVkuK.js`，SHA256 `59a23704b579543209ebb7481aee8896dcce4853bb8e90e74cef6f075723a658`；DOM/截图和bundle均已回读。全量Node1508PASS/14既有skip、静态检查/production build/UI254项通过。精确九文件独审SPEC/QUALITY PASS，未运行新的Native或完整verify；原804/811及完整exit1仍是原轮结果，不能合并成一次全量PASS。
- 正常多聊天与本地安装契约分别接受为 [ADR-022](../../architecture/adr/ADR-022-project-chats-and-v3-migration.md)、[ADR-023](../../architecture/adr/ADR-023-local-model-installation-and-owned-runtime.md)，提交6a72e50b。两份固定计划独审未发现确定P1/P2；这是实施契约审核，不是迁移、安装或推理通过。
- 多聊天实现者现独占共享App/创作快照/聊天/Agent作用域路径；本地安装实现者仅写独立目录与安装适配器，root保留main/Cargo、全局tokens、版本及任务文档。二者已从只读映射进入实现，尚未冻结或交付；Cargo、dist/1423和Native按需逐个释放。模型B/C实际执行链另做只读映射，不与正在修改的核心交叉写入。

## 2026-10-16 安装接线预检与账号库兼容检查（未交付）

- root新增Native目录选择/安装/回执/复验薄命令和共享设置界面，API只接收受限selection/不透明授权及安装身份，owner来自实际Window与宿主epoch。完整SHA检查后的异步回调再探测硬件，`cargo check --bin kk-studio`通过，`.tmp/local-install-root-commands-posthash-check.log`保留8项警告。CUDA共享资源租约和Provider/TaskHost调用尚未接通，未启用生成成功状态。
- 安装hook最初独审确认4个P2：旧刷新覆盖新操作、旧取消失败串入新操作、终态后错误持续锁定、复验失败保留旧成功状态；原5个失败反例保留。修复操作身份/序号及取消回执隔离、终态恢复和复验失效，同时同步消费计划防旧handler双提交。实际16项hook全部通过；独立复审重跑16项及原5个重叠反例均通过，12路径前后哈希一致，原4项CLOSED，无新增确定P1/P2。冻结manifest `0dff532dd04ad57c5d2620b9174e9695f46cf6ae63d8a4468773242545bbb4ac`，报告 `.tmp/local-root-integration-review-fixround1-20261016/review.md`，SHA256 `8e235c2451f7c4466a960492a3145f5460846cdd7fba531a87990cfc9e5ae7dc`。这是工作树预检，未替代精确提交、实际Browser/Native或模块验收。
- 本地适配器19路径已冻结，manifest `.tmp/local-install-adapter-frozen-manifest-20261016.json`，SHA256 `88d2936faafbd6a8d79313f65dd40dcb95fc4e5b5ee30cd11dc2eb7bb31b98c1`，作者最终Native integration34/34、主bin模块32/32、Node21/21及聚焦静态检查通过；独立只读审查进行中。旧门禁EOF反例、PATHEXT等待缺陷与修复、abort取消/同锁生命周期均留日志；真实发布ZIP结构、下载、CPU/CUDA推理、H3工作流仍未验证。
- 全局UI旧8e17 bundle只读审计run `b5d27c25-f83c-4a60-a6be-0f0f19bd7ac0`覆盖390/1099/1920的36个首页/设置/项目库状态，无页面异常或document横向溢出。实际发现1920 Web顶部菜单命中高15px；原bundle回归2PASS/1FAIL保留于 `.tmp/topbar-hit-target-red-20261016.log`。已用现有32px token修正共享按钮，尚待新构建GREEN；此有限审计不算全产品DESIGN验收。
- 账号依赖只在专属实体忽略目录 `.tmp/account-library-spike-1f7d8916-fcb9-4b1c-95ac-d2bdd7ed0222`安装固定版本，未改产品依赖、共享vendor或日常客户端。Node24真实OPAQUE稳定exportKey/错误密码及身份拒绝、jose+WebCrypto封装/篡改拒绝等6项通过；真实oidc-provider/openid-client在隔离loopback跑PAR/PKCE/授权码，5个子场景及父项通过，含重放、错误state/nonce/verifier、未注册回跳和缺PKCE。fixture明确代供认证/同意，内存adapter及TTL警告保留；不算真实账号、持久撤销或回跳验收。
- 同一专属账号spike另作独立production Worker构建，未替换产品dist。实际Edge390/1920在`connect-src 'none'`和仅WASM例外CSP下完成OPAQUE+jose，0页面错误/0外部请求，run `097fe56c-0548-459b-9397-8b50c6211e01`含源文件/锁文件/bundle哈希与截图；1423已退出释放。仅证明库与专用Worker兼容，不代表产品账号、WebView2、设备指纹/PIN、HTTPS或独立安全审查通过。
- 后续独审真实反例确认安装模块CHANGES REQUIRED：LMI-01/P1为正常续传记录下硬链接`.part`被`set_len(0)`连带截断另一原件，受控6B文件变0B；LMI-02/P2为续传继续索取全部初始空间，27B已下载17GB后仍误拒剩余23GB可用空间。报告 `.tmp/local-install-independent-review-20261016/review.md`，SHA256 `da07798902a338a3daeab8d82d60f690bf8c401c1ae3a708edaf2e7cd1d6a78e`；独立Cargo34/34及Node21/21通过不能覆盖两缺陷。root仅解除原19路径冻结交作者修复，模块尚未提交，原manifest/反例/日志保留。
- 按ADR019后续技术决定，在本任务private实体root使用ignore-scripts安装四项固定账号依赖和类型包；未安装shared vendor，原lock条目无版本更换/删除，58个新增条目及debug/ms的dev归属变化有核对。独立账号服务端实现者仅占新增account server/domain及专属新测试，root保留旧gateway/同SQLite连接/依赖/Native/client集成，不新建数据库或队列。当前处于实施准备，不把兼容spike当作产品账号或登录可用。

## 2026-10-16 安装安全修复与冻结构建回读

- 安装fixround1仅改变原19路径中的8个Rust文件：真实RW句柄核单链接/路径/身份，prefix复验和写入使用同一锁住句柄，mutation前复核；已验证原件/partial才抵扣空间，保留ZIP展开峰值和预留，同卷锁内复算。原硬链接与空间两个真实RED转GREEN，作者integration41/41、bin39/39通过；新19manifest `3060865274318a549936e32eaa193f627ee6f16af9eb8d6e18f4bd14752618f2`。独审fresh integration41/41、Node21/21和原直接源码硬链接反例通过，原件6B及SHA不变，LMI-01/P1、LMI-02/P2 CLOSED；报告 `.tmp/local-install-independent-fixround1-review-20261016/review.md`，SHA256 `cf6b8d4494f35d4845777a91c1d897be47e4d225f232744cb37b48930717af94`。这是工作树预检，不是固定提交或真实下载/推理批准。
- Windows share0不能阻止CreateHardLink，新别名反例及最初错误假设失败均保留。原有外部别名在真实句柄核验时拒绝，原件不变；检查与写入间恶意同用户进程新增别名不是原子可阻止，不作该保证，也未引入整前缀COW。只读关联原件允许安全读取，不因本修复拒绝合法硬链接模型。
- Desktop模型发现原先只回传ID，丢弃已报告能力/显示信息。新增实际TS两项RED与Rust页面parser RED后统一受限DTO；旧ID-only回执仍兼容，未知能力不臆造。TS目录/取消邻域15/15、Native provider6/6及请求取消9/9通过，包含既有真实HTTP GET/分页/socket取消。首次类型推断错误和另一writer中间态编译失败保留，最终稳定源码通过；真实供应商能力与生成仍待验。
- `npm run build`通过，573个JS构建输入前后哈希一致并原样冻结到 `.tmp/unified-product-js-freeze-39630f42-3118-455c-8bb9-44d3b987f1b2/source`。实际JS `index-CWTafAiD.js` SHA256 `3d1375168ca9b548bbd3af5b329593a87a1be9c1670192276b5e83816cd4aa11`，CSS `index-CkvZStC5.css`，设置chunk `SettingsPanel-dC3KyQPq.js`；保留既有大chunk警告。此e2d12+dirty冻结包含当时后台初批模块，不等于当前所有并行源码或Native产物。
- 该bundle首批25例24PASS/1FAIL，run `fe36f793-5971-4510-8afb-c80a8e95f63f`；安装fixture误把active释放等同于删除按ID终态回执，按真实Native契约保留terminal，不改原断言。原25例重新整批 **25/25首试PASS、0retry/flaky/skip**，run `2da80dfb-a1fb-4317-a13f-d2adefed0cd1`。覆盖三宽设置/安装界面、取消/重开、H3无隐式引擎/付费调用、聊天草稿/迁移/迟到附件/future backup及顶部按钮；安装是合成IPC，不是实际Tauri或下载验收。
- 回读截图发现聊天截图捕获了220ms重挂载动画中间态；实际settled为opacity1/零平移，390左右9/381、1099左右678/1078、1920左右1430/1900，均在viewport内。helper改为等待真实动画及上述状态，不加固定sleep/禁动画。frame邻域最初3PASS/1FAIL，旧v3 seed附未迁移messages被正确拒绝；只移除该旧字段后，原frame4项与聊天6项 **10/10首试PASS**，run `ec4731a3-fd13-433e-a936-2d550d594515`。原坐标、0.1容差、focus断言保持；root已回读390/1920最终PNG与DOM。
- 新bundle36状态只读全局审计run `80a57c8f-7aca-496f-bad5-3b1082a1779e`，0页面异常/外部请求/document横向溢出；实际1920顶部四菜单均24×24px。勘误：上文预检所写32px为未核验数值，真实紧凑token结果是24px，已超过原15px并满足本回归24px下限。有限状态审计仍不替代完整DESIGN逐页、动态参数、媒体和Native验收。
- Native迁移receipt的main较新分支补bak未来/旧格式核验，真实RED后storage26/26、当时组合bin255PASS/1既有ignore，未跑实际NativeGUI。随后Agent另发现审批/已受理工具的两项scope RED，修复后72项Agent邻域通过；该JS单路径改变未纳入上面的旧573输入bundle，需新冻结重建，不能套用旧浏览器证据。
