# Intent：统一现有 UI 细节

- Task ID：TASK-UI-DETAILS-20261015；状态：IMPLEMENTED；日期：2026-10-15。
- 来源：用户五张截图及“不要旧的和新的混合”“重点当前UI其实还可以的就是细节导致画面失衡”。
- 授权：本次明确要求整理现有 UI；按 AGENTS/SDLC 自主处理技术实现，不声称额外人工批准。
- Owner：root；branch：fix/TASK-UI-DETAILS-20261015；worktree：D:/kk-studio/.worktrees/branch-consolidation-20261011。
- Base：18e143f06ee6741d20d45346fd1bb77f34bef606（最新2.1.25）；primary 51fcc 为旧基线且 dirty，保留原文件/index。
- 范围：设置密度、首页/聊天输入框、模型入口形状、卡片上传状态、扩展页内容轴线；Desktop/Web共享，Mobile规划不变。
- 验收：紧凑设置切换不遗留宽壳；首页/Agent无画布参数；文字胶囊/图标方形圆角一致；发送与末尾动作同组；空媒体只有一个上传入口，已有内容重载不返回旧上传栏；扩展标题到卡片同列。
- 非目标：重写主题、节点数据模型、Provider/权限/凭据/存储、首页提交路由；不调用付费模型，不推送/发布。
- 当前规范：[UI索引](../../UI_INDEX.md)；[规格](spec.md)；[计划](plan.md)；[验证](verification.md)；[评审](review.md)。
