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

## 当前 Hosted 终局失败后的有界补充（先计划，后实施）

4c313633 的 push quality39167031850 实际 FAIL，不能沿用本机838首过作为 Hosted 通过。sidebar reduced-motion 首次点击等待超时，retry 一次物理点击后 folder count0；settings390 首次缺少设置按钮，retry通过。两个首试均无页面快照/trace，具体云端原因仍 UNKNOWN。

独立受控 IDB 延迟已证一个测试前提缺口：创建文件夹按钮 loading 时可见、命中但 disabled，原生 mouse.click 不等待 enabled；旧序列一次点击不产生 click 事件，释放读取后原 count 断言仍失败。相同受控条件先等现有 enabled 信号，再保留同坐标一次点击、动画/命中/count/expanded/scroll 断言均通过。这只证明机制，不反推云端当时确实 disabled。

最小修法仅在既有 createFolderOnce 的 visible 后增加 toBeEnabled；不改应用、存储 guard、settings 测试、fixture、timeout 或 retry。此为本次实际失败的测试维护，技术决策在用户已授权发布范围内。先运行现有 sidebar 四项和 settings 三项 workers1/retries0，再提交新 head，做相关检查、完整 verify、精确独审和新的 Hosted；原4c失败及未执行 Design/Rust/Native 如实保留。三端仍同次尚未 tag 的2.1.42。
