# ADR-026：模块化能力契约与依赖反转

- 状态：ACCEPTED（技术方向，产品实现尚未完成）
- 日期 / Task ID / Owner：2026-10-28 / TASK-MOD-P0 / root
- Intent / Spec / Plan：[本次交付包](../../changes/2026-10-28-modularity-p0/intent.md)
- 授权：用户要求复核其外部执行规范并开始优化；按现有AI自治范围裁定技术实现，不代表用户已验收产品。

## 背景与比较

现有creation任务/资产/Provider及插件基础设施已存在，切片间存在深层依赖和有向环。完整插件框架/微内核会重复运行时，直接让capabilities依赖creation实现则保留反向耦合。选择复用既有实现、契约包定义最小Port、App装配层注入的模块化单体；代价是须逐步梳理现有调用映射。

## 决定

遵循[MODULARITY](../MODULARITY.md)：跨端契约位于creation-contracts，capabilities只注册和分发，任务/资产/Provider仍为单一实现。先P0防回弹，P1契约，P2在现有局部重绘上做默认关闭试点，再逐环迁移。MCP/ComfyUI/插件方案与OPT路线同源；P3a等待P2，画布历史归位等待OPT-201。

Desktop/Web共用现有核心与UI，Mobile只消费平台无关包，不提前开始平台实现。P0不改产品代码；后续不得改UI视觉、存储key或自动回写旧数据。manifest、Port、权限清单的具体schema在对应后续卡验证，不把方向ACCEPTED说成能力已接通。

## 兼容、失败与回退

版本化契约，新旧适配器并存，对拍通过后再退役；所有任务沿用既有九态、取消和恢复。数据新增字段可选，旧数据缺失为未知。模块卡记录影响范围与回滚；试点关开关回旧路径；P0以revert回退，零数据迁移。

## 验证与边界

P0故障注入与Git基线见[ADR-027](ADR-027-architecture-ratchet-and-dependency-cruiser.md)。真实API、插件隔离、Mobile、完整UI同态及生产发布不由P0证明；遗留依赖与实施状态见账本TASK-MOD-P0和后续任务。
