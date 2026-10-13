# Native 验收修复与测试边界

当前执行至冻结源码 `7daeba25`，本机正式 Native6、真实 Ollama13 和隔离 NSIS 生命周期已有 PASS；最新完整验证、不同产物身份、Hosted 及最终验收的状态以 [最终记录](mainline-final-status.md) 为准。以下旧阶段保留执行时边界，不提前标 DONE。

任务：TASK-CHERRY-RED-001。2026-10-13，Desktop/Web `2.1.17`、Mobile `2.1.1`。当前 `codex/TASK-CHERRY-RED-001-mainline` 的 base/HEAD 为 `694a00607f6f63de1b8c43d0ebb117adf5d34f67`，Cherry 承接仍未提交。Windows 本地 Rust 通过；最终 Native、默认发行包/安装、三平台 Hosted 与用户验收仍 NOT VERIFIED，任务继续 PARTIAL。

## 已复现并修正

- 配置保存：原生写入失败时，旧实现已经更新浏览器配置和密钥。浏览器 RED 断言实际收到 replacement-model；现在既有账号先持久化 unverified，再更新系统凭据，最终 native commit 成功后发布 profile。凭据/第二次写入失败保留 unverified，组件同步读取真实缓存。账号 ID、credentialRef、冷却和运行任务保持。
- TaskHost：两个真实瞬时本地模型请求会争用同一 host 的 exclusive repository.lock。新增实际线程测试 RED，随后在文件锁外增加同进程 journal Mutex；跨进程独占约束保持，锁内没有网络 await。154 项 Windows Rust 测试通过。
- Runtime：当前打包的 Codex 文件为 307,108,144 字节，旧 256 MiB 限制错误拒绝启动。有限上限调整为 512 MiB；大于上限仍拒绝，SHA、大小、平台、路径、执行权限检查保持。稀疏文件测试经历 RED/GREEN。
- macOS 取消测试：已收到真实 ConnectionReset，表示 TCP RST 已断线；现在接受 EOF 或 ConnectionReset，超时、其他错误、仍有内容都失败。
- Native 生命周期验收：当前四结果入口位于图片节点。脚本迁移至真实设置、模型菜单、数量控件和图片生成入口，等待持久化并绑定实际 UI source ID，保留四结果、部分结果、unknown、防重和实际项目身份断言。等待最终新提交的完整执行结果。

## 原生自动化

新增可选 Cargo feature `native-e2e`，默认发行 feature 不包含驱动。仅显式环境、独立 data-dir、指定回环端口时运行，单独 target 目录编译；不打入正式安装器、不改变产品权限或 Native 指令。测试直接通过 WebDriver 操作实际 UI handler、实际 Tauri IPC 和本地 HTTP；没有 mock Native 指令。指针命中区域仍由浏览器 UI 测试验证。

Windows `68838135` + dirty 开发候选的六组实际验证通过：系统凭据写读删、模型发现、双模型生成/日志/Markdown、项目包往返、随包 Agent 启停、重启后凭据和项目保持。其 [回执](evidence/resumed-closeout/native-driver-688-dirty.json) 明示 dirty、测试驱动和 EXE hash `2923a6413214dea3483ffddb2a499fb630552bfd1c8b133673454c730f200db3`；[截图](evidence/resumed-closeout/native-driver-688-dirty.png) 保留。此二进制与正式发行版共用实现，但含测试驱动，不能视为正式发行版的字节验收，也不覆盖当前 mainline。

旧 `f8ead4fa` 的 [真实 Ollama Native 回执](evidence/resumed-closeout/ollama-native-f8.json) 证明当时实际 release 与本地 CPU 服务、两个真实模型、保存重开及项目包链路；[首轮失败](evidence/resumed-closeout/ollama-native-first-failure.json) 未覆盖。[旧安装器文件收据](evidence/resumed-closeout/installer-f8-files.json) 仅属于该旧源码工件。这些事实不能替代新提交的 Native、安装或跨平台验收。

