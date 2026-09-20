# Minimum Usable 2.0 Implementation Plan

本文件是审计后的执行计划，**本轮未实现这些修复，未修改生产环境**。目录名标为“建议新增”的文件不存在于审计基线；其余为真实现有文件。预计工期应在真实Provider和ComfyUI可用性确认后估计，不能从测试数量推算。

## 功能五问与平台归属

所有T0–T11符合当前2.0路线并服务MUR或替换门禁；T12属于路线但不进入当前MUR。T1/T2直接修现有数据模型，不以旧版代码迁移为实现方式。每个新增高级功能若不关闭下面的门禁，进入Backlog。

| 任务 | Primary Platform | 其他平台是否需要 | 旧版参考 | 当前Core复用 | 当前MUR |
| --- | --- | --- | --- | --- | --- |
| T0 发布基线 | Shared/Delivery | 全端发布受益 | 不继承旧架构 | 当前npm、verify、Tauri | 是 |
| T1 安全恢复 | Desktop first / Shared | Web同样需要 | 归档损坏恢复场景 | storage/model/Rust writer | 是 |
| T2 图与ID | Desktop first / Shared | Web共享图；Mobile只投影 | 完整ProjectGraph思想 | canvasGraph/canvasViewport | 是 |
| T3 素材/项目包 | Desktop | Web用IDB/导出适配，Mobile以后 | 旧校验/备份经验 | hash/provenance/schema | 是 |
| T4 图片Provider闭环 | Shared，Desktop先 | Web选定协议，Mobile以后 | 仅参考用户流程 | Provider契约/审批/归档 | 是 |
| T5 持久TaskHost | Desktop | Web保留相同状态契约，宿主不同 | 取消/未知受理经验 | 当前Worker/Repository算法 | 是 |
| T6 ComfyUI最小链 | Desktop | Web/Mobile N/A | 本地模板/模型发现 | Rust scan与新Comfy适配器 | Desktop核心范围；不做全编辑器 |
| T7 桌面发布验收 | Desktop | N/A | 安装/升级经验 | 现有Tauri构建 | 是 |
| T8 Core整理 | Shared | 全端契约 | 不复制旧Store | 已稳定的2.0服务 | Web前置 |
| T9 Web本地版 | Web | Desktop复用Core；Mobile以后 | 仅参考浏览器体验 | UI tokens/IDB/Provider | 是 |
| T10 VPS发布 | Web/Server | Desktop不依赖；Mobile必要API以后 | 旧部署只作隔离/回滚参考 | Node服务可选、Vite dist | 是 |
| T11 旧Web退役 | Web/Delivery | 不删除Desktop用户本地数据 | 仅必要用户数据导出 | 版本化项目包 | 是 |
| T12 Mobile适配 | Mobile | 不复制Desktop复杂工作流 | 重点保留旧Mobile UI/UX | 新schema/services/adapters | 否，前两端发布后 |

依赖顺序：`T0 → T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10 → T11 → T12`。可为前置设计准备材料，但不得以三个端同时补一点代替完成Desktop。基础设施暴露面可以另开一个明确范围的修复单提前处理；不得首轮审计时直接修改生产。

## T0 — 固定可复现的2.0候选基线

- 目标/问题/现在做：当前master、未提交实现、GitHub main、VPS均不同。先给当前实现一个可审阅候选，不然测试与发布无法对应。
- 文件/模块：`package.json`、`package-lock.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`、`README.md`、`docs/PROGRESS.md`、`src-tauri/tauri.conf.json`、`scripts/windows/desktop-release.mjs`；发布manifest与CI属于建议新增。
- 前置：本审计；核查并保留当前工作区全部他人修改，不全量stage、不reset、不擅自把远程main拉入。
- 操作：分组审阅现有diff和新增文件；明确npm唯一lock；刷新陈旧README事实；选择2.0分支/发布提交和原始产物hash；远程关联作为单独可审阅变更。
- 风险：把测试截图、缓存、WebView profile、凭据、临时脚本打进提交；或者发布仅HEAD而遗漏未跟踪核心代码。
- 测试：干净候选checkout `npm ci → verify → client:check → client:build`；安装包启动。核查产物不依赖工作区临时文件。
- 验收：每个二进制/前端bundle映射到commit和版本；仅一个包管理锁；能从干净来源重建相同功能。测试成功仍不自动满足外部Provider验收。

