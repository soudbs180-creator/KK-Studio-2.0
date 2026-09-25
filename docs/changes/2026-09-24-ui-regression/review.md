# Review：现行 UI 规则与真实操作回归

- Task ID：TASK-UI-010
- 时间：2026-09-24，Asia/Shanghai
- Reviewer：待独立上下文审核
- Base SHA：`76339c9f5cd1a1b2affea6b4c3d247de7188da18`
- Head SHA：待提交
- PR / branch：待建立；`fix/TASK-UI-010-ui-regression`
- Intent / Spec / Plan / Verification：本目录同名文件

## 自检范围

- 核对设计系统、源组件、候选 diff、设置与创作输入的浏览器行为。
- 对旧测试假设逐项核对实际项目数据和交互；不以静态文本替代运行验证。
- 独立 AI review 尚未发生；本文件不能标记为 PASS。

## Findings

| ID | 级别 | 影响 | 状态 |
| --- | --- | --- | --- |
| R1 | P1 | 旧桌面快捷方式仍指向已不存在的工程路径，旧 EXE 无本轮 UI 更新 | 本 worktree 新 release 已验证；用户当前入口待正式整合/发布 |
| R2 | P2 | 设置页信息架构变更后，旧测试和部分直达入口失配 | 已修正直达伙伴/插件、设置坐标与测试；全量门禁通过 |
| R3 | P2 | 新建空白项目与旧演示节点测试混用，造成大量假失败及覆盖缺口 | 已用真实空白项目和显式测试项目区分；全量门禁通过 |
| R4 | P2 | 手机扩展标签换行、项目库假本地项目卡 | 已修复并有 Web/原生截图与定向回归 |
| R5 | P2 | 侧栏 `KK项目 / KK工作流` 仍是静态演示行，未绑定真实项目数据 | 开放：`TASK-PROJECT-SIDEBAR-001`；本轮不宣称侧栏项目管理已完成 |

## 门禁

| 门禁 | 结果 |
| --- | --- |
| Self-review | IN PROGRESS |
| 独立 AI review | NOT VERIFIED |
| 完整 CI / 本地 verify | 本地 PASS：370 Node、305 Edge browser；hosted CI 待 PR |
| Web 运行截图 | PASS（当前 worktree） |
| Desktop release 实机 | PASS（隔离数据、bundle 同态；非正式安装包） |
| 用户视觉/产品验收 | NOT VERIFIED |
| 推送/合并/发布 | NOT RUN |

## 结论

当前为开发中记录，尚无最终 review 结论。新提交、完整运行验证和独立审查后再更新。
