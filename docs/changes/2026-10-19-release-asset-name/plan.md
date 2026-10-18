# Plan：公开资产名最小修复

- Task ID：TASK-CANVAS-RELEASE-20261018；Owner：root-release；状态：IN_PROGRESS。
- base：`0cc3b4ed116d71062244e3097285a2b532de8f97`；branch：`fix/TASK-CANVAS-RELEASE-20261019-download-asset`。
- [Intent](intent.md) / [Spec](spec.md) / [Verification](verification.md)。

1. 只读核实际共享常量、设置调用方、浏览器和 Desktop 两个回归；用官方规则及公开同类资产验证空格路径与点路径的差异，不上传 dummy 或修改旧 Release。
2. 创建本五件包并同步本 Task 当前入口，保留其他153账本对象和历史失败。只更新现有浏览器预期为实际公开文件名，在旧 production bundle 上取得 RED。
3. 仅将共享下载文件名中的空格改为点，同步 Desktop 现有预期；重建并运行同一浏览器用例取得 GREEN，再运行相关检查及仓库要求的完整验证。
4. 提交后做精确 HEAD 独审和 Hosted 检查，按实际 ruleset 正常合并；新 main 门禁通过后才创建一次 42 标签并 fresh 构建。旧 main/候选不代填最终工件。
5. 后续外部安装验收采用新的精确 URL 期望版本，原冻结脚本保留；发布说明及正式资产检查同步公开 dot 名，匿名下载器本身已支持点名、无需修改。

不修其他已保留的 flaky 信号，不扩大重试/超时或删除原下载断言。原资料和源代码工作树不做清理。
