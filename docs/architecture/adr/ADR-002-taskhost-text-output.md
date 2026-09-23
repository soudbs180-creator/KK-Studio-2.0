# ADR-002: 在现有 TaskHost 保存文本输出

日期：2026-09-21。状态：接受（用户请求授权范围内的 AI 技术决策）。任务：BACKEND-TEXT-NODE。

当前 Rust chat_completion 是孤立旧接口，缺取消/持久 intent，不适合作为新任务引擎。选择扩展现有 TaskHost request.kind（缺省 image）与 output.text，可复用幂等、journal、取消与 unknown 恢复。备选新聊天队列会制造第二状态源；浏览器直接调用旧命令会绕过原生宿主，因此不采用。

文本单输出，最多32 KiB UTF-8，先完整接收再成功；流式草稿不算最终结果。最终以项目 Canvas result.text 和 journal 保存，不进入仅支持媒体 MIME 的 asset repository。旧图片请求无 kind 时序列化/指纹不变，旧 output 无 text 仍有效。Web/原生沿用既有项目快照与恢复规则，不改变用户数据身份。

风险是重复提交、截断假成功及 journal 限额；用未知受理门禁、严格终止、文本/响应上限和回归约束。回滚保留含 text 的 journal/项目文件，停用新提交，不删除用户结果。

2026-09-22 补充：Desktop 文本提交重新检查连接身份/健康状态，但不持有 Web Locks lease。原生请求寿命长于 WebView，故并发计数在现有 TaskHost jobs 内按 credentialRef 管理，concurrencyLimit 有界且在 journal 创建前校验；不新建队列。恢复只读取 journal，保留已存在的用户文案/标题。完整原生进程恢复和 image health 统一仍归 T5。
