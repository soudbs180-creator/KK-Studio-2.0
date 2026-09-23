# Intent

- ID：PORT-001
- 状态：Implemented（Phase 1：原样搬入 + 最小接线；Phase 2 适配待排期）
- Figma URL/node：无新增 Figma 节点；沿用现有 Settings › 网络 入口
- 用户问题：KK Studio 的多个功能（应用内代理、本地 Agent/MCP、连接器/插件、提示词库、
  云端同步、音频生成）仅有 UI 展示或 Prototype 演示态，缺少真正的后端实现；开源项目
  infinite-canvas 已具备大量现成后端能力与功能。
- 预期结果：把开源项目的后端能力原样搬运进本仓库并跑通（canvas-proxy、canvas-agent、
  画布插件系统、提示词库、WebDAV 同步、音频生成工具库），保持本项目 UI 不变，
  以最小接线在设置中心呈现真实后端信息；验证本项目构建、测试、门禁全绿。
- 不在范围内：Phase 2 的深度适配（Agent 对话面板接入、插件节点渲染层接入、Tauri 一键
  启停、features.registry.json 状态更新、ComfyUI/付费 Provider 搬运、云端账号体系）。
- 决策记录：
  - 「先搬后适配」：本轮按用户选择执行 Phase 1，代码落入 `vendor/` 隔离目录，
    不参与本项目 typecheck/lint/prettier/features 门禁。
  - 查漏补缺：file-storage/image-storage（素材持久化）不搬运——本项目已有更先进的
    Rust 原生素材存储（FEAT-014，native-assets 变更），开源实现为浏览器 IndexedDB。
