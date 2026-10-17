# 审查记录

本轮整体尚未完成；以下独立回执只覆盖对应子范围，不是最终合并批准。

任务级审查须检查需求符合性、数据兼容、失败路径和回归；最终审查绑定精确提交。旧候选审查和测试不得移作当前结果。发现问题由原实现者集中修正后定向复审。

- 2026-10-15：自审发现未逐文件审核目录暂存，误纳入来源UNKNOWN的baseline-audit.md；已保留正文并显式撤销其事实/授权地位。后续仅逐文件暂存，未经验证草稿不得用于关闭任务或触发清理。

- 依赖安全任务级独立审查（69929f55→314ac750）：SPEC/QUALITY NEEDS FIX。DEP-01/P1：根node_modules下 package 或 @scope祖先链接仍可到达自定义builder；合成探针callback=1。交原实现者补路径组件链接检查和两例RED→GREEN，再定向复审。原测试通过不足以关闭该项。

- DEP-01修复11e991bf独审ADDRESSED；定向复审发现DEP-02/P2：preparation guard提前到cached-current返回前，阻断无需变更的缓存启动（合成built0/launched0）。原实现者第2轮修复，guard须保持callback/installer之前，缓存无准备路径应可启动。

- 依赖最终任务复审 `5705fc73`：DEP-01/DEP-02 ADDRESSED，SPEC/QUALITY Approved。旧事故字节/影响仍 UNKNOWN，非任务整体 DONE。
- 项目生命周期初审及 `00e00e40` 定向复审：SPEC/QUALITY Approved；真实浏览器组编辑竞态修复与最终 27/27 证据补入 verification，Native UI、最终整体验收分别保留。
- 12AI 初审 `3b49f605`：R1/P2 未绑定持久回执允许付费 POST。`7442c4fb` 定向复审确认强制原子认领端口、仅 owner 提交及未绑定失败关闭，R1 ADDRESSED、SPEC/QUALITY PASS。生产端口与真实 Provider 尚未验收。
- 外部提交 `56cb1381` 对依赖状态的旧断言已按上述精确提交回执纠正。主仓切换/清理不在本轮执行记录中，不因文档存在而追认授权；用户随后明确当前会话独占代码写入。

- 加载草稿初审 `5ddda4fb`：LOAD-01/P2，同素材的两个引用中移除一个会被恢复。`80f6ce4d` 改按引用ID删除、新增仍按素材身份去重；精确两文件复审 Approved，独立 actual-hook 三反例3/3通过，原RED及27hook/81邻域证据保留。
- Companion 格式保护 `84c6a136` 初审：CF-01/P1，有效v2主文件配未来版bak时，写入和恢复仍覆盖唯一新版bak；实际两组文件证明已保留。原实现者在 `6c639e8a` 补mutation前无条件检查bak；两例RED→GREEN、115相关测试及独立精确复审通过，CF-01 CLOSED，SPEC/QUALITY Approved。此结论不含未交付的统一本机仓库。
- 硬件 `f1b549b6` 初审：LOCAL-HW-01/P2 同名显卡覆盖已填充槽位，顺序影响推荐。`d3e8838f` 保留逐卡观测，四组真实collect夹具及原TS schema/推荐独立回放通过，不相加显存；定向SPEC/QUALITY Approved。未验实际模型运行。
- DESIGN `d3e8838f→e5e4b345` 全26文件独审发现DS-01/P2：仅hash换行规范化，多行CSS selector的CR仍进入YAML，干净LF checkout投影漂移。保留原反例及两RED后，`0770df7c` 统一parse/hash输入并重生投影；41单测及独立git-LF/完整CSS LF-CRLF严格相等复审通过，DS-01 CLOSED、SPEC/QUALITY PASS。预览通过不替代产品全局UI验收。
- 本地包目录/容量建议 `0770df7c→7e06c171` 四文件已提交，18定向测试及focused strict TS/lint/format通过，精确独审中。只读包计划和硬件容量指引不构成安装、推理或2K接通。
- 本地包 `7e06c171` 独立SPEC/QUALITY Approved，六Qwen/五唯一H3制品metadata一致；root另加固合法partial GPU输入，`aecb59c1` 实际RED→GREEN及19相关测试，精确增量独审Approved并额外核九种容量组合。原报告保留；未知容量不作低于建议的断言，仍无运行可用性批准。
- Native权威 `39bbdc3f→06acda64` 14文件独审CHANGES REQUIRED：NAT-AUTH-01/P1，有效主快照+损坏未使用bak被新增准入误拒，窗口前退出，破坏原有归档恢复。原实现者两类真实RED后集中修复，必须保留备份IO/未来格式保护；独立28相关测试通过不能覆盖缺失反例。其余权威/锁/激活基础无第二个确定问题；Native GUI及最终交付仍未验。
- Native `06acda64→df9f79e1` 精确两文件复审：NAT-AUTH-01 CLOSED，SPEC/QUALITY PASS；20权威及4激活回归由独立上下文通过。实际GUI/跨运行时共仓库不在此批准中。
- 设置 `df9f79e1→f32baad8` 全50文件独审：仅SET-UI-01/P2，ProviderPresetSelector在运行时localOnly切换后仍有远程分类/详情/回调；固定提交真实组件反例已保留。三文件修复 `0ad43b20` 已提交并交精确复审；未以新测试通过替代独审关闭。
- 模型阶段A `f32baad8→28c64fcc` 精确30文件提交已交独立审查。明确阶段A不包含实际同模型合并/路由优先级/动态参数/Agent授权；这些仍属原任务待交付范围，不能以阶段A列表变化标记完整模型重构完成。
- SET-UI-01 精确增量 `28c64fcc→0ad43b20` 独审CLOSED，SPEC/QUALITY PASS；三文件rawhash/Git blob吻合，独立25Node及额外同scope/busy内存断言通过，回读生产14/14证据。没有重跑Native或宣称全局UI完成。
- 模型 `0ad43b20→f472c8f0` 五文件精确复审：MODEL-A-01/02及非阻断token备注CLOSED，原Menu探针旧提交RED/修复GREEN，独立52Node通过；生产23项及390/1920截图回读。阶段A SPEC/QUALITY PASS，完整MODEL及B/C不在此批准中。
- `55a0ac51` 三文件精确复审关闭NAT-GUI-01（CDP前失败清理状态缺失）和NAT-GUI-02（重复激活依赖模拟输入路径），修正范围SPEC/QUALITY PASS。独立只读核对新Native run90314c39/EXE6ac913a2/input8ce972b0；单实例/恢复/重开/清理及记忆边界有实证，focus唯一失败保留，整轮PARTIAL。源码修正批准不等同真实前台启动验收。
- 契约 `0a80be70→6a72e50b`：ADR-022/023及两份忽略目录实施计划独审未发现确定P1/P2，可进入正常多聊天和独立安装适配实现。额外只读核对旧235e/d95 Native面对未来main/bak会拒绝写入；迁移故障注入、跨运行时Windows锁和真实安装仍须分别验收。
- UI修复 `6a72e50b→8e17cb13` 精确九文件独审SPEC/QUALITY PASS，manifest与Git blob全匹配；固定提交组件探针验证原菜单计数/选中/关闭/焦点，原Figma坐标及0.1容差未改、最终五锚点误差0。回读87/87首试报告及原804/811失败记录，未把定向通过冒充完整verify。未新跑Native、Cargo或浏览器，整体仍IN_PROGRESS。
