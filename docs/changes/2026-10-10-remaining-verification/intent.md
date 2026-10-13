# Intent：当前主线剩余回归验证与修复

- Task ID：TASK-AGENT-001
- 状态：IMPLEMENTED
- 日期与提出者：2026-10-10，当前用户
- 请求来源：验证全部剩余的任务，继续完成。
- 用户授权范围与依据：在当前仓库继续验证可验证任务，并修复验证暴露的本地回归。
- 关联账本、spec、plan：`docs/governance/task-ledger.json` 的 `TASK-AGENT-001`；本目录的 `spec.md`、`plan.md`。

## 用户原意

验证当前主线剩余任务，继续完成能够在本地闭环的工作，并保留外部条件不足的任务状态。

## AI 工程转译

在当前主线基线创建隔离工作树，复现现有本地验证失败，修复 Codex 画布生图的配置门禁、设置选择器样式和过时的浏览器/开发态断言，然后执行完整本地验证。Provider 真实凭据、Hosted CI、Tauri 真实安装与手机效果等外部验收继续单独标记。

## 目标与非目标

- 预期结果：当前 Web 生产预览和 Vite development 验证全绿，Codex 画布生图不会被错误拦截，设置下拉控件遵守公共尺寸规则。
- 包含范围：`src/App.tsx`、设置样式、相关浏览器与开发态测试、验证与治理证据。
- 明确不包含：真实 Provider/GPU、Hosted CI、远程发布、Tauri 安装包和物理移动设备验收。
- 受影响平台/模块：Web/Vite；共享 App、设置样式、Agent/插件浏览器验证。
- 已有实现和规范来源：`AGENTS.md`、`AI_RULES.md`、`docs/engineering/SDLC.md`、`docs/engineering/TESTING.md`、`docs/governance/PROJECT_STATE.md`。

## 验收条件

| ID | 用户可观察结果 | 技术证据/检查 | 适用平台 |
| --- | --- | --- | --- |
| AC-1 | Codex 画布图片请求可以进入内置生图链路，不被 API 模型配置提示错误阻断。 | `tests/browser/agent.spec.ts` 归档/恢复场景；完整 Playwright 455/455。 | Web |
| AC-2 | 设置中的供应商下拉控件在桌面和窄屏使用统一高度与禁用状态。 | `tests/browser/design-system-pages.spec.ts` 390/1920；UI 标准 215/0。 | Web |
| AC-3 | Google 图片归档、插件设置空态和开发态插件管理断言匹配当前产品语义。 | Google、插件、设计系统和 development 测试通过。 | Web/Vite |
| AC-4 | 可验证门禁全部通过，外部条件不足的任务不被错误关闭。 | `npm run verify` 退出码 0；账本仍保留 PARTIAL/TODO/BLOCKED 项。 | 当前工作树 |

## 假设、风险和决策

- FACT（直接证据）：修复前生产浏览器有 4 项失败；工作树内完整 `verify` 修复后退出码为 0。
- INFERENCE（假设及风险）：Codex 画布源项带有 `generationSource: "codex"` 时可绕过通用 API 配置门禁，具体内置 Agent 连通性仍由 Agent 链路负责。
- UNKNOWN / CONFLICT：真实 Provider、Hosted Windows 原因、Tauri release 和移动设备效果没有本地证据。
- AI 自主决定的技术事项及理由：使用现有 Codex 来源元数据作为最小门禁例外，避免增加第二套配置状态；将开发态测试选择器更新为现行“扩展”入口。
- 必须由用户决定的产品语义/范围事项（无则写无）：无。
- 外部条件、费用或不可逆动作及已有授权：无外部写入、费用或不可逆动作。
- 不在本次范围的问题与账本 ID：`TASK-PROV-005`、`TASK-PROV-006`、`TASK-VERIFY-CONCURRENCY-002`、`TASK-VERIFY-ORIGIN-003`、`TASK-WINDOWS-ENTRY-RECOVERY-003`、`TASK-DOCS-HISTORY-001` 等继续按各自证据保持开放状态。
