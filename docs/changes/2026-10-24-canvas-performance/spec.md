# Spec：画布轻量性能优化第一批

- Task ID：TASK-CANVAS-PERF-20261024；状态：IMPLEMENTED（本地候选）
- 来源：[intent](intent.md)、[计划](plan.md)及当前源码；开源取舍见工作区 `docs/05-references/research/2026-10-24-lightweight-ui-performance-open-source.md`。

## 契约

1. 历史已有 present、处于普通手势预览且没有 Undo/Redo 应用确认时，提前跳过快照协调、指纹及克隆。首次初始化和应用确认仍处理；完成/取消后按既有规则提交。
2. 持久化仍发布每次本地预览，缓存 `initialCanvas` 参照指纹；同态 ACK 不回环，冲突 ACK 仍修复本地手势。
3. 全局提交每次保留写入校验、revision、dirty 和同步 journal；按 project.id 比较 items/canvas 引用，仅图输入改变的项目重新协调。遵循现有不可变更新约定。
4. sanitizer 已产生规范存储格式，移除其外层重复 serialize；同步 journal 的格式、四百万字符阈值、sessionStorage、异步 CAS、180ms 防抖和关闭 flush 不变。
5. 连线按单边隔离渲染和几何计算；节点仅优化重复派生集合，不通过删除比较器条件强行命中 memo。缓存生命周期随组件释放。

## 当前 Figma 前置证据

2026-10-24 21:47:22—21:49:06（Asia/Shanghai）实时读取[当前文件](https://www.figma.com/design/ZiadpErDoFweCjG3uHjkM3/KK-Studio)。规范 `91:2` 下 `546:187`、`597:67456`、`1510:41557`，桌面 `2:47` 下主场景 `9:818` / 画布 `655:141064`；节点组合 `402:23347` 下创建、参考图、完成、生成中与待恢复等状态已存在。工具未返回版本号，以读取时间登记。

本批无需设计修改：布局、样式、组件状态、命中范围、焦点/输入、选择、生成/恢复状态及 item.id 持久身份保持。只读结构核对不能证明像素一致，完成后须运行同状态回归；若修改视觉或交互契约则重新核验 Figma。

## 数据与平台

无 schema、key、存储路径、Provider 协议或权限变更。原件、聊天、未知受理任务及临时聊天保护保持；不发生成请求。Web 仍完整同步 JSON.stringify，不能宣称该成本消失。Desktop 共享逻辑适用，原生壳和实际安装包需分别验证；Mobile 不适用。

## 风险

禁止缓存可变 dragRef 作为前后状态、保留旧事件闭包，或绕过 Context 声称所有节点隔离。首次批次避免这些行为改造。无用户产品语义待决定项。回退仅逆转本任务 patch，不能恢复整份 dirty 基线覆盖他人改动。
