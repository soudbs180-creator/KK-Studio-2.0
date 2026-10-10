# Verification

- RED：原有 mtime 检查无法发现保留时间戳的内容变化、删除输入和缺失收据；依赖锁文件缺失也曾被误判为已对齐。
- GREEN：`node --test tests/unit/desktopRelease.test.ts tests/unit/startModelPickerState.test.ts tests/unit/platformVersions.test.ts`，29/30 通过、1 个跳过；跳过项是当前 Windows 禁止创建 file symlink（EPERM），实现已 fail-closed，允许创建链接的 Windows/CI 仍需补跑。
- `npm run lint`、`npm run ui:check`、TypeScript、平台版本、治理和功能检查通过；治理场景新增 `desktop-source-refresh`，多模型语义 benchmark 按规则记为 NOT RUN。
- 当前 main 的真实启动链先检测到 `src-tauri/src/secret_filter.rs` 等未提交 Rust 改动并因闭包引用错误 fail-closed，没有启动旧 EXE。修正两个调用点后，启动器重建并启动 Desktop/Web `2.1.13`，EXE 版本为 `2.1.13`，路径为 `D:/kk-studio/KK-Studio-2.0/src-tauri/target/release/kk-studio.exe`；实际 EXE SHA-256 为 `CF3E505F182C6F88AC0C4EC3A14E41D0A76659FC0301CD6630FBC00658D6CF2D`。
- `kk-studio.build-receipt.json` 已记录输入与 EXE 指纹；`inspectDesktopRelease` 返回 `reason=current`、`needsBuild=false`，第二次通过 `start-kk-studio.bat --background` 启动输出 `Launched current desktop release.`，运行进程路径与收据路径一致。
- 正式安装器升级、签名发布、托管 CI、外部 Provider 和最终用户验收仍分别开放；当前主 checkout 保留其他并发未提交改动。
