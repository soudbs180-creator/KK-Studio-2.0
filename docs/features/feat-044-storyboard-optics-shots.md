# 分镜、光学与逐帧拉片（FEAT-044）

- 状态：PARTIAL
- 领域：creation
- 最近更新：2026-11-05
- 关联任务：TASK-E2E-WIRING-20261104

## 用户可见入口

画布创作工具输入小说/剧本及一致性约束，使用已配置文本模型生成结构化分镜；长文串行分段，每次真实任务不超过4000字。校验角色/服装/场景/道具与真实资产后，用户审阅并添加画布节点和连线，资产面板显示分镜文字。模型失败保留原文和已持久化结果，不提供演示兜底。

节点参数面板提供焦段、光圈、景深及机身并编入实际提示词。视频节点在客户端解复用和全帧解码，按 `0.75*deltaRGB+0.25*deltaHist` 切镜，真实缩略图归档后展开为参考卡。支持取消和显式格式/时长/资源上限失败。

## 代码位置

领域：`src/domain/storyboardPipeline.ts`、`src/domain/cameraOptics.ts`、`src/domain/videoShotBreakdown.ts`；工作流：`src/features/workflows/index.ts`；UI：`src/app/useStoryboardWorkflow.ts`、`src/components/nodes/VideoShotBreakdownControl.tsx`。MP4Box（BSD）/ts-ebml（MIT）只在适配层使用，光学和切镜公式独立实现，未复制 AGPL 参考。

## 测试与证据

`tests/unit/creativeWorkflowWiring.test.ts`、`tests/browser/advanced-canvas-wiring.spec.ts` 及[验证记录](../changes/2026-11-04-e2e-wiring/verification.md)。WebM 135帧实际浏览器解码通过。

## 当前能力

模型任务→严格校验→用户审阅→画布及资产面板；光学进入实际提示词；解码真实视频帧并归档切镜参考卡。失败没有演示兜底。

## 差距与后端化

外部模型质量、当前 Desktop 同态验收和最终门禁待完成，状态保持 PARTIAL。客户端须支持 WebCodecs 与对应视频编解码器，不支持时明确失败。

## 2026-11-05 深水区补齐

导演景别/机位角/环绕与俯仰、四个光学预设、指定节点同源桥接；剧本设定表提炼、最多两轮定向修复与单镜生产任务写回。共享UI与生产Edge定向入口通过；模型质量与Desktop同态/最终交付继续按[本次验证](../changes/2026-11-05-step2-deep-water/verification.md)分开记录，状态保持PARTIAL。
