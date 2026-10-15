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
