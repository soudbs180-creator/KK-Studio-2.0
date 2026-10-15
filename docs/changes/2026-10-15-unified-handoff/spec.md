# Spec：接管可执行上下文

1. 8个原active主会话各仅一次安全暂停；支持工具回读8主和4此前active子会话均idle，保留原本idle/notLoaded会话不唤醒。任何状态覆盖或历史分页缺口明确保留。
2. 分别验证容器/工程身份、common-dir，完整分支/worktree/HEAD/dirty；不以历史转述当当前Git实查。仅受支持会话工具，不访问禁止存储。
3. task-ledger.json仍是唯一任务权威。只新增TASK-GOV-006，handoffMatrix保存192个稳定taskId的来源映射、历史状态集合与承接处置；51差额只是覆盖差异。保全部来源原对象/版本/验证，并标交付链UNKNOWN，不盲目改旧状态。
4. 按需求与实际代码形成归并家族；HOME/REF/Compress、Canvas/Responsive等保独立契约，先比较差量再整合。模糊重复标待核实，不删除源目录/分支。
5. 容量错误/会话恢复重试/遗失恢复任务、未开发与优化、负责人排期待确认、用户最终验收权全部继承。Desktop/Web/Mobile分别验收，不把窄Web当原生Mobile。
6. 承接包给完整main/候选SHA、版本差异、证据边界、权限与数据保护、正常PR/main/构建/客户端验证门槛。最新要求本轮收口后另建正式执行会话，不在本轮实现产品。

失败边界：列表活动分页不支持、源主控返回空、site会话items不支持、历史证据与当前冲突都保留UNKNOWN/CONFLICT。工具断连失败追加保存，重连结果不抹去旧失败。
