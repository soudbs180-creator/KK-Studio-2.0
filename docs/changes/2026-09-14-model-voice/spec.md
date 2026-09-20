# Spec

- ID：2026-09-14-model-voice
- Source of truth：当前 Figma 输入栏 `410:74765` 提供 58×22 模型槽和 32×34 语音状态；`21:104319` 提供“声音开/声音关”图标资源。当前完整 Landing Frame 在文件中已被移动/删除，首页沿用现有共享输入栏和语义令牌。
- 入口与状态：`.start-mic-button` 和工作台 `.chat-composer [data-voice-state]` 默认关闭；支持环境显示“开启语音输入”，识别期间显示“关闭语音输入”，启动/停止及页面不可编辑时显示对应状态，不支持环境显示禁用原因。模型文本始终 `white-space: nowrap`，过长时省略。
- 数据契约与权限：`useSpeechInput` 使用浏览器 `SpeechRecognition`/`webkitSpeechRecognition`；权限、网络和服务能力由运行环境决定，应用只接收 transcript，不持久化音频或密钥。
- 验收标准：点击开启后 `aria-pressed=true`、图标切换为 `composer-mic.svg`；识别结果追加到输入框；再次点击停止并回到关闭图标；首页与工作台均通过；模型默认名和超长名不折行。
- 错误、取消、离线：权限拒绝、网络失败、无语音、识别失败和不支持环境分别展示状态；卸载、切换项目、离开工作台、提交中和手动关闭调用 `stop`/`abort`，手动编辑会结束当前会话，迟到结果不能写入其他输入框。
