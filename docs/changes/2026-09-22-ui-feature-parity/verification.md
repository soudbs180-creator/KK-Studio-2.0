# TASK-UI-005 验证记录

状态：DONE / PASS（本批新增功能 UI 对齐契约）。当前工程已集成，未 commit/push。用户随后提出的折叠、弹窗开关、左上角重叠及画布点阵缩放由下一交互任务继续处理，不包含在本批完成声明内。

## 结果与范围

依据现行 Design System 1.1 核对 29 项功能，补图片/Agent 双通道、首次准备、连接与审批/停止反馈、插件实际管理入口、提示词库、文案方式真实作用于输入、音频演示和平台/版本说明。范围与后端边界见 [audit.md](audit.md)。新界面属于 DS1.1 工程补充，不宣称缺失页面 Frame 的逐像素还原。

## 当前工程验证

| 验证 | 命令 / 证据 | 结果 |
| --- | --- | --- |
| 全量 | npm run verify | 327 Node、241 Playwright/Edge；0 失败、0 flaky、0 skipped |
| 代码与结构 | lint、typecheck、ui:check、format:check、build | PASS；UI142/0，51任务/29功能/0违规 |
| Agent 服务集成 | npm run agent:build | 专用条件准备路由安装与完整编译 PASS；未重启现有用户服务 |
| 独立预检 | review.md、最终38文件清单 | PASS，R1–R5全部关闭；独立28单元/4浏览器及安装保护实验通过 |
| 桌面新构建 | npm run client:build -- --no-bundle | PASS；既有未使用 Rust 函数警告保留，未改 Rust 源码 |
| 桌面实际运行 | node scripts/audit/check-ui-feature-parity-desktop.mjs | PASS；16主题/强调色组合、2次独立启动、实际JS/CSS逐字节对应dist |

日志在 evidence/logs/kk-ui-parity-root-*.log。全量浏览器报告为 evidence/web-full-results.json，当前截图为 evidence/web-accepted/ 和 evidence/desktop/。其他 red/green/web/web-final/web-protocol 目录为实施过程证据，不能替代最终报告。

## 运行链路与交互

- Web：npm run verify 的 test:ui 先重建 production dist，再由 Playwright 启动固定 http://127.0.0.1:1423/；未占用或终止现有1421开发服务。
- 首页 / → App → StartPage/StartResourcePopover；workspace → App → ConversationPanel → ConversationChannelSelector、AgentComposer/AgentConversationMessages；settings/network → SettingsSections → AgentConnectionSettings；提示词弹窗 → App → PromptLibraryPanel。
- App 统一引入 feature-parity.css；控件继承 ui-tokens/ui-primitives。新浏览器回归覆盖390/768/1920、双主题8强调色、最终computed色值、按钮前景对比度、长文本/分页/取消/异常缓存、Escape与焦点返回、插件导航及两通道草稿保留。
- Agent fixture 使用与 vendor 一致的命名 SSE + hello。覆盖 ready/warning/idle、注册后activate/state、首轮准备、审批队列、停止失败/重试、断线、旧停止/发送悬挂后的新连接可操作。旧服务404无自动降级；延迟准备请求遇到另一窗口已建会话时原子拒绝，保留现有会话。
- Desktop：新 target/release/kk-studio.exe，http://tauri.localhost/，production模式。审计仅使用隔离data-dir/WebView2 profile，已关闭本审计创建的两个进程。提示词追加保留草稿；Agent受控发送和停止错误/重试正常；重启后草稿、目录缓存保留，Token清空、Agent未自动连接。

## 审查发现与纠正

独立审查发现早期fixture事件格式不同于真实服务，旧313/237通过不能证明真实协议；已校正命名事件、hello与注册顺序。另修正warning误拒、迟到审批覆盖、组件旧操作锁和无条件threads/new可能覆盖会话的问题，详见review.md。原工程首次全量触发组件行数与一处格式门禁，已按职责提取通道控件并格式化，最终完整verify重新通过。

## 源码与保留

HEAD cf344ddcdf039c6e62aeb9c65106e2a2339c0bb4 + 已有dirty候选；隔离分支fix/TASK-UI-005-feature-parity，原工程chore/TASK-CONSOLIDATE-200。增量回传前逐文件核对原快照，无覆盖冲突；保留原工程其余未提交工作。测试写入的旧docs/evidence、历史文本截图、Tauri schemas已还原到运行前字节；本批证据保存在自己的change目录。

vendor原先被忽略：tracked scripts/agent/提供条件准备handler和幂等安装器，在现有codexMutation锁内检查注册客户端、空会话及预期版本。安装器保留其它源内容，遇局部人工修改拒绝覆盖；不改变threads/new/reset/resume语义。运行中的旧Agent服务未被终止，下次通过npm run agent启动才载入新服务构建。

文件SHA、最终审查清单、实际EXE与资源校验见source-manifest.json和evidence/desktop/runtime.json。原工程启动脚本start-kk-studio.bat继续使用已有freshness launcher。

## 保留边界

受控服务证明协议/UI，不证明真实CLI、账号、付费Provider或工具执行成功。提示词目录fixture不证明远端CORS；真实音视频、ComfyUI生成、WebDAV完整同步、T5恢复、在线Ardot写入及用户最终视觉验收仍为开放任务。本批没有发布安装包或进行hosted CI/正式PR审批。
