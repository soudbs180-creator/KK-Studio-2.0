# TASK-UI-008 · 输入框规则与实现验证

## 当前状态

2026-09-23：TASK-UI-008 DONE/PASS，未提交。隔离候选和回传后的原工程均完成 `npm run verify`：356 Node、295 browser，0 失败、0 flaky、0 跳过；UI 159/0、56 任务/29 功能门禁 0 违规，lint/typecheck/format/build 通过。原工程新构建 Tauri 的32组输入检查、实际资产字节校验和独立上下文复审全部通过。

## 来源与实现

规则先于实现：Ardot/PDF 的 DS1.1 颜色校正保持；本轮读取 Figma `0nU0A7pq6eyjwfwm1TtWkO / 407:29310` 的实际设计与截图，再将固定间隔、10px 文本和22/24px控件修订为 DS1.3 工程输入契约。在线 Ardot/PDF 未被改写；没有声称存在移动端 Figma Frame。

`index.html → src/main.tsx → App.tsx`：首页 `StartPage → StartComposer`；workspace `ConversationPanel → ConversationComposer/ConversationActions`。两者使用 `ComposerTextarea` 与末尾加载的 `composer.css`；旧页面 CSS 的重复输入几何已移除，图标继续消费既有设计资产。

文字、附件、型号参数、操作栏与首页生成选项采用文档流；焦点只显示在输入容器外层，文字按3–8行增长（短屏2–4行）。桌面文字14/20、按钮32；触屏文字16/24、命中44，主/辅助图标20/16。手机首页与触屏对话按功能分两排，768–1200宽首页有空间时保持单排。短屏对话可滚动至发送按钮；菜单避让整个操作区、内部滚动不被重定位清零。

## Web 运行与证据

运行工作树：`C:/Users/Administrator/.codex/worktrees/ui-input-contract/KK-Studio-2.0`，分支 `fix/TASK-UI-008-inputs`，基础 HEAD `cf344ddcdf039c6e62aeb9c65106e2a2339c0bb4`。这是未提交候选增量，不是提交 SHA 审批。原工程同 SHA 的1195份当前源码/文档快照是外部比较基线，未把原有并发改动归入本任务。

生产预览命令 `npm run preview -- --host 127.0.0.1 --port 1423 --strictPort`，URL `http://127.0.0.1:1423/`；实际页面 runtime 为 production。首页与创建项目后的 workspace 均在此 URL 内切换。主工程现有1421进程不属于本次验证，不停止或替换。

三档截图为390×844、834×1112、1440×900，首页空白/聚焦及 Agent/API 草稿共12张：[视觉证据](evidence/visual/capture.json)。浏览器测试还覆盖短屏、断点切换、4附件、长参数、模型实际选择、禁用/失败保留草稿、语音/IME既有交互、菜单关闭回焦和折叠。截图与 DOM 都来自重新构建后的 production preview。

## 失败历史与修复

- 首轮新增回归6项失败，复现 textarea 内层焦点与对话附件绝对定位；后续首页多行+附件复现发现区覆盖。
- 首轮全浏览器284通过/9失败：7项因隔离快照缺少被忽略的插件构建产物；实际 `npm run plugins:build` 后补齐。其余2项旧输入精确尺寸断言按已修订 DS1.3 更新，保留原交互与页面几何目的。
- 新测试删除列表时旧 nth 定位器失效、首页权限按钮名称错误，均修正测试定位；没有取消断言或放宽有效检查。
- 独立审查 R1：手机菜单覆盖第二排工具；R2：短桌面多附件+型号参数后发送被裁切；R3：菜单捕获自身滚动导致 scrollTop 清零。均有复现、修复和独立复验，历史结论保留在 [review.md](review.md)。
- 25项布局定向测试、后续18项菜单/输入/参数回归通过；最终全量结果见 [工作树验证日志](evidence/logs/worktree-verify.log)。首次失败日志保留，不使用旧通过数量代替最终验证。

## 最终原工程与桌面验收

- 原工程 `D:/kk-studio/KK-Studio-2.0` 先运行 `npm run agent:build`，随后 `npm run governance:write`、`npm run verify`；首次整合回归全通过。[原工程日志](evidence/logs/root-verify.log) / [浏览器 JSON](evidence/root-browser-results.json)。
- 当前随包 Agent 资源的4269个manifest条目逐一校验长度与SHA，50个新编译Agent文件与随包文件一致。采用 `npm run tauri -- build --config src-tauri/tauri.agent.conf.json --no-bundle` 重建，包含现有已验证的Agent资源；保留既有5项Rust未使用代码警告，无新增编译错误。[资源校验](evidence/desktop/runtime-package.json) / [构建日志](evidence/logs/tauri-build.log)。
- 执行 `node scripts/audit/check-input-desktop.mjs`：独立临时数据根和WebView profile，专用CDP9338；`http://tauri.localhost/`，production / src/main.tsx，CSS viewport1920×1080。首页/对话×深浅主题×8强调色，共32组输入增长、焦点、文字尺寸和图标居中检查通过；附件移除、独立Agent/API草稿、4种菜单Escape回焦、折叠保留和首页发现区流布局全部通过。无页面错误。审计仅关闭自建进程与profile连接，9338已释放。[原生结果](evidence/desktop/runtime.json) / [审计日志](evidence/logs/tauri-audit.log)。
- 当前JS `index-DLeRvWsG.js`，SHA256 `754e32be48a8a119b0e4791fd15bdfdacf6a27595e865801135ad4316068005a`；CSS `index-CCZfPOS7.css`，SHA256 `196db94dfd36b94d8f6d3aa319b0a5f72fc7309b7763383c9dd85bfad0cb2ef0`。原生实际fetch字节、原工程dist、独立Web补审及三档截图是同一构建资产。EXE SHA256 `045ba6e3b257ae301c4fad1f835ec8e17b9633fe87fc7cd91ec3c721416a5ff9`；不是安装器/发布验收。
- 独立复审最终PASS：R1/R2/R3关闭；767/768/834/1200/1201下10组工具布局、每组7按钮命中和30次菜单开关通过；两个通道草稿保留。见 [最终review](review.md) 和 [断点数据](evidence/review-tablet-final.json)。
- 回传前逐文件比对，26份任务文件直接同步，共享账本仅追加TASK-UI-008。集成前2226个文件留有SHA；本轮测试改写的39份旧截图/报告恢复到回传前字节，其他未归本任务的文件全部匹配。共享进度文档仅补本轮记录；无commit/push。[保留与增量记录](evidence/integration.json)。

## 验收边界

本任务验证 UI 规则和可操作性；真实付费 Provider、其他 Agent 适配器、云服务、发布与托管 CI 沿用各任务状态。手机/平板为浏览器尺寸模拟，尚无真实移动设备软键盘证据；最终视觉偏好仍由用户确认。未 commit/push。
