# 模块化、能力契约与渐进整顿

- docId: MODULARITY
- status: current
- updatedAt: 2026-10-28
- source: 用户提供的模块化执行规范及补篇；[复核规格](../changes/2026-10-28-modularity-p0/spec.md)
- supersededBy: null

本文承接外部执行规范§1–16及补篇的架构要求，替代早期架构审计/评审草案。原分析目录标识为`ce87a6c0-3893-44ac-a478-19a693f30412`；当前规则以后以仓库版本为准。入口与授权遵循[AGENTS](../../AGENTS.md)、[AI_RULES](../../AI_RULES.md)，本文不扩张权限。FACT须有源码或命令证据，INFERENCE/UNKNOWN/CONFLICT分开记录；OPEN不得当作已实施决策。

## 目标与不变量

采用模块化单体、稳定能力契约、能力内部工作流和可替换适配器。复用现有任务队列、资产仓库、Provider、插件系统、Agent与记忆服务；不能再建第二套。公开契约变更必须版本化并提供兼容、迁移和回退方案。

本整顿不改变Figma视觉、布局、令牌、控件尺寸、交互和功能入口。仅调整组件导入也须有同状态DOM/截图证据。旧项目、原图、对话、插件、记忆和历史任务应原样可读，存储key不变；旧数据缺新增可选字段视为未知，读时兼容，不自动回写。具体数据与UI保护仍以现有规范为准。

## 模块与落位

| 层         | 位置与职责                                                                                                        |
| ---------- | ----------------------------------------------------------------------------------------------------------------- |
| 跨端契约   | `packages/creation-contracts/`：纯类型、zod schema、Port、任务/资产/事件/错误协议；不依赖React、Tauri、网络或存储 |
| 领域       | `src/domain/`：Desktop/Web纯模型、纯函数、fixture；保持现有domain保护                                             |
| 功能       | `src/features/<kebab-name>/`：垂直切片，对外只经`index.ts`                                                        |
| 能力注册   | `src/features/capabilities/`：注册、解析、分发；仅依赖契约包和本切片，不拥有队列、状态、存储或算法                |
| 外部适配   | `src/integrations/`：Provider/外部服务/系统Port实现，不依赖features/components                                    |
| 展示与装配 | `src/components/`只消费公开hook/props；App及其装配hook注入真实实现，不把业务算法写入UI                            |
| 平台       | `src/runtime/`浏览器边界，`src-tauri/`原生壳与IPC；Mobile独立工程，只通过可版本化契约共享                         |
| 治理与测试 | 规则/基线在`config/`，治理脚本在`scripts/governance/`；单测/契约测试在`tests/unit/`平铺                           |

目录四象限、证据、参考、vendor归属按[AGENTS](../../AGENTS.md)，产品不得依赖容器绝对路径。vendor修改必须保留上游许可、固定SHA、补丁清单和同步步骤；不得静默覆盖。新脚本进已有子目录，新增证据名用ASCII、不含空格；存量不批量改名。

命名沿用现状：切片kebab-case，普通模块camelCase.ts，组件PascalCase.tsx，hook为useXxx.ts，schema为xxxSchema。Adapter/Port/Registry/Store/Schema/Host各有明确职责。组件规模与health棘轮按[编码规范](../engineering/CODING-STANDARDS.md)，不为凑行数机械拆分。

## 自动边界与基线

| ID  | 规则                                                                                                            | P0实测唯一依赖数                             |
| --- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| R1  | 所有切片外调用者只能访问目标切片根index.ts；切片内部导入不受此条限制                                            | 405（原文420是引用出现次数）                 |
| R2  | features不得反向依赖components                                                                                  | 11                                           |
| R3  | integrations不得依赖features/components                                                                         | 10（原文8漏了两个models导入）                |
| R4  | 不新增feature有向环；每条处于任意有向环的切片边都纳入比较                                                       | 16（8切片强连通分量；6对双向边不是完整口径） |
| R5  | capabilities仅依赖自身与creation-contracts                                                                      | 0                                            |
| R6  | domain只依赖src内本领域；creation-contracts不依赖任何宿主src（含styles）；两者均不依赖React/Tauri或Node系统模块 | 2（已有domain→runtime特许，保留旧检查）      |
| R7  | 实际插件源不得直连宿主src；宿主加载器、SDK/host不是第三方插件                                                   | 0                                            |
| R8  | 新增业务源码模块不得同名；index/环境声明豁免，domain/schema与feature/逻辑配对须文件头互指                       | 0                                            |

规则见`config/architecture-rules.cjs`，基线见`config/architecture-baseline.json`，入口见`scripts/governance/check-architecture.mjs`。保留既有`import-boundaries.mjs`。新检查由`check-governance.mjs`调用，因此governance、lint、verify都会执行。

