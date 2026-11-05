# Verification：生产接线续作

- Task ID：TASK-E2E-WIRING-20261104；记录状态：IN PROGRESS；日期：2026-11-04；交付包角色：current。
- cwd：D:/kk-studio/KK-Studio-2.0；branch：codex/TASK-E2E-WIRING-20261104；base/head：6719c6d1 + dirty。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Review](review.md)。

## 实现范围与剩余项

- P0：scoped memory V2、显式驱动/CAS、保留 V1 原件的原生迁移、memoryService 级联检索与 Agent 请求前注入已接线，本体检查已接实际工具调用。专用分域记忆管理界面仍待完成。
- P1：五种共享控件已有业务调用；四处扩展插槽、设置启停、网关恢复队列、Agent 路由/授权/执行/状态广播已有实际入口。聊天回滚、StagePlanDetail 完整流转、完整 Figma 双端复核仍待完成；逻辑隔离不等于操作系统沙箱。
- P2：数字引用已在生成命令及 Agent 请求前校验并映射真实素材 ID，缺失引用拒绝提交。TokenizedComposerInput、画布双向绑定、34 操作与 floorplan 待完成。
- P3：阶段 3 committed/dirty 候选已三方吸收，移除 useLocalGeneration / DemoRunButton，音视频任务接真实协议与原件归档；源树保留。分镜、光学与客户端切镜待完成。
- P4：harness 仅数字引用解析改为生产转出，其余内联替身待替换。整体 PARTIAL。

## 本地验证

日志根 `D:/kk-studio/output/logs/e2e-wiring-2026-11-04/`，证据根 `D:/kk-studio/output/e2e-wiring-2026-11-04/`。当前 `6719c6d1 + dirty`；文件散列不能替代最终提交 SHA。

| 证据 | 结果及边界 |
| --- | --- |
| `typecheck-8.log` / `lint-8.log` | 当前类型检查、lint exit0；代码健康仍有既有 advisory，不代表全部治理债已清零 |
| `unit-6.log` | 2666 total：2646 pass、20 skip、0 fail；吸收后两个旧“音视频未接入”断言按真实模态契约修正，保留无授权模型和非法模式拦截 |
| `build-4.log` | 阶段 3 吸收后构建 exit0，有大 chunk 提示；其后引用/回执修改须重验 |
| `e2e-1.log` | 312/312；仍含 harness 替身，不能作为六支柱实际验收 |
| `rust-test-3.log` | 313+25+19+26+41 = 424 pass、1 ignore、0 fail；原生合成协议/存储测试，不是付费服务联调 |
| `browser-agent-1.log` / `browser-controls-1.log` | 生产 bundle Agent 15/15、设置/工作台 27/27；后续代码变化需最终回归 |
| `browser-media-1/2/3.log` | 26 pass/7 fail → 窄屏按实际 portal 定位后 11 pass/2 fail → 保留断言并等待实际持久化后两个迟到删除/撤销场景 2/2；整组合并重跑待做 |
| `media-native-partial-1.log` | 84/84，覆盖 HTTP 408 防重复 POST、部分视频实时/重启保持 unknown 与已归档原件 |
| `review-stage3-v2-1.log` | 独立复核 136/136，13/13 散列匹配；只覆盖协议/状态范围 |
| `desktop-1440-verified.png` / `mobile-390-verified.png` | 1421 实际视口 1440×900 / 390×844；首页及局部交互观察，不是完整 Figma 或移动交付验收 |
| `extension-runtime.json` | 实际应用插槽启停、工厂重启与动作有效；扩展内容为合成探针，非外部插件兼容性验收 |

两树保全见 `preservation-192733`、`preservation-205228`；吸收收据 `stage3-merge-candidates-v3/applied-receipt.json`。未清空用户资料；现有浏览器配置出现项目读取保护，隔离测试与用户资料分别记录。

## 待验收

`verify-3.log` 对上一版候选完整通过；其后的记忆管理接线须重新验证。当前源码 Desktop release/进程身份、真实付费 Provider、main 合流和源树回收仍待完成。审美检查器已解析真实 CSS，但当前诊断为 advisory，须按 Figma 逐项复核，不能记为九轮审美全绿。

## 续作验证收口与下一切片

