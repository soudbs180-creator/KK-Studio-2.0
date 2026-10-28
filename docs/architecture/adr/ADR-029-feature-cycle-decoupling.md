# ADR-029：P3a–e依赖反转与单一纯核心

- 状态：PROPOSED；源码候选无环，运行/独审/main分别验收。
- 日期 / Owner：2026-10-28 / root
- 任务：TASK-MOD-P3A、P3B、P3C、P3D、P3E；退役TASK-MOD-P3-COMPAT。
- 依据：[MODULARITY](../MODULARITY.md)、[四文档覆盖](../../changes/2026-10-28-modularity-p0/four-document-coverage.md)、[P3a规格](../../changes/2026-10-28-p3a-creation-image-edit/spec.md)。

## 选择与边界

移动现有纯函数到domain、共享类型归契约包、基础设施归integrations，服务由装配根注入。不通过外层目录转运feature依赖来消除图环。仅把对方import改成index不能解循环；全重写业务链增加数据/计费风险，两者均不采用。

| 阶段 | 真实落位与边界 |
| --- | --- |
| P3a | Task/Draft/Attachment/Input、ImageEditRequest/ModelSelection/CanvasReference归契约包；createImageEditRuntime注入原资产方法。共享Context在runtime，不依赖feature；ON经既有image.inpaint注册器，OFF保留兼容链 |
| P3b | creation不依赖Agent单例，generateFromCanvas由app/taskPorts注入；聊天投影与交付断言归domain |
| P3c | 项目类型、纯规范化/迁移/快照codec归domain；local-service消费同一核心与StoragePort。旧window存储I/O留creation，Node服务不进浏览器 |
| P3d | Provider元数据/凭据/跨窗口锁移到integrations/providers，旧路径导出同一实现；文本流事件解析归domain，解除models→ai-gateway→creation长环 |
| P3e | memory显式接收MemoryAgentPort；临时会话/线程/项目/revision/只读目录检查保留，迟到完成核对Port身份。回复与附件类型归契约，prompts不反依赖Agent/creation |

契约1.2→1.3统一既有可选字段和Port，Desktop/Web源码48→49，Mobile43保持。原key/ID/schema版本、九态、sha/parentId/origins、审批和unknown受理保持；无新库。严格Zod ES2022声明URL限制仍开放。

## 兼容与回退

旧模型、快照、恢复、Provider、alpha、Canvas命令与聊天投影路径保留单向导出，同一函数/Context/类身份，不复制状态。首个包含P3的正式发布后至少一个周期才可单独移除；当前没有正式发布回执。

内部prepare/compose函数改由createImageEditRuntime(assetPort)绑定，所有仓内调用者已迁移，不保留隐式全局I/O；memory私有hook调用者显式注入原Agent，不是已发布插件SDK变更。P2 flag仍默认关闭，不在同一次操作中双跑Provider。

回退提交与包/应用版本即可，无用户数据迁移；不覆盖主checkout的Figma改动、不删历史证据。

## 验收

实际R4阶段图16→15→12→10→4→0，R1从405降367，其余规则无新增。baseline只删已解决项，回归包含type-only/动态边。旧数据/导出、根/Mobile/Agent/local-service/浏览器证据分别记录；无环不代替Tauri、真实Provider、独审或合流，见五个阶段verification。
