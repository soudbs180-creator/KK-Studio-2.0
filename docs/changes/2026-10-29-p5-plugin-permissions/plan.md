# TASK-MOD-P5 执行计划

Task：TASK-MOD-P5；base `cf73c8425b359035e99da5f8a5db5b0db7697080`；复用现有隔离树与 `refactor/TASK-MOD-P3-feature-cycles`，不新建工作树、不使用子代理。

沿OPT-401同一kk-plugin.json设计，加入PermissionPort、默认拒绝的受限RPC和分级运行时；OPEN-3采用补篇A的legacy兼容，旧插件原样加载并明确其仍在宿主realm。新UI授权提示等待Figma设计，当前仅后端与诊断日志，不自动给第三方新增权限。

- [x] 阅读规范与调用链，保存源码/图/受保护文件基线。
- [ ] 实现本卡契约、所有调用方及必要回归。
- [ ] 完成快速三门禁与受影响运行检查，收缩真实基线。
- [ ] 更新功能卡/台账/四文档覆盖、自审、提交与证据。
- [ ] 独审、完整verify、原生与main交付。

- [x] 清单/JSON Schema、PermissionPort、受限RPC、验包和Web实验T1接线及限定回归。
- [ ] 原生IPC、更多逃逸面/资源上限、独审、授权Figma/UI与T0/T2/T3/其他贡献；生产门保持关闭。
