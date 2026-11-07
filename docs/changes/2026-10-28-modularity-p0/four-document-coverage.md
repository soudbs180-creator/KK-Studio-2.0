# 四份原文的需求覆盖与交付总清单

核对日期：2026-10-28。Owner：root。追踪任务：TASK-MOD-FOUR-DOC-COVERAGE；任务状态以[账本](../../governance/task-ledger.json)为准。本清单记录来源和验收范围，不另立一套架构规则，也不把阅读完成等同项目完成。产品基线c2a0228a，核对候选59a8fd51；不代表origin/main已集成。

## 来源与解释顺序

四份Markdown均已重新从首行读到末行。原目录为用户指定的`C:/Users/Administrator/.gemini/antigravity/brain/ce87a6c0-3893-44ac-a478-19a693f30412`；同名metadata.json是工具元数据，不是第五份需求。完整字节SHA-256、行数、章节索引及覆盖映射见同目录[source manifest](four-document-sources.json)。

| 来源 | 作用 | 如何承接 |
| --- | --- | --- |
| architecture_audit.md（审计） | 原始问题、现有实现、风险、P0–P8初案 | 保留问题溯源；其中过时的契约位置、规则编号和统计不直接实施 |
| modularity_review_and_spec.md（复核草案） | C1–C4纠错；补目录命名、旧文件、模块卡、轻量化和隔离 | 与执行规范逐项对照；切片内单测等被后文修正的条目明确标为取代 |
| modularity_execution_spec.md（执行规范） | §0–20、P0–P8、P3a–f、R1–R8、OPEN与验收 | 原文明确取代前两份；承接其无冲突需求，不能据“取代”丢掉旧需求 |
| standards_and_repo_organization.md（补篇） | 标准现代化A0–A9、仓库整理B0–B13、ORG-0–7、路线对齐 | 与执行规范共同覆盖总范围；不是只读取证据瘦身一节 |

当前用户指令优先，其次仓库AGENTS/AI_RULES；外部文档内部按执行规范及补篇的明确更正处理。现行架构规则路由[MODULARITY](../../architecture/MODULARITY.md)。后续新增规则只在其应属文件定义，本清单只链接和追踪。

## 已确认的修正与未决项

| 条目 | 处理与理由 |
| --- | --- |
| 契约位置、能力依赖 | 用现有packages/creation-contracts，经Port注入；不沿用初案domain/capabilities或capabilities直连integrations |
| 测试位置 | tests/unit平铺；复核草案“切片内单测”已被执行规范§0.3明确纠正 |
| 边界工具 | 保留import-boundaries，新增dependency-cruiser；集合棘轮，不按单纯计数放行 |
| 审计数字 | P0实测R1=405唯一边、R3=10、R4=16环内有向边；原420出现次数、8遗漏、6双向对不同口径，不能直接当当前基线 |
| 同名与溯源 | schema/业务合理配对不合并；已有parentId/origins/promptHash/model不再重复定义 |
| P1与注册表测试边界 | §17-P1要求uses成环/版本不兼容测试，但P1不接运行，跨manifest图环和实际resolve依赖P2；P1须校验结构/局部引用，P2补完整图/兼容解析用例，验收归属明记，不以阶段矛盾静默删测试 |
| P3a依赖 | 执行规范§17“可与P2并行”与§18“依赖P2”矛盾；按具体方案与P0现行规范，先P2再P3a |
| P3f依赖 | 补篇A8明确延至OPT-201设计后合并考虑，不先重复搬迁画布历史实现 |
| 弃用文档归属 | 补篇A3写P0新建，B12明确ORG-1落地；追踪ORG-1及相关协议/插件任务，不能把文件不存在说成已完成 |
| ORG卡含义 | ORG-0是盘点，ORG-1是REPO-LAYOUT/索引/ignore/DEPRECATIONS；证据外置是ORG-5试点及ORG-6推广。用户最近的组合任务保留，但三个阶段分别验收 |
| OPEN-1/6 | 契约包位置及独立Zod补丁已有用户明确指令；不重复询问 |
| OPEN-2 | 用户已授权日志/图片外置并留sha256；迁移仍须可恢复、引用完整、分级及先试点，不能据授权跳过校验 |
| OPEN-3/7 | 旧插件legacy策略与分级运行时尚未定稿/实施；新入口默认拒绝不能被推成旧插件全部拒绝。UI提示须当前Figma依据 |
| OPEN-4/5 | 参考目录先内容diff，死代码工具先只出报告；无实证不删、未执行不标已评估 |
| OPEN-8/9/10 | A2A按真实需求触发；框架大版本先评估；Git历史改写不在当前执行范围。观察/评估条目必须留有结论，不能省略或擅自实现 |
| 外部版本与协议事实 | 补篇明确网络版本未读官方原文；MCP Tasks/OAuth、zod导出、SKILL格式、框架最新版本等需在对应任务查官方资料。本次阅读不冒充其技术事实已复验 |

