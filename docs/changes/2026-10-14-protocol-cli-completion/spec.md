# Spec：协议和CLI实际执行

## 数据与执行

Profile、ProviderConnection新增可选protocol：openai-chat/openai-responses/anthropic/azure-openai/ollama，authMode：api-key/none。旧字段缺省仍为Chat/APIKey；不添加第二storage key或抹掉旧值。任务/项目捕获providerProtocol/providerAuthMode，Native request为protocol/authMode；更改连接协议/认证后，旧任务不得改投。Native serde None省略，旧请求指纹不变。

Responses使用/responses+input、Bearer；Anthropic使用/messages、x-api-key、anthropic-version、max_tokens；Azure只实现v1 /openai/v1/chat/completions、api-key、部署名称；Ollama复用/v1/chat/completions兼容SSE，本机可免密。none仅loopback的Chat/Ollama，remote与其他协议拒绝。文本-only协议不能冒充图像/视频输出能力；新目录仅反映服务报告的模型，不能把/models说成Azure部署发现。

流解析须有对应完整终态才成功；工具/拒绝、截断、格式坏、未知终态和超限不得成功。取消/中断保留draft/unknown、禁止自动重复；HTTP拒绝保留原分类。没有供应商回传的消耗继续未报告。

连接检测只读模型接口，Native复用pinned/no_proxy/no-redirect网络边界与vault引用，不使用会POST生成的旧test_connection。Web保留cookies omit/redirect error/取消和跨域错误，不新增不安全代理。

Native模型发现先准备窗口归属UUID，取消/释放只作用于该请求；取消可先于fetch，整段凭据等待/DNS/HTTP及分页在10秒内结束。完成、失败、超时清理请求；取消未能确认时显示错误，不能只停界面忙碌。UI取消发生在prepare IPC尚未返回时不得启动HTTP，迟到prepare释放或30秒过期；活动请求数量上限16。当前最后一个窗口关闭即退出进程，不新增多窗口常驻生命周期。

## CLI与界面

Desktop实际安装检测采用version/help，无模型额度；登录/安装在用户点击时打开相应真实操作，不谎称已登录。桥启动/停止管理本任务拥有进程；Web保留明确平台边界与可用手动命令。CodeBuddy读取失败不得变empty并删除原路径；重试后才允许保存。Gemini安装检测的失败不能永久负缓存。

Agent生产包必须携带当前平台Codex运行依赖；独立锁定依赖安装修复残缺metadata，不修改primary/node_modules junction或编造metadata。目标Node+wrapper version/login help/app-server help均通过才出包；只复制生产白名单。

Desktop沿共享二/三栏导航；390手机层级收敛且返回/滚动可用。画布缩放后选中节点的实际交互命中不能缩到18px；文字不小于12px，操作不小于24px，触摸主操作消费40px token。固定喜欢/标签面板与旧数据兼容保持。

## 验收

同协议保存/重载→只读检测→实际本地HTTP协议服务请求→完整文本回写→重载恢复；Web与Tauri分别证据，不把fixture当云端供应商验收。覆盖旧资料、错协议/远程免密、取消、坏SSE、读取失败、生产CLI依赖以及1920/1099/390真实DOM、命中和截图。完整verify、Rust/当前原生构建、独立SHA审查、体积与产物哈希后交付最新版本。
