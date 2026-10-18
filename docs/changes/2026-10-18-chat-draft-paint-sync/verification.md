# Verification：草稿绘制同步与发布门禁

- Task ID：TASK-CANVAS-RELEASE-20261018；交付包角色：current；记录状态：IN_PROGRESS / 整体NOT_VERIFIED。
- 日期：2026-10-18，Asia/Shanghai；base及当前已提交HEAD均为87c9cfbe0f19555f9998d6b7051760f22f26f67f；以下新修复结果绑定预提交工作差异，不冒称精确新提交通过。
- branch：fix/TASK-CANVAS-RELEASE-20261018-draft-race；[Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Review](review.md)。

| 检查                                                       | 实际结果                                            | 证据与边界                                                                                            |
| ---------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 历史main87c quality39130558124                             | 五job success；Browser836 PASS+1 FLAKY              | sending-chat首次文字拼接失败、retry通过；原日志保留，不称零flaky或可直接tag                           |
| 原用例4倍CPU诊断                                           | 20/20原断言通过，但20份逐帧记录发现可编辑跨聊天草稿 | 工程外draft-race-cpu4-instrumented.log、draft-race-first-pass-events.json；原拼接选择区交错未直接重现 |
| 新rAF断言+旧source                                         | 1 FAIL / 1 PASS，RED                                | draft-frame-old-red.log：A标签可编辑框显示B草稿两帧；不是等待超时                                     |
| 同断言+布局阶段同步                                        | 10/10 PASS，5轮两变体、workers1/retries0            | draft-frame-layout-green.log；4倍CPU，原请求/回执/消息/附件/持久化断言保留                            |
| 当前差异lint / typecheck / 两文件Prettier                  | exit0 / exit0 / exit0                               | draft-race-lint.log、draft-race-typecheck.log及root实际格式检查；不是完整verify                       |
| 独立dirty差异预检                                          | 最小hook/import差异和RED/GREEN文件摘要已核对        | independent-draft-layout-precheck.json；不是新head正式批准                                            |
| 新提交完整verify / 精确独审 / Hosted / Delivery            | NOT_RUN / NOT_VERIFIED                              | 待提交及实际head结果，不沿用旧SHA                                                                     |
| 最终main / tag / Hosted setup / installed / 生产Web-Mobile | NOT_RUN / NOT_VERIFIED                              | 仍需完成原任务全部AC，不将局部草稿GREEN当统一发布完成                                                 |

预检产品文件SHA256：3097049122867ac0a152cad3a97de07877cea26e5ef83f467caf9ee954bc3d26；测试文件SHA256：db6474b95d6ef75e131a652bc837da743bf6f7088c40bcf5930e5440ff41d1c0。RED日志SHA f92e27d418f7b87f6985167562b3b14bc7bbfb1f61c45efd3706442f2d5174de，GREEN日志SHA877e9a8486a1f3a20d7171f09a48d2d4082b9dc79514d1f22aadfaffc9024816；代码再变后这些结果只属于原工作差异。

UI链为真实聊天tab→ConversationPanel→可编辑对话textarea，rAF检查所选tab与输入值；未向真实Provider发新turn、未改用户资料。Desktop/Web本次局部fixture已覆盖；新head完整Desktop/Native和Mobile矩阵仍待正式验证。历史PR4968零flaky与main87c一flaky分别保留。工具栏、冷备、codec与旧Native结果见原包及工程外原始收据，不改写为新修复实际运行证明。
