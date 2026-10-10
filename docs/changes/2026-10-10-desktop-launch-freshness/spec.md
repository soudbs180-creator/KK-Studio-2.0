# Spec

- `desktop-release.mjs` 在构建前读取 `package-lock.json` 与三个 Tauri JavaScript 包的实际安装版本。
- release 必须带有 `kk-studio.build-receipt.json`：收据保存固定输入集合的内容指纹和 EXE 指纹；缺失、损坏、输入删除/内容变化或 EXE 变化都必须重新构建，不能只依赖 mtime。
- 发现 `node_modules` 缺失或版本不等于锁文件时，先使用当前 Node 的 npm CLI 执行 `npm ci --ignore-scripts --no-audit --no-fund`，并再次确认版本已对齐；不在启动时触碰随包 Agent 目录。
- 缺少/损坏锁文件或链接到其他 checkout 的 `node_modules` 不得被标记为已对齐；修复必须在依赖所属 checkout 中执行。
- 依赖修复失败、仍然漂移或 Tauri 构建失败时，启动器失败关闭，不启动已有旧 EXE。
- 依赖已对齐且 release 新鲜时，启动不重复安装或构建。
- 规则要求从 `start-kk-studio.bat`/GUI launcher 验证，记录实际 EXE 路径、mtime/hash 与进程身份；直接双击旧 `kk-studio.exe` 不作为更新验收。
- 修改 GUI 启动器源码或快捷方式脚本时，另行运行 `npm run client:shortcut`；应用 EXE 收据不能替代启动器收据。
