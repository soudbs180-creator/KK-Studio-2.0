# Plan

- ID：desktop-data-stability-20260916
- 1. 记录当前 HEAD/dirty 文件基线；在唯一允许工程内使用 codex/desktop-data-stability 分支，不迁移/覆盖现有未提交实现。
- 2. 先补读失败、文件安全和图恢复的失败回归用例。
- 3. T1：Rust 快照仓库保护；前端读取/保存状态机；错误反馈、重新读取和独立草稿下载。
- 4. T2：版本化 canvas 模型、稳定节点身份、项目绑定的图状态、持久化接线。
- 5. 定向用例 → 完整 npm run verify → client:check / Rust tests → 重建 Desktop 与隔离运行取证。
- 6. 对本轮差异复核，更新 PROGRESS、存储契约与 verification；报告尚未达到 MUR 的剩余任务。
- 风险：已有脏工作区、损坏原件、保存竞争、旧快照缺字段、迟到回调、Desktop 测试实际 AppData 隔离。
- 回滚：本轮源码修改前副本在 tmp/desktop-data-stability-20260916/baseline；只比对本轮差异，不全量 reset。

## 执行记录

- 基线：609f524；91/91 Node 测试通过；已有工作区差异已保存。
- Ruling：按用户唯一工程约束在 D:/kk-studio-next 原地新建分支，不创建第二运行工程；不把其他未提交代码纳入本轮提交。
- Ruling：T0 本轮完成源码基线记录；完整可重建发布提交仍保留在发布前门禁，不能因修复完成宣称生产候选已建立。
- T1 已接线：原生安全仓库、Web CAS、读取保护、重试与独立草稿下载；T2 已接线：canvas v1、UUID、项目绑定、参数持久化。
- 全量首次回归发现默认项目连线初始化遗漏，已修复；新增节点延迟聚焦可能覆盖后续焦点，改为挂载时聚焦。浏览器矩阵断言改为浮点数值比较。
- 原生验收脚本修正了重启后旧 Locator、未等文件提交和损坏 JSON 轮询异常三项测试同步问题；最终 4 次独立启动/关闭、A/B 恢复和合成故障验收通过。
- 最后复核修正保存成功后残留的错误提示，新增回归；最终 verify / release 与取证结果见 verification.md。
- 本轮不提前开展 T3，不把项目图稳定性标为整个 Minimum Usable Desktop 已完成。
