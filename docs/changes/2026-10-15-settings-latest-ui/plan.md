# Plan：最新 UI 设置最小修复

- Task ID：TASK-SETTINGS-LATEST-20261015；状态：IN PROGRESS；日期：2026-10-15；交付包角色：`current`。
- [Intent](intent.md) / [Spec](spec.md) / [Verification](verification.md) / [Review](review.md)。
- Owner：root；branch：`fix/TASK-SETTINGS-LATEST-20261015`；worktree：`D:/kk-studio/.worktrees/branch-consolidation-20261011`。
- Base / 开工 HEAD：`c1fae190618be3bb5a4e00208b8f4776ec8c0be5`。本地 `origin/main` 回读为 `694a00607f6f63de1b8c43d0ebb117adf5d34f67`，本任务明确承接最新 UI 候选，不冒称已发布 main。

## 开工与裁决

已读根 AGENTS/AI_RULES、PROJECT_STATE、UI_INDEX/相关 tokens、SDLC、PROMPTING、BRANCH-POLICY、REVIEW、五份模板、设置功能卡和账本。Node 24.20.0 / npm 11.19.0；本次基线 lint/typecheck/相关测试由 root 记录，文档代理不借此前 2.1.24 结果代填。

旧 primary `51fccfc7` + 修复 `428a3a2d` 是错误 UI 基线。选取当前最新 UI `c1fae190`，保留绿色、1280/240/192 和手机分级导航，以当前失败和当前产物验证。

本次 root 负责源码/测试/版本/端口/浏览器；文档代理只拥有本包、task-ledger、生成 TASK_LEDGER、PROJECT_STATE、AI_HANDOFF、PROGRESS 与设置功能关联及其生成看板。新建本包时工作树已有 root 所有的设置源码/测试变更；不覆盖或提交其他人的文件。primary dirty/index 和用户资料保留。

## 实施顺序

| 步骤 | 责任/文件                                        | 改动目的与证明                                                                                            |
| ---- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| 1    | root / 基线、实际 runtime；文档代理 / 本包与账本 | 核对新基线/加载来源，登记 IN_PROGRESS；旧 UI 与旧验证只作历史                                             |
| 2    | root / 设置组件、相关保存共享代码和测试          | 查全调用者，保留真实 RED；修复溢出、提示遮挡、模型布局/交互与已证保存风险                                 |
| 2a   | root / `vite.config.ts`、最新布局回归            | 把 `**/.worktrees/**` 的过宽忽略限定为内部 `resolve('.worktrees')`；证明本工作树源码刷新并 guard 当前几何 |
| 3    | root / 版本与当前构建                            | 按现有脚本 Desktop/Web 2.1.24 → 2.1.25；Mobile 规划保持；执行相关门禁                                     |
| 4    | root / browser 与 Desktop                        | development 1421、preview 1423 串行验当前来源与 AC；Tauri 另重建/验源指纹和配置恢复                       |
| 5    | 独立 reviewer；文档代理 / 本包和治理入口         | 冻结 SHA 后独立 review、修复并复验；依据实际回执更新结果与剩余范围                                        |

## 状态与开发笔记

| 时间       | 旧状态 | 新状态      | 原因/决策                                            | 负责人 | 证据                                           |
| ---------- | ------ | ----------- | ---------------------------------------------------- | ------ | ---------------------------------------------- |
| 2026-10-15 | 未登记 | IN_PROGRESS | 用户纠正旧 UI 启动；在 c1fae190 上继续已授权设置修复 | root   | [intent](intent.md)；当前 Git/版本/tokens 回读 |

独立技术选择均在已有授权内：复用现有组件、事务、tokens，不新增平台工程或依赖。代码失败继续修复；缺少证据记 NOT_VERIFIED，只有必要外部条件才记 BLOCKED。

## 并行、风险与恢复

- 同一文件唯一写入者；root 负责整合，功能 registry/生成视图由文档代理串行生成。1421/1423 运行验证不抢占、不结束他人进程。
- 保存风险先用隔离合成资料/故障注入验收；禁止用真实用户配置作破坏性试验，不泄露秘密。
- 保留旧失败、旧源码、旧运行证据；不 reset/clean、移动/删除 worktree、悄悄提交 primary 或改存储 identity。
- 若当前候选仍加载旧 UI，先确认 script/runtime mode/entry/端口/产物来源，继续诊断，不能宣布完成。
- 复验范围覆盖新 diff 实际触及的配置/存储、长文案、busy、失败与恢复；最终完整门禁和本次独立 SHA review 待真实结果。
- PR/Hosted/签名/安装/真实账号/付费 Provider/实体手机及用户视觉验收分别记录，不被本地静态/fixture 结果代替。

## 计划变更

本次改用最新 UI 是用户明确纠正，未改变原设置修复范围。任何后续新增产品语义或更改公共数据契约须另记录依据；本包不预先承诺完成。

2026-10-15：root 已按平台版本脚本把 Desktop/Web 递增到2.1.25，Mobile2.1.1保持。发现 Vite 过宽 watch 忽略造成本工作树页面仍使用缓存原始源码；最新基线截图/原始DOM已留证。首轮开发回归7 fail / 5 pass，由root报告含缓存c1基线及1项手机lazy加载测试竞态；原失败保留，最终新source结果待补，不作为成功。
