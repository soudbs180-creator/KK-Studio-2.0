# ADR-022：项目内普通聊天与快照 v3 的不可降级迁移

- 状态：ACCEPTED（设计已采纳；不代表实现、运行验收或发布完成）。
- 日期 / Task ID / Owner：2026-10-16 / TASK-KK-UNIFIED-20261015 / root；多聊天实施者 multi_chat_mapping。
- 决策来源：用户批准 PROJECT / MODEL / TEMP / REPO / TRASH；root 2026-10-16 对单 canonical draft、旧通道分聊天、Native/Node 互斥边界的技术裁决。
- 延续 [ADR-019](ADR-019-unified-local-repository-and-optional-account.md)、[ADR-020](ADR-020-project-lifecycle-in-creation-snapshot.md)、[ADR-021](ADR-021-native-local-repository-authority.md)。本决策不改变可选登录、手动加密同步和本地原件边界。

## 问题与取舍

当前 CreationProject 同时保存 API messages/composerDraft、Codex threadId 和 GoogleConversation，Agent 草稿另在 React 内存。把这些数据复制到 chats 同时保留旧 project 读写，会产生两份权威；单加 UI tabs 或只用 projectId 的 epoch 会串线程、草稿、工具和结果。旧 v2 normalizer 会删除未知聊天字段但仍允许写回，故不能以 additive v2 发布多聊天。

采用同一 CreationSnapshot、同一保存队列和 CAS，同项目共享 canvas/items/tasks/materials。新普通聊天仅一个可见持久 draft、一个本地 canonical transcript 与具体执行适配器的非秘密恢复上下文。拒绝聊天另存数据库、每聊天一份项目/画布、三套常态输入槽、把 chatId 填进 projectId、只存外部 threadId 却宣称可完整备份。

## 普通聊天权威

- 快照 version 从 2 升 3；project 增加 chats 与 activeChatId；移除项目级 messages/composerDraft/agentThreadId/googleConversation 作为活动权威。project.id、canvas/item/task/asset ID、组、垃圾箱、凭据引用、路径和浏览器 key 不改变。
- 每 chat 保存 id/name/time、单 draft、完整本地消息、具体执行上下文、主 Agent 选择及允许调用模型 ID。新聊天主 Agent 默认 Codex，允许范围为空；默认普通聊天不复制另一聊天上下文或自动授予新模型权限。
- 新聊天的主 Agent 仅开放当前已验证且有执行路径的 Codex 能力；现有 direct/Google 旧聊天用其真实普通执行链恢复，不冒充新通用 Agent。高级/未验证调用选择禁用并说明原因。切主 Agent 保留当前输入，不发送；外部模型调用在宿主检查实际 allowlist/verified capability，空范围禁止 tool run_generation 外部调用，用户手动画布生成不受此条冒名限制。
- messages 是唯一本地正文权威；Google adapter 从 canonical messages 构造请求/兼容 record，在保存回执时合并一次，不再持久一份 google.messages。Codex UI 的活动/流式状态可临时投影，但断线/重开显示已保存本地历史，不依赖模型/网络才能阅读。
- 恢复上下文按具体适配器保存 opaque IDs、状态和最小 pending turn/提交回执；不是第二套任务队列。计划和媒体任务继续沿现有项目级 stagePlans/tasks，增加明确 originChatId；没有证据的旧来源保留 legacy/unknown，不能编造精确来源。

## 旧通道无损拆分

迁移只处理真实存在的数据，不为空通道造聊天。稳定 chat ID 在每个 project 内可用 `legacy-direct` / `legacy-codex` / `legacy-google`，空项目 `chat-default`；作用域始终是 projectId+chatId，不能把裸 chatId 当全库身份。

