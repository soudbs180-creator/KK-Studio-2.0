# Native 验收修复与测试边界

任务：TASK-CHERRY-RED-001。2026-10-13，2.1.17 候选；最终状态继续由 verification/账本记录。

## 已复现并修正

- 配置保存：原生写入失败时，旧实现已经更新浏览器配置和密钥。浏览器 RED 断言实际收到 replacement-model；现在既有账号先持久化 unverified，再更新系统凭据，最终 native commit 成功后发布 profile。凭据/第二次写入失败保留 unverified，组件同步读取真实缓存。账号 ID、credentialRef、冷却和运行任务保持。
- TaskHost：两个真实瞬时本地模型请求会争用同一 host 的 exclusive repository.lock。新增实际线程测试 RED，随后在文件锁外增加同进程 journal Mutex；跨进程独占约束保持，锁内没有网络 await。154 项 Windows Rust 测试通过。
- Runtime：当前打包的 Codex 文件为 307,108,144 字节，旧 256 MiB 限制错误拒绝启动。有限上限调整为 512 MiB；大于上限仍拒绝，SHA、大小、平台、路径、执行权限检查保持。稀疏文件测试经历 RED/GREEN。
- macOS 取消测试：已收到真实 ConnectionReset，表示 TCP RST 已断线；现在接受 EOF 或 ConnectionReset，超时、其他错误、仍有内容都失败。
- Native 生命周期验收：当前四结果入口位于图片节点。脚本迁移至真实设置、模型菜单、数量控件和图片生成入口，保留四结果、部分结果、unknown、防重和实际项目身份断言。等待新候选的完整执行结果。

## 原生自动化

新增可选 Cargo feature `native-e2e`，默认发行 feature 不包含驱动。仅显式环境、独立 data-dir、指定回环端口时运行，单独 target 目录编译；不打入正式安装器、不改变产品权限或 Native 指令。测试直接通过 WebDriver 操作实际 UI handler、实际 Tauri IPC 和本地 HTTP；没有 mock Native 指令。指针命中区域仍由浏览器 UI 测试验证。

Windows 开发候选的六组实际验证通过：系统凭据写读删、模型发现、双模型生成/日志/Markdown、项目包往返、随包 Agent 启停、重启后凭据和项目保持。此二进制与正式发行版共用实现，但含测试驱动，不能视为正式发行版的字节验收。receipt 保留 dirty 边界和可执行文件 hash；最终不可变提交还需重跑。

驱动为 [tauri-plugin-wdio-webdriver 1.5.0](https://crates.io/crates/tauri-plugin-wdio-webdriver/1.5.0)，实际 crate LICENSE 为 MIT，来源 [webdriverio/desktop-mobile](https://github.com/webdriverio/desktop-mobile)。下载 crate SHA256：`4f76676d510d271d80abcf8b0552987b5b4f0eae5e3f906e9b5660d43c97c62e`。只添加测试 feature 所需 24 个 Cargo package，原有 569 个 name/version 均保留，不进行其他升级。macOS 不使用付费驱动服务。

CI Windows 安装回执继续要求源码 clean。Tauri 生成 ACL 文档的 diff 独立归档，再仅复原四个非 release-input 生成文件；任何其他源码改动仍会使回执失败。三平台 Native 工作流用免费标准 runner，Linux 使用实际独立 D-Bus Secret Service 和 Xvfb。当前 Windows/macOS Hosted 结果尚待新版实际完成，不引用旧提交结果冒充通过。

## 当前验证

`npm run verify` 全部通过：1127 unit（1113 PASS、14 SKIP）、174 Agent（172 PASS、2 SKIP）、520 浏览器全部 PASS、开发插件四步 PASS；lint、类型、UI 237/0、格式和生产构建通过。随后保存失败显示补修的完整相关浏览器文件 11/11 PASS。系统凭据和 Native 测试仅使用随机 synthetic 账号，清理自己创建的项；不读取用户真实密钥，不调用收费云服务。
