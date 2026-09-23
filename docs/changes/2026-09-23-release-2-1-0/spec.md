# Spec：KK Studio 2.1.0 版本元数据与源码上传

- Task ID：REL-2.1.0
- 状态：IMPLEMENTED
- 日期：2026-09-23
- Intent / 账本：`intent.md`；版本交付不新增产品功能账本任务。
- 当前规范与实现基线：2.0.0 融合基线、当前 `chore/TASK-CONSOLIDATE-200` dirty tree。
- Source of truth：`package.json`、`package-lock.json`、`src-tauri/Cargo.toml`、`src-tauri/Cargo.lock`、`src-tauri/tauri.conf.json`、`VERSION`、`src/runtime/appInfo.ts`。

## 用户行为与入口

- 主流程和相邻流程：应用启动后由 npm/Tauri 元数据提供版本；账号弹层、软件更新设置和插件/MCP 宿主显示同一版本。
- 页面/route/组件或 API/命令入口：`src/components/AccountPopup.tsx`、`src/components/settings/ConnectionSettings.tsx`、`src/App.tsx`、`src/features/plugins/pluginLoader.ts`、`src/features/mcp/mcpClient.ts`。
- loading、success、error、cancel、offline、timeout：版本更新服务仍为 Prototype/禁用；本次不伪造更新下载、安装或重启结果。
- 重试、幂等、stale async、unknown 受理与重启恢复：不改变既有任务与存储契约。
- 键盘/焦点/响应式：不改变既有交互；仅更新版本文案来源。

## 架构、数据与权限

- 模块职责和依赖方向：`src/runtime/appInfo.ts` 从根 `package.json` 读取版本；界面、插件和 MCP 客户端复用该值。
- schema/API/事件/文件格式与兼容策略：应用语义版本为 2.1.0；项目/设置/画布等持久化 schema 版本保持原值。
- 数据归属、原件保留、校验和、并发/原子性：不修改本地项目、附件、用户数据或存储 key。
- 凭据与日志边界、最小权限、外部传输与费用：版本提交不携带凭据；仅推送用户已授权的 Git 远端。
- 相关 ADR：无；版本元数据同步不引入跨模块协议变化。

## 平台能力

| 能力 | Desktop | Web | Mobile | 降级/禁用理由 |
| --- | --- | --- | --- | --- |
| 版本显示 | 2.1.0 元数据显示 | 2.1.0 元数据显示 | 不适用 | 移动端没有独立目标 runtime |
| 在线更新 | Prototype/禁用 | Prototype/禁用 | 不适用 | 更新服务未接入 |

## 生命周期与恢复

- 初始化/安装：新构建读取 2.1.0；本次不生成安装包。
- 正常使用、取消/离线：不受版本文案更新影响。
- 升级和旧 schema：保留原有存储 key、identifier 和 schema 版本；2.0.0 历史记录只作为历史证据。
- 损坏/写失败/进程重启：不改变恢复路径。
- 备份、还原、回滚：Git 提交和既有恢复归档提供回滚点；不覆盖用户数据。
- 导出/卸载/退役及用户数据保留：不变。

## 验收映射

| Intent AC | 预期状态/结果 | 检查/运行环境 | 证据要求 |
| --- | --- | --- | --- |
| AC-1 | 运行时和配置版本均为 2.1.0 | Windows PowerShell、TypeScript/npm/Tauri | 版本搜索、定向单测/verify |
| AC-2 | 任务分支提交存在于 origin | Git CLI | push 输出和 `ls-remote` |
| AC-3 | 本地检查真实记录 | Node 24、现有依赖 | verification/review |
| AC-4 | 存储身份未变 | `rg`/diff 审阅 | key/identifier 检查 |

## 风险和决策

- 可自主解决的技术决定及依据：用 `appVersion` 消除界面/插件/MCP 的重复硬编码；保留协议和持久化 schema 版本。
- 待用户决定的产品语义：无。
- 规范冲突、外部依赖与阻断范围：分支规则要求 PR 和 main CI；本次只上传任务分支，未声称正式发布。
- 与 intent 的差异及授权依据：无。
- 明确未承诺的能力：安装包、代码签名、Hosted CI、main 合并、真实 Provider/云端服务和自动更新。
