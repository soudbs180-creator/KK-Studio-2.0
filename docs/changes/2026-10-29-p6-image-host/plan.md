# 图片能力任务接线 Implementation Plan

> For agentic workers: use superpowers:executing-plans；用户已指定本上下文独立执行，不使用子代理。

**Goal:** 图片能力任务接线可独立验证、版本化与回退。

**Architecture:** 独立Manifest与执行器通过现有CapabilityRegistry/TaskPort；显式ComfyUI工作流/原件绑定，不猜API端点、不新增任务队列/素材仓库；API适配接口保留，未配置不可用。

**Tech Stack:** 既有TypeScript/Zod/React与ComfyUI HTTP适配器，无新增算法库。

**Spec:** [本卡spec](spec.md)

任务 TASK-MOD-P6-HOST；base `972adc011e040b6db76284de1daea42d8b2167cb`；复用既有分支 `refactor/TASK-MOD-P3-feature-cycles`，不新建工作树，不使用子代理。

独立Manifest与执行器通过现有CapabilityRegistry/TaskPort；显式ComfyUI工作流/原件绑定，不猜API端点、不新增任务队列/素材仓库；API适配接口保留，未配置不可用。

## 文件与接口

P6共享契约imageCapability.ts定义有界workflow/参数/绑定，CreationTask新增可选imageCapability；capabilities各独立文件只校验本能力及TaskPort派发。creation装配输入→原队列，integrations/generation复用LocalComfyUiAdapter，无私有跨切片导入。P7共享assetLineage.ts与三端merge策略，不改变既有读写协议身份。

## 步骤与验证

- [x] 先写请求非法/权限/禁用/同任务引用/独立升级回退/来源去重的失败用例，保存RED。
- [x] 最小实现公开契约、真实调用方和必要快照兼容；运行GREEN。
- [x] 对绑定原件与参数、结果顺序、取消/未知受理/恢复、旧包和跨端来源运行限定回归。
- [x] 快速三门禁、构建/预算/CSS/Edge与四文档清单更新。
- [ ] 自审、提交、源码/构建证据绑定；独审/真实GPU/原生与main另验。

已完成作者预检，候选提交与源码绑定记录于回执；独审/真实GPU/Native/main仍待，不勾为全部完成。