## T1 — 项目读取失败保护与恢复状态机

2026-09-16 实现状态：已完成本地创作快照范围的读取保护、原生备份/CAS 和 Web CAS；故障、恢复、草稿下载及原生运行证据见 `../2026-09-16-desktop-data-stability/verification.md`。不包含整个应用的文件仓库改造或断电耐久认证。

- 目标/问题/现在做：阻断LB-01。读取失败不能转成“可写空项目”；这是继续使用前的数据门禁。
- 文件：`src/App.tsx` 的load/persist/retrySave，`src/features/creation/storage.ts`、`model.ts`；`src-tauri/src/main.rs` 的read/write_creation_snapshot；新增恢复UI只在需要时沿现有Modal/设计tokens实现。
- 前置：T0；不依赖Provider、网络或云服务。
- 操作：区分 missing / loaded / corrupt / unsupported / permission denied；load failure保留原件并禁写；“重新读取”和“另存当前草稿”分开；至少保留一份不可被自动覆盖的已知有效副本；完整schema/revision检查后才写。
- 风险：将所有失败都视为首次空启动；恢复旧revision覆盖新revision；对损坏backup轮转；新恢复UI诱导用户覆盖原件。
- 测试：有效主文件、损坏主文件+有效备份、双损坏、不支持版本、权限拒绝、写盘失败、用户主动另存；注入rename/fsync失败；校验原件checksum不变。
- 验收：本轮`recovery-fault.json`用例不再产生空写；读失败时重新打开应用仍保留源文件；恢复说明给出明确动作且不伪报“已保存”。

## T2 — 完整画布项目模型与稳定节点身份

2026-09-16 实现状态：canvas v1、UUID、项目绑定与当前卡片参数已接线，并完成 A/B 切换、刷新和原生正常退出/重启验收；详见 `../2026-09-16-desktop-data-stability/verification.md`。下一依赖单元为 T3。

- 目标/问题/现在做：阻断LB-02/03。工作台必须保存用户实际编辑，而不只是卡片文字。
- 文件：`features/creation/model.ts`、`domain/canvasItems.ts`、`canvasGraph.ts`、`canvasViewport.ts`；`Canvas.tsx`、`canvas/useCanvasControls.ts`、`useCanvasConnections.ts`、`useCanvasNodeActions.ts`、`useCanvasPointer.ts`；`App.tsx`。
- 前置：T1。
- 操作：节点稳定UUID；模型保存node positions、edges、viewport和实际使用的参数；所有图更新经过项目service；schema版本迁移保留原始快照；对dangling edge/重复ID给出可恢复结果。
- 风险：旧快照没有位置字段；两个同ID旧节点无法无歧义推导连线；切项目迟到回调污染另一个项目；频繁拖动写盘阻塞。
- 测试：创建A/B项目，添加相同kind节点、拖动、连线、缩放、切换、刷新、退出重启；断开/删除后还原；重复旧ID输入；并发写入/多窗口revision冲突。
- 验收：本轮image.x=146在重启后仍146；新增ID无重复；节点/连线/引用/视口完全对应原项目；保存队列有防抖和durable完成反馈。

## T3 — 原生素材库、资产引用和项目包

