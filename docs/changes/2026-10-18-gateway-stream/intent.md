# Intent：本地网关增量文本流

TASK-GATEWAY-STREAM-20261018，base 00e79cf01a7ef787f3c83baeeb46e854d281a2c2，branch fix/TASK-GATEWAY-STREAM-20261018，复用原审计实体树。用户授权“先把冷启动严格比较失败核查闭环，再按优先级推进不依赖额度的剩余任务”。前置TASK-COLDSTART-LOCAL-20261018已通过真实严格冷启与独立复核；本地P1优先级审计确认网关仍buffered，故实施父TASK-AI-GATEWAY-001的有界增量流子项。

只打通现有可选注入的Ark adapter→Scheduler→chat→HTTP文本增量、取消及重试边界，用受控本地HTTP上游证明首段在完成前到达。保护现有JSON、图片、异步、鉴权、凭据引用和默认404；不接主入口或解锁UI，不调真实Provider/系统凭据/额度，不新增存储、协议版本或依赖。只影响Web本机服务运行产物，Web2.1.40→2.1.41，Desktop2.1.40/Mobile2.1.1不递增。所有src输入被桌面构建指纹覆盖，最终仍用官方流程重建当前Desktop40，不能沿用旧input。

所有现有改动与用户资料保全，无删除/移动、reset/clean、强停、push/merge/发布；[规格](spec.md)、[计划](plan.md)、[验证](verification.md)、[审查](review.md)。父任务保持PARTIAL、FEAT-038保持PROTOTYPE；真实DPAPI/凭据/Provider/Hosted与用户验收另行。
