# P6/P7 交付验证

状态：PARTIAL。

## 已完成

- P6.1 工作流卡片旁新增 “Not installed? Get ComfyUI” 引导，链接 `https://comfy.org/download/`，并说明 Desktop/Portable、模型目录和目录选择步骤。
- P6.2–P6.4 工具栏新增 `扩图`、`高清修复`、`图层拆分` 按钮。按钮通过现有 `CanvasImageCommandContext.submit` → `prepareImageCapabilityInput` → `dispatchImageCapability` → `CapabilityRegistry.run` 路径派发；没有显式能力工作流时保持禁用并显示原因。
- P7 选中 ComfyUI 结果图片时显示 `[Workflow Source]` 属性行；点击来源卡片会复用画布选中和定位控制。

## 自动化证据

| 检查 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `tests/unit/imageCapabilityActions.test.ts` + `tests/unit/imageCapabilitySubmission.test.ts` | 5 passed |
| `tests/unit/canvasWorkflowSource.test.ts` | 3 passed |
| `tests/browser/image-edit.spec.ts -g "image capability actions"` | 1 passed |
| `tests/browser/comfy-workflow.spec.ts -g "P6.1 fixture"` | 1 passed；包含来源属性定位和来源卡片选中断言 |

## 本地 ComfyUI 图像尝试

证据目录：`D:/kk-studio/output/p6-p7-2026-11-01/`。

- `comfy-system-stats.json`：本地 ComfyUI `0.34.1` 在 `127.0.0.1:18188` 健康，检测到 `NVIDIA GeForce RTX 5080`。
- `checkpoint-inventory.json` 与 `model-inventory.json`：`CheckpointLoaderSimple.ckpt_name` 的可用列表为空；当前目录只有 MiniMax H3 diffusion/text/VAE 文件，没有 SD 1.5 或 SDXL checkpoint。
- `sd15-standard-workflow.json`：标准 SD 1.5 KSampler → VAEDecode → SaveImage 工作流。
- `sd15-generation-attempt.json`：真实 `/prompt` 请求返回 HTTP 400 `value_not_in_list`，原因是 checkpoint 列表为空；未产生任务、图片或画布节点。
- `canvas-fixture-run.json`：现有 ComfyUI 画布 fixture 通过，能归档 PNG 并写入结果边；它是协议/画布链证据，不是 SD/SDXL 模型验收。

因此，标准 SD/SDXL 图像验收仍未完成，不能把本次 H3 视频/首帧证据升级为图片验收。补齐 checkpoint 后可重跑同一工作流和接线测试，不需要新的代码路径。