1. 旧 API messages/未发 draft、Codex thread/pending 和 GoogleConversation 是不同上下文，存在时分别迁成普通聊天。单一旧上下文只产生一个聊天。
2. 旧 root.messages 的确切写入者：model.createProject 给所有 HOME 路径创建 `${projectId}-message`（API 或 Codex 均可能）；App.submitImageCommand 仅 chat 来源追加 `${projectId}-message-${taskId}`，Agent/Google 回合不追加此数组。因此不能因为存在 Codex thread 就把整个 root.messages 分给 Codex。
3. 带有效 taskId 且 prompt/消息身份一致的追加项归旧普通对话。初始项只有同时存在可靠创建来源（如未退役 pendingAgent+Codex selection+匹配初始内容，或未被改写的 Codex 根卡标记）且不与直接聊天证据冲突时归 Codex；不得仅靠模型名、当前选中 channel 或相似正文判断。
4. 无法确定来源的非空 root.messages 原样保留为标明“旧消息，来源待核对”的普通历史聊天，不拼进 Codex/Google 上游上下文。保留所有原 ID/role/content/time，不靠去重相似文本删记录，不自动外发。
5. draft.pendingAgent 明确归 Codex；其余旧 composerDraft 以可靠持久执行通道/直接输入来源决定。非空 draft 与来源无法确定时，进入对应保全聊天并标来源待核对，不默认发送。只有偏好、没有正文/附件/线程/消息的空槽不产生额外聊天。
6. 活动旧 channel 有持久可信记录且对应 chat 存在时选择它；否则确定地选择含真实内容的一项；空项目选择默认 Codex。global kk-chat-channel 只作旧弱偏好，不作为历史来源证据或新聊天授权。
7. 迁移时若该浏览器真实仍持有 Agent 内存草稿，交给其 project+旧通道对应 chat；不能跨通道覆盖。相同来源有两个不同未发草稿时才显式保存为可见恢复草稿，保留两个版本，不建立一般化多 slot。
8. 已有消息缺失/无效字段必须使预检失败或显示待恢复，不能 normalize 成空成功。原 v2 原始字节及迁移关联报告不可变保留。

## 格式屏障和事务顺序

Native 仓库身份 format/minWriter 从 1 升 2，身份文档 version 仍1、repositoryId 不变。新代码明确接受旧 identity 1 进入升级预检，不是简单改常量使全部旧 marker 无法打开。快照文件仍 `projects/creation-v2.json`，后缀是历史路径，不代表只能装 schema2。

1. AppPaths 只做目录与兼容身份准入。Native authority 先取得 root、snapshot、asset、TaskHost journal 的现有 OS 句柄，再检查主/备、现有 Node companion 身份/metadata，完成可逆预检；在升级成功前不创建 TaskHost、不运行恢复、不发布可写权威。
2. 读取当前有效 v2，并保留 main 和原 backup 的不可变字节档案（含 SHA-256、原 revision、目标格式和迁移步骤）；所有归档先 write/sync/readback，重试只接受相同摘要，不能覆盖另一原件。
3. 准备并严格校验 v3 候选（含全图/聊天/任务/素材引用）与新主/备临时文件。已有 corrupt unused backup 沿 NAT-AUTH-01 规则保留，不以垃圾备份阻断有效主；未来格式/IO 必须阻断。
4. 在锁内先发布 v3 backup 建立旧 Native write 屏障，再发布 v3 main，最后更新同 repositoryId 的 format2/minWriter2 marker 并完成迁移回执。每一步有固定摘要可在崩溃后校验恢复；中途失败不返回 writable/success，不退回空库或另一个目录。
5. 不允许最终 v3 main +可写 v2 bak；旧 v2 仅可在不可变 archive 作为显式恢复输入。可恢复中间态在步骤档案与字节匹配时由新代码继续，未知组合 fail closed。
6. Web standalone 使用同一 IDB readwrite transaction 原子发布新 snapshot、新 backup、旧原件 archive 和迁移回执。保留全局 revision CAS；只在事务成功后切 writable、更新 localStorage copy/pending journal 基线。future主/备/local/session journal 不能被低版回退覆盖或成功后清除。
7. 项目包 checksum 验证原始包结构在先，迁移在后；旧包恢复到独立新根时同样发布 v3 主/备/身份屏障。新的包外壳 transport未改变时保留 outer version1，内部 snapshot 明确为3。

## 旧软件拒绝证据与范围

已只读核对 2.1.33 `235e7f79` 与 2.1.34 `d95e4c44` 的旧 Native creation_validation：只有 version2 可读，其他数值版本返回 unsupported。其 SnapshotRepository.current 对 unsupported main 不回退；main损坏时 bak3 同样 unsupported。旧 writer 在写 backup 前 decode 已有 bak，遇 unsupported 返回，故升级期间 main2/bak3 也不会由这两版普通 Native writer 覆盖。升级完成后旧 owner 生命周期锁 / schema3 主备分别保护运行中及退出后的普通快照入口。

