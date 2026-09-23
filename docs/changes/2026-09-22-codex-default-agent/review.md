# 独立审查

状态：PASS（Web 首批范围），2026-09-22。实现者与只读 agent_review 在独立上下文检查；没有替代尚未完成的 Desktop/第三方账号验收。

审查覆盖登录桥、SSE/握手与历史、项目/回合隔离、权限、取消、API 凭据身份、生成受理回执、图片归档、模型能力与参数映射，以及并发 UI 合并后的状态恢复。

| 发现 | 修复与复核 |
| --- | --- |
| 写入已经受理、回执丢失后新 requestId 自动重试可能重复生成 | 串行工具队列，未知回执锁定并中断；不能把该错误被末尾 completed 清空。单测及独立复核 PASS。 |
| 多账号同名模型可能误用其他目录的尺寸 | 显式 connectionId 优先；无身份时仅允许唯一候选；测试 PASS。 |
| 初始化过程中旧 hello 可覆盖较新 ready/审批/回复 | 握手后缓存状态事件，历史播种后顺序重放，过滤旧 revision；原始复现保持 revision=2、sending=false 和已清除审批。 |
| 初始化工具等待历史/模型后迟到写入 | 收到时立即返回恢复中未执行，绝不缓存重放写入；terminal 取消旧队列。独立复现 applyOps=0。 |
| 历史复合 ID 与实时 raw itemId 导致重复回复、重复 delta | 按 thread/turn/item 去重；服务只返回 settled turns，历史 assistant 标 completed 后拒绝追加 delta。真实连续两轮刷新与独立内存复现 PASS。 |

最终专项复核：`agentConnection + agentEvents + agentPreparation` 24/24 PASS；另三个无端口复现场景全部 PASS。每个场景后发送下一轮并交付 fresh tool_call，恰执行一次，确认旧 abort 不污染下一轮。最终未发现新增 P1/P2；没有文件修改、真实服务或收费调用来自审查代理。

完整门禁、实际浏览器与账号验证由主代理执行，见 verification.md。状态 PARTIAL 反映 remaining.md 中的明确范围边界，不将全部市场 API/所有 App 宣称完成。
