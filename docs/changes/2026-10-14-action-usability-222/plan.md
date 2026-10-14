# Plan：从2.1.22继续的按钮可用性与分端修复

- Task ID：TASK-222-ACTIONS-20261014；基线：1abbcd51f36aec8b8e906ac980f051344021e1dd；root唯一产品写入者。
- 原工作区状态保存工程外，复用登记worktree并保留旧分支。基线typecheck PASS；共享行为对应Desktop/Web候选2.1.23，Mobile仅保留2.1.1规划。

1. 三项只读并行审计已覆盖CLI配置/进程、设置持久化/插件、画布控件/筛选；root统一启动1421实际浏览器取证，1423验收串行。
2. 已保存配置覆盖、CLI部分结果、记忆关闭竞态、插件持久化/坏记录/生命周期/超时/取消，以及画布和MCP/备份的失败探针。root串行应用候选，核对调用者、原子性、未知字段、安全和状态反馈。
3. 最小实现覆盖Agent配置先保存再发布、Gemini失败/超时、记忆保存错误与关闭守卫；插件保存后提交状态、15秒加载等待上限、停止等待和宿主管理资源清理；MCP回执折叠保留、busy导航与停止等待；精确备份ID恢复确认；通用控件命中/选项宽度、画布顶部上传/删除、320px HUD避让、撤销偏好和资源来源清空。Google获取密钥增加Desktop shell入口，实际原生验收待完成。
4. 已有实际定向Node83/83、Agent配置9通过/2既有跳过及typecheck/UI/build结果，当前fresh production浏览器45/45首试通过。历史23项18通过/5失败、MCP/备份6项4通过/2失败和手机新测试定位错误均保留。独立预检复现的插件启动/发现竞态已按8项RED→GREEN修复；不把顶层模块副作用声明为可撤销。
5. 串行执行完整verify及适用Rust/原生检查，记录实际端口、route/import链、bundle与同状态DOM/截图；Desktop须使用当前checkout官方启动链重建并核对收据、EXE/hash，不能复用2.1.22产物。补Google shell外链、设置busy/取消和窄屏画布实证。
6. 冻结最终源码SHA后独立复核并提交，更新账本、Project State、Handoff、Progress；实际便携目录/源码/Web/ZIP按运行时白名单和哈希收据输出最新版本。完整检查、fresh Native、独立审查和产物回读未齐前保持PARTIAL，不把窄屏Web计为Native Mobile。

外部patch只存工程外，代理不同时修改此worktree；不借用另一工作树dist、不杀外部服务、不清理用户数据/分支。