## 总需求矩阵

状态含义：候选=已实现但未完成整合交付；部分=只有明确列出的子项；未实施=本轮未落地；待核实=不能据旧分析宣称成立；观察/评估=保留决策边界，禁止按“没写代码”自动判失败或已完成。所有行还须遵守下节共同完成条件。

### 架构、能力与兼容（执行规范，含前两份的纠错需求）

| ID | 来源 | 必须覆盖的结果/验收 | 当前程度与剩余 |
| --- | --- | --- | --- |
| G-01 | 审计§0–3；执行§1–6 | 九类模块职责、唯一共享设施、垂直切片/公开入口；不改UI/存储key/旧数据身份 | 规则候选已承接；不是全部实现已解耦 |
| P0 | 执行§11/17；复核C4 | R1–R8、历史基线、故障注入、原检查保留、ADR①②、引用核对清单 | 候选完成且原SHA独审通过；完整verify及main合流未完成 |
| P1 | 执行§4.3/7/17 | capability.ts、ports.ts、公开导出/包版本；合法非法/权限/版本契约回归；五个Port不扩既有语义 | 候选已新增capability.ts及本轮指定Task/Asset/Provider三个Port，包1.1.0，旧wire类型兼容；13契约/独立项目配置与运行探针通过，严格依赖声明的Zod URL限制保留；Storage/Permission另阶段，独审/合流未完成，见[P1验证](../2026-10-28-capability-contract/verification.md) |
| P1-G | 复核C3；执行§17-P1 | 可选capabilityId、check-features与卡片/账本对应，独立治理提交；ADR③草案 | 未实施，已登记TASK-MOD-P1-G；ADR-028草案已建，不能因契约文件完成而漏掉治理字段/卡片与检查 |
| P2 | 执行§7/17 | register/unregister/list/resolve/run；inpaint包装现有链路、Port映射、默认关闭；旧新任务/资产/origins/parentId对拍、DOM零差异 | PARTIAL候选已实现注册器与TaskPort.submit接线；双构建数据/溯源/HTTP/DOM同态通过，各14 pass/1原窄屏fail；严格PNG仍有1像素渲染不稳定，原生/独审/main未验，见[P2验证](../2026-10-28-inpaint-capability/verification.md)。该行描述P2时点；后续P3a已注入原资产AssetPort，见下方逐阶段记录 |
| P3a | 执行§18 | creation↔image-edit：共享类型下沉、Port/props、纯函数归位；对应R4减少 | 源码候选已实现：契约类型统一、AssetPort注入、共享Context为无feature依赖的runtime；ON经inpaint注册器、OFF兼容。完整图阶段16→15；运行/独审/main仍PARTIAL |
| P3b | 执行§18 | agent↔creation：任务/资产Port，类型下沉，组装根回调 | 源码候选已实现：Agent回调由装配根注入，聊天/交付纯函数归domain；阶段15→12，原接口/状态不重造；运行/独审/main仍PARTIAL |
| P3c | 执行§18 | creation↔local-service：StoragePort/快照契约；server-only不进浏览器 | 源码候选已实现：domain纯模型/codec与StoragePort，local-service不反依赖creation；阶段12→10，HTTP重启/备份恢复通过；原生/独审/main仍PARTIAL |
| P3d | 执行§18 | creation↔models：Provider职责归位，旧路径垫片保留一个发布周期、到期任务 | 源码候选已实现：Provider store/vault/锁归integrations；文本事件纯解析解除长环，阶段10→4；旧路径保留并挂TASK-MOD-P3-COMPAT，未正式发布/合流 |
| P3e | 执行§18 | agent↔memory及agent↔prompts两对分别解除；记忆隐私/权限保持 | 两对均已实现源码解耦：MemoryAgentPort显式注入，回复/附件类型下沉，prompts无反向feature引用；阶段4→0；不是只解除一对，独审/main仍PARTIAL |
| P3f | 执行§18；补篇A8 | useCanvasHistory真实实现归位、DOM/交互不变 | 未实施；等待OPT-201设计，防止重复搬迁 |
| P4 | 执行§17 | skills→plugins→models→agent→creation五个目标切片逐卡收敛深层import；基线下降 | 源码候选R1全量367→0，R3 10→0、R4保持0；六卡与ADR-030分别留证，独审/原生/完整verify/main未验。generation-server/assets可选重命名未做 |
| P5 | 执行§9/17；补篇A4/A6 | PermissionPort、清单/受限上下文、越权拒绝、旧插件迁移；与OPT-401同设计 | 部分：OPEN-3选legacy兼容，清单/PermissionPort/受限RPC/验包与Web实验T1已接线；生产门关闭。授权Figma、原生/逃逸面、T0/T2/T3与独审未完，见ADR-031 |
| P6 | 执行§7.4/17 | 每项独立Manifest/适配器/关闭升级回退、原队列、取消恢复与真实回执 | 三卡分别PARTIAL：源代码+ComfyUI工作流+HTTP/Edge预检通过；GPU/API/Native/生产UI/独审/main未完成，共享变更独立HOST卡，见ADR-032 |
| P7 | 执行§8/17 | 已有溯源覆盖与可选兼容、旧项目/导出包/快照 | PARTIAL：既有字段足够，修复不同父/Provider及导入Origins丢失，三端同规则与旧快照回归通过；原生GUI/独审/main待验 |
| P8 | 执行§17 | App仅抽装配hook，JSX/样式不动，DOM/截图同态 | 七组hook源码候选已实现，App2002→1546，35函数及JSX/样式入口不变，固定输入软件Edge四组DOM/PNG同态；独审/完整verify/main仍开放，见[P8验证](../2026-10-29-p8-composition/verification.md) |
| G-02 | 执行§10/13/15/16/附录B；复核§3.5–3.8 | 记忆作用域/隐私；每模块卡13项、回退、版本/兼容、故障/取消/恢复及受影响范围 | 约束已写入架构候选；模块卡全量补齐、逐能力验收尚未完成 |