- 执行状态（2026-09-16）：T3a原生文件仓库、媒体引用编解码、缺失保护、参考附件解析与素材库错误重试已实现；执行记录在`../2026-09-16-native-assets/verification.md`。T3b完整项目包、跨环境导入/另存及缩略图分离仍未完成，因此T3总体保持Partial。
- 目标/问题/现在做：阻断LB-04/09。Desktop原图应由文件仓库保管，项目用assetId；统一大小限制，禁止截断base64。
- 文件：`features/creation/assetRepository.ts`、`model.ts`、`components/assets/useAssetImport.ts`、`nodes/referenceUpload.ts`、`nodes/DemoMediaPreview.tsx`、`src-tauri/src/storage_paths.rs` / `main.rs`；建议新增`features/projects/projectPackage.ts`和平台Asset/File接口。
- 前置：T1/T2。
- 操作：原生asset文件内容寻址+索引；preview与原图分离；Project→Asset引用完整性；文件选择/另存/项目包导入导出；schema+checksum预检后原子提交。Web先保留IDB adapter，等T9全面验收。
- 风险：跨项目共享asset误删；zip路径穿越/压缩炸弹；导入覆盖已存在项目；磁盘满；大小边界导致有效旧素材丢失。
- 测试：真实PNG/JPEG/WebP/GIF；重复字节来源合并；大于16MiB data URL对应的合法资源；超过上限的明确拒绝；导出后迁移到隔离数据目录重开；缺asset/错hash/权限失败/磁盘满。
- 验收：项目包可在另一干净本地环境恢复内容和图；原图hash一致；删除WebView缓存不破坏Desktop原生档案；任何校验/写入失败都不伤源项目。

## T4 — 单一图片生成入口与Provider健康状态

- 目标/问题/现在做：闭合LB-06/08。首页、对话、画布编辑和结果继续编辑调用同一task command，明确真实协议与demo。
- 文件：`App.tsx` executeTask/handleSendMessage、`features/creation/imageGeneration.ts`、`providerRegistry.ts`、`generationQueue.ts`；`integrations/generation/*`；`nodes/CreationComposer.tsx`、`DemoResultNode.tsx`、`useLocalGeneration.ts`；`ModelProviderSettings.tsx`。
- 前置：T3（结果存储可靠）。
- 操作：先固定一个真实图片Provider及模型能力，核对请求参数、参考图和输出格式；将factory或host adapter接入真实产品路径并减少重复协议；新增configured/verified/failure含义；所有入口执行相同连接选择、权限、健康、冷却规则。
- 风险：图像编辑意外路由成文生图；项目固定凭据与当前全局Provider混用；以`/models`成功推定生成成功；受理未知自动重发；日志泄密。
- 测试：真实最小文生图+参考图编辑+结果继续编辑；401/403/429/冷却到期、连接更换、模型不支持、CORS、结果URL过期、部分结果归档失败；请求应固定connection/credentialRef；mock测试与live验收分开记录。
- 验收：三个入口任务都带相同契约，真实结果保存并重开；未验证连接不显示已连接；到期可重新探测；demo不混入正式任务；从未输出/持久化凭据。

## T5 — 本地TaskHost与未知受理恢复

- 目标/问题/现在做：闭合LB-05。应用退出、超时和网络断开不能变成新任务重复计费/生成。
- 文件：`App.tsx`任务逻辑、`features/creation/model.ts`、`generationQueue.ts`；`features/generation-server/repository.ts`、`worker.ts`、`provider.ts`、`schema.sql`；`integrations/generation/jobClient.ts`；`src-tauri`宿主接线/打包配置。
- 前置：T4真实Provider契约明确，T3原图归档可靠。
- 操作：先做短技术验证选择原生任务宿主或随包本地sidecar；复用已测持久队列/幂等/围栏算法；durable intent在提交前落盘；保存providerJobId/输出映射；增加submitted/unknown/cancel_requested等语义；对不支持查询的同步API明确人工核对。Local模式不依赖平台账号、额度或VPS。
- 风险：为了复用managed gateway把本地任务强加信用账本；sidecar未打包Node24；WebView关闭仍被误认为供应商已取消；恢复重复提交；取消别人的ComfyUI任务。
- 测试：提交前崩溃、提交中断、已受理未记录响应、部分归档、取消晚到、重启、Provider不可查询、重复submit和retry；真实进程生命周期；离线本地工作不访问VPS。
- 验收：跨重启恢复同一任务身份；已归档输出不重新生成；unknown不能直接普通retry；UI取消文案与供应商确认一致；Worker生命周期可观测；不会要求系统另装开发Node。

