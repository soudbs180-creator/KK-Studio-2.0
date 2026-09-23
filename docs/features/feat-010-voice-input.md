# 语音输入（FEAT-010）

- 状态：PARTIAL
- 领域：creation
- 最近更新：2026-09-21
- 关联任务：TASK-CAP-001

## 用户可见入口

- 开始页与对话输入框麦克风按钮（VoiceInputButton），听写到输入框。

## 代码位置

- `src/features/creation/useSpeechInput.ts`：浏览器 Web Speech API（SpeechRecognition / webkitSpeechRecognition），含 start/stop/error/超时状态机
- UI：`src/components/VoiceInputButton.tsx`，接入 StartComposer / ConversationActions

## 测试与证据

- 浏览器：`tests/browser/composer-voice.spec.ts`

## 当前能力

- 支持 Web Speech 的浏览器/WebView 中真实语音转文字。

## 差距与后端化

- Desktop WebView2 是否提供 SpeechRecognition 未验证；不支持时必须显示禁用原因而非假成功。
- 无服务端语音识别；浏览器不支持时无降级方案。

## 变更记录

- 2026-09-21：创建卡片，状态 PARTIAL（Web 真实，Desktop 未验证）。
