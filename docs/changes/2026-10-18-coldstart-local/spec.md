# Spec：启动恢复与同值持久化幂等

TASK-COLDSTART-LOCAL-20261018；[原意](intent.md)、[计划](plan.md)、[验证](verification.md)。

- 既有父任务与多个终态重试子任务完成一次归并后，若完整持久化语义最终未变，恢复返回原快照，不刷新任何任务/项目时间或CAS revision。真实状态、error、output、归属/unknown及未知扩展字段变化仍保留并保存。
- Agent宿主在权限、项目/聊天/线程与输入校验后，相同threadId或完整消息值不触发commit；仍等待flush并传播保存失败，不能以同值绕过边界或返回假成功。内容、顺序或metadata真实变化仍保存。
- Native journal与retry结果按完整链最终值判定：旧或相同validated回执造成中途往返、最终完整持久化值未变时，复用原任务/项目/快照，不发布本链生成的审计时间和revision。原始Native记录自带合法finite时间的新validated回执仍保留，即便只有时间变化；normalizer为兼容补入的本机时钟不代表新原生证据。全部真实error/output/unknown/items/canvas和未知字段变化也保留。不得跳过原生读取、回执校验、素材归档和不明受理保护，onlyTaskIds过滤仍保持原语义。
- 复用当前snapshot3/identity2及原存储身份，无新存储、协议/权限或状态机。原草稿、消息、画布、选择、opaque字段、凭据引用及原始迁移文件保持。
- 先合成RED与正例回归，再冻结精确源、完整工程验证、官方当前Native构建及原默认库真正正常关闭/冷启动。严格比较覆盖全部字段/时间/revision，不能沿用原地activation代替冷启，也不修改旧reopenHash或过滤新的失败字段。
- 冷启遇真实未完成状态恢复时保留合法变化与原件，按证据分流，不回写旧库或强制归零。现有主/备及完整用户profile在构建前保全。内部Native IPC与附着前网络没有观测时不声明零调用。
