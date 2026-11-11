# Intent：保全旧聊天并恢复编辑和聊天

- Task ID：TASK-CHAT-MIGRATION-20261017；状态 READY；2026-10-17；owner root。
- 当前用户明确要求：继续解决旧聊天资料只读和迁移，保全原始数据，恢复正常编辑和聊天；仍不删除或移动文件，完成相关验证。
- 用户请求授权范围内的 AI 技术决策：实现已接受 ADR-022 的迁移、普通聊天权威与执行隔离；无需用户重复批准普通技术步骤。
- current 交付包：[Spec](spec.md)、[Plan](plan.md)、[Verification](verification.md)、[Review](review.md)；前次审计交付包保持历史含义。
- branch `fix/TASK-CHAT-MIGRATION-20261017`，base `bbc8a766740ec94d30171020cf208a6aeb3c87d4`。
- 复用已完成审计的现有实体 worktree `D:/kk-studio/.worktrees/TASK-AUDIT-REPAIR-20261017`，不新建第五个 checkout、不移动目录；旧审计分支保留 bbc8a766。

## 目标与约束

默认原库有9项目、5个项目级旧Agent线程；一个v2项目包含两个普通chat。主快照revision2226，SHA `998e0101cfd0d13ed660771f04a6668a618a0c6ae9ccf198088ab17e9e616931`。多chat写入与root投影未隔离导致正确保护；不能靠取消guard恢复使用。

本轮恢复已有普通聊天的编辑、保存、离线阅读、原线程重连和正常发送。已有chat/项目/线程/素材/凭据引用与未知字段保全；无法证明来源的旧内容独立标记，不自动发送。新窗口、临时聊天、通用多Agent、额外Provider/Mobile/账号功能不扩展。旧任务不批量结案，真实外部能力与本地fixture分别记录。

## 验收

| ID | 可观察结果 | 证据 |
| --- | --- | --- |
| AC-1 | 原始主备、身份、资料和历史可恢复，未删移原文件 | 不可变副本、SHA、独立枚举重哈希、隔离恢复 |
| AC-2 | 迁移后各聊天正文/草稿/附件/线程独立，编辑和重开不丢 | 原始Value对账、迁移故障矩阵、实际Native和浏览器 |
| AC-3 | 普通聊天重连和发送归原chat，不借线程或跨chat写入 | scope7正负回归、迟到/并发/重连、canonical历史落盘 |
| AC-4 | 当前产物正常打开原库，主备格式与身份屏障一致 | EXE/input/loaded bundle/版本、启动与关闭重开收据 |

未知外部连接/额度不伪报成功；不授权图片、视频或其它额外付费生成，不外发用户文件或秘密。

## 执行边界回读

原保全、编辑、历史和迁移验收由[当前验证](verification.md)记录；正常新回复因共享Codex额度耗尽保持未验收，不改原验收要求、不删除/移动原文件。
