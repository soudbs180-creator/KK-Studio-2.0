# Spec：普通 Chat 图片归档

- Task ID：TASK-CHATGPT-IMAGE-POC-20261018；状态 READY；2026-10-18。
- 权威：[intent](intent.md)。工程外 kk-archive/PLAN.md 只作调查来源，不作为可发布依赖。

## 契约

仅 assets_add 图片归档扩展：kind=image，source=chatgpt-ordinary，imageUrl 为有界 PNG/JPEG/WebP base64 data URL；archive 包含 jobId、sha256、bytes、mime、projectId、chatId，可含 fileIdSha256。不得接受网络 URL、文件路径、凭据或回调。

HTTP 正式入口须证明已连接 client 与完整 project/chat/epoch scope；已有通用 MCP 无此绑定时拒绝图片归档，不借用全局当前目标。前端再次校验 scope、取消、魔数、MIME、实际字节和摘要，复用 assetRepository。固定来源 ChatGPT 普通 Chat（插件），isAiGenerated=true，sourceKind=provider；模型未报告时记录图片模型未报告。

同 project/chat/jobId 绑定一个 SHA；独立于可删除卡片的 imageArchiveReceipts 保存任务绑定，删除后重放明确拒绝且不复活。相同重放复用持久卡片与素材，冲突拒绝。串行归档，提交前后重验作用域。使用浏览器原生 Image.decode 和已有尺寸上限拒绝损坏图片。flush 必需且失败不能回 verified；素材 loadStoredAsset 原件回读校验，receipt 包含真实 assetId、canvasNodeId、SHA、字节、scope 和 verified=true。素材 sourceJobId 保留上游真实 jobId；不依赖内存 Map 宣称持久完成。

## 兼容与边界

已有 Codex/Google importGeneratedImage 行为保留。图片 API、额度查询和配对不在该归档函数内执行。无合法连接或持久化能力时返回明确错误；隔离测试不代表默认用户库已归档。共享前端行为影响 Desktop/Web，版本从 2.1.37 递增 patch；Mobile 规划不变。

## 追加阶段：订阅图片通道（FEAT-040）

1. 偏好为 auto/codex/chatgpt-chat，独立于 ModelSelection.source 与 provider 连接身份。默认兼容旧记录；普通 Chat 未连接或 Web 平台不提供原生能力时清楚显示原因。
2. sendMessage 返回 not-sent/accepted/unknown。调用 postTurn 之前才可证明未发送；之后异常、连接 epoch 变更或缺终态一律 unknown。只读已提交结果，不跨通道重发。
3. 自动通道只以新鲜、明确的服务方 ordinaryUsageAllowed=false 等权威拒绝为准，不能从 100% 窗口、未知 credits 或错误文本推断。显式普通 Chat 不读 Codex 用量。
4. 普通 Chat 只操作 KK 自有原生 WebView 的官方网页；每用户专属 profile，浏览器环境覆盖与重解析路径拒绝；远程页无本地命令权限。不得把登录推断为图片权限，未确认普通 Chat 页面/下载目标则停住。
5. 任务以 jobId+project/chat/epoch 绑定，保留 prompt 摘要与一次提交状态；重复 ID 同内容查询，不同内容拒绝。提交尝试前持久化，未知、重启、取消、迟到或导航不自动重试。
6. 原件只允许当前任务明确关联的下载，文件路径由 Rust 决定；完成后验 MIME/magic/大小/SHA，再由现有严格归档链解码、写素材、写画布、flush 与回读。普通 Chat 网页来源和既有插件来源分别如实保留。下载事件没有进度硬上限时明确该限制。
7. 实际本人登录、模式确认、一次新图片、原图回传、默认 Native 重启和额度归属是最终门槛；纯逻辑测试或隔离原图回放不替代。失败不切付费 API，不自动消耗重置券或购买 credits。

## Unknown 结果恢复契约（本轮用户授权）

- 恢复复用原jobId/project/chat/epoch/完整promptHash；不调用draft、prepare_submit、submit或新建job，不向模型重新发送。公开历史搜索只向唯一搜索对话框写本次已知检索词，不能写消息composer/按发送。
- 唯一受限搜索结果、规范官方会话、原提示词全文精确匹配和唯一关联图片均成立后，才可沿既有同图预览/唯一下载链恢复。未找到、搜索非唯一、身份或scope改变、验证页一律停止，保持Unknown。
- 已知完整查询的自有搜索对话框内若仅有一个可见规范会话链接，允许只读打开该候选核对全文；标题或截断片段不证明匹配。多个规范链接（含同路径重复或禁用链接）拒绝选首个；候选全文及唯一图未核实前禁止打开图片或下载。
- Unknown不是已提交或已完成的别名；只有正式Native自有window/generation下的实际下载完成、magic/大小/SHA验证，才能将该原任务推进Downloaded。不能接外部路径/脚本/URL/任意bytes来代替该证据。
- 恢复后的归档复用现有archiveImage和Native持久确认；相同任务/SHA只保留一份原件/节点，确认后清理owned暂存。重复恢复Downloaded/Archived只返回已有状态，不再次下载或发送。原Unknown失败投影及一次性guard保留供审计。
- 对仍在运行的正常KKAI实例，先完成可审查候选与验证；如需载入新代码，只在持久保存/无运行任务的证据成立时正常关闭重开，不kill或中断用户工作。首次本人网页登录的profile继续复用，不复制凭据。
