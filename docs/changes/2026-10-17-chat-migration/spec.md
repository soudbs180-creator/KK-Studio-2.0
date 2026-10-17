# Spec：旧聊天无损迁移与普通聊天恢复

- Task ID：TASK-CHAT-MIGRATION-20261017；READY；[Intent](intent.md)、[Plan](plan.md)。
- 规范来源：[ADR-022](../../architecture/adr/ADR-022-project-chats-and-v3-migration.md)、[ADR-021](../../architecture/adr/ADR-021-native-local-repository-authority.md)、[数据存储](../../architecture/DATA-STORAGE.md)。本包限定当前用户请求，不改写旧审计PASS。

## 数据与迁移

复用同一snapshot、CAS、保存队列和Native authority。snapshot3、repository identity version1/format2/minWriter2；repositoryId、存储路径与用户资产身份保持。Native activation protocol1与KK Agent HTTP7分开。

迁移基于原始JSON Value，先严格预检。保留已有chat ID及所有字段；已有root与chat各自的消息/草稿/线程同时检查，不能选一边覆盖。可靠旧Codex线程成为独立legacy-codex上下文；缺乏来源证据的正文/附件草稿进入明确待核对的恢复chat，不自动混入Codex或Google请求。任务未知来源保持unknown，不伪造activeChat归属。Google canonical正文为单一权威；恢复上下文仅保留所需非秘密状态。输入相同产生相同候选，重试不重复迁移。

Native在现有四把生命周期锁内、TaskHost恢复及owner发布之前，保全main/bak/identity/journal原始字节，write/sync/hash/readback归档及候选，持久步骤manifest；先发布v3备份屏障，再主文件，再同repositoryId新marker/完成回执。故障中间态按摘要继续，未知组合/future/IO拒绝可写，绝不空库回退。普通项目包导出/恢复与聊天媒体引用同步支持。

Web standalone同一IDB readwrite事务保存archive/main/bak/marker/receipt，成功之后才切可写或更新弱副本；future主备/本地journal继续保护。Node companion拒绝Native根并在发布前复检，Windows标准读写owner锁与Native独占锁双向互斥；不宣称任意旧无锁软件安全。

## 聊天权威与运行

v3活动chat是唯一可写messages/draft/thread/Google恢复上下文、主Agent及模型允许范围来源。旧root投影只用于兼容组件，不作为第二份持久权威。作用域是projectId+chatId；所有附件、voice、Skill/Partner、回执、草稿清空和线程保存冻结该作用域。

HTTP7的state/turn/tool/result包含scope和epoch；服务受理时冻结原chat、thread、turn和canvas状态。切换聊天后迟到结果保留原来源，旧服务/错scope/空允许范围拒绝执行，不替换已有线程，不自动重试unknown任务。canonical用户/助手消息落盘后，离线重开无需远端即可阅读。

保持现有界面、tokens、存储keys和凭据身份。临时、新窗口等未验能力继续明确禁用。Desktop先验收，Web共用语义但独立记录；Mobile不实施。

## 验收映射

AC-1对应主备原始SHA和恢复演练；AC-2对应迁移向量、每步IO/崩溃/未来格式、聊天切换编辑与媒体包；AC-3对应真实服务scope隔离、线程/历史/允许范围与迟到响应；AC-4对应当前SHA完整verify、Rust、独立review、官方产物、资料副本演练后默认库迁移及关闭重开。
