# 生产生成去演示与显式离线夹具（FEAT-025）

- 状态：PARTIAL
- 领域：system
- 最近更新：2026-11-04
- 关联任务：BACKEND-MEDIA-001、BACKEND-TEXT-NODE、UI-003

## 用户可见入口

首页 StartPage、对话 Composer、画布文本/图片/视频/音频均走统一真实提交链。已删除 `useLocalGeneration` 与 `DemoRunButton`；缺模型、密钥或连接时显示设置引导，生产生成没有 demo fixture 回退。空任务列表不再塞入两张固定假任务。

`public/fixtures/demo`、`src/domain/demoMedia.ts`、`localGeneration.ts` 仅用于显式离线测试、示例展示及旧项目素材兼容；历史 `result.source=demo` 保留示范素材标记，不重写用户原件。

## 代码位置

- `src/runtime/canvasCommandRuntime.tsx`、`src/features/creation/useImageCommandSubmission.ts`、`useTaskExecution.ts`。
- `src/components/StartPage.tsx`、`nodes/CreationComposer.tsx`、`PromptCreationNode.tsx`、`canvas/TaskPanel.tsx`。
- `tests/browser/demo-results.spec.ts`：未配置三模态零演示请求、视频提交/轮询/重载、speech 失败不回退。
- `tests/unit/mediaEntrySubmission.test.ts`、`mediaTask*.test.ts`；[阶段 3 验证](../changes/2026-11-04-multimodal/verification.md)。

## 当前能力

统一提交链已替换视频/音频演示入口，历史结果仍按原 source 标记加载；用户数据和历史素材保留。

## 测试与证据

本轮整合的实际命令与失败修复见[六支柱验收](../changes/2026-11-04-e2e-wiring/verification.md)，源树结果只按来源使用。

## 差距与后端化

四模态真实服务与每平台同态终验仍由关联开放任务跟踪，保持 PARTIAL。2026-09-21/22 的演示 seam 是历史状态，现已从生产创作路径移除。
