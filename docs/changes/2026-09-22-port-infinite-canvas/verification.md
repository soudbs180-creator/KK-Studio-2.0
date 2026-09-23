# Verification

## 验证命令与结果（2026-09-22）

| 门禁 | 命令 | 结果 |
| --- | --- | --- |
| 类型检查 | `npm run typecheck` | ✅ 0 错误 |
| 单元测试 | `npm test`（`node --test tests/unit/*.test.ts`） | ✅ 251/251 通过（含新增 19 项服务测试） |
| Lint + 治理门禁 | `npm run lint`（eslint + check-governance + check-features） | ✅ Governance 48 任务 0 违规；Features 28 项 0 违规 |
| 格式检查 | `npm run format:check` | ✅ 全部符合 Prettier |
| UI 标准 | `npm run ui:check` | ✅ 129 文件 0 违规 |
| 生产构建 | `npm run build` | ✅ 3.42s（chunk 体积警告为既有现象，非错误） |
| 浏览器 UI 测试 | `npm run test:ui`（Playwright） | ✅ 199 passed，11 flaky（重试通过），exit 0 |

## 移植项专项验证

### 1. canvas-proxy（vendor/canvas-proxy）
- 单测 `npm run proxy:test`：✅ 5/5（根路径探测、OPTIONS CORS、GET 转发、POST 透传、502 兜底）
- 说明：CLI 入口增加 `import.meta.main` 守卫避免 import 副作用（最小适配，供测试导入）。

### 2. canvas-agent（vendor/canvas-agent）
- 构建 `npm run agent:build`：✅ tsc 0 错误
- 测试 `npm run test:agent`（tsx --test）：✅ 124 通过 / 2 跳过（Windows 跳过 POSIX 权限用例）/ 0 失败
- 进程冒烟：`node vendor/canvas-agent/dist/index.js` → `GET /health` 返回
  `{"ok":true,"protocolVersion":6,...}`；日志打印连接 token 与 MCP 注册命令。
- 依赖隔离：vendor/canvas-agent 自带 node_modules（zod v3 与根 zod v4 共存），
  不污染根依赖树。

### 3. 画布插件系统（vendor/canvas-plugins）
- `npm run plugins:build`：✅ 4 个内置插件（html/markdown/sticky-note/svg）构建成功，
  产物同步到 `public/plugins/*.js` + `index.json`。

### 4. 服务层（src/features）
- 提示词库 `promptLibrary.ts`：✅ 7 个来源预设、解析/缓存/搜索/失败降级（7 项测试）
- WebDAV `webdav.ts`：✅ 目录自动创建、上传/下载 manifest、Basic 认证、连接测试（6 项测试）
- 音频生成 `audioGeneration.ts`：✅ 选项规范化、TTS 请求构造、代理拼接、错误透出（6 项测试）

## 已知边界（如实披露）

- Node 运行时为 v22.23.2（项目 engines 要求 >=24）：canvas-agent 的 .js→.ts
  说明符重写依赖 Node 24，本机以 tsx 运行其测试；升级 Node 24 后可直接
  `node --test vendor/canvas-agent/src/**/*.test.ts`。
- 设置中心「本地服务」卡片为信息展示（启动命令/地址），一键启停需 Phase 2
  Tauri 侧拉起 Node 子进程。
- 浏览器测试中的 11 个 flaky 均为既有用例（服务启动竞态），与本变更无关。
- Phase 2 适配（对话面板接入、插件渲染层、Tauri 一键启停、registry 状态更新）
  未在本轮范围内，见 spec 边界。

## Phase 2 适配验证（2026-09-22）

### 1. Agent 接入对话面板（已完成）
- 连接层 `src/features/agent/*`（agentTypes/agentApi/agentEvents/agentCanvas/agentConnection）：
  HTTP + SSE 事件流（chat_message/agent_event/workspace_changed/codex_state 等）+ 画布工具桥
  （`tool_call` → `/canvas/result`）+ 审批回执；应用级单例 + 可注入 storage。
- UI：`AgentConversationMessages`/`ConversationComposer` 拆出，`ConversationPanel` 增加
  `agent` prop；设置中心 `AgentConnectionSettings` 连接卡片（地址/token/权限模式/状态点）。
