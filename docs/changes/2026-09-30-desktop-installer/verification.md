# Verification：Desktop 安装器

- Task ID：TASK-DESKTOP-INSTALLER-001；状态：DONE（本机子任务 AC1–4 范围）。
- 日期：2026-09-30，Asia/Shanghai。
- [Intent](intent.md) · [Spec](spec.md) · [Plan](plan.md) · [Review](review.md)。
- Base：bd3bc66889b2856e273c2117191a74fdebd6f791。
- 当前 task worktree：D:/kk-studio/.worktrees/T7-desktop-installer；最终 head 的独立补审与托管门禁另行绑定，不将早期审查套用新提交。

| 检查 | 结果 | 范围 |
| --- | --- | --- |
| 独立 npm ci | PASS | 锁定依赖，Node24.19.0 |
| 基线 lint/typecheck | PASS | 修改前 |
| 基线桌面启动测试 | PASS 12/12 | 修改前 |
| 收据与保护定向测试 | PASS 8/8 | 损坏/缺文件/路径、新鲜度、NSIS binary marker；GUID 注册与 portable 进程真实 Windows fixture |
| NSIS 构建 | PASS | 完整 Agent + 离线 WebView2；5 个已有 Rust dead_code warning 未屏蔽 |
| 原生安装/修复/卸载再装 | PASS | 实际 NSIS；4 次安装各 4279 文件，Agent、项目保存/重装/资源修复/卸载再装、注册清理 |
| 设置几何无重试复验 | PASS 160/160 | 相同 8 项重复 20 轮，原像素/包含断言保留 |
| 最终全量 verify | PASS | head2cf5249：根631/639（8 skip）、Agent169/171（2 skip）、browser377/377，无 flaky；lint/typecheck/ui/format/build 全部通过 |
| Rust fmt/test/client:check | PASS | 97/97 Rust tests；源码未改变，head8ece4c7 运行 |
| 独立审查 | PASS（技术/运行证据） | base→2cf5249，INST-001–005 关闭；最后文档提交另绑定精确 SHA 补审 |
| Hosted CI / PR / main 推广 | 独立交付门禁 | 此记录提交时尚未发生；实际精确 head/CI/merged 结果保存在 PR 与交付收据 |

实际收据 commit `0fba927d85b3c0edb0b3260073e09f66c9c32f19`；beforeBundle 构建输入 commit `61b0c855c570fb83a8e469d8c9b04b294151c0f2`。两者仅新增保护测试，产品源码相同。后续采样/证据目录/文档提交也不改变应用产物。安装器大小 343681213 bytes，SHA256 `7103126d23c070c39bf1d5ce8ef897b8c277dda88838c1ee769bb0e24325d635`；安装后 EXE SHA256 `0d782457aa115e664bf55aca50a7d0865c92e5fba5d84d5dfff582b6fabeb5a3`。Authenticode 实际检测 `NotSigned`。

交付复制复核勘误：早期文字记录误写343671471 bytes，现按真实收据/文件修正为343681213。原始收据、实际安装校验与installer hash从未改变，复制后的安装器再次通过size/hash核对。旧错误保留在Git历史，不覆盖原始证据。

Tauri 2.11 在 NSIS 入包前将唯一 bundle marker 从 UNK 改为 NSS，打包后恢复源码目录 EXE。首次收据发现 mtime 较新而拒绝，未忽略失败。现以 beforeBundle 记录原 EXE、预期 NSS EXE、配置/manifest hash，并在收据时再次核对；未知/重复 marker 拒绝，实际安装后再次逐文件验证。详见[官方处理源码](https://raw.githubusercontent.com/tauri-apps/tauri/dev/crates/tauri-bundler/src/bundle.rs)。

原生命令为 `npm run client:installer:test -- releases/installer-guarded/installer-receipt.json`，实际安装路径是随机临时 `kk-installer-audit space-*`（含空格），data-dir/profile 独立；URL `http://tauri.localhost/`、首页 `/`、Tauri release、bundle `assets/index-DBl3l-J0.js`。启动链为 `src/main.tsx → App.tsx → StartPage`，实际 IPC 快照验证项目名“安装器保留项目验收”；截图证明窗口加载，项目保留由 IPC 和隔离快照证明。每次操作先拒绝其它注册/进程，卸载后保留数据，只清理本轮临时路径对应且无未知值的 settings 键，最终探测为空。外部请求采用无效 per-process proxy 与非本地 DNS 限制，主机 WebView2 已存在。

首次 verify 的根测试 627/635（8 skip）、Agent 169/171（2 skip）通过，browser 376 pass + 1 flaky。既有设置测试关闭 retry 重复五轮为 35/40 PASS、5 FAIL；20 次低负载诊断未复现，受控四帧间隔诊断 10/10 复现顺序测量失败，同帧矩形差值全为 0。产品 surface-enter 动画保持；仅修正同步采样，两项原像素断言未放宽。修复后关闭 retry 20 轮为 160/160 PASS。计划已记录该验证修正。

2cf5249 补充 nav/两按钮/panel/sidebar 可见性断言，保留旧 boundingBox 对隐藏控件的失败能力；再次无 retry 20 轮 160/160 PASS，完整 verify 退出0且377/377无flaky。实际证据见 [candidate-verify.log](evidence/candidate-verify.log) 与 [settings-visibility.log](evidence/settings-visibility.log)；前次 head8ece4c7 的完整成功记录另存 [final-verify.log](evidence/final-verify.log)，不修改其来源SHA。

首轮原生报告曾放在 Playwright 的 test-results，后续 browser 清理导致报告/截图丢失，退出日志保留。已将默认输出移到独立 .tmp/installer-audits，并重新完整实机验收；本轮 evidence 保留最新原始报告/截图与初次日志，未重建或伪造已删除文件。

日志保留 stdout 的失败与 warning；落库仅标准化 CRLF/行尾空格/末尾空行，原始日志及 raw SHA 在工作区外保留。文本 stored hash 对应 LF 仓库字节，Git checkout 可转为 CRLF。[capture.json](evidence/capture.json) 绑定来源、退出码与文件身份；[原生报告](evidence/installer-runtime.json)、[安装收据](evidence/installer-receipt.json)、[受控诊断](evidence/settings-controlled-geometry.json)、[实际 active rulesets](evidence/hosted-rulesets.json)。

当前主机已有 WebView2；干净 Windows、无 WebView2 首装、真实断网环境、低版本回滚、签名、正式发布、Provider/ComfyUI 均 NOT VERIFIED。T7 与 FEAT-026 保持 PARTIAL；收据校验不是数字签名，也不单独证明安装可用。
