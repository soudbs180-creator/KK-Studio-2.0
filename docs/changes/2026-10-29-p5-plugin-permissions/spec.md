# TASK-MOD-P5 边界与验收

Task：TASK-MOD-P5；base `cf73c8425b359035e99da5f8a5db5b0db7697080`；复用现有隔离树与 `refactor/TASK-MOD-P3-feature-cycles`，不新建工作树、不使用子代理。

沿OPT-401同一kk-plugin.json设计，加入PermissionPort、默认拒绝的受限RPC和分级运行时；OPEN-3采用补篇A的legacy兼容，旧插件原样加载并明确其仍在宿主realm。新UI授权提示等待Figma设计，当前仅后端与诊断日志，不自动给第三方新增权限。

验收：R1逐卡下降，R4保持0，其余规则不新增；根typecheck/lint/npm test通过，生产构建/体积/CSS与有关浏览器回归单列。P5必须拒绝未授权、非法消息、完整性错误、越界路径/身份、迟到完成与超限请求，兼容旧插件，不能把Worker或legacy说成安全沙箱。卸载不删除项目/资产。原生/真实外部服务/独审/main分别验收，失败不跳过。
