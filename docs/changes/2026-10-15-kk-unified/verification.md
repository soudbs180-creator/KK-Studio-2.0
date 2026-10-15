# 验证记录

总状态：IMPLEMENTING / NOT VERIFIED。未运行真实生成、登录、云恢复；不宣称原计划已完成。

基线 d95e4c44 / 2.1.34，隔离工作区 TASK-KK-UNIFIED-20261015。依赖为 canonical node_modules junction，未新安装依赖。

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
- 硬件只读检测确认 Ultra 7 270K Plus / 可用总 RAM 63.5GiB / RTX5080 独立显存16303MiB，空闲9743MiB仅为瞬时样本。用户 ComfyUI 目录静态发现 H3 T2V/I2V 四权重，R2V ref2va 缺失；未启动、生成、下载或修改原目录。Qwen 模型建议源及固定权重摘要保存在忽略的 `.tmp/qwen-hardware-research.md`，尚非安装或性能验收。

## 写入来源核对

`56cb1381` 为当前实现者之外的提交，包含先前未提交文档及加载 RED 候选。只读确认主仓已切 main@d95e4c44、保全目录存在；未声称备份完整恢复通过。用户明确本会话独占当前隔离分支写入后恢复实施；保留外部提交，不重复主仓切换或清理。
