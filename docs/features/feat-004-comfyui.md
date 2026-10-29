# ComfyUI 本地出图链（FEAT-004）

- 状态：PARTIAL
- 领域：creation
- 最近更新：2026-09-21
- 关联任务：T6、EXT-COMFY

## 用户可见入口

- 设置中可添加本地 ComfyUI 连接（`local_comfyui`，loopback）。
- 规划入口：图片节点经本地 ComfyUI 工作流出图（当前不可用）。

## 代码位置

- 前端适配器（已写未接）：`src/integrations/generation/localComfyUiAdapter.ts`（/prompt、/history、/view、/interrupt 原语）、`providerAdapterFactory.ts`（工厂零调用）
- Rust 命令（已写未接）：`src-tauri/src/main.rs` 的 `comfyui_check_connection / comfyui_queue_prompt / comfyui_get_history / comfyui_scan_directory`
- 连接模型：`src/domain/providerConnections.ts`
- 服务端参考实现：`src/features/generation-server/provider.ts`、`assets.ts`

## 测试与证据

- 服务端 local_comfyui 路径有真实 HTTP 测试：`tests/unit/generationServerProvider.test.ts`
- 前端/Rust 桥接无测试（因为未接线）
- 证据：账本 T6、`docs/architecture/GENERATION-PLATFORM.md`

## 当前能力

- ComfyUI 工作流文件的本地管理是真实能力（见 FEAT-005）。
- 适配器与 Rust 原语代码已具备，但没有 Tauri invoke 桥，`imageTaskCommand` 不经过工厂，UI 无法触发本地出图。

## 差距与后端化（Wave 1，纯本地、无外部依赖）

1. 前端新增 invoke 桥调用 Rust `comfyui_*`（或经统一任务宿主）。
2. 将 ComfyUI 提交接入 `submitImageCommand → executeTask`，复用 FEAT-002 的 reservation/health/journal。
3. 工作流持久化、逐任务取消（只删指定队列项，不用全局 interrupt）、归档与重启恢复。
4. 用户选定 ComfyUI 根目录/工作流/模型（EXT-COMFY 验收条件）。

## 变更记录

- 2026-09-21：创建卡片，明确“代码已写、链路未通”，列为 Wave 1 最高优先。

- 2026-10-15：TASK-KK-UNIFIED-20261015 已获用户实施授权，新增范围见 [统一规格](../changes/2026-10-15-kk-unified/spec.md)。本卡既有证据仍限原版本；新范围实现/真实验收尚未完成，不能沿用旧 PASS 关闭。

## 2026-10-29 P6.1候选更新（PARTIAL）

TASK-MOD-P6-1已接通桌面画布工作流卡片：选择本地根目录并隐藏启动、健康检查、进入原生编辑器/返回、选择保存的API工作流快速执行、WS/归属history→AssetPort→结果图片连线。返回保留原生编辑内容。旧段落的“没有接线/只管理文件”描述历史版本，不覆盖本追加；旧生成任务入口并未因此全部改造。

代码入口为src/features/comfyui/index.ts、src/components/canvas/ComfyWorkflowNode.tsx及src-tauri/src/comfy_runtime.rs/comfy_transport.rs。隔离Native夹具已核验host/editor两个client、原件SHA、持久化边、重载重开及停止；编辑器使用键盘提交，实际鼠标未验收。真实GPU/完整原生ComfyUI图界面、卡片参数面板、独审与主线交付仍开放，不提升REAL。后续只做浏览器与命令行验证，不再控制用户桌面。详见[验证](../changes/2026-10-29-p6-1-comfy-canvas/verification.md)与[ADR-033](../architecture/adr/ADR-033-comfy-canvas-runtime.md)。