驱动为 [tauri-plugin-wdio-webdriver 1.5.0](https://crates.io/crates/tauri-plugin-wdio-webdriver/1.5.0)，实际 crate LICENSE 为 MIT，来源 [webdriverio/desktop-mobile](https://github.com/webdriverio/desktop-mobile)。下载 crate SHA256：`4f76676d510d271d80abcf8b0552987b5b4f0eae5e3f906e9b5660d43c97c62e`。只添加测试 feature 所需 24 个 Cargo package，原有 569 个 name/version 均保留，不进行其他升级。macOS 不使用付费驱动服务。

CI Windows 安装回执继续要求源码 clean。Tauri 生成 ACL 文档的 diff 独立归档，再仅复原四个非 release-input 生成文件；任何其他源码改动仍会使回执失败。三平台 Native 工作流用免费标准 runner，Linux 使用实际独立 D-Bus Secret Service 和 Xvfb。当前三平台 Hosted、默认 macOS/Linux 包和安装回执须在最终新提交实际完成，不引用旧提交结果冒充通过。

`scripts/agent/native-e2e-build.mjs` 在编译前检查已提交源码，捕获 frontend/Native/Cargo/build 输入 hash，编译后再核对输入与 HEAD，生成绑定实际 feature EXE hash 的 build receipt；测试拒绝 HEAD/input/binary 不匹配。porcelain 使用 `trimEnd()` 保留首行状态空格，避免把生成 schema 的路径截错。当前 dirty guard 已实跑 exit 1：`Commit all source changes before building Native evidence`，本机日志 `.tmp/cherry-red/native-build-dirty-guard.log`；这是拒绝脏输入的证据，尚未形成新构建成功收据。

旧 `windows-fixed-head` 只记录运行时 HEAD，实际 EXE 早于最后 R1 前端修复，不能证明最终前端来自该 head。必须在最终提交后重建、核对 hash，再运行 Native；不回写旧收据身份。

## 旧 Hosted 失败的修复依据

`0e77c54c` 的 Windows installer receipt 因 Tauri CLI 2.11.4 把 Cargo.toml 的 54 处 CRLF 转 LF 而发现 dirty。六组独立字节 probe 的 [回执](evidence/resumed-closeout/cargo-cli-probe/receipt.json) 与 [LF control](evidence/resumed-closeout/cargo-cli-probe/lf-control-receipt.json) 证明只有换行变化，LF control 在 `core.autocrlf=true` 下没有 modified worktree column。probe runner 在编译前主动结束，exit 1 不是构建证明；正式候选通过 `.gitattributes` 固定 LF，其他源码 dirty 仍必须拒绝。

同一旧 head 的 macOS/Linux Native 五组已 PASS，但 cleanup 把 SIGTERM `signalCode` 误判为未退出，所以 job 仍 FAIL；quality 完整 verify 已 PASS，后续 Native 四结果 fixture 的旧数量/持久化等待/来源绑定仍 FAIL。退出判断和 fixture 已修，须以新 head 实跑三平台才能关闭；不把旧 job 改成 PASS。Cargo 探针的六对 before/after、diff 和原输出为证据，临时私有项目副本不是验收输入。

## 当前验证

当前 mainline dirty 的 `npm run verify` exit 0：[原始输出](evidence/resumed-closeout/verify-mainline-dirty.log) 记录 1127 unit（1113 PASS、14 SKIP、0 FAIL）、174 Agent（172 PASS、2 SKIP、0 FAIL）、522 browser 全部 PASS、development 四步 PASS；lint、类型、UI 237/0、格式和浏览器生产构建通过。Windows `cargo fmt --check` 与 `cargo test --locked` exit 0，[原始输出](evidence/resumed-closeout/rust154-mainline-dirty.log) 为 154 PASS、0 FAIL/IGNORE。旧 520 项及其后 11 项定向结果属于历史，不合并为当前原生证明。

系统凭据和 Native 历史测试仅使用随机 synthetic 账号，清理自己创建的项；不读取用户真实密钥，不调用收费云服务。最终必须冻结新提交，重建默认发行与测试驱动、安装器/三平台包并校验其 source/input/binary hash，回读三平台 Hosted 与 fresh 独立审查，再进行用户产品验收。仅本地 verify/Rust 通过不能把这条链路提前 DONE。

## 默认包与 Agent 资源收据增量

默认 macOS/Linux 包实现已完成：`native-crossplatform.yml` 构建 macOS app/dmg（免费 ad-hoc 签名）及 Linux AppImage/deb，调用 `tests/desktop/package-portability.mjs` 的 prepare/verify。workflow 的 push 覆盖 main 和两个 Cherry task branch，paths 覆盖 frontend、Native、随包 Agent、构建脚本及配置；PR 也按相关输入触发。默认发行 feature 不含 `native-e2e` driver。

校验器绑定 actual sourceHead/input hash，核对原包 bytes、平台/架构、运行资源清单和各资源 hash、执行权限；仅解包到独立临时目录，用实际默认可执行文件验证启动和 Native 存储初始化，再清理自有 PID/目录。smoke 本身不证明 GUI/IPC/vault/Agent 功能；这些仍由独立 Native 验收覆盖。macOS 还检查 ad-hoc signature，notarization 继续 NOT VERIFIED。

root 的 [self-test 原始输出](evidence/resumed-closeout/package-portability-selftest.log) 为 9/9 PASS，包括路径/资源/hash/dirty/HEAD/input 拒绝，以及隔离 Node fixture 的启动/早退与 PID 清理。这不是四种 actual package 运行证据；app/dmg/AppImage/deb 及相应包 hash、签名、默认启动回执仍等待新 head 的 Hosted 实跑，NOT VERIFIED。

Native build receipt 新增 packaged `runtimeManifestSha256`：编译前后核对当前 manifest，运行前核对 receipt 与当前资源，实际 Native 启动 target 再比对随包 manifest，拒绝复用旧 target 内的 Agent。fresh reviewer 检查时两个 manifest hash 一致；最终仍须生成绑定新 head 的正式 receipt/EXE 并实跑，而不沿用旧 receipt。

MR001 authenticated Anthropic browser header、MR002 完整目录身份及 MR003 迟到失败健康围栏的源码修复和定向证明见 [verification](verification.md)。root 正在回收最新完整 verify；本页前轮 1127/174/522 和 Rust154 保留执行时含义，不替最新增量预填全量 PASS。当前 Native、四种默认包、安装、Hosted 和最终产品验收仍待证据。
