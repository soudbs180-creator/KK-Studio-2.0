# 审查记录

本地审查重点：版本源仍只有 `config/platform-versions.json`；嵌套 Agent/插件版本保持独立；检查器只把活动源码中的产品主次版本字面量作为警告，不误报存储 schema 版本；Windows 启动器继续以内容 hash、依赖 lock、receipt 和 EXE hash 作为 fail-closed 条件。

剩余审查项：需要在合并候选的精确 SHA 上完成独立 review、托管 CI、发布工件 receipt 和至少一个非本机安装回读。旧截图、旧快捷方式、旧 worktree 和 mtime 不能替代这些证据。
