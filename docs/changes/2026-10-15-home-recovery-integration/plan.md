# Plan：首页恢复串行实施

- Task ID：TASK-CODEX-HOME-20261015；状态：IN_PROGRESS；[Spec](spec.md)。
- 依赖：PR62测试进程/证据保护 → 本任务 → Canvas/Responsive。当前只在已推送安全head上临时堆叠；旧会话不恢复开发，子代理只读检查测试设计。
- [x] 核对当前源码、原HOME/REF合同与测试规则，保留旧账本证据并领取同一stable ID。
- [x] 先补连接并发/相同凭据/取消与迟到完成的确定性RED；最小修复后定向与邻域GREEN。
- [x] 浏览器复现编辑后草稿复活和来源漏传，最小修复并验证当前新输入、普通聊天、失败/重载隔离。
- [ ] 递增实际受影响Desktop/Web版本；完整verify、生产运行来源/DOM/截图及新隔离Tauri证据，独立源码审查。
- [ ] 上游squash后从稳定main只挑本任务独有提交，重新核对冲突/测试/独审；正常PR/Hosted/main及实际客户端按证据验收。

运行失败原件只追加，不重写旧结果；端口1421/1423严格串行，不杀占用进程。保持默认profile与测试资料隔离。

实现边界已按职责移入homeAgentRecovery：共享proxy身份、请求来源/数量、仅退休本次持久pending草稿；App文件低于原main规模，不新增大组件或放宽健康阈值。旧连接初始化主体保留原函数，public connectShared管理共享等待。额外读取期覆盖问题单独TODO，不混写三P2验收。
