# MCP 与外部专业软件接入专项思维链（MCP & External Pro Software Thought-Chain）

> 领域：MCP 服务集成、无 MCP 软件微型侧车（Micro-MCP Sidecar）、Topaz / Photoshop / Blender 桥接与降级链
> 适用：当扩展外部软件、引入 MCP 工具或打通工业级图像/3D/视频处理管线时，AI **自动且仅**加载此文件。
> 详见宏观设计规范：`docs/architecture/UNIVERSAL-EXTERNAL-APP-BRIDGE.md`。

---

## 1. 核心意图与架构基准

1. **KK Studio 角色定位**：
   - AGI 统一协同大脑与无限画布，绝不重新造劣质轮子；
   - 工业级成熟软件（Photoshop 生成式扩图、Topaz Gigapixel 4x/8x 超分、ComfyUI 扩散模型、Blender 3D 机位）统一收归为外部算力插件。
2. **三层接入梯度与微型侧车（Micro-MCP Sidecar）**：
   - **梯度 1（原生 MCP）**：走 `src/features/mcp/mcpClient.ts`（streamable HTTP / stdio）；
   - **梯度 2（无 MCP 命令行软件）**：编写极简独立侧车（`vendor/sidecars/<app>-mcp/`），侧车对外暴露标准 MCP，对内静默调起 Headless CLI（如 `topaz-gigapixel-cli.exe`）；
   - **梯度 3（GUI 桌面软件）**：利用官方脚本通道（Photoshop UXP/ExtendScript、Blender Python socket）后台自动化批处理。
3. **全自动降级矩阵（Graceful Fallback）**：
   - 软件已安装时优先调用顶级工业软件；未安装时平滑降级至本机 ComfyUI 模型；本地无 GPU 时降级至云端 API。
   - 用户在画布上永远只有一键式创作体验（超分、扩图、抠图），无需切屏。

---

## 2. 专项决策与留痕记录（最新记录追加于此）

### [2026-11-06 19:25] 外部专业软件微型侧车架构确立
- **执行 Agent**：Antigravity (Gemini 3.8 Flash High)
- **事实与依据**：
  - 响应 PO 指令，确立无 MCP 软件统一采用轻量级 Micro-MCP Sidecar 模式接入；
  - 正式发布架构白皮书 [`docs/architecture/UNIVERSAL-EXTERNAL-APP-BRIDGE.md`](../architecture/UNIVERSAL-EXTERNAL-APP-BRIDGE.md)；
  - 明确 Topaz Gigapixel CLI 侧车与 Photoshop UXP 桥接规范，主工程保持 0 代码污染。
- **移交待办 (Handoff)**：
  - 在 `src/features/capabilities/` 扩展对应 Manifest 与适配器优先级声明，打通能力路由。
