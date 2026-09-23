# 视频生成节点（FEAT-006）

- 状态：PROTOTYPE
- 领域：creation
- 最近更新：2026-09-21
- 关联任务：BACKEND-MEDIA-001、TASK-MINIMAX-001、EXT-PROVIDER

## 用户可见入口

- 添加节点 › 视频（徽标“MiniMax H3”）；AddNodeMenu 明示“仅支持本地演示素材，API 未连接”。

## 代码位置

- UI：`src/components/nodes/VideoNode.tsx`、`DemoResultNode.tsx`、`DemoRunButton.tsx`
- 演示 seam：`src/components/nodes/useLocalGeneration.ts`、`src/domain/demoMedia.ts`、`src/domain/localGeneration.ts`
- 固定素材：`public/fixtures/demo`
- 真实链路：尚无（图片链路 FEAT-002 是复用模板）

## 测试与证据

- `tests/browser/demo-results.spec.ts`（验证演示行为与标注，不验证真实生成）
- MiniMax 审计：`docs/changes/2026-09-21-minimax-deep-audit/`

## 当前能力

- 仅回放固定本地演示素材；提示词、比例、时长不改变结果；不消耗积分、不上传。

## 差距与后端化（Wave 1）

- 抽象视频 provider（规划 MiniMax H3 等），复用任务宿主的队列/幂等/取消/归档；视频为异步作业，需要轮询/回调与进度。
- 参数（时长/比例/清晰度）真实透传；结果素材化并连 result 边。
- 代码链路可先于凭据完成；真实出图验收依赖 EXT-PROVIDER（Key/额度）。

## 变更记录

- 2026-09-21：创建卡片，状态 PROTOTYPE。