旧 TS snapshotCodec 同样拒绝 version!=2；旧 standalone writeIndexed 在 IDB transaction 内先 decode 已存 current，schema3 会 abort；loadCreationSnapshot 在 writable=true 之前解码 main/local/indexed，future数据不变空可写。上述是源码证明，实施还需固定旧 reader 在合成 v3/坏主+新备上的真实回归。

**不能由此推断任意旧软件安全。** 旧 Node 不必服从 Native OS 锁/marker；`asset PUT`、restore、deviceId 等路径不依赖 snapshot version。2.1.34 Node 旧 writer 也未有本轮 CF-01 的所有 backup 保护。新 schema3 不能当全目录隔离。

## Node 旧伴随服务边界

- 当前 CompanionStore 仅用于它自己的 Node 仓库/显式导入源，不可指向 Native 根；Native/Node metadata 不同，不通过切 folder 变共仓库。后续 Web authority adapter 才连接同一 Native Arc。
- 沿现有格式 guard 增加一个 store-level `assertStandaloneRoot`：启动首次写目录前、main.deviceId前、每个public read/write/stage/publish/list/backup/preflight/import/restore/assetBlobPath入口，以及异步请求读完body后的发布/响应前复检 Native `app/repository.json`。存在该路径（包括坏 JSON/未来版本/异常路径类型/读权限错误）即拒绝，不能当不存在或改写它。
- Windows 的空根并发将在隔离子进程验证：Node持有同一个 `.kk-native-owner.lock` 的标准读写文件句柄，Native share_mode(0) 与之双向互斥；晚开的Node也会被Native现有独占句柄拒绝。验证成立才采用，并用明确close生命周期，测试/异常启动不可漏句柄。它不是Node间通用CAS锁。
- Unix Node普通open不等于flock，不宣称同等 OS 互斥；marker/操作复检仍启用。跨运行时并发保证与平台证据单独报告，不能以Windows通过冒充所有平台。
- Node实例先开空目录后 Native marker出现、上传body读到一半、asset stage已存在、restore预检后目录被认领，都应拒绝后续数据操作并保留原目录/上传/备份字节，不另建IDB。Native准入同时拒绝已知 companion身份/裸 metadata，避免双方误认。
- 任意老Node二进制/第三方无锁写者不在修复保证内；不要在真实用户目录运行旧写者试验。

## 执行 scope 与归档

- `ChatScope={projectId,chatId}` 是持久身份；活动连接再带 runtime epoch。项目/聊天切换、重新读取和连接改变立即失效旧 UI 回调。权限、附件、voice、Skill/Partner、自定义事件和controller共享同一 scope。
- KK Agent HTTP 协议升7（不是上游 Codex app-server 协议版本），新的 state/turn/tool/result 包含 scope；服务在 turn受理时固定真实 project/chat/epoch+thread/turn，不再只绑定 clientId。旧服务不支持scope时明确禁用；旧turn不能读到同窗口后来上报的新画布。
- 旧普通高级“新建Agent会话”不能静默替换本chat线程；普通聊天创建由明确“新聊天”入口完成。新窗口/临时/通用多Agent/并行主Agent不在此阶段开放。
- 受理之前所有await按活动scope fencing，失败保留原草稿；受理之后 Native媒体任务、Codex/Google媒体结果的归档按冻结来源，不受UI epoch误取消。沿现有任务/线程恢复入口读回执，unknown不重发、不换渠道。
- 聊天作品入素材库并关联原聊天消息，只有用户“添加到画布”才创建画布卡。画布发起任务按 sourceItemId回填；legacy/unknown旧结果保持旧行为，不能误判后全部移出用户画布。

## 临时聊天和交付

本阶段仅普通聊天；临时菜单明确禁用原因，不将 temporary记录塞快照后再让各exporter猜测过滤。其执行层不写记忆、Codex补充历史、journal、promptHash/ref/origins的链路在后续阶段实现并验证，不能本阶段挂名完成。

验收包括旧通道迁移向量、每步崩溃/IO、旧reader拒绝、Node/Native格式隔离、全chat重开/导出恢复、同项目切换迟到事件、accepted图片归原chat且不塞canvas、主Agent默认/空allowlist真实执行、390/1099/1920及连续缩放、当前release Native实际产物。所有检查/审查/托管CI/外部真实Provider各自记录，不由schema测试升级为完成。
