# P8 规格

任务 TASK-MOD-P8；base792759611c60f698366b755f94198071c6c65c27；复用refactor/TASK-MOD-P3-feature-cycles工作树。不使用子代理，不控制桌面，不改变JSX/样式/存储身份。

按四原文执行规范§17，只抽装配hook。抽出Skills初始化、首页模型同步、Agent订阅、会话投影、任务协调、Agent/插件桥与主题/快捷键装配。已有src/app/taskPorts.ts继续作为组合契约，不引入依赖/服务/队列/画布框架。函数/闭包与effect依赖须与7927 AST一致，App返回JSX、CSS导入序列/文件字节不变，R1/R3/R4保持0。原型/夹具不提升REAL；Desktop/Web版本按规则增53，Mobile43、契约1.5不变。

故障边界覆盖：旧快照只读/恢复、迟到项目与会话、引用闭包、订阅卸载、Host多桥清理、健康错误、取消/unknown。先有固定基线浏览器/结构证据，再迁移再对拍；历史失败保留并核实。

合流门：当前源码快速三门禁、build、完整verify序列、相关UI同态、独审/CI与主仓dirty完整保全。任何未满足门不能声称胜利收官；Git main可快进不等于交付已验收。
