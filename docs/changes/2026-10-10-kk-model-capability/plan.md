# Plan：kk 多平台模型能力闭环

1. 扩展通道与文本结果类型，补充图片结果误用拒绝测试。
2. 在 Ark 适配器中按 operation 分流文本与图片，增加非流式和 buffered SSE HTTP 门禁。
3. 增加安全的 /v1/models 投影，过滤禁用/隔离通道和敏感字段。
4. 将有效模型标识贯穿 ModelSelection、模型菜单、Codex Agent 事件、CanvasCollectionItem、DemoResult 和资产 provenance。
5. 更新功能登记、任务账本、进度和本交付包；运行全量单测、类型、lint、格式、UI、构建和浏览器回归。

每一步都必须保留当前提交、命令、结果和未验证外部条件；任何真实凭据能力只能标记 NOT VERIFIED，不能用 fixture 代替。