# Intent：全页面新UI收敛与主线集成

- Task ID：TASK-UI-FULL-20261015；日期：2026-10-15；状态：IN_PROGRESS。
- 用户授权：继续检查所有页面与所有已实现卡片，重点模型选择、Agent输入框、圆角、同排对齐、旧项目重开；发现问题直接修复，浏览器验证后提交并合入主线。
- 用户追加纠正：卡片必须按真实载荷区分空态与内容态；空card只保留upload，不显示内容toolbar，有内容card才出现对应toolbar。所有类型还必须检查运行/失败/恢复状态与功能真实链、页面分类和动作互斥，尺寸GREEN不能代替该验收。
- 当前基线：6bc2e3da387e0117e24fd49419d9a0d6e4b6a9d4，Desktop/Web2.1.26；本轮版本脚本已递增候选Desktop/Web2.1.27，实际新构建待验；worktree D:/kk-studio/.worktrees/branch-consolidation-20261011；root负责产品源码，full_pages负责本轮交付文档；分支fix/TASK-UI-FULL-20261015。
- 远端事实：2026-10-15实际fetch及API确认origin/main=694a00607f6f63de1b8c43d0ebb117adf5d34f67；与候选共同祖先1f6cbd37，历史squash造成两侧差量，禁止按文件整份选ours/theirs。主线与候选必须逐项保全后再集成。
- 设计沿用当前新UI与[唯一索引](../../UI_INDEX.md)，不用历史页面覆盖新规则。先复证，再最小修复，不增加依赖或新主题。
- 非范围：付费Provider/秘密配置、真实资料迁移、Mobile实现、发布签名/安装器、旧分支清理；保留primary并发dirty/index与原件，合成恢复数据只用于隔离验收。
- 主线保全与Delivery：相对main新增15份历史包、75个五件套文件均存在；由本任务明确承接来源和当前组合验证，保留原任务branch/status和历史结论，不修改门禁或历史例外集。
- 关联：[规格](spec.md)、[计划](plan.md)、[验证](verification.md)、[审查](review.md)、[覆盖矩阵](coverage.md)。
