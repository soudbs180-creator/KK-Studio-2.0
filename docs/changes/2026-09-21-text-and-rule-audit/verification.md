# BACKEND-TEXT-NODE / TASK-RULES-003 verification

更新：2026-09-22（Asia/Shanghai）。**本轮本地实现、运行验证与独立dirty-diff预检通过；TASK-RULES-003 DONE，文本整体仍为PARTIAL。**

唯一工程 D:/kk-studio/KK-Studio-2.0，分支 chore/TASK-CONSOLIDATE-200，HEAD cf344ddcdf039c6e62aeb9c65106e2a2339c0bb4 加未提交工作区。遵从用户要求，未commit/push。原有其他dirty修改和暂存删除未重置、未混入提交。

## 交付与状态

- 文本节点从固定演示切换到现有BYOK任务链。Web请求OpenAI兼容 /chat/completions SSE；Desktop使用同一TaskHost、系统凭据库与journal，文本不进入图片素材仓库。
- 支持增量中文、真实结果卡/连线、编辑/复制/下载、持久保存。输入4,000字、输出32 KiB UTF-8；仅完整非空响应可成功。离线不发送，缺配置明确禁用，取消/断流后的未知受理不能普通重试。
- 原生并发占用属于jobs，独立于WebView；重载只读原任务。恢复保留用户编辑，发送前重新检查来源/任务/连接状态。
- 规则门禁修复完成；28功能/48任务登记一致。FEAT-003/005/009/026以本轮勘误降为PARTIAL；FEAT-008由PROTOTYPE推进到PARTIAL。真实付费Provider和完整T5验收没有被fixture取代。

## 最终验证

| 命令/范围 | 结果 | 留存证据 |
| --- | --- | --- |
| npm run verify | exit0；lint/typecheck/format/build通过，227 Node、210 Playwright/Edge，0失败/0flaky，UI129/0 | logs/full-verify.log、browser-results.json |
| features/governance | 28 features/0、48 tasks/0；文档收口后再校验 | logs/closeout-checks.log |
| cargo test --manifest-path src-tauri/Cargo.toml --bin kk-studio | exit0，74/74 | logs/rust-tests.log |
| cargo fmt --manifest-path src-tauri/Cargo.toml -- --check；cargo check | exit0；5项既有dead_code warning，非新增失败 | logs/cargo-check.log |
| npm run client:build -- --no-bundle | exit0；当前Tauri release exe，未打安装包/未发布 | logs/native-release-build.log、source-manifest.json |
| node scripts/audit/check-text-runtime.mjs | development1421，当前/src/main.tsx，真实本机HTTP SSE、保存/编辑/刷新通过 | text-development-runtime.json/png |
| node scripts/audit/check-text-runtime.mjs --desktop | 隔离Tauri release/WebView2，http://tauri.localhost/，当前index-C7-jQxHk.js，通过4组断言 | text-desktop-runtime.json/png |
| 独立agent复核 | 31相关Node、17 TaskHost Rust、features28/0；无残余blocker | review.md |

完整verify后只有治理文档、证据留存和开发审计脚本对Vite正常HMR查询参数的路径识别调整；产品源与已验证release/bundle身份见source-manifest.json。收口再次运行lint/format、features/governance与Rust fmt。前述历史feature-system的212/200/65仅代表其当时状态。

## Desktop 实机协议断言

使用独立data-dir/WebView profile与随机loopback端口；只读现有环境并创建本轮fixture凭据，结束后删除该凭据并关闭本轮进程。没有使用真实付费账号。

1. 设置文本连接、concurrencyLimit=1，经实际UI提交；Rust发送带幂等键的流式POST，界面显示未完成草稿。额外同凭据请求在journal创建前被capacity拒绝。
2. 生成中刷新WebView，再打开同项目，恢复仍在运行的草稿；释放fixture后结果成功，服务端POST数量仍为1。
3. 编辑结果、保存、再次刷新，用户文案保留；未生成媒体assetId。
4. 第二个独立任务接收草稿后取消，状态unknown、按钮禁止普通重试；迟到流不添加成功结果。第三个独立任务正常完成，原生容量释放，浏览器activeJobs=0。
5. 模拟浏览器离线入口后提交新文本，HTTP请求数量不变、草稿保留；恢复网络状态。

