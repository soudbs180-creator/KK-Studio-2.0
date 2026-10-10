# 规格

1. `config/platform-versions.json` 的 desktop/web/mobile 版本必须是合法三段式版本；现有镜像文件继续由 `version:bump` 同步。
2. 根 package lock 必须包含 Tauri API、dialog、CLI 的锁定条目；每个嵌套 package-lock 的根 name/version 必须匹配相邻 package.json。
3. 活动源码中与产品主次版本相同的三段式字面量只产生审计警告，必须在 PR 中解释其是否为协议/schema、插件/供应商版本或误用的产品版本。
4. 启动新鲜度必须依赖源码内容指纹、依赖锁定、release receipt 和 EXE hash；mtime 只用于诊断。
5. 合并门禁绑定 base/head SHA；发布环境只消费带 commit/tree、版本和文件 hash receipt 的不可变工件。
