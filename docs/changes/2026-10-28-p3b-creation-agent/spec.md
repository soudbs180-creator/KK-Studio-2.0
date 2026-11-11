# TASK-MOD-P3B 边界与验收

TASK-MOD-P3B；base 6ac48d6ce9c2867e953fe56ebf2f05fd55e475bb；复用TASK-MOD-P0隔离树，branch refactor/TASK-MOD-P3-feature-cycles。用户明确授权继续P3a–e，不使用子代理。

Agent回调经装配根注入，聊天与交付纯函数归位。依赖图包含type-only/动态导入，不借外部目录转运feature依赖、不扩基线、不新增队列/存储/Provider副本。旧入口可作单向兼容导出，迁移同一实现；不能为保留shim重造循环。纯模型与codec不读写存储，平台I/O仍归原adapter。

验收：受影响调用者/公开出口/夹具全部更新，类型/根lint/全单测及必要browser/local-service/Agent回归通过；R4完整环集合逐步下调，保留类型边与旧数据反例。UI仅装配props/import变化，实际DOM/截图另验，原失败不跳过。独审/原生/真实服务/main单列。