Web production preview 的10项文本专项覆盖缺配置、实际产品请求体/鉴权/幂等键、中文结果持久化、长文案编辑/保存/刷新、来源在异步校验期间删除、截断/空响应/HTTP拒绝、离线、取消后迟到响应，以及真实本机HTTP SSE分段显示。完整210项还覆盖图片任务、provider调度、演示、资产、键盘/菜单和响应式等相邻流程。

## 复现与修复证据

- 旧feature门禁对无平台证据REAL、历史中的状态字符串和仅OBSOLETE任务放行。新版隔离fixtures先7失败/1通过，修复后8/8；覆盖坏字段、路径穿越/绝对路径/符号链接和文件类型。日志feature-red.log、focused-green.log。
- Web文本SSE最初未实现时8/8失败，完成后8/8通过；畸形JSON、EOF、空结果、错误事件、超限、length终止和取消不会伪装成功。
- Rust追加错误事件回归先4通过/1失败，随后修复且全套74通过；错误内容不回显Provider正文。日志native-text-red.log。
- 原生恢复用户编辑的回归先复现标题被“文案结果1”覆盖，再修复通过。日志edited-recovery-red.log；独立review还直接复现了长结果保存写入prompt导致decodeSnapshot失败。
- 审计脚本定位错误已按真实DOM/运行契约修正：project-library-card实际类名、Vite内联模块与HMR查询参数、unknown提示实际文案；未放宽生成结果、请求数、持久化或未知受理断言。

## 规则冲突与声明勘误

- 功能卡由维护者同步编辑；features/README.md和TASK_LEDGER.md才是生成视图。AGENTS中“验证不足只能Prototype”修正为按真实范围保留PARTIAL/PROTOTYPE。
- REAL要求非空入口/代码/测试、DONE/PASS关联任务和各声明平台的runtimeEvidence。非REAL必须有开放任务，DONE/OBSOLETE均不是开放任务。路径必须位于仓库内，异常数据报违规而非直接崩溃。
- Wave1允许先做本地实现，不能绕过依赖的实际验收；Wave2归组不等于禁止Wave1开工。静态门禁只验证证据结构/引用，不能证明证据内容真实或规则被模型理解。
- FEAT-009旧“Rust chat_completion/stream已接入前端多轮对话”与实际App图片任务入口不符，已修正并登记BACKEND-CONVERSATION；本文本节点是单次生成。
- FEAT-003尺寸映射代码透传不证明Desktop/每个模型的尺寸适配；BACKEND-IMAGE-PARAMS恢复PARTIAL。未静默吞掉供应商尺寸错误，也未伪造旧验收。

## 运行链、证据边界及保留

入口 / → App → Canvas → CanvasNodeContent → PromptCreationNode → CanvasImageCommandContext → App executeTask → Web generateText / Desktop TaskHost → textTaskResult/原生journal恢复。复用既有样式与组件，本轮不宣称新的Figma视觉一致性。预览固定1423、开发固定1421；实际Desktop bundle通过与dist/index.html比对确认。

完整browser回归会写docs/evidence；执行前保存当时文件字节，最终产物另存本change目录，随后按原字节恢复已有路径。此前dirty证据仍保留，不重置为HEAD。来源SHA/源文件与产物SHA-256见source-manifest.json。早期feature-guards/backend-text-native工作树只留作候选，最终实现以唯一工程为准。

实际付费Provider/ComfyUI、完整T5进程退出/崩溃/断电恢复、原生health统一、安装发布、Hosted CI/正式PR审批、live模型规则eval均未被本轮本地证据替代。BACKEND-TEXT-NODE保持PARTIAL，不宣称整个后端路线图完成。

协议参考：[OpenAI streaming](https://developers.openai.com/api/docs/guides/streaming-responses)、[Image generation](https://developers.openai.com/api/docs/guides/image-generation)。这些资料用于确认协议边界；运行结论来自上述实际工具结果。