### 标准现代化（补篇第一部分，不能被P系列或瘦身替代）

| ID | 来源 | 必须覆盖的结果/验收 | 当前程度与剩余 |
| --- | --- | --- | --- |
| SEC-ZOD | K3/A6/A7 | 独立升级、目标漏洞回归、实际运行副本与lock核验 | 1e63b722候选及限定独审PASS，未合流；Agent其余审计问题独立入账 |
| STD-01 | A0/A2 | 一份Manifest生成UI/Agent/MCP/插件/ComfyUI投影；统一错误/PermissionPort；platforms/degrade | 仅方向承接；schema/投影一致性及错误映射未实施。P1/P2须带入这些补充字段/验收 |
| STD-02 | A1/A2/A6/A8 | 保留MCP双版本客户端，版本夹具/Tasks支持核查；服务端接同一能力清单，loopback/token/Origin/白名单/审计 | 未完成对应核实与服务端交付；归并OPT-003/103，不另写第二工具清单 |
| STD-03 | A1/A2 | zod导出JSON Schema，供协议/非TS校验，逐投影对拍 | 未实施；API/方言能力需官方核实，不能把示意当可用事实 |
| STD-04 | A3/A9 | N/N-1主版本、deprecated及移除版本、至少一个发布周期、DEPRECATIONS和旧版夹具 | 架构文档有原则；专门弃用清单、协议矩阵与落地回归未完成 |
| STD-05 | A4 | kk-plugin.json、贡献/冲突/权限/完整性、分级运行时、SDK兼容、安装/更新回退/卸载保留、RPC上限和崩溃隔离 | 未实施；与P5/OPT-401同一设计，不能因为权限接口存在就标插件标准完成 |
| STD-06 | K9/A1/A4/A6 | 当前CSP、shell、Tauri capability和历史插件修复审计；iframe无IPC/同源存储权限 | 待核实，是插件沙箱前置；Worker不自动等于安全沙箱 |
| STD-07 | A5/A8 | SKILL.md格式核实、导入导出、版本/lock/回退；Skill不等于Capability | 未实施；沿用OPT-302，外部Skills内容不默认捆绑 |
| STD-08 | A1/A8 | ComfyUI API JSON+参数绑定、模型依赖/图版本、HTTP/WebSocket映射9态 | 本轮未交付；与OPT-101/102复用同一出图链 |
| STD-09 | A1/A7/A9 | 逐项依赖收益/许可/兼容/回滚评估；React/Vite/TS大版本只评估；Node类型对齐运行时 | 仅Zod有实施证据；其他升级/评估未完成，不能根据旧outdated直接升级 |
| STD-10 | A1/附录OPEN | A2A、OpenTelemetry、Responses和Wasm的采用触发条件/观察结论；无需求不预做 | 观察/按需，未形成逐项最终决策；不得为凑清单实现新协议 |
| STD-11 | A8/A9 | 与OPT路线同源、共享文件单一写入者、PROTOCOLS/PLUGIN-STANDARD及相应ADR | MODULARITY已有概括映射；两份专门文档与完整依赖挂接未完成。对齐不代表OPT-001…404全部已完成/自动新增产品授权 |

