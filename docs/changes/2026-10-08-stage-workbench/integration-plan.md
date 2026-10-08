# Integration Plan：新主线阶段工作台去重与合并

> For agentic workers: 使用 superpowers:executing-plans 顺序处理当前 worktree；已有功能契约与回归继续适用，按精确新 SHA 独立复审。

- Task：既有 TASK-ORCH-002，不新增同类 task/feature。
- 用户后续授权：本次明确要求“合并主线”，包括推送本任务分支、PR 与受保护的 squash 合并；不包含部署、收费生成或分支清理。
- 原候选：ca6bc522c06c56e37802be8315bcf6b0227945e7，原基线21d121d；合并前完整verify再验638root/172Agent/389browser，浏览器零重试。
- 当前新主线：5b0eb6a341335c6bcdefcadf59be3ae4c2e4cdb3，PR #34；验证期间前移，包含阶段Plan入口、共享编排器、重规划/回执/MCP改进。
- Goal：保留新主线有效改进，将本轮更完整的审批、返工、恢复与保存围栏融入唯一Plan入口；不用旧SHA审查/旧产物替代组合结果。
- Architecture：唯一TaskWorkbenchStages接收project和异步动作，内部读取project.stagePlans；单一App编排器供UI/Agent共享，保留activeProjectIdRef与画布刷新；原TaskHost/恢复/MCP逻辑保留。
- Files：App、TaskWorkbench、TaskWorkbenchContent、TaskWorkbenchStages、StagePlanDetail、stage/task CSS、原registry/ledger和交接文档；浏览器/desktop选择器随统一Plan标签调整，原领域和恢复测试保留。

## Review Focus

1. 单一Plan标签与单一面板/编排器；无第二计划状态、队列或重复审批入口。
2. 新主线activeProjectIdRef与画布更新不能被旧分支覆盖；旧项目请求仍先校验projectId/revision。
3. 宿主等待flush，原生CAS冲突不报成功、保留草稿；双击/迟到响应围栏不退化。
4. 保留主线增量重规划、回执恢复、MCP并发防护和暂停能力；新旧回归均须通过。
5. 任务与功能登记合并原条目，历史失败证据保留；新版本/产物/审查/CI分别绑定真实提交。

## Steps

- [x] 逐块解决冲突：在既有TaskWorkbenchStages承载增强面板，删除重复StagePlanPanel；保留唯一Plan路由和主线暂停能力；统一App实例及持久/画布提交边界；取消重复旧stage样式。
- [x] 治理合并：保留主线新增task/验收与两侧历史记录；仅增强原TASK-ORCH-002/FEAT-030。比较的31项历史定位仍绑定21d121d，补新主线已关闭缺口说明。按新主线patch提升Desktop/Web版本。
- [x] 定向/完整verify、client build/check和真实release审批/重启/CAS故障再验；保留新证据，核对源/EXE hash与实际UI。
- [ ] 固定committed HEAD独立复审；修复阻断后复验。推送并创建PR、attach artifact，等待精确HEAD的verify/delivery成功，再执行squash。
- [ ] fetch并ff-only更新本地主线，验证merged状态、merge SHA与组合结果；保留分支及worktree，未授权清理。
