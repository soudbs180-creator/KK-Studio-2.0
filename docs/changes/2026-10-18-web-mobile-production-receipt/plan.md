# Plan：正式发布、生产验收与收口

- Task ID：TASK-WEB-RELEASE-20261017；日期：2026-10-18，Asia/Shanghai。
- 状态：生产技术及用户手机UI验收完成；文档门禁以本收据PR当前HEAD及外部回执为准。
- Owner：root；分支：`docs/TASK-WEB-RELEASE-20261017-production-receipt`。
- Base：`f730f1dc32fb2e568dda6d4a52c58b05802d6b6b`；文档最终head不预填。
- [Intent](intent.md) / [Spec](spec.md) / [Verification](verification.md) / [Review](review.md)。

## 来源与分工

PR66正常squash合并，main与审查候选690d完整tree均为`53dd0eac369b3fc3cc31364217048c521da956c5`。新文档分支从该main建立、开工clean。已读根AGENTS/AI_RULES、流程/分支/审核规则、模板和前包证据。本包作者仅写此六文件；root独占现行治理/账本及外部执行，不改变产品源码、依赖、版本、存储身份或其他工作树。

## 执行实录

| 步骤 | 实际结果                                                                     | 证据                                                                             |
| ---- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1    | PR66精确head独审、五quality/两guards context、合并tree通过                   | verification / review                                                            |
| 2    | main quality39052635456五job及guards39052635453通过                          | hosted-main-f730-final.json                                                      |
| 3    | 正式v2.1.38发布，受限部署run39055538017成功                                  | formal38-auto-deploy.json                                                        |
| 4    | 当前179/上一155文件服务器全量hash与HTTPS入口资源集通过                       | final38-verified.json                                                            |
| 5    | 生产九项首试9/9，零重试/跳过/flaky，九份网络/异常附件为空                    | production38-mobile-proof.json                                                   |
| 6    | current38/previous37、仅两目录、旧4a已GC，服务主PID保持                      | final38-cleanup.json                                                             |
| 7    | helper默认验证/--cleanup完成，撤临时root授权和两个本机私钥，正式受限密钥保留 | final38-cleanup / root-temporary-ssh-denied / local-private-key-removal.json     |
| 8    | 用户直接回复“已显示独立手机 UI，正常”                                        | user-phone-acceptance38.json                                                     |
| 9    | 现行治理与149任务/36功能、runtimeEvidence及历史区终核通过                    | root-final-docs-semantic-preservation.json；提交门禁以本PR当前HEAD及外部回执为准 |

工程外收据在本任务分析stage保存，命令、hash与范围见[verification](verification.md)。实体手机UI已接受，不代填其真实Provider/账号全链或特定Safari验收。

## 失败、回滚与历史

健康失败恢复两个指针；固定回滚命令见[release](release.md)。本轮未实际把生产切回37；隔离回归验证回滚机制，37全部155文件hash通过。37是恢复目标，不改称已接受的独立手机UI。

旧/m路由、启动深链、Gateway交错、本机图片回调、Linux fixture/契约与插件flaky的RED/复验保留在[历史验证](../2026-10-17-web-release-receipt/verification.md)。动态批量私钥删除被自动策略拒绝且未执行，随后两个固定LiteralPath分别删除成功；不留作阻断。Windows tag工作流失败与Web成功分开。

## 文档交付

task0已关联新verification及当前分支，其他149任务、其余36功能/runtimeEvidence保全已核对；FEAT-028继续PARTIAL、T12开放，视图由原命令生成。文档提交仍须执行适用门禁及带完整base/head/分支的Delivery，以当前PR回执记录结果；旧690d审核不代替文档新head独审。
