# 本机模型目录与凭据读取修复

任务：TASK-CHERRY-RED-001。日期：2026-10-13。

真实官方Ollama0.40.3、原默认服务配置实测：`http://tauri.localhost` Origin被403拒绝，`tauri://localhost`与`http://localhost:1423`均200。因此Windows WebView不能直接用浏览器fetch刷新本机模型目录。没有修改Ollama CORS、DNS或全局代理；GET Native桥只供明确免密、canonical loopback模型目录使用，原Web/远程密钥请求保持原契约。

新增受限IPC `provider_models_read/cancel`，沿现有reqwest/Tokio/Tauri，不新增依赖或Provider/任务队列。仅GET末尾`/models`端点；精确localhost/127.0.0.1/[::1]，localhost解析固定为回环；拒绝远程、短IP、账号、fragment、非协议分页参数和重定向。无代理、Cookie、Origin、Authorization或vault调用；10秒/2MiB/严格UTF8，拒绝正文不回传。既有JS分页、协议模型解析与人工能力声明复用；目录成功不增加图片验证证据。

取消以随机requestId隔离，主动中止Native网络future；早于注册的取消也拒绝请求。4个活动读取、64个30秒取消标记均有上限；已结束请求释放。没有新的持久化状态或任务调度器。

JS两个行为测试实际RED→GREEN；Rust六项真实TCP测试PASS，包括无认证/Origin/Cookie、localhost回环解析、拒绝/重定向正文、超限/非法UTF8、取消后真实socket EOF、提前取消无连接与容量/过期。原始输出在`.tmp/cherry-red/native-discovery-*`，真实Ollama Origin探测脚本/输出独立保留。最终Native UI、组合HEAD与Hosted回执另行验证，不能据此声称安装或全部三OS GUI通过。

隐藏API面板、免密模式和身份不明确的配置不再读取凭据；免密时不展示清除密钥。切回API Key才读取精确引用，保留未发送草稿。复用既有credential-state hook和settings-state转换，不制造第二存储。实际浏览器新增回归1/1 PASS；相关三文件25/25 PASS，五个原失败RED原件保留。删除密钥后检查明确缺密钥、请求次数不增加，仍验证另一账号凭据正常。

测试用vault状态mock只覆盖前端读取门禁；真实系统vault另用唯一synthetic ID验证，不能将此mock当系统凭据库通过。原工作区/index未写入；后续候选仍须完整门禁、实际构建和独立审核。
