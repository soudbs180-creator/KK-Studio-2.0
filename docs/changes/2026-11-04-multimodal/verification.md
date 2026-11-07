# 阶段 3 验证

- Base：`3d1a48f9`；分支：`codex/TASK-STAGE3-multimodal`。
- 初始 main 干净，只有正式工作树，版本 Desktop/Web 2.1.64。
- 安装：`npm ci --ignore-scripts --no-audit --no-fund` exit 0。
- 基线 typecheck/lint 通过；补齐既定 postinstall 后单测 2495 通过、20 既有跳过、0 失败。首次单测因未构建 Agent dist 失败的日志保留。日志位于 `D:/kk-studio/output/logs/stage3-2026-11-04/`。
- Figma：当前 `91:3` 顶层组件索引只读检查，session `4e259e75-10cd-44fb-b02a-9b3b4c1b420d`。不以此宣称完整视觉验收。
- 当前 Figma 参数组件 `630:7203` / Veo `630:7196` 已读取：4/6/8 秒、720p/1080p、16:9/9:16、最多 3 张参考图与首尾帧。生成动作 `760:74485`、反馈 `968:23363`、首尾帧 `2403:46977` 保持现有布局。
- 原生子任务 `92aacba1f17ee72eccd2e659fc1f8233d5fccf6f`：Rust 无默认特性全量 411 通过、1 既有忽略；TaskHost 63 通过；check/fmt/diff 通过。覆盖原件首尾帧、严格参数、回执先落盘、重启仅 GET、未知提交不重发、取消与部分成功恢复、无凭据结果下载及 MIME/大小校验。日志 `native-final-full.log` / `native-final-check.log`；默认特性与实际 Desktop 需当前前端 dist 后验证。
- 共享提交、UI、运行态和真实 Provider 验收：待执行。原生合成协议测试不代表真实收费出片或媒体解码验收。
