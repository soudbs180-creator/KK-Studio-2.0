# ADR-028：能力声明、Port与单一清单投影（草案）

- 状态：PROPOSED；仅P1声明候选落地，注册表/协议投影与权限执行未实施。
- 日期 / Task ID / Owner：2026-10-28 / TASK-MOD-P1、TASK-MOD-P1-G / root
- 来源：[P1规格](../../changes/2026-10-28-capability-contract/spec.md)、[ADR-026](ADR-026-modular-capability-architecture.md)。

## 背景与选择

旧wire.CapabilityManifest描述供应商能力事实，不能复用名字来覆盖业务能力声明。直接抽宿主实现会触及creation/UI循环，新运行时会重复队列/资产。选择在原契约包新增BusinessCapabilityManifest与三个纯Port，保留旧导出/九态/身份；包minor升到1.1.0，不升级应用版本，不接入口。Task/Asset/Provider装配根和映射见P1规格。

Zod4.6.7（MIT）用于声明边界校验；npm官方semver7.8.5（ISC）用于semver/range语法与兼容判定，不手写版本解释器；@types/semver7.8.0（MIT）作为源包依赖供独立TS消费者编译。TypeScript6.0.3仅开发工具。已用npm registry核对精确版本/许可，资料：[Zod API](https://zod.dev/api)、[npm semver](https://github.com/npm/node-semver)。根/Agent的Zod安全升级仍由独立SEC卡承接，本卡不混入。

## 目标投影与门槛

一份manifest由未来REG.list()只读派生UI/Agent/MCP/插件/ComfyUI与JSON Schema，投影层不得手写另一份能力清单。P1只提供声明。P1-G单独增加可选capabilityId和卡片/账本治理；P2完成注册/图环/版本解析/实际适配器筛选和双路径inpaint对拍；P5实现PermissionPort与旧插件迁移策略。StoragePort、统一错误、弃用字段与完整协议投影仍沿四文档总清单，不用本草案证明其完成。

至少一个adapter兼容当前包才接受manifest，可保留旧适配器版本范围；P2必须剔除不兼容适配器，不能把schema通过当作每个adapter都能执行。network权限只是明确hostname声明，不是实际授权；未实现权限执行前不能声称沙箱可用。

## 兼容、限制与回退

旧供应商Manifest、任务/资产字段及函数保持；新声明默认值不触碰旧数据，未定义第二套任务态。回退新增出口/文件及包依赖，恢复Mobile file-lock记录即可，无用户数据迁移。N/N-1协议适配、弃用周期/移除版本的运行落地仍待各协议卡验证。

源包沿现行ES2022/types=[]/skipLibCheck=true配置验证。额外的严格无宿主依赖声明检查在Zod的URL类型处失败；不增加DOM/Node全局或隐藏此失败，严格消费者目前不支持。独立安装与浏览器bundle证据、既有Mobile回归及后续结果见[P1验证](../../changes/2026-10-28-capability-contract/verification.md)。独立审查、P0/main整合与实际Provider运行未由本卡完成。
