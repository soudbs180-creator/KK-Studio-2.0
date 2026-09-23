# ADR-004：随包 Agent 与桌面进程归属

状态：本轮技术决策；用户授权继续最近 Codex/Agent 清单，不提交/推送。

采用现有官方 Codex app-server 适配器和隔离 vendor。Tauri 随包 Node/Agent/Codex，Windows 用 Job Object 约束本次实例子树；子进程先等待 stdin 归属握手，主进程确认后才开放 loopback 随机端口。运行数据位于既有 KK 数据根的 app/agent，Codex 账号目录继承现有登录身份。

连接 Token 随启动生成，仅经私有管道和原生 IPC 进入前端内存，不进入配置、URL或日志。Web/外部服务连接继续存在；桌面资源缺失明确禁用。构建资源可通过单独 Tauri 配置加入，普通构建不会假装携带执行器。

备选：依赖全局 node/npm 和源码路径会使干净安装失败；按端口查杀会误停别人的任务；只 kill 根 node 会留下 Codex/MCP 子进程，均不采用。

Vendor 完整来源代码、锁文件及 MIT 许可纳入可交付输入，保持独立构建/类型检查，不搬入 KK UI 或领域模型。根 npm ci 的 postinstall 按锁文件安装和构建 Agent/插件；禁用依赖安装脚本。随包资源仅收集生产依赖和许可证，排除意外 workspace link、开发依赖与用户数据。

验证包括独立目录运行、凭据不落盘、原生资源路径、重复启动、停止/主进程退出、保留外部实例、当前 Web/Tauri 产物与源码哈希。回滚仅撤回本轮代码与运行资源，不覆盖用户数据或登录身份。

依据：[Tauri resources](https://v2.tauri.app/develop/resources/)、[官方 Codex App Server](https://learn.chatgpt.com/docs/app-server)。第三方登录软件与商业 API 的适配不由本 ADR 宣称完成。


补充：Windows 数据目录以不共享文件句柄约束单个托管实例，OS 关闭句柄后自动释放；不会根据旧 PID 查杀。停止端点在同一事件循环原子关闭新请求入口，已执行 turn/变更请求阻止停止；只读账号/历史请求可随进程退出取消。

Codex 0.155.1 新建持久线程显式指定官方 historyMode: legacy，避免本机默认 paginated store 的 list_turns 不支持错误。仅影响新线程，不改写已有历史。依据：[锁定版本 thread processor](https://github.com/openai/codex/blob/rust-v0.155.1/codex-rs/app-server/src/request_processors/thread_processor.rs)。

新建主线程通过官方 thread/name/set 赋予初始名称 KK Studio，使未发送消息的空线程也可跨进程恢复；不发送模型 turn，也不命名临时 Skill 线程。
