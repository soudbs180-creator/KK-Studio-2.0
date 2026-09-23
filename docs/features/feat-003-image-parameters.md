# 图片比例与清晰度参数（FEAT-003）

- 状态：PARTIAL
- 领域：creation
- 最近更新：2026-09-22
- 关联任务：BACKEND-IMAGE-PARAMS、TASK-AGENT-001

## 用户可见入口

- 图片参数弹层 `ImageModelParameters`：按当前 API 账号/模型目录展示精确尺寸及比例；未声明仅提供“自适应”。
- 设置 → 模型供应商 → 模型与参数：刷新目录、用途/尺寸声明。未知新模型不猜测能力。
- 选择后随生成请求真实发送给供应商；“自适应”= 不传 size，使用供应商默认。

## 代码位置

- 映射（唯一事实源，纯函数）：`src/domain/imageParameters.ts`
- UI：`src/components/nodes/ImageModelParameters.tsx`、`src/components/settings/ProviderModelCatalog.tsx`；目录：`src/features/models/modelCatalog.ts`
- 浏览器请求：`src/features/creation/imageGeneration.ts`（JSON body 与 multipart 均透传 size）
- Desktop 请求：`src/features/creation/nativeTaskHost.ts`、`src-tauri/src/task_host.rs`（`size` 字段透传，Rust 不重复映射）
- 任务接线：`src/features/creation/model.ts`（CreateProjectInput/CreationTask.imageSize）、`imageTaskCommand.ts`、`src/App.tsx`

## 测试与证据

- 单测：`tests/unit/imageParameters.test.ts`（比例×清晰度映射、自适应、非法值、8px 对齐）
- 类型/构建：`npm run typecheck`、`npm run build`
- 变更证据：`docs/changes/2026-09-21-feature-system/verification.md`

## 当前能力

- 任务校验精确 size 属于所选账号/模型，进入原有 Web/Desktop 透传链。切模型清除旧尺寸；参数保存重开保持。旧比例映射仅保留历史项目兼容。
- 供应商不支持某尺寸时返回其真实错误，不静默吞掉。

## 差距与后端化

- 标准 /models 往往不返回尺寸，须服务明确返回或按供应商文档声明。当前支持已有 OpenAI 兼容协议；非兼容厂商、真实付费逐家验收与新版 Desktop 同态证据待补。
- 视频节点的比例/清晰度/时长仍为草稿（FEAT-006 后端化时处理）。

## 变更记录

- 2026-09-21：从“仅存草稿”改为真实透传，PROTOTYPE → REAL（BACKEND-IMAGE-PARAMS）。

## 本轮证据勘误（2026-09-22）

状态按 [本轮验证与勘误](../changes/2026-09-21-text-and-rule-audit/verification.md) 纠正为 PARTIAL；保留早期记录的历史含义，不当作现行完成结论。

本轮目录与参数改动见 [默认 Agent 验证](../changes/2026-09-22-codex-default-agent/verification.md)。新增 modelCatalog/modelRouting 单测、model-picker 与 desktop-data-stability 浏览器回归；Codex 内置生图不虚构可选 API 尺寸。
