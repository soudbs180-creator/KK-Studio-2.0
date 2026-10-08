# 连接器目录（FEAT-013）

- 状态：PARTIAL
- 领域：intelligence
- 最近更新：2026-10-08
- 关联任务：TASK-UI-005、TASK-CAP-001、TASK-MINIMAX-001、PLUGIN-DESKTOP-001、TASK-PLUGIN-DEV-001

## 用户可见入口

- 技能页内“连接器目录”（ConnectorCatalog），列表仍显示“未安装 · Prototype”。
- 画布“添加节点”菜单新增「插件」分组：html / markdown / sticky-note / svg 内置插件默认启用。

## 代码位置

- 连接器目录（未合并）：`src/components/ConnectorCatalog.tsx`（硬编码 `CONNECTORS` 清单）
- 画布插件系统（已接入，vendor/canvas-plugins 移植）：
  - `src/features/plugins/`（pluginTypes/pluginRuntime/nodeRegistry/pluginStore/pluginLoader）
  - 渲染：`src/components/nodes/PluginNode.tsx`、`src/styles/plugin-nodes.css`
  - 设置管理：`src/components/settings/PluginManagerSettings.tsx`（URL 安装/更新/启停/卸载）
  - 画布模型：`src/domain/canvasItems.ts`（plugin 负载）、`src/domain/canvasGraph.ts`（插件尺寸）
  - Agent 快照/操作：`src/features/agent/agentCanvas.ts`（插件节点翻译）

## 测试与证据

- `tests/unit/pluginLoader.test.ts`（11 项：安装/启停/卸载/本地发现/更新/无效导出/清理，以及远程地址、重定向和旧缓存拒绝）
- `tests/browser/plugins.spec.ts`（添加菜单 → 创建 SVG 插件节点 → plugin 变体渲染）

## 当前能力

- Web production preview 中，插件 SDK 契约、注册表、启停 store、HTTPS URL 安装/更新/卸载和内置节点渲染已通过本地测试；第三方插件以应用页面权限执行，应只安装可信来源。
- Web 与 Desktop 的内置插件随应用启动自动发现并默认启用（可在设置 › 插件中停用/卸载）。Desktop 随包插件现从同源 `/plugins/*.js` 模块路径加载，fresh Tauri 已验证发现、添加、渲染、停用和恢复；严格 CSP 未加入 `blob:`。
- 连接器目录页与插件系统尚未合并（UI 形态差异）。

## 差距与后端化

- TASK-PLUGIN-DEV-001：固定 1421 的 Vite development 会因随包 `/plugins/*.js` public-import 错误弹出遮罩；原主线与 TASK-MODEL-001 均复现。Production/Tauri 的既有结果保留，开发加载未完成；见[本轮诊断](../changes/2026-10-08-model-capabilities/verification.md)。
- 将连接器目录页与插件系统合并为统一“连接器/插件”入口。
- 插件 `ctx.ai` 生成能力走本项目资产管线（result 入画布），generateText 提示走对话面板。
- 远程插件仍以应用权限运行，仅允许不含凭据/片段的 HTTPS 地址且禁止自动重定向；本轮不承诺远程代码在 Desktop 中执行。
- 连接器目录页与插件系统尚未合并；插件 `ctx.ai` 真实资产管线和统一入口仍是后续工作。

## TASK-UI-005 更新

首页与图片对话的插件菜单读取实际启用插件；管理入口定位 settings/plugins，MCP 工具单独管理。连接器目录原有 Prototype 与画布插件不是相同实现。 见 [核对与验证](../changes/2026-09-22-ui-feature-parity/verification.md)。
