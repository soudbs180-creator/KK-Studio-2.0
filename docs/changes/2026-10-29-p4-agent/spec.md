# TASK-MOD-P4-AGENT 边界与验收

Task：TASK-MOD-P4-AGENT；base `cf73c8425b359035e99da5f8a5db5b0db7697080`；复用现有隔离树与 `refactor/TASK-MOD-P3-feature-cycles`，不新建工作树、不使用子代理。

只收敛跨切片导入与公开导出；不改算法、UI结构/CSS、存储身份；保持type-only、默认导出和动态入口的符号身份。

验收：R1逐卡下降，R4保持0，其余规则不新增；根typecheck/lint/npm test通过，生产构建/体积/CSS与有关浏览器回归单列。P5必须拒绝未授权、非法消息、完整性错误、越界路径/身份、迟到完成与超限请求，兼容旧插件，不能把Worker或legacy说成安全沙箱。卸载不删除项目/资产。原生/真实外部服务/独审/main分别验收，失败不跳过。