- `verify-1.log` 完整浏览器暴露 20 fail / 912 pass / 1 skip；原记录保留。实际修复：首页添加按钮恢复32可见框、设置返回40、音频草稿恢复7500而发送前4000校验保留、已保存任务切换聊天后继续执行但冻结原聊天/源节点身份。任务面板测试改用明确持久化的暂停任务；旧演示生成、2K视频和32命中区假设按实际生产契约修正，保留归档、首尾帧、命中和焦点断言。
- `task-origin-red-1.log` 3 fail → `task-origin-green-1.log` 24/24；`browser-origin-1.log` 8/8；`browser-audio-draft-1.log` 1/1，含4500字符保留且不POST；`browser-fixes-1.log` 102 pass，剩2后经前述定向关闭。
- `verify-2.log` 被 SettingsPanel 301行门禁拦截；将原侧栏等价提取为 SettingsSidebar，保留原DOM/选择/锁定逻辑，没有调高门槛。
- **`verify-3.log` 完整 exit0**：单元2670总计/2650 pass/20 skip；Agent204 pass/2 skip；UI308文件0违规；格式通过；生产浏览器931 pass/1 skip/0 fail；设计文档单测41/41与预览浏览器9/9；像素比较在其既有条件下1 skip；开发态四插件集成PASS。跳过不记为执行成功；当前候选仍dirty，整体需求没有完成。
- `e2e-4.log` 312/312。harness 的网关、黏性、扩展、路由、授权、安全、遥测、本体、可解答性、对比度与15画幅已生产转出；其他内联替身仍待清理。
- 独立 root 修复预审：`review-origin-controls-snapshot.json` 14/14散列匹配；独立26/26与312/312，无新增P0/P1或实质回归。随后侧栏提取须随最终提交再审。
- Figma 重认证后旧session被服务判为失效，当前session `e48d1326-f7c0-459a-8a16-670144c2c260`。现行01正式规则2925:368已按行回读；`figma-01-typography-current.json` 明确700标题与Dark660，因此纠正审美规则把700误报为违规的问题。审美仍有282项advisory，非视觉验收。
- 当时下一切片：03记忆管理母版1189:20669增加记忆范围内容行4376:119305（复用1189:20259与489:2860），652×548，32选择器。后续落实见下节。

## 记忆范围管理续作

- 先补齐03母版，再补04桌面4381:63323和05窄屏网页4381:77335；原关闭态和独立手机未接入状态保留。`figma-memory-scope-scenes.json` 记录所有节点，03/04/05截图已目视检查；Source Han Sans CN VF、真实实例和可编辑层，未使用完整UI栅格替代。Figma设计证据不代表本地全页像素一致。
- MemoryService通过同一KkMemoryStore为选定namespace提供读取、提炼、删除、清空、重置；缺适配器直接失败。App沿设置真实调用链传活动项目；session身份与Agent注入一致；自动学习保持原全局契约。旧记录列表DOM独立为MemoryRecordsList，未移除错误/确认/只读限制。
- `scoped-management-red-1.log` 后，`scoped-management-green-1.log` 42/42；`memory-scope-typecheck-1.log`、`memory-scope-lint-1.log` exit0；`memory-scope-unit-1.log` 2652 pass/20 skip。随后UI改动另验。
- 新浏览器测试先确认入口缺失2 fail。green1两项失败为fixture元数据count不一致及CSS触控覆盖；green2剩重载回首页后项目上下文未重新进入的测试前提；分别修正并保留原断言。`scoped-management-browser-green-3.log` 12/12（含既有9项、真实IDB隔离删除/重载、390px 32可见/44热区实点、A→B→A迟到读取）。该结果在最新生命周期修复之前，不作为最终hook证明。
- 独立发现 MEMORY-SCOPE-REVIEW-01/P1：StrictMode effect重放使读取卡住，`review-memory-strict-red-1.log` 复现。修为独立mountedRef与读取revision；`review-memory-lifecycle-green-1.log` 独立验证StrictMode、旧删除回调、卸载后操作及同scope读取乱序。最终散列审核另记。
- 补充开启状态预检：`memory-disabled-preflight-red-1.log` 关闭期间仍发送1次→修复后 `memory-disabled-preflight-green-1.log` 37/37，包含项目与Agent身份不一致拦截及临时会话既有用例。没有调用真实模型或读写用户记忆数据。
- `memory-scope-typecheck-4.log` exit0；最新整套verify重新执行中，不沿用verify-3为新代码验收。

## 结论

整体 PARTIAL。任何阶段不得仅按模块文件存在、纯测试替身或旧证据标为完成。后续命令与日志追加至本记录。


## 2026-11-05 续作记录（尚未终验）

日志目录：`D:/kk-studio/output/logs/e2e-wiring-2026-11-05/`。开工分支仍为 `codex/TASK-E2E-WIRING-20261104`，base `6719c6d1`，含前序 dirty；未清理源多模态树。

