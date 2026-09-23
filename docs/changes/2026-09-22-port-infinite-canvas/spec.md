# Spec

## 目标

把 infinite-canvas（MIT）的现成后端能力原样搬入并跑通，UI 保持本项目自有形态。

## 搬运清单与映射

| # | 搬运项 | 上游来源 | 落入位置 | 对应功能空缺 |
| --- | --- | --- | --- | --- |
| 1 | canvas-proxy 本地转发代理 | `canvas-proxy/` | `vendor/canvas-proxy/` | FEAT-021 应用内代理（Prototype） |
| 2 | canvas-agent 本地 Agent + MCP | `canvas-agent/` | `vendor/canvas-agent/` | FEAT-012 MCP 自动调用 / FEAT-009 对话 |
| 3 | 画布节点插件系统 | `plugins/canvas/{sdk,html,markdown,sticky-note,svg}` + `web/src/lib/canvas/plugin-*` | `vendor/canvas-plugins/` | FEAT-013 连接器/插件目录（Prototype） |
| 4 | 提示词库服务 | `web/src/services/api/prompt-source-*`、`prompts.ts` | `src/features/prompts/promptLibrary.ts` | 提示词库（无对应功能） |
| 5 | WebDAV 云端同步 | `web/src/services/webdav-sync.ts` | `src/features/sync/webdav.ts` | FEAT-019 云端保存（Prototype） |
| 6 | 音频生成选项与 TTS 请求 | `web/src/lib/audio-generation.ts`、`services/api/audio.ts` | `src/features/creation/audioGeneration.ts` | FEAT-007 音频生成（Prototype 演示态） |

## 不搬运（查漏补缺结论）

- file-storage / image-storage：本项目已有更先进的 Rust 原生素材存储（FEAT-014
  native-assets），开源实现为浏览器 IndexedDB，不搬运。
- 生成 API 前端层（image.ts/video.ts 等 42KB/23KB）：本项目已有 BYOK/TaskHost/
  Gateway 链路（FEAT-002/006），架构更完整，仅比对参考。
- 开源 UI（web/）：用户明确 UI 保持本项目自有形态，不搬运。

## 最小接线（Phase 1）

1. **设置中心 › 网络**：把「应用内代理尚未接入」占位替换为「本地服务」信息卡：
   - 本地转发代理：启动命令 `npm run proxy`、默认地址 `http://127.0.0.1:23210`；
   - 本地 Agent（MCP）：启动命令 `npm run agent`、默认地址 `http://127.0.0.1:17371`、
     MCP 注册命令 `npm run agent:mcp`。
2. **npm scripts**：`proxy`、`proxy:test`、`agent:install/build/agent/agent:mcp`、
   `test:agent`、`plugins:install/build`。
3. **插件构建产物**：同步到 `public/plugins/*.js` + `index.json`，供本地启动按需加载。

## 验证方式

- 单测：新增 proxyForward / promptLibrary / webdavSync / audioGeneration 测试，
  canvas-agent 自带 126 项测试。
- 进程级：启动 canvas-agent 验证 `/health`；代理转发冒烟。
- 全量门禁：typecheck、lint、features:check、format:check、test、ui:check、build。

## 边界与后续（Phase 2）

状态（2026-09-22）：

- [x] Agent 对话面板 / SSE 事件流接入；MCP 自动调用编排（已实现：`src/features/agent/*`，
  对话面板 `agent` 扩展、设置中心连接卡片；画布工具桥 + `tool_call`/`/canvas/result`）。
- [x] 插件节点渲染层（注册表、远程安装/更新/卸载）接入画布（已实现：
  `src/features/plugins/*` + `PluginNode` + 添加菜单「插件」分组 + 设置中心插件管理）。
- [ ] 设置中心一键启停（Tauri 侧拉起 Node 子进程，未排期）。
- [ ] features.registry.json 状态更新与任务账本登记（随 Phase 2 收尾一起做）。

已知适配差异（插件侧）：
- `ctx.ai` 的 generateImage/generateVideo 走本项目资产管线（origin:"plugin" 提交生成，
  结果以画布节点呈现，不返回 dataURL）；generateText 拒绝并提示使用对话面板；
  内置插件均未使用 ai。
- `openPanel`/`closePanel` 为空实现（本项目无节点下方面板系统）。
- 真正 `/agent/codex/turn` 端到端依赖本机 Codex CLI（未安装，未确认）。
