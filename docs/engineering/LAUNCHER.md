# Windows 一键启动

`src-tauri/target/release/kk-studio.exe` 是项目根目录和桌面“启动 KK Studio”快捷方式的直接目标，工作目录为 `D:\kk-studio-next`，图标为 `src-tauri/icons/icon.ico`。这样点击启动不会先打开命令行窗口。根目录的 `start-kk-studio.bat` 仍保留为手动启动入口，浏览器 tab 使用 `/design/figma/logo.svg`。

批处理启动时优先直接运行已有 release；只有 release 缺失时才调用 `scripts/windows/desktop-release.mjs` 构建一次。源码变更后的 release 更新请手动执行 `npm run client:build`，避免每次点击启动都阻塞在 Rust 编译阶段。

不要把快捷方式指向历史 `D:\kk-studio`，也不要复制旧 `assets/icons/kk-studio.ico`。图标和 Tauri bundle 必须来自当前工程的 `src-tauri/icons/`。
