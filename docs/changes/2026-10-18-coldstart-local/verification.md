# Verification：冷启动严格比较

TASK-COLDSTART-LOCAL-20261018：IN_PROGRESS / NOT_VERIFIED；source base fe103d2b，branch fix/TASK-COLDSTART-LOCAL-20261018。Desktop/Web原2.1.39，Mobile候选2.1.1不动；已fetch的origin/main c248d817其版本Desktop2.1.37/Web2.1.38/Mobile2.1.3属于并行集成来源，不冒充本候选或Hosted复验。

开工9登记树/16原本地分支（本轮新分支另计），全部141dirty逐份稳定复制/index/diff/status/all-ref bundle及raw checkpoint：D:/KK-Studio-recovery-20260921/sidebar-canvas-20261018-d0cffabe-7380-43be-b482-e280d7be4df4，receipt SHA a9937aa2f4a00c4434187ce346509e94f26248d71ad85f72958497bba6af8df8。原主仓8c HEAD/index保持，但并行从69增96dirty，旧63中已有部分被并行作者改动：历史比较receipt233d4c85保持FAIL，当前96已复制；不恢复/覆盖新版本，不再冒称旧63仍全同。

开工时上轮cold FAIL、四数字差异、actual历史Agent callback UNKNOWN、随后activation全字段一致的收据均原样保留。它们不替代本轮真正冷启动验收。开工实际原Native PID50396/CreationDate1792264675745/EXE e9caebca，无CDP；后续当前资料份数与进程身份须现场重新核对。下方按阶段追加当前验证，不把开工未知改写为通过。

## 最小根修复与预审阶段

AgentHost正式RED第二轮5失败/1保护正例通过；同值thread跳过commit，同值消息完整持久化JSON比较，不跳过安全校验和await flush。新增metadata-only变化正例。taskRecovery正式14条RED为6PASS/8FAIL，测试原SHA不变，修复后原24+新14为38/38 PASS，另nativeTaskHost31/31 PASS；收据implementation-verification.json SHA33e7a4e6d76100c24ffbae05d1dcf74239f83c2a1952978cd3023e763f209777。

独立Spec预检拒收COLD-SPEC-001/P1：mergeAgentChatItem对完成态历史补入own turnId:undefined，原JS sameJson仍误判变化，82项旧回归未覆盖。原拒收收据f8ce56da保留。root新增真实merge路径回归先RED（7PASS/1FAIL），双方JSON归一后比较，保留全部实际metadata及错误上报。首次扩展回归112/113的原FAIL来自旧agentConnection断言要求重复保存至少两次；它与新幂等契约冲突。保留旧失败，仅将该断言改为“首次真实变更有commit、第二次相同回放零commit且仍flush”，原身份/内容/metadata断言全部保留并补引用保持。新113/113全部PASS，0skip。不存在通过放宽持久化字段或忽略时间让冷启变绿。

全仓lint/typecheck初检exit0（既有2条advisory未扩scope），最终修正后的完整verify和精确commit双轴补审仍待。Desktop/Web已用官方version:bump递增2.1.40，Mobile2.1.1未变。

## 构建前保全阶段

精确核对原PID50396/CreationDate/原EXE后，复制旧2.1.39 EXE、build receipt、dist、Agent运行时及原数据启闭前critical共4447文件，逐份源/副本SHA一致；随后仅CloseMainWindow正常关闭该实例，0实例后复制完整用户profile。工程外新根D:/KK-Studio-recovery-20260921/coldstart-local-20261018-fff10774-062f-4668-a206-44b6db0aec10，prebuild receipt SHA293758ed11b8a2ca1e4a03a9c75c71a50f0545cef6d8934f621425848c8d6a2c。

完整资料2849文件/350742192B、124目录，source与target逐份hash、前后清单闭合/0差异/0错误，runtime-userdata-b483afe2-d948-49fe-ac24-f9a459942791，receipt SHA0a7c0a5e8d204df9f201f702449b6cd66b0e97ec0048164e0b223a406940104e。仅证明该观察区间，不声明live永久静止；系统凭据库未导出。无删除、移动、force kill或回退用户资料。
