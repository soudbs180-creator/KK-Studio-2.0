# TASK-MOD-P5 用户意图

用户要求P4依次skills→plugins→models→agent→creation，并把全量367处R1降为0；随后按已接受kk-plugin.json与分级运行时推进P5。四份需求总清单仍继续追踪。

Task：TASK-MOD-P5；base `cf73c8425b359035e99da5f8a5db5b0db7697080`；复用现有隔离树与 `refactor/TASK-MOD-P3-feature-cycles`，不新建工作树、不使用子代理。

沿OPT-401同一kk-plugin.json设计，加入PermissionPort、默认拒绝的受限RPC和分级运行时；OPEN-3采用补篇A的legacy兼容，旧插件原样加载并明确其仍在宿主realm。新UI授权提示等待Figma设计，当前仅后端与诊断日志，不自动给第三方新增权限。