依赖身份为规范化的`from => resolved-to`，去重且不含行号。比较集合，不能只比较数量；替换成另一条违规也必须失败。R4在切片聚合图上检查路径可达性，覆盖多节点长环和原强连通分量中新边。

候选违规集合必须是候选基线的子集，候选基线必须是Git base基线的子集。减少时提示删除已解决条目，只允许下调，不允许扩容或用同数量替换。基线缺项、重复项、count不一致、损坏配置、未解析内部依赖均失败关闭。初次建立基线时产品源码须与所选base一致，不能夹带重构来扩大白名单。

Git比较基线按`ARCHITECTURE_BASE`、`GOVERNANCE_BASE`、本地main、origin/main顺序选择；CI应显式提供当前PR base。当前本地main与origin/main分叉，P0仅对本地c2基线负责，不能伪称远端已整合。Type-only、import type query、re-export、动态字面量、require、别名和TS扩展名替换均有故障注入测试。产品源即使位于名为dist的子目录或使用test-like文件名也照常扫描，不能按名称从依赖图排除。

禁止跨模块读取对方私有localStorage/IndexedDB结构；由所属切片公开受控读取接口。新增能力组合用能力ID依赖解析，不互相深层import。

## Capability与Port契约（P1/P2/P3源码候选）

P1增加业务声明与Task/Asset/Provider Port；P2增加默认关闭的注册器/inpaint派发；P3契约1.3.0统一既有类型、MemoryAgentPort与StoragePort。旧wire.CapabilityManifest保留；协议投影与PermissionPort未实施，严格依赖声明限制仍见[P1规格](../changes/2026-10-28-capability-contract/spec.md)。P3候选R4=0，不将源码候选当作原生、独审或main完成，边界见[ADR-029](adr/ADR-029-feature-cycle-decoupling.md)。

契约只定义已有行为的最小接口，不借Port扩展语义。实现由App装配层注入，P2前须提供“Port→现有函数”对照表。

| Port           | 职责                                               |
| -------------- | -------------------------------------------------- |
| TaskPort       | 提交、订阅、取消、重试、恢复现有CreationTask       |
| AssetPort      | 按ID读原件、写结果及现有来源/父子字段              |
| ProviderPort   | 按能力解析模型/资源、发起调用                      |
| StoragePort    | 受控项目/快照持久化，不让浏览器引入server-only实现 |
| PermissionPort | 统一入口权限判断                                   |

Manifest必须定义：稳定能力ID、semver版本、名称、builtin/plugin/workflow类别、输入输出schema引用、权限/模型特征/资源、适配器ID/类型/优先级/兼容范围、进度/取消/恢复/时间预算、原素材角色与结果关系、uses依赖、fallback、启用状态和功能卡路径。能力ID形如`image.inpaint`、`image.layer-split`，发布后不改名不复用；适配器ID形如`image.inpaint/comfyui`。

注册表提供register/unregister/list/resolve/run；注册时校验版本、权限、uses无环和卡片。非法manifest拒绝并记录原因，不影响宿主。run通过TaskPort创建任务并返回任务ID，不持有另一套运行状态。Agent工具与按钮从同一清单派生，同输入须产出同构任务和资产；禁用/缺失能力有明确原因，既有数据不删除。

适配器只负责请求翻译、进度映射、错误归一、取消与兼容声明。选择按约束、优先级和资源可用性；回退必须写任务事件。每个能力有schema正反例、适配器产物对拍、取消/失败恢复与回退测试。修改影响收敛到该能力、适配器、测试和功能卡；共享层确需改变时另立任务。

## 任务、资产、记忆与版本

任务沿用已有[9态与恢复契约](../../packages/creation-contracts/taskState.ts)，不增减状态。资产写统一仓库，沿用parentId/origins/promptHash/model；溯源扩展必须可选且读时兼容。画布、收藏、标签和分组只引用资产ID，不复制原件。替换适配器不得改变旧资产读取结果。

记忆按user/project/task作用域独立，遵循[MEMORY-CONTRACT](../MEMORY-CONTRACT.md)。完整文件不入同步、localStorage、日志或导出；已授权请求的相关片段注入边界仍按原契约。

能力、契约和插件apiVersion采用semver。破坏性变更需主版本并存、兼容/迁移说明与到期任务；目标支持N/N-1主版本，旧测试至少保留到正式下线。数据只记录能力ID/版本/参数；没有需求的协议不预做。

## 协议与插件现代化方向

内部一份Capability Manifest，UI、Agent、MCP工具、插件贡献和ComfyUI绑定由注册表只读派生；不能分别手写业务清单。统一错误与权限经Port映射，协议适配在边缘，不进domain/契约核心。跨平台声明可用范围与降级原因。