- 基线 typecheck exit0、e2e 312/312，但包含内联替身，不能据此验收生产接线。
- 新原子操作定向测试 `canvas-unit-2.log` 3/3，含34项载荷及真实状态/历史、导入防越界、Floorplan真实fixture。该夹具须移入仓内，不以本机参考绝对路径作为CI依赖。
- `targeted-1.log` 37/38 暴露删除后悬空边校验顺序，随后修复；不得删除旧失败日志。
- 独立只读预审发现 Node parameter-property、未等待保存、越界导入、无效持久化、DOM/CSS包装层、历史指纹/分组、锁绕过、JSON回导、真实Floorplan格式等问题，逐项修复中；预审不代表最终独审通过。
- `typecheck-4.log` / `agent-build-2.log` exit0，随后新增接线需要重跑。当前 `typecheck-5.log` 的阶段 submissionState 非法枚举已修，完整门禁未通过；`unit-1.log` 的旧纯函数测试调用新增hook问题通过拆出真实projection函数修复，行数门禁正在收敛。
- 全部新运行链路、外部模型、Desktop启动器、终验与main合流仍未验收。harness 更早R1–R5/UI内联替身的独立检查已发现，不能把这部分说成全走生产。

### 11-05 生产接线与去替身进展

- P1：回滚先持久备份再补偿/截断，使用当前 app-server 的 `thread/revert`（新建 paginated 历史）；旧历史明确拒绝，不伪造文件回退。StagePlanDetail 经三阶段协调器签发 User Mandate 并保存，再依依赖执行真实任务，持久化 sourceNodeId/taskId，unknown 不自动重投；批准参数严格透传，签发前解析唯一模型连接。
- P2：34 项严格 Zod 操作接真实画布历史/保存、锁/分组/尺寸/导航、JSON 和 PNG 导出及 Agent 工具回执；Floorplan 真实参考结构经 Dagre 布局。实时数字引用随参考排序及槽位变化重映射，缺失引用在提交前拒绝。
- P3：模型任务返回结构化分镜，校验资产及角色/服装/场景/道具约束，长原文串行分段，每次任务不超过4000字；分镜入画布并在资产面板投影。光学参数持久化且进入实际提示词。MP4Box/ts-ebml 解复用→WebCodecs 全帧解码→纯领域加权切镜，缩略图实际归档后添加参考卡；取消/失败不伪造结果。
- `tests/e2e/harness.ts` 现仅生产模块 re-export；R1–R5、UI 和跨域场景全部调用生产函数/组件。测试专有环境夹具在 tests/support，未把行为替身移动到生产目录。`e2e-production-1.log` **312 pass / 0 fail / 0 skip**；后续修改仍须重跑。
- `advanced-browser-5.log` **3/3**：生产 bundle 的蓝图导入/节点连线/重载、WebM **135帧**实际解码/切镜/缩略图归档/参考卡、分镜配置缺失的可见失败。HTTP fixture 和本地媒体不等于真实付费服务验收。
- `creative-wiring-3.log` **62/62**；`creative-wiring-4.log` **14/14**，含长原文完整分段、备份失败保护、token用量、生产转出 AST 和原工具回执兼容。最新 Rust package 扩展正在验证。
- ComfyUI 取消统一调用按 job 定向的端点；不支持时仅移除该排队任务并明确报告不能中断，禁用可能误伤他人任务的全局 interrupt。
- `verify-6.log` 发现 4 项旧工具回执严格相等失败：新增空 outputs 数组改变兼容形状，现改为仅有真实结果才附加，14/14 定向关闭。`stage-browser-1/2.log` 暴露测试连接缺字段和阶段未绑定连接，均保留失败日志，修复后由完整 verify 复验。
- 当前仍是 **PARTIAL**：最新完整 verify、Rust 全量、当前 Desktop 启动器与产物身份、正式提交 SHA 独审、CI/main 合流和源树回收未完成。外部 Provider 与真实 Agent 文件补偿未作付费/日常资料验收。

### 后续门禁修复（保留全部失败日志）

