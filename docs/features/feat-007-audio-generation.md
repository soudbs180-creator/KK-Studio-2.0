# 音频生成节点（FEAT-007）

- 状态：PARTIAL
- 领域：creation
- 最近更新：2026-11-04
- 关联任务：BACKEND-MEDIA-001、EXT-PROVIDER、TASK-UI-005

## 用户可见入口

首页、对话及音频节点选择语音模型连接，输入朗读文本后，经统一 CreationTask / 原生持久 TaskHost 执行 OpenAI 兼容 `/audio/speech`。无配置、失败或离线不返回演示音频。参数契约捕获音色、MP3/WAV、0.25–4 倍速；节点默认 Alloy/MP3/1 倍速。音频参考附件明确拒绝。

二进制结果通过 MIME、签名与大小校验后归档并连 result 边，任务和结果可重载。speech 本身无轮询 ID；请求中断后的受理不确定保留 unknown，禁止重发冒充恢复。音乐生成尚未接入。

## 当前能力

生产入口已接入统一任务链；跨端真实服务终验仍待完成，状态保持 PARTIAL。

## 代码位置

- `src/components/nodes/PromptCreationNode.tsx`、`src/features/creation/audioGeneration.ts`。
- `mediaTaskExecution.ts`、`executeMediaTask.ts`、`nativeTaskHost.ts`、`src-tauri/src/task_host_media.rs`。
- `packages/creation-contracts/media.ts`；`tests/unit/mediaTaskExecution.test.ts`、`mediaResponse.test.ts`；浏览器 `generation-flow.spec.ts` 验证显式 speech 夹具的归档、解码、播放和重载。
- [阶段 3 验证](../changes/2026-11-04-multimodal/verification.md)。真实服务验收由 EXT-PROVIDER 跟踪，不能以固定协议夹具升级 REAL。

## 测试与证据

当前整合结果以[六支柱接线验收](../changes/2026-11-04-e2e-wiring/verification.md)为准，源树协议测试记录见[阶段 3 验证](../changes/2026-11-04-multimodal/verification.md)。

## 差距与后端化

真实 Provider、Desktop/Web 同态终验、模型能力及实际音视频解码验证必须分别记录，合成协议通过不能升级 REAL。

2026-09-22 的独立 TTS helper 和本地演示节点已由本轮统一任务接线替代；保留历史演示素材读取。
