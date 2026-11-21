# 桌面模型代理验证

## 软件与证据

- 平台候选 Desktop 2.1.43。基线 9b1038a75a62d0fc6fc9c23d6866711138493ab7。
- Windows release 通过启动器的 ensureDesktopRelease 构建。输入 d4db3703f9dc7c75c42a64afe04ec011abbff637a9df19ca3a93c10a0f11a108，EXE SHA-256 30591a62338021a0d531a22f804c7f1a59a292870fcee404959eb4f8e55c7666。
- WebView2 用隔离目录启动，URL http://tauri.localhost/，production，入口 src/main.tsx。设置链路 App → SettingsPanel → SettingsSections → ConnectionSettings → ProviderNetworkSettings。工作树 .tmp/proxy-native-LlQpX4 包含同状态真实 WebView2 截图和 DOM 检查结果。
- Web 用 Vite preview，端口 1423，加载同轮构建的 dist。设置用例 11 项通过，包含仅桌面展示线路控件的边界。

## 结果

- Windows 受控代理收到模型发现、发文字和生图的 CONNECT。界面报告三次手动代理。代理拒绝连接后没有重复提交，代理握手没有上游 Authorization。
- 本地 HTTP 夹具验证检测、文字流和图像归档均成功，未经过代理。重启后仍为保存的直连。强制直连收到 HTTP 301，测试代理未收到该请求。
- 首次真实域名直连探测发现本机 DNS 对该域名返回 198.18.0.0/15 内的合成地址。候选保留直连校验，代理模式仅接受域名解析得到的该类占位地址。清除子进程代理环境变量后，Windows 系统代理实测对模型列表探测收到 HTTP 401。未使用付费 Key。
- Rust 主程序 230 通过，1 个既有忽略。TypeScript、cargo check、生产构建、lint、格式、UI 静态规范、设计浏览器 8 项及设置浏览器 11 项通过。
- 最终 EXE 的既有 TaskHost 生命周期 11 项通过，含图文生成、任务取消、恢复与归档。收据在 test-results/desktop/taskhost-lifecycle/1795236556709-736421aa-ee39-436e-91a6-ac6284c8ed1b/receipt.json。
- 全量 verify 在 Agent 的一项 Codex TOML 表头测试停止。Node 1975 通过、20 跳过，Agent 203 通过、2 跳过、1 失败。该测试读取本机实际配置，同一失败在未改动的主线单独复现。
- 企业 PAC/WPAD 和 macOS 未在本轮设备上实测。供应商付费生成、独立审核、主线与正式发布仍待验。
