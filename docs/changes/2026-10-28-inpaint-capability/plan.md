# P2 Implementation Plan

> REQUIRED: superpowers:executing-plans；用户禁止子代理，主代理直接实施。

**Goal:** 薄注册器与默认关闭的inpaint派发，隔离测试双路径对拍。
**Architecture:** capabilities只依赖creation-contracts/自身；creation宿主适配原持久任务交付闭包；算法与UI保持原位。
**Spec:** [spec.md](spec.md)。

## Task 1 注册表与执行器

- [x] RED测试register/list/clone/unregister、无效schema/权限/重复/环/缺失依赖、版本范围/平台/资源/优先级/禁用、派发权限/输出校验、明确回退事件、执行错误不二次提交。
- [x] 实现capabilityRegistry.ts、inpaintCapability.ts、index.ts；仅契约依赖，版本工具与taskReference schema补契约包1.2。
- [x] 定向GREEN与R5检查。

## Task 2 宿主接线与双路径

- [x] creation/inpaintCapabilityDispatch.ts包装原submit闭包，绑定project/task身份，防止JSON伪造或隐式二次运行；RED→GREEN。
- [x] useImageCommandSubmission只增默认关闭开关、前置lazy import与最终派发；原提交体保留，return await维持锁。
- [ ] 追加隔离parity场景，实际生成原图/蒙版、单次fixture HTTP、归档成功/恢复，记录完整任务/资产及关系、DOM/截图；默认关/开分别build与完整image-edit文件运行，比较归一化JSON与PNG。仅归一化实际随机ID/时间，不忽略业务字段。
- [ ] 快速三门禁/旧单元/契约与Mobile类型回归、build、gzip预算与保护指纹；更新卡片/账本/四文档矩阵，作者自审与候选提交，不假称main/全局已完成。

## Review Focus

lazy import期间状态变化；flush失败/取消/未知受理不得重复提交；fallback不得在executor出错后重跑；清单对象/版本/依赖不能被外部修改破坏注册状态；新旧任务与asset provenance关系必须一致。P1-G/严格声明限制与P0已知UI失败分别追踪，不跨范围修UI。

## 实际进度

隔离parity已在原有两个有效端到端场景中增强采样，不另复制场景。任务/资产/溯源/HTTP/DOM及重载恢复通过；严格PNG比较exit1，原窄屏失败保留，故该验收行不勾选。根/Mobile门禁、build及卡片/账本已同步；独审、原生与main未完成，保留PARTIAL。构建最终恢复默认关闭；完整verify未由增量检查代替。