- 测试：`tests/unit/agent{Api,Canvas,Events,Connection}.test.ts`，29 项。

### 2. 插件渲染层接入（已完成）
- 特性层 `src/features/plugins/*`（pluginTypes/pluginRuntime/nodeRegistry/pluginStore/pluginLoader）
  + `tests/unit/pluginLoader.test.ts` 7 项。
- 渲染：`PluginNode`（快照优先取节点数据，toolbar/双击/主题/存储桥接）；`CanvasNodeContent`
  增加 `scale`；`CanvasNodeFrame` 插件变体与内联尺寸；添加菜单「插件」分组（启用的已装插件）。
- 设置中心：`PluginManagerSettings` + `plugin-manager.css`（安装/更新/启停/卸载）。
- 画布模型：`canvasItems.plugin` 负载、`canvasGraph` 插件尺寸分支、`agentCanvas` 插件节点
  快照/op 翻译。
- App 接线：`pluginLoader.setBridge(agentCanvasBridge)` / `setAi` / `setPluginRuntime` /
  `ensurePluginsLoaded()`；`submitImageCommand` origin 联合新增 `"plugin"`。

### 全量门禁（Phase 2 全部改动后）

| 门禁 | 命令 | 结果 |
| --- | --- | --- |
| 类型检查 | `npx tsc --noEmit` | ✓ 0 错误 |
| 单元测试 | `npm test`（node --test tests/unit/*.test.ts） | ✓ 287/287（新增 agent 29 + plugin 7） |
| Lint + 治理 | `npm run lint` | ✓ Governance 48 任务 0 违规；Features 28 项 0 违规 |
| 格式检查 | `npm run format:check` | ✓ 全部符合 Prettier |
| UI 标准 | `npm run ui:check` | ✓ 136 文件 0 违规 |
| 生产构建 | `npm run build` | ✓ 2.71s（chunk 体积警告为既有现象，非错误） |
| 浏览器 UI 测试 | `npx playwright test tests/browser` | ✓ 210 passed（59.8s） |

### 测试期望更新说明
- `connection-drag.spec.ts` 两处随新功能调整：添加菜单项 8 → 12（新增 4 个内置插件
  分组），键盘 End 落点由「音频」改为最后一个插件项「SVG」。

### 已知边界（Phase 2）
- `ctx.ai` 合同差异：generateImage/Video 走本项目资产管线（结果入画布、不返回
  dataURL），generateText 拒绝并提示走对话面板；内置插件均未使用 ai。
- `openPanel`/`closePanel` 为空实现（本项目无节点下方面板系统）。
- /agent/codex/turn 端到端已验证跑通（2026-09-22）：canvas-agent 使用随依赖捆绑的 @openai/codex（0.146.0 → 0.155.1），无需全局安装 Codex CLI；Codex 以 ChatGPT 账号登录，gpt-6-astra 真实回复成功（turn.completed status=completed，usage 22475/62/55，duration 9048ms）。gpt-5-codex 在 ChatGPT 账号下不受支持。对话面板发消息不再传项目模型（App.tsx onSend 已修正）。
- Tauri 一键启停与 features.registry 状态更新仍待办。
### 收尾修正与登记（2026-09-22 复核）
- `agentCanvas.ts` 修复两处：`delete_node` 带插件 nodeType（含 ":"）时改为按
  `item.plugin?.type` 精确匹配，不再误删普通 text 节点；`update_node` 对插件节点
  接受 width/height 补丁并合并 metadata。新增 2 项单测（插件删除精确性、插件
  metadata/宽高更新），单测 287 → 289。
- `docs/features/features.registry.json` 状态登记：FEAT-007/009/012/013/019/021
  更新为 PARTIAL（见 docs/features/feat-{007,013,019,021}-*.md 卡片与生成面板），
  `check-features.mjs` 0 违规。
- `vendor/`、`public/plugins/` 已加入 `.gitignore`（Phase 1 遗留项清理）。
- 最终全量门禁（含收尾修正）：typecheck 0 错、单测 289/289、lint 0 违规、
  format 干净、ui:check 0 违规、build 成功、Playwright 全量通过。
