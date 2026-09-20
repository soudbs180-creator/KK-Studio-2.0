# Spec

- ID：KK2-LAUNCH-AUDIT-20260916
- Source of truth：当前源码调用链优先于 README、历史账本、测试名称或旧版文件名。
- 状态口径：Ready 只描述验证范围内的能力；Partial 为有真实实现但未闭环；Prototype / Mock / UI Only 不作为服务可用依据；没有验证的真实供应商、移动运行时、域名生产部署保持未验收。
- 平台约束：Desktop 为主产品；ComfyUI 和本地模型只属于 Desktop；Web 使用浏览器本地存储且正式部署 VPS；Mobile 保留交互经验，替换旧业务与数据层。
- 数据权限：生产 VPS 仅运行读取命令和有限网络探测，不读取或输出 secret 内容，不操作数据库业务记录；用户给出的 API Key/Hash 不因名字猜测服务归属。
- 验收标准：report.md 覆盖用户 19 项输出；plan.md 中每项含问题、目标、平台归属、MUR、依赖、文件、风险和验收；verification.md 明示真实/模拟/未验收边界。
- 错误、取消、离线：重点审查未知受理、关闭恢复、损坏快照、保存失败、浏览器配额、跨平台错误入口，不把 AbortController 等同于供应商取消。
