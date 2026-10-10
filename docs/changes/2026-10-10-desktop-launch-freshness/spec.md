# Spec

- `desktop-release.mjs` 在构建前读取 `package-lock.json` 与三个 Tauri JavaScript 包的实际安装版本。
- 发现 `node_modules` 缺失或版本不等于锁文件时，先使用当前 Node 的 npm CLI 执行 `npm ci --no-audit --no-fund`，并再次确认版本已对齐。
- 依赖修复失败、仍然漂移或 Tauri 构建失败时，启动器失败关闭，不启动已有旧 EXE。
- 依赖已对齐且 release 新鲜时，启动不重复安装或构建。
- 规则要求从 `start-kk-studio.bat`/GUI launcher 验证，记录实际 EXE 路径、mtime/hash 与进程身份；直接双击旧 `kk-studio.exe` 不作为更新验收。
