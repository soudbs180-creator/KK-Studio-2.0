# 视频生成节点（FEAT-006）

- 状态：PARTIAL
- 领域：creation
- 最近更新：2026-11-04
- 关联任务：BACKEND-MEDIA-001、TASK-MINIMAX-001、EXT-PROVIDER

## 用户可见入口

首页、对话及画布视频节点选择已配置的 12AI Veo 3.1 标准/Fast 连接后，复用统一 `CreationTask`、审批、队列与 AssetPort 归档。未配置时引导模型设置，不加载假素材。支持 4/6/8 秒、16:9/9:16、720p/1080p、声音、标准模型最多 3 张图片参考或成对首尾帧；不支持的参考/参数明确拒绝。

视频提交与轮询分离：受理声明和任务 ID 在继续前持久化，恢复只查询原 ID，未知受理不自动重发。停止等待不冒充远端取消。原件验证 MIME/签名和大小后归档，结果以 result 边连接来源，重载读取本机原件。

## 当前能力

生产入口已接入统一任务链；跨端真实服务终验仍待完成，状态保持 PARTIAL。

## 代码位置

- UI：`src/components/nodes/VideoNode.tsx`、`CreationComposer.tsx`。
- 共享：`src/features/creation/mediaTaskInput.ts`、`mediaTaskExecution.ts`、`executeMediaTask.ts`、`nativeTaskHost.ts`。
- 原生：`src-tauri/src/task_host_media.rs`、`task_host_media_protocol.rs`、`task_host_video_recovery.rs`。
- 契约：`packages/creation-contracts/media.ts`；[阶段 3 验证](../changes/2026-11-04-multimodal/verification.md)。
- 测试：`tests/unit/mediaTask*.test.ts`、`tests/browser/demo-results.spec.ts`、`canvas-state-actions.spec.ts`。协议夹具不代表真实收费出片。

## 测试与证据

当前整合结果以[六支柱接线验收](../changes/2026-11-04-e2e-wiring/verification.md)为准，源树协议测试记录见[阶段 3 验证](../changes/2026-11-04-multimodal/verification.md)。

## 差距与后端化

真实 Provider、Desktop/Web 同态终验、模型能力及实际音视频解码验证必须分别记录，合成协议通过不能升级 REAL。

## 仍待验收

真实 Provider/GPU 和 Desktop/Web 同态终验由 BACKEND-MEDIA-001 / EXT-PROVIDER 跟踪。MiniMax 独立协议仍由 TASK-MINIMAX-001 承接；不以 Veo 支持推断其他模型可用。历史固定演示项目保留只读兼容。

2026-09-21 的固定演示状态已由本轮真实执行接线替代；原 MiniMax 审计见 `docs/changes/2026-09-21-minimax-deep-audit/`。
