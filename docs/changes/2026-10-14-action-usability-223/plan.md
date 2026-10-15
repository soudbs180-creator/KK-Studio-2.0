# Plan：2.1.23 按钮修复与当前版本交付

- Task ID：TASK-223-ACTIONS-20261014；基线6b5a2012；root唯一仓库写入者。
- 原工作区状态与基线typecheck PASS回执存工程外；CLI、设置、画布三个独立审计仅产工程外候选patch，不同时写worktree。

1. 核对所有调用者、存储身份、相关功能卡和既有未完成项；注册本任务，不覆盖旧证据。
2. 保存真实失败探针；先应用回归测试记录RED，再检查并串行应用最小源码修复。
3. 实测背景入口与短屏菜单，沿用确认的手机新布局；核对设置交叉busy、生成参数、取消/删除/撤销和数据恢复。
4. Desktop/Web递增2.1.24，Mobile规划不变；串行执行完整九步verify，记录实际route/import链、bundle、DOM与截图。
5. 当前源码官方Agent/Tauri重建，独立测试目录验证真实Native和同字节便携目录；采用受控CLI/HTTP夹具，不调用真实账号或付费服务。
6. 冻结提交SHA后独立审查并修复有效问题，更新账本、Project State、Handoff、Progress及受影响规范；白名单/哈希回读后输出当前Windows、Web、源码与Git恢复包。

未完成验证保持PARTIAL；主线不push/merge，原工作树、分支、用户数据与失败证据保留。
