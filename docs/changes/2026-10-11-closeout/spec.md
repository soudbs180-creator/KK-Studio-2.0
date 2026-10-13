# Spec：2026-10-11 项目收口增量

## 可观察契约

1. 已发现的视频和音频模型显示 `aria-disabled="true"` 与“此生成执行器尚未接入”，Enter 不得提交，Escape 可关闭并回焦模型入口。
2. 上传图片后，原始宽高写入当前项目快照；刷新并重新打开项目后，预览仍存在且画布比例保持一致。
3. `TASK-AI-GATEWAY-001` 已有实现和本地回归，因此状态为 `PARTIAL`；真实 Ark/Codex、DPAPI、上游流和 Desktop 运行态仍保持开放。
4. 计数、账本生成视图和 `PROJECT_STATE.md` 必须一致。

## 外部边界

真实 Provider、Gemini 登录、Tauri WebView、Hosted CI、发布、第二环境和用户验收不由本地 fixture 或浏览器测试替代。
