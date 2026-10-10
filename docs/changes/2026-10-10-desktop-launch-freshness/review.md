# Review

独立 reviewer 绑定 base `b695bcfa` 与 guard head `3a5b6113`，复读了 receipt、输入指纹、锁文件和链接依赖路径。结论无 P0/P1；`node --test tests/unit/desktopRelease.test.ts` 为 22 通过、1 跳过、0 失败，`git diff --check` 通过。根/包级 linked `node_modules` 会进入未对齐状态，release 输入符号链接直接拒绝核验，构建/依赖失败均不启动旧 EXE。

当前 Windows 策略禁止创建 file symlink，相关测试按设计记录 EPERM 跳过；允许创建链接的 CI/Windows 环境需要补跑。评审不替代正式安装器升级、签名发布、托管 CI 或用户验收。
