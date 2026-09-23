# TASK-AGENT-003 验证记录

本轮第一批：Agent 本地图片附件、显式画布原件引用、MCP 真实选择与视口。隔离候选与原工程均通过完整 verify；原工程回传、最新 Tauri 资源及真实识图/MCP 已完成核验。没有 commit/push，不把 dirty 预检描述为正式 SHA review 或发布。

## 来源与当前基线

- ROOT：D:/kk-studio/KK-Studio-2.0；HEAD cf344ddcdf039c6e62aeb9c65106e2a2339c0bb4 加当前未提交候选。
- 隔离目录：C:/Users/Administrator/.codex/worktrees/agent-attachments/KK-Studio-2.0；分支 feat/TASK-AGENT-003-attachments。
- 初始源清单 2234 文件保存在工程外 output/agent-attachments-20260923/baseline-manifest.json。期间 TASK-UI-008 回传，已将其 Design System 1.3 和共享 ComposerTextarea/composer.css 完整纳入候选，4 个共享文件三方合并，无冲突。
- 26 个源码/测试/audit 文件以 evidence/source-manifest.json 绑定当前 ROOT 前版本与候选 SHA-256；这是 dirty 文件基线，不冒充提交差异。
- 上游版本 e6d0911e9d509d00150eaab02f9ca05be94ffc46 与既有 vendor 来源一致，复用附件/localImage 与画布工具协议，无上游整体替换、依赖升级或存储身份变更。

## 执行与证据

Node 24.20.0；Windows/Edge。复用 ROOT 的 node_modules，隔离目录单独构建 vendor/canvas-agent/dist。首次 Node 基线失败原因是缺 vendor dist，补齐后基线 lint/typecheck/356 Node 全过。

- 隔离目录 npm run verify：退出码 0；363 Node、299 browser 全通过，0 failed；lint/typecheck/format/build 通过，UI 159 文件/0 违规，57 任务/29 功能/0 违规。日志 evidence/verify-worktree.log。
- Web：npm run test:ui 先 production build，Playwright 启动固定 http://127.0.0.1:1423 的 Vite preview；不会连接已占用端口或变更用户 1421 服务。
- UI 来源：Design System 1.3 + 既有 Workspace 布局。App → ConversationPanel → AgentComposer → ConversationComposer/ComposerTextarea；App → Canvas → useAgentCanvasView → 现有 controls。画布引用原生选择框为工程补充，复用 Agent 控件 tokens、compact 高度、r10、焦点/禁用规则。共享 composer 内部几何保留 UI008。
- 浏览器覆盖：本地图片、明确画布引用、原件传输与 metadata、失败保留、API 隔离、严格批次、恰好 8 MiB、最多 6 张、第 7 张阻断、缺失/损坏原件、项目/模式 ABA 迟到读取、MCP 多/单/空选择、真实变换与重开恢复。既有 390/768/1920 同态截图与无溢出断言继续执行。
- Native：npm run client:build:agent -- --no-bundle；node scripts/audit/check-agent-attachments-desktop.mjs --real。临时 --data-dir 和 WebView profile，http://tauri.localhost/，通过 CDP 9345 读取真实窗口。记录 EXE 与实际加载 JS/CSS 的 SHA-256，逐字节比对 dist；只回收自有实例，外部 17381 Agent 保持可用。UI008 合并前的真实识图与 MCP 证据存 evidence/pre-ui008，最终原工程证据追加于下方。
- 真实识图使用两张明确的测试图片，上传与归档原件 SHA-256 和发出的附件相符；Codex 实际回复形状/颜色，无图片生成或编辑验收替代。

## 失败与修复记录

附件空数组与未支持视图操作的红测保存在工程外 agent-red.log；真实 MCP 发现上游 viewport 字段为 k、内部为 scale，保留 desktop-protocol-red.json 与 viewport-protocol-red.log，边界转换后通过。第一次完整检查暴露 Canvas 超过 300 行，按职责提取 CanvasProps；随后格式门禁修正。旧浏览器测试有两个重复 alert，显示去重后通过；另两项仍断言旧版附件禁用，按本轮规格改为可添加并补强断线草稿/API 隔离断言，未跳过测试。

独立预检 R1 严格批次失败仍可提交、R2 A→B→A 接受迟到原件、R3 base64 padding 导致 8 MiB 误拒绝均已修复；单测、真实浏览器回归及 reviewer 只读编译代码故障注入复验关闭。详见 review.md。完整通过后截图发现新 select 使用系统小尺寸，补入既有 Agent 样式；最终原工程 verify 包含该样式补修。

## 交付边界

Agent 图片草稿是按项目的页面会话状态，刷新恢复不在本轮；归档素材继续持久保存。文件名进入消息文字，画布引用保留结构化元数据。参考图编辑、站内工具、TTS/视频、其他登录适配、通用第三方 MCP 和逐厂商付费生成仍未完成。现有工程可运行和本轮验收不代表所有总清单、Hosted CI、PR、安装包发布或用户视觉验收通过。

## 原工程最终核验（2026-09-22T17:42:27.585Z）

状态：DONE/PASS（本轮范围）。原工程 npm run verify 退出码0，363 Node/299 browser全通过，UI159/0、57任务/29功能0违规；完整日志 evidence/verify-root.log 与 browser-results.json。最后 select 样式补修包含在此次运行中；web-agent-390/768/1920.png 与 web-attachments.png 是当前 production preview 截图，已人工查看390与1920关键状态，无裁切/溢出。

原工程 npm run client:build:agent -- --no-bundle 退出码0，Rust保留5个既有未使用代码warning；桌面 audit --real 退出码0，4项检查通过，errors=[]，外部17381服务前后均可用。新EXE SHA-256：baeb95a434a3f9713241e66332213fb94fb52c4aa6037c2cdd530fde0d526879。

实际加载资源：
- /assets/index-Cs6rrqdp.js：74eb349380bdd43c7cd39af17f19097b98951cb26b9b68cd0f3d6f60e4fff047
- /assets/index-mFIdX-t1.css：9a4bb8365f1fe793c5eaf72c7425fe68508eef02fe1cdcbce9af1b300cdad88a

两张测试原件随用户明确提交发给真实Codex；收到对绿色三角形/橙色矩形、红色方块/蓝色圆形的描述。附件字节哈希、canvasReferences和实际回复记录在 evidence/desktop-real-vision-runtime.json；同态截图 desktop-draft.png/desktop-real-vision.png，发送前失败草稿、发送成功清空、真实MCP操作和重开视口都由当前EXE执行。使用独立临时数据，未接触用户既有项目或登录存储身份。

回传前逐项校验当前ROOT基线及26个受审文件，保留并发UI008；58个文件限定回写，2,277个非本轮输入字节未变，见 evidence/integration.json。历史完成记录另与当前源码核对：522输入中494不变、28属于既有UI008或本轮范围，66个原生/Agent后端/打包输入零漂移；见 prior-claims-recheck.json。旧完整8/7项生命周期证据保留历史含义，没有伪称此次全部重跑。

最终源文件均与独立review manifest一致。全量测试和native构建生成的旧截图/报告/schema按运行前字节恢复，staging保持原样，结果见 evidence/preservation.json。文档收尾后另执行governance/features/format门禁；文档修改不重复调用真实模型。当前操作未创建提交、PR、安装器或发布。
