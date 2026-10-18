# Spec：安装包公开下载名

- Task ID：TASK-CANVAS-RELEASE-20261018；状态：READY；[Intent](intent.md)。

GitHub Release 的公开资产名使用 `KK.Studio_<desktop version>_x64-setup.exe`。`src/runtime/appInfo.ts` 是现有共享入口；Web 与 Desktop 设置中的 href 和 download 文件名均消费这一常量，不新增平台判断或第二套版本源。

NSIS 本地工件仍为 `KK Studio_<version>_x64-setup.exe`，receipt 和 ZIP 四项仍按本地真实文件名校验。发布时另核 GitHub API 回读的规范化资产名及原始字节 hash，不修改受信任工件的 receipt 来掩盖文件名差异。

- AC-1：Web 和 Desktop 设置显示各自端别/版本，安装包 href 和 download 对应真实公开资产名。
- AC-2：真实浏览器测试在旧实现失败，在修复后通过；保留下载行为、当前页和包含 Agent 的说明断言。
- AC-3：不改变存储 key、`com.kkstudio.app`、`%APPDATA%/kk-studio` 或凭据 service；原项目、配置、消息、原件和已有备份保护保持。
- AC-4：三端候选仍为未打标签的 2.1.42，最终 Windows 单包与 Web/Mobile 同 main/tag 来源，正式下载匿名逐字节验证。

本修正不增加依赖、网络发现、重试或新安装格式。手机交付是独立 `/mobile/` 网页，功能成熟度和未验真实生成范围不变。
