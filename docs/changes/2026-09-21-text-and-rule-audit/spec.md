# BACKEND-TEXT-NODE / TASK-RULES-003 specification

1. 文本创建使用现有 Canvas/Task/Provider connection 和凭据库；不新建队列。仅单输出，无图片附件；每次请求绑定明确文本模型、地址和凭据身份，不自动跨账号切换。
2. Web 直接流式 fetch，Desktop 使用同一原生 TaskHost。文本在 journal output.text 保存并最终写入 Canvas result.text；它是文本内容，不伪装图片素材。请求 kind 缺省 image，保持历史图片兼容。
3. 请求前写入 durable intent；执行前重新检查连接/租约/取消；缺凭据、离线、身份变化、节点删除必须停止发送。流式非空且完整结束才成功；断流/取消后受理未知保持 unknown，禁止自动重复收费提交。迟到结果不覆盖取消或其他项目。
4. 文本最多 32 KiB UTF-8；SSE 响应/单行有上限；严格 UTF-8，允许跨 chunk；无 DONE/finish_reason、错误事件、畸形 JSON、空文本都不可成功。
5. 功能卡片由人维护、看板脚本生成；REAL 要显式平台证据、有效代码/测试/入口及 DONE/PASS 任务。非 REAL 必须有真正开放任务。历史结论用本次勘误纠正，不改写旧测试记录。

Web/原生 fixture 只证明产品协议链路；真实付费服务与完整 T5 进程恢复验收不混同。功能状态按最终证据保守更新。
