# Review：现行 UI 规则与真实操作回归

- Task ID：TASK-UI-010
- 时间：2026-09-25，Asia/Shanghai
- Reviewer：实现者自检；独立上下文 reviewer 对 base→`0e0343ec46318797c56519805963c66aa0c09714` 完成初审，复核修复待二次审查
- Base SHA：`76339c9f5cd1a1b2affea6b4c3d247de7188da18`
- 实现 SHA：`6f57e025aa7f7f5d70e2b585cba45c70f56dd1ad`；文档补记提交不改变产品代码
- PR / branch：[草稿 PR #19](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/19)；`fix/TASK-UI-010-ui-regression`
- Intent / Spec / Plan / Verification：本目录同名文件

## 自检范围

- 核对设计系统、源组件、候选 diff、设置与创作输入的浏览器行为。
- 对旧测试假设逐项核对实际项目数据和交互；不以静态文本替代运行验证。
- 实现者检查 base→实现 SHA 的关键组件、对话状态、目录选线、面板拖动及测试变更；`git diff --check` 无错误，未发现新增验收阻断问题。
- 独立 AI reviewer 首次因 workspace 额度耗尽未启动；重试后按 base/head 和实际 diff 完成初审，未发现 P0/P1，提出五项 P2。实现者已逐项修正并运行定向与完整验证；修复提交尚待 reviewer 再审，本文件不提前标记整体 PASS。

## Findings

| ID | 级别 | 影响 | 状态 |
| --- | --- | --- | --- |
| R1 | P1 | 旧桌面快捷方式仍指向已不存在的工程路径，旧 EXE 无本轮 UI 更新 | 本 worktree 新 release 已验证；用户当前入口待正式整合/发布 |
| R2 | P2 | 设置页信息架构变更后，旧测试和部分直达入口失配 | 已修正直达伙伴/插件、设置坐标与测试；全量门禁通过 |
| R3 | P2 | 新建空白项目与旧演示节点测试混用，造成大量假失败及覆盖缺口 | 已用真实空白项目和显式测试项目区分；全量门禁通过 |
| R4 | P2 | 手机扩展标签换行、项目库假本地项目卡 | 已修复并有 Web/原生截图与定向回归 |
| R5 | P2 | 侧栏 `KK项目 / KK工作流` 仍是静态演示行，未绑定真实项目数据 | 开放：`TASK-PROJECT-SIDEBAR-001`；本轮不宣称侧栏项目管理已完成 |
| R6 | P2 | 可拖宽对话面板的“对话记录”按钮使用固定 `left:365px`，远离收起按钮 | 改相对右缘定位；扩宽间距浏览器断言通过 |
| R7 | P2 | 分隔条 `aria-valuemax` 高于实际可达宽度 | 按窗口和相邻面板更新可达值；End 与相邻面板变化回归通过 |
| R8 | P2 | 侧栏宽度被桌面样式覆盖，且缺少恢复 291px 默认值的键盘动作 | 消除变量覆盖；Home 最小、End 最大、Shift+Home 默认值回归通过 |
| R9 | P2 | 首页模型菜单缺方向键/Home/End 导航 | 已补可用项焦点移动；搜索框光标键保持原行为 |
| R10 | P2 | 验证文档把旧 `runtime.json` 误指为最终 bundle | 改指 `web-figma-runtime.json`；Web/原生同哈希重新采集 |

## 门禁

| 门禁 | 结果 |
| --- | --- |
| Self-review | PASS（实现者自检，不能替代独立审查） |
| 独立 AI review | 初审完成，R6–R10 修复待提交后复审 |
| 完整 CI / 本地 verify | 修复后本地 PASS：370 Node、319 Edge browser；PR #19 新 head 的 hosted CI 待核对 |
| Web 运行截图 | PASS（当前 worktree） |
| Desktop release 实机 | PASS（隔离数据、bundle 同态；非正式安装包） |
| 用户视觉/产品验收 | NOT VERIFIED |
| 推送/PR | 首轮实现已推送，PR #19 为草稿；复核修复待推送 |
| 合并/发布 | NOT RUN |

## 结论

独立初审的五项 P2 已在本地修复并验证；待提交后复审、hosted CI 和用户产品验收，不请求合并，也不将本任务标记为 DONE。
