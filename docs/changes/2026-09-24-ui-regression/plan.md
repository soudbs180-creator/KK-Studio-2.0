# Plan：现行 UI 规则与真实操作回归

- Task ID：TASK-UI-010
- 状态：IN PROGRESS
- 日期：2026-09-24
- Intent / Spec：本目录 `intent.md`、`spec.md`
- Owner / branch / worktree：root；`fix/TASK-UI-010-ui-regression`；`D:/kk-studio/.worktrees/TASK-UI-010-ui-regression`
- Base SHA：`76339c9f5cd1a1b2affea6b4c3d247de7188da18`；目标 `main`
- 原工程状态：dirty；任务 worktree 单独承接 UI 候选，原工程文件不覆写。

## 开工证据

- 读取 `AGENTS.md`、`AI_RULES.md`、设计规范、项目状态、任务账本及现行组件和样式。
- Node 24、npm lock 安装；Agent 与画布插件分别构建。未构建插件时的菜单数量失败登记为测试环境不完整。
- 旧桌面快捷方式指向不存在的 `kk-studio-next`，已构建 EXE 早于候选 UI；根开发页 1421 与独立预览 1423 不可混用。
- 候选设置 CSS 的基础分组规则覆盖手机媒体规则；窄屏分组在底部导航被裁切，先有失败用例再修复。
- 全量浏览器回归暴露两项旧测试前提：新建项目不再自动放入演示节点；本地恢复副本必须比已保存首页草稿的修订号更新。按存储契约修正测试夹具。
- 同态截图发现手机扩展标签换行，项目库在没有本地项目时展示假 `kk` 卡；已作为界面缺陷修复。

## 实施顺序

2026-09-25 补充顺序：先读取用户四个 Figma 节点并更新设计规则；再改首页紧凑输入/模型弹层与附加选项入口；接着修搜索底部选中线、持久对话和顶部对齐、窄屏工具栏；最后按新规则回归三档 Web 与 fresh Desktop。旧 `npm run verify` 的370/305仅证明此前候选，不能证明这次新增改动。

| 步骤 | 文件/模块 | 改动与目的 | 验证 |
| --- | --- | --- | --- |
| 1 | 设置、首页、侧栏与扩展标签 | 对齐入口、语义名称、分组与焦点 | 设置与目录浏览器用例 |
| 2 | 面板、手机导航、创作输入 | 修复可调整宽度、窄屏裁切和工具分行 | 指针、键盘、390/768 用例 |
| 3 | 新项目、画布与 Agent fixture | 保持空白项目语义并修复旧测试入口 | Agent、画布、项目回归 |
| 4 | 全工程 | 完整 verify、运行截图、独立 review、文档 | 日志、证据、PR |

## 并行与冲突

- 根 checkout 与其它分支持续保留。UI 分支只编辑自己的 worktree；最终整合时按源分支解决冲突并重跑相关检查。
- 本轮 review 以提交 SHA 为准；dirty diff 只作预检。

## 风险与恢复

- 风险：设置分类改名与合并页改变旧自动化入口；补真实路由和等价内容断言。
- 风险：新建项目改空白后，历史测试仍读取演示节点；使用 canonical 项目/画布构造器生成测试 fixture。
- 风险：Web preview 与旧 Desktop 看起来不同；重新构建并记录两者 hash 后再报告桌面结果。
- 恢复：仅撤销任务分支提交或重新构建本 worktree；不清除用户应用数据。

## 验证和交付

- 定向回归：设置分类、菜单、画布、面板调整、Agent/Provider 与保存恢复。
- 完整检查：`npm run verify`；需要时 `npm run client:check` 与 fresh Tauri release。
- UI 证据：记录 1423 preview 的 route/import、DOM/computed style、390/768/1920 同态截图；Desktop 单独记录。
- 更新本目录 verification/review、任务账本、PROJECT_STATE、AI_HANDOFF、PROGRESS；独立 review 后建立可审阅 PR。
- 未达到实际验证的能力保持 PARTIAL / NOT VERIFIED，不随 UI 入口升级。