### 仓库整理（补篇第二部分）

| ID | 来源 | 必须覆盖的结果/验收 | 当前程度与剩余 |
| --- | --- | --- | --- |
| ORG-0 | B6/B12 | 跟踪清单、引用图、registry/门禁依赖、分支树、根文件及参考目录内容比对；可复跑 | 部分：外部inventory/引用/归档清单已有；新增目标位置内容比对165份仓内/9份容器文件，原字节与LF均无等价副本，均保留；其余盘点闭环待补，不能标全盘点结束 |
| ORG-1 | B1–B8/B12 | REPO-LAYOUT、索引、ignore加固、DEPRECATIONS骨架；元数据和退役路径 | 候选已建立REPO-LAYOUT/DEPRECATIONS、索引与ignore；配置/治理/索引/链接和快速三门禁通过，仅自审且未合流。与迁出证据分别验收 |
| ORG-2 | B9.3/B11/B12 | 根白名单、禁入类型、图片200KiB、文件位置/ASCII/备份及存量棘轮；故障注入 | 门禁候选已接治理入口，初始640条历史命中经ORG-5收缩至578，9项故障注入及快速三门禁通过；仅自审、未合流。不是存量清零；见[本卡验证](../2026-10-28-repo-layout-guard/verification.md) |
| ORG-3 | 执行§12.3；B12 | TEST_READY/TEST_INFRA等引用和内容核实后逐项处理；保留receipt/启动器 | 仅候选清单，未实施退役；候选不等于可删 |
| ORG-4 | B8/B12 | docs/reference、docs/superpowers与容器逐份diff、等价迁移、引用修复 | 目标位置逐份hash已查，165份无等价副本；未迁出，不盲迁 |
| ORG-5 | B9/B12 | 单包E1/E2/E3试点，先校验门禁认可方式、真实副本/hash、manifest、历史引用及恢复 | 单包候选已迁62日志1357699B，源/Git/容器及新目录恢复全匹配；32历史链接转清单，PNG/JSON/E1保留，历史断链86→86无新增。新增SHA校验器；独审/主线整合未完成，见[验证](../2026-10-28-evidence-pilot/verification.md)。先前1292份副本其余尚未迁出 |
| ORG-6 | B12/B13 | 试点通过后逐包/月推广；每批实际前后体积与引用/恢复验收 | 未实施推广。全量估净64.5%仍只是准备测算；ORG-5任务树首包毛量迁出1.36MB，主线减量仍0。不能把副本或首包算作全仓70%完成，也不硬凑目标 |
| ORG-7 | B10/B12 | PR/合并/SHA/dirty逐项核实、分支-SHA清单、已合并分支/树回收，保护main/master | 本地/远端113/7分叉及树已审计，实际整合/清理未完成；复用TASK-GOV-004 |
| ORG-X | B2.6/B6.3/B9.4/B13 | vendor各子目录UPSTREAM固定SHA/许可/补丁/同步；大fixture用途；死代码/包体报告；前后指标 | 未全面核实/补齐；不能用vendor根README替代每目录要求。releases保留/分享白名单也要有范围证据 |

## 完成判定及后续执行

最近用户列出的5项是优先实施批次，不是上述总范围的全部。前两份是有明确修订关系的审计和草案，不是再做四遍同一实现；每个无冲突需求保留来源，发生取代/延后/观察时写明依据。任何整顿项都不能仅因为MODULARITY文档写完、P0门禁存在、Zod升级或证据已复制就标为全部完成。

每项报告分别给出：需求来源→对应任务/功能卡→实际base/head及影响文件→适用检查/运行回执→审查/主线合流/回滚→剩余缺口。只有当前项完整验收才能关闭；所有必做项关闭、观察项有明确决策、待决项有处理结论之后，才可讨论整套交付完成。不使用未定义分母的“总体完成百分比”。

执行顺序继续遵守P0→P1→P2及ORG试点→推广；本次先修复需求追踪缺口，不改变产品代码、UI、依赖或原始四份文档。用户最新禁止子代理；本清单由主代理直接核对，自审不标独立审核。禁止为了满足审查文字再次启动子代理。

## P0后续检查点：2026-10-28

