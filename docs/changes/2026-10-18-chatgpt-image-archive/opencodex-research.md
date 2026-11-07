# OpenCodex：订阅登录与图片回传核查

2026-10-18，只读核查公开源码；任务仍为 PARTIAL / FEAT-040 PROTOTYPE。固定 main 与最新 v2.88.0 为 `6936d9885d8a9bda9301737affcbaf1a4ff00e17`，发布于 2026-10-17 03:49:20 UTC。未安装、运行该项目、读取本机凭据或向其发送模型请求。

## 对 KKAI 有帮助的实现

- **每人首次授权、后续复用和刷新**：有 PKCE / device 登录和 refresh token 持久更新；后续请求不要求打开 Chrome。失效或服务端撤销后仍可能需要本人重新授权。参考 [OAuth](https://github.com/lidge-jun/opencodex/blob/6936d9885d8a9bda9301737affcbaf1a4ff00e17/src/oauth/chatgpt.ts#L203-L283)、[刷新与更新](https://github.com/lidge-jun/opencodex/blob/6936d9885d8a9bda9301737affcbaf1a4ff00e17/src/codex/account-store.ts#L1316-L1368)。源码的公共客户端标识不等于 KK 已获独立客户端注册；不照搬其明文 JSON 凭据落点。
- **Codex 原生图片工具转发**：真实实现客户端独立 Images 请求，支持 ChatGPT/Codex 登录，并非只能使用另购 API key。因此不能笼统说 OAuth 无法生图。参考 [图片入口及说明](https://github.com/lidge-jun/opencodex/blob/6936d9885d8a9bda9301737affcbaf1a4ff00e17/src/server/images.ts#L1-L13)。
- **原件落盘及有界处理**：从已完成的图片工具结果取得原始数据，校验预算和格式后排他写文件、返回本地图片链接。可以借鉴其数据流；KK 仍使用已有 assetRepository、完整 SHA、项目/chat/job 绑定与持久回读。Markdown 本地文件链接不等于 KK 画布已归档。参考 [图片结果投影](https://github.com/lidge-jun/opencodex/blob/6936d9885d8a9bda9301737affcbaf1a4ff00e17/src/server/responses-hosted-image-display.ts#L112-L145)、[原件处理](https://github.com/lidge-jun/opencodex/blob/6936d9885d8a9bda9301737affcbaf1a4ff00e17/src/images/artifacts.ts#L247-L428)。

## 尚不能解决的目标

订阅登录内置目的地固定为 `https://chatgpt.com/backend-api/codex`，图片追加 `/images/generations` 或 `/images/edits`。本次已审实现没有切换普通 Chat composer 或普通 Chat 图片会话的分支；额度耗尽/权益拒绝不会据此获得普通 Chat 的图片权益。也不能仅凭后端 URL 推断每张图片的实际扣额账本，仍须服务端回执。参考 [固定目的地](https://github.com/lidge-jun/opencodex/blob/6936d9885d8a9bda9301737affcbaf1a4ff00e17/src/providers/openai-tiers-destination.ts#L9)、[图片转发](https://github.com/lidge-jun/opencodex/blob/6936d9885d8a9bda9301737affcbaf1a4ff00e17/src/server/images.ts#L765-L784)。另外的 API-key/Google/xAI 路由不属于本任务“每人现有 ChatGPT 订阅、无额外 API 费”的验收。

名为 chatgpt 的实验命令拒绝非 macOS；app-server shim 改写的是本地 stdout 额度字段，维护文档记录仍可能锁住 composer，不能作为 Windows 普通 Chat 接口或服务端扩额。参考 [Windows 边界](https://github.com/lidge-jun/opencodex/blob/6936d9885d8a9bda9301737affcbaf1a4ff00e17/src/cli/chatgpt-command.ts#L110)、[shim](https://github.com/lidge-jun/opencodex/blob/6936d9885d8a9bda9301737affcbaf1a4ff00e17/src/chatgpt/app-server-shim/gate-rewrite.ts#L91-L95)、[维护说明](https://github.com/lidge-jun/opencodex/blob/6936d9885d8a9bda9301737affcbaf1a4ff00e17/structure/clients/chatgpt-desktop.md)。

[v2.88.0 发布说明](https://github.com/lidge-jun/opencodex/releases/tag/v2.88.0)主要为账号恢复/用量、连接回收及工具历史修复，没有宣告新增普通 Chat 图片通道。[MIT 许可](https://github.com/lidge-jun/opencodex/blob/6936d9885d8a9bda9301737affcbaf1a4ff00e17/LICENSE)允许按其条件复用代码，不额外授予在线服务或订阅权限。

## 当前决定与证据

将登录续期和原件回传作为工程参考，保留 KK 的受控素材归档；本目标无需安装整个多账户代理。普通 Chat 自有 WebView 已验证会话复用与后台连接；同日后续工程外实验也已从已有测试图自动下载原件，完整解码与视觉检查通过，详见 [验证](verification.md)。正式 Native 任务绑定、自动归档和实际扣额仍未验；不能用 Codex 原件或别的模型代替普通 Chat 验收，不重复发送、不购买额度或自动切付费 provider。

完整只读报告在工程外 `D:/kk-studio/output/opencodex-research/FINDINGS.md`、`AUTH-FINDINGS.md`，49 份固定源码由 `source-manifest.json` 绑定 SHA-256 与 Git blob SHA-1，全部与该提交 tree 对账。root 另核图片转发与目的地文件。图片源码为 43,040 字节 / 933 行，SHA-256 `09e3b4f9bdfb75cec5b2a0abc5d10635e0697621feb573d22a9dc5a8ac279f6c`；网页文本抽取曾返回 899 行，行号以已对账的 Git blob 为准。本次未运行上游测试；源码存在、mock 断言、KK 实测与实际扣额分别记录。
