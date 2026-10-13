# 设置中心（FEAT-022）

2026-10-13：保留既有主题/强调色，增加实际Native背景读回的透明窗口开关与恢复；不支持的宿主明确禁用，不能以CSS浮岛代替透底。见[实现与平台证据](../changes/2026-10-13-cherry-red-scope/verification.md)。平台物理效果与签名安装继续独立验收，状态保持PARTIAL。

- 状态：PARTIAL
- 领域：system
- 最近更新：2026-09-22
- 关联任务：TASK-UI-005、TASK-PROV-001、UI-004、TASK-DS-001、TASK-DS-002

## 用户可见入口

- 侧栏设置（SettingsPanel）：通用、模型供应商、MCP、技能、ComfyUI、连接、存储、账号等分区。

## 代码位置

- `src/components/settings/`（SettingsPanel、ModelProviderSettings、Provider*、McpSettings、SkillsSettings、ConnectionSettings、GeneralSettings 等）
- 连接与凭据：`src/features/creation/providerRegistry.ts`、`providerCredentials.ts`、`src/domain/providerConnections.ts`、`src/domain/settings.ts`

## 测试与证据

- 单测：`tests/unit/settings.test.ts`
- 浏览器：`settings-scroll`、`settings-switch-audit`、`mcp-settings`、`runtime-ui`

## 当前能力

- 供应商连接增删改、健康/隔离状态、API Key（系统凭据库）、MCP、技能、存储、主题等真实可用。

## 差距与后端化

- 系统集成（开机启动等）在 GeneralSettings 中标注不可用；部分分区视觉基线随 UI-004 补齐。
- 平台类分区（账号/记忆/代理）见 FEAT-017/020/021。

## 变更记录

- 2026-09-21：创建卡片，状态 REAL。

- 2026-09-22：Design System双主题8种强调色已接入现有偏好。新增 `tests/unit/designSystem.test.ts` / `tests/browser/design-system.spec.ts`；新样式分平台验证见 `docs/changes/2026-09-22-design-system/verification.md`。原设置REAL证据不自动证明本次新样式Desktop验收，暂为PARTIAL。

- 本轮Web验证：双主题8色、键盘/回焦/重载、390/768/1920；当前工程309单测与13定向浏览器通过。新版Desktop仍未验证，PARTIAL不表示撤销既有已验证能力。

- 2026-09-22（TASK-DS-002）：目录和设置控件按Design System 1.1迁移；新增 `tests/browser/design-system-pages.spec.ts`，Web与实际Tauri证据见 `docs/changes/2026-09-22-design-system-pages/verification.md`。桌面重启已验证偏好和本地Skill记录保留；本证据不覆盖Provider/GPU或任务宿主恢复，功能状态保持PARTIAL。

## TASK-UI-005 更新

Agent 连接状态/密码输入/会话凭据、平台与版本标识已对齐；独立代理尚未全局接线的边界明确。 见 [核对与验证](../changes/2026-09-22-ui-feature-parity/verification.md)。


## 默认 Agent 与 API 目录补充（2026-09-22）

设置提供已登录 Codex 连接、同步权限偏好与 API 模型目录刷新、手动用途/尺寸/型号分组/搜索别名。能力与账号身份绑定，未知能力不冒充可用。详见本轮 [verification](../changes/2026-09-22-codex-default-agent/verification.md)。

2026-10-13 7da 主线候选：正式 production Tauri Native6、真实 Ollama13、严格隔离NSIS生命周期已通过相关链路；不同源码/产物和 Hosted/用户验收边界见[最终记录](../changes/2026-10-13-cherry-red-scope/mainline-final-status.md)。功能总体仍PARTIAL，不据此关闭其他开放任务或真实云/图片/视频能力。

2026-10-14 最新验收：Win默认production Native13含实际透明开启/读回/不透明恢复已PASS；三平台Native6与默认包已PASS。新增Mac/Linux真实原生背景读回/恢复断言尚待新head Native7实跑，物理透底体验/签名下载仍分开。 完整身份与许可见[最终记录](../changes/2026-10-13-cherry-red-scope/mainline-final-status.md)。保留功能整体PARTIAL及其他开放任务。

最终技术锚点0d61：Windows/Mac真实背景开启/读回/关闭恢复通过；Linux此runner无compositor而明确禁用，Native7及默认包完整通过，物理效果条件与签名仍单列。 本期技术步骤完成，用户最终产品/发布范围待验收；功能总体及其他任务状态不批量升级，详见[最终记录](../changes/2026-10-13-cherry-red-scope/mainline-final-status.md)。