上段“本次不改产品”描述最初需求追踪卡，不限制后续已授权修复。本轮候选修复任务关闭伪元素越界及429健康等待项目保存的问题，完整调度15项与面板命中2项通过，保存邻接4通过/1几何失败。Desktop/Web源码2.1.46，主线及安装客户端未更新；详见[本轮验证](../2026-10-28-provider-browser-contract/verification.md)。P0完整verify、独审/main整合仍开放，不能启动宣称P1/P2已完成；P1/P2仍未实施，其他矩阵行的交付条件全部继续适用。

2026-10-28追加：保存几何失败定位到折叠侧栏旧width:auto将HUD容器缩成0。候选源码Desktop/Web47；保存6项及同宽reload通过，邻接30项27 pass/3 fail，HUD旧取消裁切另有开放任务。完整verify/P0/ORG/main仍未完成，P1/P2仍未实施；四文档其他行状态与完成条件继续有效。

2026-10-28用户明确启动P1后，本轮仅契约候选按新优先级推进，P0/ORG与父分支门禁未关闭。当前包1.1.0及三个Port有独立安装、类型/运行与根/Mobile回归证据；P1-G、严格依赖声明限制、其余Port与P2/STD/ORG仍分别追踪，不将单一子项称为四文档完成。

2026-10-28 P3最终补验：P3a–e 源码候选：契约包1.3.0、Desktop/Web2.1.49、Mobile2.1.43。完整图R4由16降0，R1由405降367，其余规则无新增；212个迁移函数体AST一致、六份UI JSX结构一致，纯核心/infra/runtime无间接feature依赖。根2354通过/20跳过/0失败，Mobile373与Agent204通过（Agent另2跳过），根/契约/Mobile类型通过；Edge双构建各3/3通过，任务/资产/HTTP/DOM同态且4张PNG SHA完全一致。核心浏览器原9失败保留：8项在父P2错误和位置逐项一致，另1项为P2已有窄屏HUD失败。P2 flag仍默认关闭；独审、Tauri/真实Provider、完整verify和main整合未完成，五阶段分别PARTIAL。P3f、P4–8及STD/ORG等四文档其余任务继续开放。 逐阶段记录见各TASK-MOD-P3A…E变更包，不将五阶段候选等同四文档全部交付。

2026-10-29更新：P4全量R1=0、R3=0、R4=0（六张分目标卡）；P5契约1.4、权限/验包/RPC和Web实验T1已实现，生产门默认关闭，legacy兼容有宿主权限。完整交付仍PARTIAL，其他P/STD/ORG不因本次推进自动完成；取舍与限制见ADR-030/031及本次七份变更包。


2026-10-29 P6/P7任务树候选：Desktop/Web2.1.51、契约1.5.0、Mobile2.1.43。独立扩图/修复/分层Manifest+ComfyUI工作流经原队列保存、执行、归档和重载；独立禁用与1.1实际执行/回退1.0通过。P7规范化原有PromptHash/ParentId/Origins，保留同字节不同父/Provider及导入来源，TS/Rust同规则。根2372 pass/20 skip、Mobile373、Agent204 pass/2 skip、Rust资产18、生产Edge17项通过；运行限制/源码构建hash见[共享验证](../2026-10-29-p6-image-host/verification.md)。三项能力和P7均PARTIAL，真实GPU/API、Desktop原生/GUI、独审、完整verify/main未完成，无生产UI新增。P2/P5生产门状态不变；原9个核心浏览器失败/1像素差异未归零，四原文其余任务不因本次推进自动完成。


2026-10-29 P6.1候选：Desktop/Web2.1.52（Mobile43/契约1.5.0不变）；本机ComfyUI扫描、隐藏托管与双态工作流卡片已接，归属WS/history经AssetPort归档并落图连线。修正代理502、Windows Python别名子进程泄漏及画布边未持久化；隔离Native夹具双client/原件SHA/结果边/重开/停止通过，原生编辑器为键盘提交，鼠标未验收。真实GPU/完整编辑器、卡片参数面板、Figma04/05、独审、完整verify/main仍未完成，PARTIAL；用户要求停止桌面控制，后续浏览器与命令行。P6.2–4及P7原候选不回退，四原文其余项不自动关闭；见[本轮验证](../2026-10-29-p6-1-comfy-canvas/verification.md)。

2026-10-29 P8续修：App装配源码已实现，交付底座与聊天修复获限定增量独审，根2405通过/20跳过及限定浏览器通过；最新58模型草稿内容同步修复验证中。默认origin/main三项首建基线、远端113/7分叉、完整901浏览器和独立目录安全缺陷继续开放；P3f/STD/ORG等原矩阵不批量关闭，真实GPU/最终Native GUI未验收。最新源/验收状态见P8验证与任务账本，不使用单一百分比。
