# Spec：原生 TaskHost 提交、取消与恢复

- Task ID：T5；状态：READY；2026-10-08。
- 来源：[intent](intent.md)、既有 [durable intent spec](../2026-09-19-taskhost-durable-intent/spec.md)、[数据契约](../../architecture/DATA-STORAGE.md)。
- Source of truth：既有 TaskHostRequest、JobRecord、CreationTask、原生 TaskHost 与 asset/snapshot repositories；不增加任务队列或存储 schema。

使用实际 production Tauri release、原生命令和操作系统凭据库，fixture 只替代外部供应商。生成正常路径至少归档两项独立输出；请求到达时核对 journal 与稳定 idempotency key。返回前后取消保持保守受理语义；停止本地等待不能宣称供应商未计费。HTTP 连接、响应流、资产下载处于等待时都应能响应取消。

Desktop 的 submitted 持久证据是宿主 POST 前写入的 native journal；前端在 await IPC 回执时仍可为已持久化的 queued intent，随后保存 submitted。验收核对两份同身份 durable 记录，不能要求 IPC 回执必定早于原生网络请求。成功项目正常退出恢复和运行中任务异常终止恢复分别记录，不混用退出方式。

异常终止只针对本测试启动的进程树。使用原数据根重启；所有未确认任务恢复 unknown，已归档输出身份和字节保留。重放相同请求返回原记录，改变请求但复用身份报 conflict，不创建新的供应商请求。UI 中 unknown 不提供普通重试；Batch Matrix 的提示与逐项按钮复用实际 retryableOutputIndices 门禁，未知批次中即使有 failed 项也不能宣称可普通重试。

文本请求的原生容量在主进程持有：WebView reload 不释放运行任务容量；拒绝满载请求发生在 journaling/POST 前；取消后释放容量并允许新的独立身份。成功正文须非空、已完成，流中断仅保留草稿。

测试使用唯一凭据 ID，并先确认不存在；finally 只清理本轮合成凭据。密钥不写 journal、快照、报告、截图或 localStorage。数据目录、浏览器 profile、CDP 端口和服务端均隔离；已有端口被占用时失败，不杀其他进程。

Desktop 为本轮真实原生验收对象；Web 的 durable intent/unknown 契约运行现有浏览器回归；Mobile 尚无产物。离线/取消不清空已归档结果；保存错误继续保留原件，旧 schema 和原用户数据身份不改变。若仅补测试/文档不 bump；修复 Rust 和共享 UI 行为自动递增受影响 Desktop/Web patch。承接 PR #35 后本候选 Desktop 2.1.6 / Web 2.1.7 / Mobile 规划 2.1.1。普通局部取消修复不新增 ADR，沿用现有任务和存储 ADR。

AC-1–6 的结果和环境逐项记录于 [verification](verification.md)。回滚为 revert 本次修复，测试数据与历史失败证据保留；不删除用户数据或清理分支。

当前T5已验收候选04260ad（Desktop2.1.7/Web2.1.8）及main落地78cea37；AC1–6本机与当前Hosted通过。后续UI011组合版本单独取证，不复用旧产物hash；旧阶段版本文字保留历史。
