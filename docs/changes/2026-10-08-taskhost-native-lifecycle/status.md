# 收尾状态与后续优先级

日期：2026-10-08。任务权威：[task-ledger.json](../../governance/task-ledger.json)；逐项状态：[TASK_LEDGER](../../governance/TASK_LEDGER.md)。本表只收敛当前候选与剩余依赖，不将所有历史分支视为待合并。

| 项/分支                                | 当前状态                                                    | 处理                                                                     |
| -------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| TASK-AUDIT-20261003 / PR #34           | 已合并 main@5b0eb6a；合并后 CI PASS                         | 保留原提交、工作树和历史失败证据                                         |
| TASK-ORCH-002-stage-workbench / PR #35 | 已合并 main@5dd6e6dd；合并后 verify/deploy-linux PASS       | T5 已通过 fa9da162 承接；不重复合并                                      |
| T5-native-lifecycle                    | 原生取消/归档和重试 UI 门禁已修复，十一组 fresh native PASS | 第一轮审查两项 P2 已返修；最终完整 verify、精确 SHA 补审和当前 CI 后合并 |
| TASK-MODEL-001-capabilities            | 原执行者在途工作                                            | 未取得当前最终审查/CI，不强行合并                                        |
| 历史 PR #13/#17/#18/#19/#20            | 已由 PR #31 集成                                            | 以 2026-09-29 audit 的 source/landing mapping 为准，不重复合入原堆叠分支 |
| codex/feat/minimax-deep-replica        | 显式 WIP snapshot，未验收                                   | 保留；不能将“保存工作”视为完成                                           |
| TASK-INTEGRATE-20261008                | main@5b0eb6a 的 clean 准备树，无独立产品改动                | 保留，不创建空 PR                                                        |

| 优先级       | 开放任务                                   | 下一步 / 验收边界                                                                                                   |
| ------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| P1           | TASK-PROV-005（本轮新增）                  | 供应商非秘密配置/目录的原生 durable 保存与启动恢复；模拟立即异常退出，保留账号/模型/ref。代码可本地做，不需付费凭据 |
| P1           | TASK-PROV-006（从旧 T5 描述拆出）          | native image 的连接身份/禁用/容量和结构化 health 回写；已有 T5 journal 引擎复用，禁止另建队列                       |
| P1           | BACKEND-MEDIA-001 → TASK-ORCH-003          | 视频/音频异步 Provider 契约、归档/取消/unknown，再接编排执行门禁；真实计费验收单独保留                              |
| P1           | TASK-TASKSTATE-002                         | 可验证报价回执 schema/来源/货币单位；当前无报价继续未知，禁止用任意系数冒充实际账单                                 |
| P2           | BACKEND-MCP-AUTO                           | 本地工具审批、调用/取消/错误和结果链，可先做受控 fixture                                                            |
| 独立验收     | T7、T9/TASK-LOCAL-SERVICE-001、T12、UI-004 | 各自安装/离线/容量、伴随服务登录、原生移动包和同态视觉证据，未因本轮构建通过而完成                                  |
| 外部 BLOCKED | EXT-PROVIDER、EXT-COMFY、T10、T11          | 真正 Provider/GPU/ComfyUI 凭据和模型、VPS/旧部署权限，不能用历史记录或 fixture 宣称生产成功                         |

每个开放任务的 goal/acceptance/dependencies/owner/branch/worktree/evidence 见账本。TODO 是尚未实施；PARTIAL 是已有代码但尚有明确缺口；BLOCKED 只用于外部必要条件。现有任务及用户数据不清理，继续按任务分支完成并经独立审查和托管门禁合并。

当前账本 99 项：DONE 56 / REVIEW 1 / PARTIAL 26 / TODO 12 / BLOCKED 4；T5 在当前 HEAD 补审前保持 REVIEW。Desktop 2.1.6 / Web 2.1.7 / Mobile 规划 2.1.1；这些是源码版本，不能代替正式安装或发布。