- `rust-all-1.log` **428 pass / 1 ignored / 0 fail**（317+25+19+26+41），含画布尺寸/锁、光学、Stage授权/任务身份及用量的项目包往返和非法参数拒绝。
- `verify-7.log` 单元 **2675 pass / 20 skip** 后被旧 legacy 断言拦截；依据当前CLI协议改测 paginated，之后 Agent **204 pass / 2 skip**。`verify-8` 新卡缺栏目、`verify-9` 四组件行数超限，均补齐/按已有职责提取，未抬高门槛。`verify-11` 仅一处格式失败，已格式化。
- `verify-10` 偶发暴露合法项目ID含 `sk-` 被误判。`identity-secret-red-1.log` 确定性复现，按完整凭据边界匹配后 `identity-secret-green-1.log` **21/21**，真实密钥及敏感字段拒绝规则继续覆盖。
- `desktop-stage-2/3/4.log` 保留失败。配置及SSE fixture协议修正后，真实原生任务已成功，但阶段提前被 pending→unknown 错误阻断。`native-pending-red-1.log` 复现，修复为 submitted/pending 保持 running，终态缺回执仍为unknown；`native-pending-green-1.log` **54/54**。
- 生产目录旧 `NonDowngradableWriteBarrier` 明示测试模型现移至 tests/support 并删除生产导出；仅保留原模拟单元用途，不计真实迁移证据。`barrier-test-model-1.log` **40/40**，E2E 迁移使用生产事务。
- 最新完整 `verify-12` 与官方启动器隔离 `desktop-stage-5` 执行中；不得用上一版绿灯代填。

### 最新定向验证

- `desktop-stage-5.log` 实际官方启动器→Native任务→保存/重启/CAS冲突 **PASS**，1920×1080，EXE SHA256 `68151a575e5dd016896f0b57b845b911d8b9af696f9ee4c169b5470a588b2113`；此后输入框修复须再构建复验。
- `verify-12` 旧bundle浏览器出现 token 包装后直系样式失效，输入高度0导致多项同源超时；在确认根因并保留失败日志后停止该轮，记录 `stale-browser-stop-1.log`，不是完整通过。修复共用 textarea 样式/高度计算，无业务标签特判或新模式开关。
- 修复后 `browser-wiring-13.log` **44/44**、零重试：真实MP4两个镜头、WebM拉片、模型分镜入画布/资产、API回滚备份/用量/重载、三阶段执行及语音/焦点/参考缩略图/固定输入区域。`e2e-production-2.log` **312/312**，零跳过。
- `unit-12.log` **2677 pass / 20 skip / 0 fail**；`typecheck-11.log`、`lint-11.log` exit0。新增 `demux-real-1.log` 对真实12帧MP4及135帧WebM解复用通过，核对跨cluster时间戳。
- 媒体夹具来源：`silence.mp3` 为阶段3的100帧 MPEG-1 Layer III 静音数据（128kbps/44.1kHz/双声道），仅测试显式返回；`client-shots.mp4` 为本次浏览器 Canvas/MediaRecorder 自行编码的黑→白12帧 H.264 片段，无第三方内容，生产解析/解码/切镜全部实际执行。CI 使用仓内原件，生成证据在容器 output。
- `verify-13/14` 被媒体来源说明放置位置门禁拦截，现将说明归入本交付记录，没有修改位置规则。最新完整门禁仍待跑通。

- `verify-15` 浏览器 **918 pass / 23 fail / 1 skip**：token包装使原flex子项变成行内textarea，多出5px基线及失去focus规则；修复由TokenizedComposerInput自己的CSS持有，不按业务标签特判。旧help菜单两行→四行及审批不执行断言依据新入口/授权契约更新；保留点击、宽度、窄屏和真实未配置拒绝断言。
- `browser-review-fixes-16.log` **102/102**、零重试，关闭上列23项；`browser-home-media-17.log` **2/2**，从首页选择实际音视频模型，默认参数随真实协议任务提交、审批及归档，没有付费请求。
- `unit-16.log` **2684 pass / 20 skip / 0 fail**，`typecheck-16.log`、`lint-16.log` exit0。最新 `e2e-production-3.log` **312/312**，零跳过。代码健康仍为advisory，未称存量/新增长文件和复杂度问题已全部清零。
- 当前整体仍PARTIAL，最新完整 `verify-17` 执行中，随后将以同一冻结源码经官方启动器重建Desktop。当前无提交、无PR/main合流或工作树回收；远端main相对本地基线落后205提交，完整PR差异与本轮增量需分别核对。

- `verify-17` 因 `vite.config.ts` 未指定 `optimizeDeps.entries` 导致 `vite:dep-scan` 扫描 `src-tauri/target/` 下百余个 codegen HTML 超时；在 `vite.config.ts` 显式限定 `optimizeDeps.entries: ["index.html"]` 后，`verify-18.log` 全量 11 道门禁（`lint`、`typecheck`、`test` 2684 pass、`agent:build`、`test:agent` 204 pass、`ui:check` 0 违规、`format:check`、`test:ui` 977 pass、`test:design` 41+9 pass、`test:pixel`、`test:development` PASS）完整 `exit 0` 通过。