- MCP：保留既有客户端，先核实实现版本和一致性夹具；服务端与OPT-003/103共用清单，loopback、token、Origin校验、工具白名单与审计。协议Tasks/OAuth细节须读官方规范后确定，不按外部报告的版本号猜。
- JSON Schema：评估从已用zod导出schema，核实实际API，不另建手写schema真源。
- ComfyUI：与OPT-101/102共用API工作流JSON、参数绑定、模型依赖、图版本和HTTP/WebSocket进度，不重复接线。
- Skills：保留现有manifest、只读权限和密钥扫描，按OPT-302评估SKILL.md兼容、锁定与回退；Skill是方法说明，Capability才是执行能力。
- A2A、OpenTelemetry、Responses及其他协议族：只有真实需求才实施；外部版本信息必须复验。框架大版本只做评估，不夹带升级。

插件权限与包格式必须与OPT-401使用同一设计。目标清单含id/name/version/apiVersion/宿主版本范围/平台/trust/runtime/entry/contributes/permissions/integrity；来源签名另议。ID冲突拒绝安装，未声明权限默认无权限，完整性失败拒绝加载，清单不含秘密。权限初稿为canvas:read/write、ai:generate、asset:read/write、storage:own、network:<host>、filesystem:read，保留Skill只读兼容。

目标分级：T0声明式、T1 iframe UI、T2 Worker计算（Wasm观察）、T3外部MCP进程，builtin受信插件单列。**这不是现有插件已隔离的声明**：实施前审查CSP、Tauri capability、历史插件修复和SDK兼容。Worker本身不构成网络/权限隔离，隔离与受限RPC需安全评审。旧插件兼容策略OPEN-3尚未落地，不能擅自拒绝所有旧插件。

生命周期：发现→schema/版本/平台校验→权限授权→完整性校验→可回退安装→启用/运行→更新失败回退→禁用/卸载。卸载不得删除已有资产/项目；数据保留/删除由用户明确选择。RPC须超时/大小上限，插件存储按ID隔离。新权限提示涉及UI时先走Figma流程。

## 执行顺序、文档与清理

P0基线→P1契约→P2局部重绘试点（包装现有逻辑、默认关的开关、旧路径保留）串行。P3a依赖P2；其余循环逐对单卡；P3f与OPT-201设计合并考虑。P4按skills→plugins→models→agent→creation收敛公开入口；P5权限依赖P1和OPEN-3；P6逐能力核实已有实现、建卡、接适配器；P7只补溯源兼容；P8只抽装配hook，不改JSX/样式。

与[优化路线](../changes/2026-10-26-kk-optimization-roadmap/roadmap.md)同源立项，不并行重写MCP、ComfyUI或插件包格式。每卡复用适合的现有任务树，不能混入他人dirty树；通过门禁后按实际合流条件整合回收，不能因为“即时合流”绕过审查、冲突或未验证门禁。

快速门禁为typecheck/lint/npm test，合流前完整verify。开发端口1421，生产浏览器预览1423，Desktop/Web分别验证；fixture不替代真实Provider回执。当前规范和工程流程只定义一份，功能卡/registry/账本保持一致，生成视图用脚本更新，新增文档进入索引。跨模块本卡使用完整变更包，小改豁免按AI_RULES。

整理先登记候选、检索源码/脚本/CI/测试/registry/ledger/文档/门禁引用，确认用户数据和历史证据保护后另卡处理。receipt及启动脚本有真实引用，保留。参考目录需内容diff；死代码工具仅出报告。证据E1/E2/E3分级、外置manifest、200KB新增图片门禁与仓库布局ORG卡属于后续工作，不能声称已启用；OPEN-2/4保持默认不迁。Git历史改写不在授权范围，必须另行明确授权。

依赖升级须有具体收益、兼容/许可/回滚与独立任务。高复杂度通用能力优先成熟开源适配。外部zod安全公告与“最新版”表未经本卡复验，不据此升级。每卡报告影响范围、当前证据、风险与回退；失败保留原始日志，未知事实先查证。

## 四份原文的覆盖与授权更新

完整来源、修订关系和逐项交付边界见[四文档总清单](../changes/2026-10-28-modularity-p0/four-document-coverage.md)。前述OPEN-2默认不迁是P0当时的边界；2026-10-28用户已授权证据外置及sha256清单，实际迁移仍须ORG-5试点/ORG-6推广的引用与恢复验收。补篇platforms/degrade、统一错误/投影、专门文档、vendor治理及ORG事项均须追踪，本文概括不代表已实施或全部验收。最近五项只确定优先批次。
