# Spec

- ID：workflow-matrix-2026-09-15
- Source of truth：最新 Page `0:1`，Runtime / Tasks `396:938` 的 196×240 面板基线；批量/审阅/来源面板为复用现有 token 的工程补充。
- 入口与状态：画布图片节点的五类 Reference Slots；任务列表进入 Task Workbench；Asset Library 查看来源详情。异步任务覆盖 waiting、running、success、partial、failed、cancelled、offline、paused/recovery。
- 数据契约与权限：项目快照只记录非敏感 Provider/连接引用、任务、父子素材和评论；密钥只进当前会话/系统凭据库。远程传输和高成本批量需人工批准，覆盖原图与外部分享禁用。
- 验收标准：结果只引用内容寻址 `assetId`；单项重试不重复提交；评论转任务可分配、完成、恢复；重复字节保持 SHA-256 与 AI 来源。
- 错误、取消、离线：归档失败保留失败格；取消保留既有成功格；暂停恢复只提交剩余格；离线显示离线并等待用户重试。
