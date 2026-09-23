# 音频生成节点（FEAT-007）

- 状态：PARTIAL
- 领域：creation
- 最近更新：2026-09-22
- 关联任务：TASK-UI-005、BACKEND-MEDIA-001、EXT-PROVIDER

## 用户可见入口

- 添加节点 › 音频；与文本节点共用 `PromptCreationNode` 编辑卡片。

## 代码位置

- UI：`src/components/nodes/PromptCreationNode.tsx`
- 演示 seam：`src/components/nodes/useLocalGeneration.ts`、`src/domain/demoMedia.ts`
- 真实链路（已移植）：`src/features/creation/audioGeneration.ts`（OpenAI 兼容 TTS 请求构造、
  音频选项规范化、本地代理拼接、错误透出）；源：vendor/canvas-plugins 上游 `web/src/lib/audio-generation.ts`

## 测试与证据

- `tests/browser/demo-results.spec.ts`
- `tests/unit/audioGeneration.test.ts`（选项规范化、TTS 请求构造、代理拼接、错误透出）

## 当前能力

- 音频节点仍回放本地演示素材（固定结果）。
- TTS/音频请求后端能力已可用（供后续供应商接线复用），尚未接到节点提交链。

## 差距与后端化（Wave 1）

- 抽象音频 provider（TTS/音乐），复用统一任务宿主与素材归档；区分语音/音乐的参数与轮询。
- 真实验收依赖供应商 Key/额度（EXT-PROVIDER）。

## TASK-UI-005 更新

音频卡改为本地演示标识，移除无效的文案/剧本/策划案选项。真实 TTS 仍未接任务/资产链。 见 [核对与验证](../changes/2026-09-22-ui-feature-parity/verification.md)。
