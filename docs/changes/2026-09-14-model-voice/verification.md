# Verification

- ID：2026-09-14-model-voice
- 命令与结果：`verify-kk-studio.cmd` 通过（Node 24 PATH 引导）；TypeScript 检查、Node 单元测试 23/23、`scripts/check-ui-standards.mjs` 99 文件/0 违规、生产 `vite build`、全库 Prettier 检查和 Edge Playwright 完整生产预览 122/122 均通过。`.prettierrc.json` 的 `endOfLine: auto` 消除了 Windows CRLF 导致的格式误报。
- 浏览器视口/状态：`http://127.0.0.1:1423/`，Vite production preview，1920×1080；landing 关闭语音、workspace 关闭语音；独立 mock SpeechRecognition 覆盖首页/工作台开启、识别、停止、启动中取消、启动失败重试、手动编辑、离开工作台和网络错误。Tauri release 通过 WebView2 CDP 在 `http://tauri.localhost/` 同状态读取，`SpeechRecognition` 与 `webkitSpeechRecognition` 均为 `function`，页面错误为空。
- 截图或 DOM 证据：`docs/evidence/voice-model-2026-09-14/landing-off.png`、`workspace-off.png`、`dom.json`、`tauri-landing-off.png`、`tauri-dom.json`。Landing 模型按钮 132.70×38.58，`white-space: nowrap`；工作台模型 58×22，语音 22×22，默认 `aria-label=开启语音输入`、`data-voice-state=off`、图标 `/design/figma/mic-off.svg`。
- Figma 对比：`410:74765` 的模型默认槽位、右侧 22px 语音槽及 `21:104319` 的开/关图标已复用；首页完整 Frame 不在当前文件中，未声称完成整页像素一致。
- 结论：Prototype（语音识别依赖浏览器/系统服务和用户麦克风权限；web production、Tauri release 的加载状态与组件交互已验证，真实音频是否可用仍取决于用户授权与系统服务）。
