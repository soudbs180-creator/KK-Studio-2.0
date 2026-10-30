# Spec：安装验收与自动对话初始化的边界

- Task ID：TASK-CANVAS-RELEASE-20261018；日期：2026-10-19；Owner：root-release。
- 状态：IN_PROGRESS / NOT_VERIFIED；currentPackage：本目录。
- branch：`fix/TASK-CANVAS-RELEASE-20261019-installer-lifecycle`；base：e43c5efaa9e80ad7ee617c852868a20e6093e08a/tree d9c0ee4206fb83bc413696b50356a887d10ad049；新head待提交。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Verification](verification.md) / [Review](review.md)。

1. 首次install和真实production首页launch后，在创建任何项目之前打开已有模型接入设置，等“服务运行中”和“停止服务”enabled，绑定首页ensure已结束；不点击连接/停止或改变自动偏好。再验证随包Agentstart/status/stop；原healthy=true断言保留，增加available=true、running=true及停止后running=false。首页无project，自动ensure不准备Codex会话。
2. 随后沿原顺序创建并保存原验收项目；重装、资源损坏拒绝并修复、卸载后重装四次launch与项目内容断言全部保留。
3. 原包损坏拒绝、4284文件校验、安装位置/现有安装保护、仅自有注册清理及finally错误传播保留。不加stop重试、睡眠、timeout放宽、自动偏好修改或生产guard变化。
4. 自有临时数据和profile与原用户资料隔离；所有真实日常资料原件、凭据身份、storage key及seed不变。
5. 本机同候选包证明测试修法，不冒充新head安装器。新head经正常PR/main门禁；正式42tag只从最终通过main创建，fresh构建，正式包再完成同项验收后才日常安装与发布三端。
