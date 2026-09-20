# Plan

- ID：2026-09-14-model-voice
- 变更文件：`src/features/creation/useSpeechInput.ts`、`src/components/VoiceInputButton.tsx`、`StartComposer.tsx`、`ConversationActions.tsx`、`ConversationPanel.tsx`、`ConversationModelPicker.tsx`、`catalog-pages.css`、`conversation-panel.css`、相关浏览器回归。
- 实施顺序：读取当前 Figma 输入栏状态 → 抽取共享语音识别 hook 和按钮 → 替换首页/工作台禁用控件 → 固定模型名称单行与省略 → 加入模拟识别回归 → 生产预览截图和 DOM 验证。
- 风险与回滚：Web Speech API 在部分浏览器或离线环境不可用；按钮会禁用并说明原因。回滚时删除共享按钮/hook并恢复各处原禁用按钮及旧模型文本节点。
- 验证命令：Windows 使用 `verify-kk-studio.cmd` 注入 Node 24 PATH 并执行 `npm run verify`；另行执行 Tauri `client:build -- --no-bundle` 与 WebView2 CDP 运行态检查。
