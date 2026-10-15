# 设置中心（FEAT-022）

- 状态：PARTIAL
- 领域：system
- 最近更新：2026-10-15
- 关联任务：TASK-UI-005、TASK-PROV-001、UI-004、TASK-DS-001、TASK-DS-002、TASK-UI-CONSOLIDATE-20261014、TASK-PROTOCOL-CLI-20261014、TASK-222-ACTIONS-20261014、TASK-223-ACTIONS-20261014、TASK-SETTINGS-LATEST-20261015

TASK-SETTINGS-LATEST-20261015本地DONE/PASS：在最新c1fae190 UI上完成2.1.25设置修复，629浏览器首试及实际Web/Tauri、Native配置恢复和独立源码审查通过。当前Desktop入口已指向新版；原配置身份、primary dirty/index保留，旧错误基线与失败证据保留。[当前验证](../changes/2026-10-15-settings-latest-ui/verification.md)。真人Provider/Hosted/签名和用户视觉接受另验，功能继续PARTIAL。

## 用户可见入口

- 侧栏设置（SettingsPanel）：通用、账号管理、使用记录、模型接入、扩展、ComfyUI、存储、网络、记忆、高级与软件更新；旧分类 ID 和深链接保留兼容。
- 模型接入按 Codex 主 Agent、官方 API、中转 API、CLI 账号、OAuth 分类；CLI 再选 Gemini / CodeBuddy。手机网页提供设置分类、接入方式、服务商详情的返回路径。

## 代码位置

- `src/components/settings/`（SettingsPanel、ModelProviderSettings、Provider*、McpSettings、SkillsSettings、ConnectionSettings、GeneralSettings 等）
- 连接与凭据：`src/features/creation/providerRegistry.ts`、`providerCredentials.ts`、`src/domain/providerConnections.ts`、`src/domain/settings.ts`

## 测试与证据

- 2026-10-15最新UI设置修复（本地DONE/PASS）：从c1fae190最新基线承接Desktop/Web2.1.25，629浏览器全部首试、完整verify及当前Web/Tauri几何与Native20+11+1+5配置恢复通过，独立源/测试054cd53f审查PASS。Desktop已启动新EXEc9c3b4e，原配置身份、primary/index与全部失败保留；真实Provider/Hosted/签名/用户视觉接受另验，功能状态仍PARTIAL，见[当前验证](../changes/2026-10-15-settings-latest-ui/verification.md)。

- 2.1.24本地验证（TASK-223，本任务DONE/PASS；功能主状态保持）：MCP/插件与伴随服务父子操作采用独立busy所有权；未受理动作禁用，迟到检查的成功/失败不覆盖新连接，关闭/返回在操作完成后恢复；最终产品58b5c07f与完整验证、官方/便携回执见[本轮验证](../changes/2026-10-14-action-usability-223/verification.md)。

- 2.1.23本地按钮修复：`tests/browser/settings-control-usability.spec.ts`、`tests/browser/settings-persistence-failures.spec.ts`、`tests/unit/pluginStartupRace.test.ts`；结果及Web/Desktop边界见[2.1.23历史验证](../changes/2026-10-14-action-usability-222/verification.md)。

- 单测：`tests/unit/settings.test.ts`、`providerProtocol.test.ts`、`modelCatalogProtocol.test.ts`、`nativeCli.test.ts`、`codebuddyConnectionSettings.test.ts`
- 浏览器：`settings-scroll`、`settings-switch-audit`、`settings-navigation`、`provider-cli-settings`、`mcp-settings`、`runtime-ui`；当前轮结果由任务 verification 记录。

## 当前能力

- 本轮2.1.23已验证补齐开关物理命中区、完整常规选项、插件/MCP取消及busy导航、备份具体ID恢复确认与Google密钥桌面外链。

- 既有连接增删改、健康/隔离状态、API Key 保存事务、MCP、技能、存储和主题保持。通用模型接入增加显式协议/认证与只读模型获取；新协议的文本链路和边界见 FEAT-032。
- Windows Desktop 新增实际 CLI 管理：检测完整安装、主动安装/登录、取消自有操作和 Gemini 桥启停。版本/帮助、终端退出或桥健康均不代表账号与模型验证；CodeBuddy 配置读取失败先重试，保存路径与模型连通状态分开。
- 手机网页按分类/方式/详情逐级展示并回焦，异步操作期间锁定切页和关闭。未实现的 OAuth 与平台能力仍显示边界，不借用网站身份。

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

默认绿、中性动作、弱焦点和分组导航按 UI_INDEX 消费。公共预设提供官网、认证说明与接口文档；Gemini 前往独立 Google 配置，浏览目录不发请求。UsageSettings 派生本机已保存项目/任务与有效 provider 实际 USD 回执；Token 未报告，demo、估算、冲突与其他币种不计。StorageOverview 区分原生 get_storage_root、伴随服务地址和浏览器位置；storage.estimate 仅是浏览器估算，项目引用数不是全库大小，未报告的字节不猜测，读取错误有重试。

原 UI 收敛的历史结果见[收敛验证](../changes/2026-10-14-ui-consolidation/verification.md)。本轮新协议、CLI 与手机网页的最终源码门禁、实际构建和产物身份由[2.1.22协议/CLI验证](../changes/2026-10-14-protocol-cli-completion/verification.md)记录；真实账号安装/登录、付费供应商调用和 Native Mobile 未验收，状态保持 PARTIAL。

- 2026-10-15：TASK-KK-UNIFIED-20261015 已获用户实施授权，新增范围见 [统一规格](../changes/2026-10-15-kk-unified/spec.md)。本卡既有证据仍限原版本；新范围实现/真实验收尚未完成，不能沿用旧 PASS 关闭。
