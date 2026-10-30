# 扩图（FEAT-040）

- 状态：PARTIAL
- 领域：creation
- 最近更新：2026-10-29
- 关联任务：TASK-MOD-P6-OUTPAINT

## 用户可见入口

原有任务提交程序接口；没有新增视觉控件或生产按钮。Desktop原生TaskHost未实现时拒绝提交，Web fixture只是共享核心预检。

## 代码位置

独立能力声明位于src/features/capabilities；公共输入在packages/creation-contracts/imageCapability.ts；现有creation任务与ComfyUI适配器负责执行和归档。

## 测试与证据

imageCapabilities、imageCapabilitySubmission、imageCapabilityWorkflow单测及image-capabilities浏览器任务链。完整边界见[本卡验证](../changes/2026-10-29-p6-outpaint/verification.md)。

## 当前能力

`image.outpaint` 1.0.0独立Manifest、禁用和版本回退，明确原assetId/参数/API格式工作流/输出节点；使用既有任务与资产仓库，不提供自研图像算法。

## 差距与后端化

真实GPU与节点/模型工作流、Provider API、Desktop GUI、独审与主线验收未完成；没有生产UI入口。需要在Desktop真实链路完成后再推进Web同等交付，不将FixtureTransform的回执当算法质量或REAL证据。
