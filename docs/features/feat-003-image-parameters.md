# 图片比例与清晰度参数（FEAT-003）

- 状态：PARTIAL
- 领域：creation
- 最近更新：2026-10-08
- 关联任务：BACKEND-IMAGE-PARAMS、TASK-AGENT-001、TASK-MODEL-001

## 用户可见入口

- 图片参数弹层 `ImageModelParameters`：按当前 API 账号/模型目录展示精确尺寸及比例；未声明仅提供“自适应”。
- 设置 → 模型供应商 → 模型与参数：刷新目录、用途/尺寸与生成/参考图编辑/蒙版/扩图三态声明；参考图和单次任务数量可留空表示未知。
- 选择后随生成请求真实发送给供应商；“自适应”= 不传 size，使用供应商默认。

## 代码位置

- 映射（唯一事实源，纯函数）：`src/domain/imageParameters.ts`
- 操作/限额白名单：`src/domain/imageModelCapabilities.ts`；归档参考图计数：`src/domain/imageReferences.ts`；账号模型解析：`src/features/models/imageModelCapabilities.ts`。
- UI：`src/components/nodes/ImageModelParameters.tsx`、`src/components/settings/ProviderModelCatalog.tsx`；目录：`src/features/models/modelCatalog.ts`
- 浏览器请求：`src/features/creation/imageGeneration.ts`（JSON body 与 multipart 均透传 size）
- Desktop 请求：`src/features/creation/nativeTaskHost.ts`、`src-tauri/src/task_host.rs`（`size` 字段透传，Rust 不重复映射）
- 任务接线：`src/features/creation/model.ts`（CreateProjectInput/CreationTask.imageSize）、`imageTaskCommand.ts`、`src/App.tsx`

## 测试与证据

- 单测：`tests/unit/imageParameters.test.ts`（比例×清晰度映射、自适应、非法值、8px 对齐）
- 类型/构建：`npm run typecheck`、`npm run build`
- 能力契约：`tests/unit/imageModelCapabilities.test.ts`；真实组件：`tests/browser/model-capabilities.spec.ts`；fresh Tauri：`tests/desktop/model-capabilities.mjs`。
- 本轮完整检查及运行证据：[TASK-MODEL-001 验证](../changes/2026-10-08-model-capabilities/verification.md)。
- 变更证据：`docs/changes/2026-09-21-feature-system/verification.md`

## 当前能力

- TASK-MODEL-001 已实现同一目录的图片操作三态、参考图和任务生成数量声明，初始准备/Web租约/Desktop提交前消费同一限制。声明限定精确账号/model，provider 禁止优先；未知保留原兼容，false/0 不丢失。归档素材去重计数用于普通生成、重绘、连线和附件读取，原件缺失仍拒绝。最新集成完整verify及fresh Tauri通过，精确提交独立补审/PR门禁以本轮验证为准。

- 任务校验精确 size 属于所选账号/模型，进入原有 Web/Desktop 透传链。切模型清除旧尺寸；参数保存重开保持。旧比例映射仅保留历史项目兼容。
- 供应商不支持某尺寸时返回其真实错误，不静默吞掉。

## 差距与后端化

- 标准 /models 往往不返回尺寸/能力；可选 capabilities.image 扩展或手动声明均不构成真实服务验证。非兼容厂商和真实付费逐家验收仍待补；蒙版/扩图执行未接通，不能因支持声明开放操作。功能保持 PARTIAL。
- 视频节点的比例/清晰度/时长仍为草稿（FEAT-006 后端化时处理）。

## 变更记录

- 2026-09-21：从“仅存草稿”改为真实透传，PROTOTYPE → REAL（BACKEND-IMAGE-PARAMS）。

## 本轮证据勘误（2026-09-22）

状态按 [本轮验证与勘误](../changes/2026-09-21-text-and-rule-audit/verification.md) 纠正为 PARTIAL；保留早期记录的历史含义，不当作现行完成结论。

本轮目录与参数改动见 [默认 Agent 验证](../changes/2026-09-22-codex-default-agent/verification.md)。新增 modelCatalog/modelRouting 单测、model-picker 与 desktop-data-stability 浏览器回归；Codex 内置生图不虚构可选 API 尺寸。
