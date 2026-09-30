# Spec：原生生图事件只传元数据

- Task ID：TASK-AGENT-008；状态：IMPLEMENTED；日期：2026-10-01
- [Intent](intent.md) / [账本](../../governance/TASK_LEDGER.md)
- 基线：main@709e51d，锁定 @openai/codex 0.155.1。
- 实现权威：codex-client.ts 的 normalizeItem / handleNotification；http.ts 的 generated-image 鉴权文件端点；agentConnection.ts 的 syncGeneratedImages；agentHost.ts 的原件导入。无新增 ADR、schema 或 UI 设计。

## 行为与数据

app-server 的 imageGeneration / image_generation started/completed 通知均克隆后去掉 result。id、type、status、savedPath、revisedPrompt、transparentBackground、failure 及其他元数据保持；普通工具 result 原样保留。稀疏完成通知沿用已有合并。不得修改输入对象或把 failed/queued/running 宣称为完成。

素材归档完成后，提交前再次读取当前项目，检查相同生成身份是否已由并发通知导入；存在则返回，不重复提交或追加 agentGeneratedImageIds。保留项目切换/取消保护和原件归档；已经存在的历史重复标记不伪造为已修复的旧证据。

SSE 和补充历史传同一份规范化元数据；图片通过现有受鉴权、thread/item 定位、路径/类型/25 MiB 大小校验的端点获取，再归档为 KK 拥有的素材。没有有效完成文件时继续返回真实错误，不增加任意路径读取入口。取消、断线、文件丢失、失败和重启沿用现有状态及恢复行为。

用户输入 messageText 与模型 prompt 分开：固定画布规则随请求发送；显式 Skill 可加入其 instructions；开启记忆才加入最多三条相关片段。当前默认记忆关闭。请求没有重复拼接历史，Codex 持久线程仍保有自身上下文。本次不删减保障真实操作的固定规则。

## 平台与生命周期

| 能力 | Desktop | Web | Mobile |
| --- | --- | --- | --- |
| 规范化原生生图事件 | 本机真实生产生图 PASS | 共享 Agent/浏览器回归 PASS；真实账号未独立验收 | 本次未验收 |
| 素材归档恢复 | 原生仓库重启/唯一归档 PASS | 既有 IndexedDB 回归 PASS | 未验收 |
| 豆包生图 | 登录外部条件未满足 | 未验证 | 未验证 |

补丁仅变更传输，不改图片原件、用户数据目录、存储 key 或 app identifier。版本按 Desktop/Web patch 递增；回滚代码无需迁移数据。安装器、卸载、正式发布不由本补丁证明。凭据只留请求内存，证据仅存合成请求和图片。

## 验收映射

- AC-1：3 MiB result 修复前失败、修复后通知小于现行限制，完整 Agent/事件流回归和真实生产生图。
- AC-2：受鉴权文件字节与 KK 素材 hash 相同，重启后唯一归档。
- AC-3：短句、POST messageText、history 用户消息一致；固定规则出现一次，连续聊天没有请求长度累计。
- 豆包登录和外部额度是外部依赖；代码与测试通过不代替真实成功。
