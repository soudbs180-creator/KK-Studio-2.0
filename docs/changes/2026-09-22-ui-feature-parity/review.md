# TASK-UI-005 独立预检

结论：PASS（dirty-diff 专项预检；不等同正式 PR/托管批准）。

最终审阅 38 个源码/测试/构建脚本文件，基线 HEAD 为 cf344ddcdf039c6e62aeb9c65106e2a2339c0bb4，原融合候选快照独立保留；未把其他 dirty 工作归入本批。

- review-manifest.json SHA-256：75925f0d6c0cbbb3bd27818c5466f3d278e12e63f5b33abbf3cde4852b07ad6b。
- 独立最终报告 SHA-256：c4d548db533652a8f0e65371090f3a28f6dad21d6607f846019996e847c4cdb5。
- 独立复验：28 单元、4 定向浏览器、完整临时 vendor TypeScript 检查通过；安装脚本幂等和拒绝覆盖本地修改通过。

| 项目 | 发现 | 处理 |
| --- | --- | --- |
| R1/P1 | 命名 SSE 被丢弃，未消费 hello；注册顺序不正确 | 保留事件名，恢复 hello 状态；注册后再激活/推送画布 |
| R2/P2 | warning 会话误判连接失败 | 接纳可用状态并显示可选工具提示 |
| R3/P2 | 旧审批回执清除新审批 | 连接版本与请求身份保护，保留审批队列 |
| R4/P2 | 旧悬挂请求锁住新连接按钮 | 操作状态按连接版本隔离，草稿保留 |
| R5/P2 | 首次准备可能重置另一窗口会话 | 专用条件初始化路由，在 mutation 锁内校验；旧服务无危险降级 |

完整记录：[初检](independent-review-initial.md)、[协议复核](independent-review-protocol.md)、[最终复核](independent-review-final.md)。原工程集成、全量验证与 Tauri 运行见 verification.md。

最终补审确认通道选择控件的职责拆分和格式调整无行为改变，仍为 PASS；当前 38 文件均与最终清单一致。
