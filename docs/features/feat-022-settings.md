# 设置中心（FEAT-022）

- 状态：PARTIAL
- 领域：system
- 最近更新：2026-10-14
- 关联任务：TASK-UI-005、TASK-PROV-001、UI-004、TASK-DS-001、TASK-DS-002、TASK-UI-CONSOLIDATE-20261014

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

## Agent 与凭据恢复（2026-10-13）

TASK-AGENT-RECOVERY-20261013：模型接入将普通桌面连接合为一个入口，断开为次操作，停止服务进入高级选项。API 输入不回填秘密，系统读取状态区分读取中、已保存、缺失与读取失败并支持重试。普通与 Google API 共用持久保存边界，保留既有系统凭据身份；本轮跨窗口一致性、进程重启与秘密隔离证据见 [验证](../changes/2026-10-13-agent-recovery/verification.md) 和 [ADR-016](../architecture/adr/ADR-016-agent-and-provider-recovery.md)。

## 2026-10-14 源码候选与验收边界

设置分组与公共预设已接入源码；默认绿、中性动作和弱焦点按UI_INDEX消费。目录有官网/密钥/文档，协议未接入时禁用，不自动联网。UsageSettings派生本机项目/任务与有效provider实际USD回执；Token未报告，demo/估算/冲突/其他币种不计。StorageOverview读取原生get_storage_root、伴随服务地址或浏览器位置；storage.estimate仅浏览器估算，项目引用数不是全库大小，Desktop/伴随服务字节未报告且错误有重试。源码补充ProviderPresetSelector/providerPresets/UsageSettings/usageSummary/StorageOverview；完整两端与安装包证据仍待补。

新结果见[本轮验证](../changes/2026-10-14-ui-consolidation/verification.md)，未完成的平台/外部服务不由源码或fixture推导PASS。
