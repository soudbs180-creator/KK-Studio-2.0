# Intent：首页失败后的编辑重试与连接恢复

- Task ID：TASK-CODEX-HOME-20261015，沿用原任务；Owner：root，唯一写入者。
- Branch：fix/TASK-CODEX-HOME-20261015-recovery；worktree：既有TASK-GOV-PHASE0。
- 稳定main：3a992597；临时堆叠基线：已推送PR62 head f9c6aa7186c67324d1af201823f03d46b188c29b。PR62正常squash后必须从实际main仅承接本任务独有提交，保留旧分支。
- 用户要求统一成果、实际Windows验证并最终正常合main；交接明确HOME/REF三项P2不能因PR60已合入而跳过复现。

目标：首次连接失败后，用户编辑提示词/附件再重试，发送当前输入；成功后旧待发草稿不再复活，结果与原首页图片节点正确连线。首页与代理自动连接并发时应等待同一次握手，不提前发送或中断相同连接。

保护九项目、两恢复副本、原始媒体、连接设置和homeDraft；验证仅用独立合成资料与本地fixture。历史auto-connect原值未知，不猜恢复。无付费生成、外部授权、发布或日常客户端替换。本轮不增加新生成通道或改变普通聊天草稿存储契约。

FACT：当前App以提示词相等清除持久pending草稿，手动onSend没有canvasSource；store在connecting时提前返回，相同setCredentials仍disconnect。INFERENCE：分别可导致编辑重试后复活旧草稿、结果漏来源边和首页连接竞态。必须先运行回归证明RED。现有完整安全源码9aa通过只能证明前置，不能代填本任务结果。
