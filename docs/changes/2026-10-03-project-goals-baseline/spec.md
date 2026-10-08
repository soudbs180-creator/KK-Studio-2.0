# Spec：项目建设目标与验收基线

- Task ID：TASK-GOV-GOALS-001。
- 状态：IMPLEMENTED；日期：2026-10-03。
- Intent / 账本：[intent.md](intent.md) · [`task-ledger.json`](../../governance/task-ledger.json)。
- 当前规范与实现基线：[`AGENTS.md`](../../../AGENTS.md)、[`AI_RULES.md`](../../../AI_RULES.md)、[`SPEC_BASELINE.md`](../../governance/SPEC_BASELINE.md)、[`UI_INDEX.md`](../../UI_INDEX.md)。
- Source of truth：[`PROJECT_GOALS.md`](../../governance/PROJECT_GOALS.md)；架构、存储、UI、功能真实程度和任务状态仍由各自权威文件拥有。

## 用户行为与入口

- 主流程：项目创作、对话与 Agent、能力配置、故障与恢复四条路径。
- 工程入口：治理文档、`scripts/check-project-goals.mjs`、`package.json` 的 `goals:check`，以及 `lint`/`verify` 链路。
- 状态：项目基线必须说明 loading、success、error、cancel、offline、timeout、unknown、stale async 和重启恢复的适用边界。
- UI：实际页面仍按 `docs/UI_INDEX.md`、tokens 和浏览器/桌面同态证据验收；本任务不新增可见控件。

## 架构、数据与权限

- `PROJECT_GOALS.md` 只做治理入口，不复制领域 schema、存储格式或 UI 数值。
- 检查脚本只读取项目文档和任务账本，不访问凭据、不写用户数据，不改变运行时状态。
- 任务必须关联 change package、源码/脚本证据和可复现命令；外部能力继续保持 PARTIAL/TODO/BLOCKED。

## 平台能力

| 能力                 | Desktop                             | Web                            | Mobile         | 降级/禁用理由                              |
| -------------------- | ----------------------------------- | ------------------------------ | -------------- | ------------------------------------------ |
| 项目级目标与验收文档 | 共享治理入口                        | 共享治理入口                   | 仅作为规划约束 | 无原生 Mobile 包和同态运行证据时不计为完成 |
| 目标门禁             | `client:check` 及完整门禁适用时执行 | `goals:check` 接入 lint/verify | 未建立独立门禁 | 本任务不虚构平台包                         |

## 生命周期与恢复

- 初始化：检查治理入口、任务账本和 change package 是否存在。
- 修改：脚本失败时阻断 lint；文档变更不触碰用户数据。
- 升级/回滚：项目目标文档按 Git 提交回滚；不迁移运行时数据。
- 外部阻塞：凭据、服务、设备、生产权限缺失时保留原任务状态并记录原因。

## 验收映射

| Intent AC | 预期状态/结果                                         | 检查/运行环境                          | 证据要求                      |
| --------- | ----------------------------------------------------- | -------------------------------------- | ----------------------------- |
| AC-1      | 四条核心路径、范围和非目标写入唯一项目入口            | 读取 `PROJECT_GOALS.md`                | 文档章节与链接可读            |
| AC-2      | 代码、UI、链路、质量、交付标准可执行                  | Windows PowerShell / Node 24           | 目标文档和治理门禁            |
| AC-3      | `goals:check` 校验章节、关键状态词和账本任务          | `node scripts/check-project-goals.mjs` | 退出码 0                      |
| AC-4      | lint/verify 自动执行目标检查                          | `package.json` 脚本链                  | `npm run lint` 等价命令无失败 |
| AC-5      | 任务、Project State、进度和 change package 互相可追溯 | Markdown/治理检查                      | 账本生成视图无漂移            |

## 风险和决策

- 可自主决定：使用文档入口加确定性检查，不把运行时规则复制到第二套 schema；理由是与现有治理体系一致且不会引入产品状态源。
- 外部依赖：真实 Provider、ComfyUI、VPS、Mobile、第三方 MCP 和用户视觉确认仍需独立任务条件。
- 明确未承诺：目标门禁通过只证明项目基线完整，不证明外部能力已真实可用。
