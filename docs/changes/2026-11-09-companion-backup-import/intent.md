# 旧本机服务备份显式导入 Desktop

- Task：TASK-CLOSURE-20261109；FEAT-037；承接用户当前版本验收→跨端存储保护的顺序。
- Outcome：用户在 Desktop 现有项目包恢复入口选择旧 Companion 备份的 manifest.json，预检通过后恢复为独立 Native 新仓库，保留旧聊天、来源和全部合法素材。
- Scope：项目包原生读取分派、新的有界 Companion 读适配、实际 Node 备份 fixtures、拒绝/回滚测试、原生文件选择器增加 JSON 导入过滤器；不改产品视觉。
- Non-goals：Web/Native 实时共仓、Native HTTP 数据面、缺失来源信息的推测补全、旧根覆盖、账号计费、真实付费 Provider、生产发布、依赖升级。
- 架构依据：已接受 ADR-021；Native 唯一写入者，Node 为显式导入源。沿用现有 staging/readback/权威准入/原子 publish。