## T6 — Desktop最小ComfyUI链

- 目标/问题/现在做：把Desktop核心方向从目录变为可执行流程。只接一个验证模板，不扩成完整workflow编辑器。
- 文件：`src-tauri/src/main.rs` comfy commands / scan；`integrations/generation/localComfyUiAdapter.ts`与host adapter；`LibraryPage.tsx`、`settings/ConnectionSettings.tsx`、平台capabilities；建议新增`features/comfyui`边界。
- 前置：T3–T5；用户选择的本地ComfyUI目录、可执行服务和模型可用。不存在时给安装/连接原因，不下载模型或猜造workflow。
- 操作：读取system_stats/object_info等实际能力；选择可验证workflow；映射prompt/参考图/必要参数；提交→poll/history→下载输出→原生asset→project；模型权重留在用户目录。
- 风险：模板缺节点/模型；全局interrupt影响其他任务；路径或下载越界；把连通性当生成成功；误暴露给Web。
- 测试：一条真实图像workflow的成功、缺模型、节点错误、断连、取消、已受理未知、程序重启；确认input/output和原图hash。
- 验收：真实结果进入当前Project/Task/Asset体系，重启可查；断网仍可使用本地服务（不把navigator.onLine当本地服务不可用）；Web/Mobile不展示入口且不能取得Comfy adapter。

## T7 — Desktop MUR发布验收

- 目标：让用户可以开始依赖Desktop做基础工作，按report中的D-MUR收口。
- 文件：上述Core与Desktop模块、`tests/browser`、Rust测试、建议新增原生E2E/安装升级验证脚本与发布manifest。
- 前置：T1–T6；若明确延期Comfy，只可发布范围标识清楚的BYOK图片基础包，不能声称Pure Local生成完成。
- 风险：开发机配置掩盖打包缺件；只验证dist未验证release；升级破坏旧快照；签名/下载渠道与版本不对应。
- 测试：干净Windows安装、真实Provider/Comfy、创建/打开/导入/执行/保存/关闭/重开完整故事；断网、磁盘满、损坏数据；完整verify/client检查；产物entry/hash。
- 验收：用户任务完整执行、所有原件可恢复；无VPS依赖的本地操作；没有虚假成本/连接/云保存；候选包与提交对应且可回滚。

## T8 — 成熟Shared Core整理

- 目标：为Web和Mobile复用已稳定业务，不再次搭第二套Project/Task/Provider。
- 文件：`App.tsx`、`features/creation/*`、`domain/*`、`runtime/*`；建议新增`platform/capabilities.ts`、`platform/desktop`、`platform/web`和服务composition root。
- 前置：T7。T1–T6只建立必要小接口；此阶段才系统拆分App。
- 风险：抽象泄漏window/invoke/平台路径；误把RN和React DOM组件强行共用；重构扩大行为差异。
- 测试：共享服务无DOM/native依赖的单测、两个adapter的同一契约测试、Desktop完整故事回归。
- 验收：UI调用业务服务，平台差异在注入层；完整Desktop验收保持；开发文档每feature明确owner/MUR/其它平台需求。

## T9 — Web 2.0本地版

- 目标：关闭LB-10并建立W-MUR；不做Desktop Wrapper的反向镜像。
- 文件：`Sidebar.tsx`、`LibraryPage.tsx`、`GenerationOptions.tsx`、`ConnectionSettings.tsx`、Web能力adapter、`creation/storage.ts`、`assetRepository.ts`、项目包和必要service worker/离线资源策略（建议新增）。
- 前置：T8；明确首发支持浏览器范围并在设备/版本矩阵验证。
- 操作：移除Web Comfy/本地模型/原生设置；IDB为权威，metadata/blob分离，revision冲突和容量处理；持久存储申请及失败说明；标准文件导入导出，FSA检测增强；Provider CORS或受控代理明确选择；会话key不持久化。
- 风险：origin变化丢失可访问性；隐私模式/驱逐/配额；多标签覆盖；HTTP不具备必要安全上下文；代理变成云端文件库。
- 测试：目标浏览器重新打开和清理缓存后的边界；拒绝存储/配额/标签并发；项目包转移；离线打开既有项目；真实Provider和导出；无原生调用。
- 验收：Web完整基本流程与错误恢复通过；原件本地；只有明确操作才远程传输；无Desktop Only假入口。

## T10 — VPS staging与生产架构

- 目标：在自有VPS单独发布Web2.0，保留旧服务直至切换验收。现状旧1.4.5、公开DB/API/Admin、无next Compose配置。
- 文件/模块：建议新增`deploy/compose.yaml`、`deploy/nginx/`、secret模板、health/ready、backup/restore/release/rollback runbook；现有VPS`/etc/nginx`、`kk-api.service`仅在后续明确部署变更中修改。
- 前置：T9、用户正式/staging域名与DNS权限；准备备份和回滚。
- 操作：使用当前Nginx+certbot；独立next服务/版本目录，应用Compose在staging验证；构建在VPS外；DB和内部API仅私网/回环，暴露22/80/443按运维要求；服务端secret注入；有界资源/日志轮转/鉴权/健康/重启/备份。
- 风险：覆盖旧服务/占用端口；1GB OOM；无备份DB；旧API schema被当新Core；公开代理/任意远程下载；不必要的双网关。
- 测试：从外网验证TLS/端口/鉴权/版本；真实Web故事；进程/主机重启；证书续期验证；备份还原；资源压测和磁盘水位；一键回滚到前一个next产物。
- 验收：2.0 staging和生产分别有证据；用户域名直达VPS；不依赖Vercel；内网端口不从公网直达；资源满足测得的初始负载；Desktop本地工作不依赖该服务。

## T11 — 切换与退役旧Web/Vercel

- 目标：完成替换而不是长期维护双生产；旧功能只保留必要的数据导出和回滚能力。
- 涉及模块：DNS/vhost、发布manifest、迁移/导出向导、旧Vercel项目、旧API依赖清单、回滚runbook。
- 前置：T10、已验证旧origin导出/必要数据迁移、有限回滚窗口和回滚触发条件。
- 风险：DNS切换导致旧origin本地数据不可访问；回滚代码不兼容已升级数据；关错旧服务；误删除仍需保留的用户数据。
- 测试：先staging演练导入/导出与回滚，再有限生产切换；验证客户端不再调用旧Functions/API，完整下一次打开项目故事。
- 验收：窗口内真实使用无阻断；用户可获得备份；新入口/证书/日志/任务/结果正常；随后单独停用旧Web/Vercel。没有自动删除数据库/Volume的步骤。

## T12 — Mobile 2.0适配（不进入当前MUR）

- 目标：保留旧移动交互，并把项目/任务/设置/Provider适配到已成熟2.0；先查看与轻量管理。
- 文件：旧`apps/web/src/components/mobile/*`仅参考；建议新增当前工程的`features/mobile`或正式移动应用入口，使用T8输出的core与mobile adapter；不直接复制旧Store。
- 前置：T11；先确认要继承的正式Mobile运行形态（移动Web/Expo），避免将两个旧入口当一个已完成App。
- 风险：把静态mock、旧计费/云优先默认、旧鉴权与provider路由带入；对跨设备本地数据做不存在的自动同步承诺。
- 测试：真实手机safe-area/键盘/Sheet/触控/返回、结果详情、数据本地恢复、凭据、权限拒绝；共享任务状态合约。
- 验收：保留导航/卡片/Sheet节奏；2.0 schema/services/错误模型生效；没有ComfyUI/重型workflow；任务控制只针对实际可访问且获授权的宿主。

## 风险与回滚共同要求

- 所有持久化变更先备份、版本化、校验、用户可见恢复，不用自动空数据覆盖。
- 新任务/Provider故障矩阵中，取消和网络错误不能自动推断供应商未执行。
- 本地审计发现不等于已获生产切换许可；后续先形成可审阅部署产物和回滚路径，再执行对应部署任务。
- 不把平台账户/真实计费/云存储扩大成D-MUR的前置依赖。
