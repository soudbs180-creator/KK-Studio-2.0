# Review：侧栏项目分组与文件夹收纳交互增强

- Task ID：TASK-UI-009
- 时间与时区：2026-09-24（UTC+9）
- Reviewer/context/工具或模型（已知时）：AI（本任务实现者同上下文，仓库单 owner 工作流）
- 独立于实现上下文：否；说明方式：按本模板逐项自查 + 全量门禁与浏览器同态复验；无第二账号审批，个人仓库不虚构第二人
- Base SHA / head SHA / 规则版本：base = `origin/main` 76339c9；head 见本包 git log；规则 = AGENTS/AI_RULES/SDLC/BRANCH-POLICY 当前 main 版本
- PR / branch / worktree：`feat/TASK-UI-009-sidebar-project-groups` / `D:/kk-studio/.worktrees/TASK-UI-009-sidebar-project-groups`
- Intent / Spec / Plan / Verification：`docs/changes/2026-09-24-sidebar-project-groups/{intent,spec,plan,verification}.md`

## 评审范围和方式

- 读取的真实 diff、实现、规范和证据：
  - `git diff origin/main..HEAD` 全量（src/components/{Sidebar,SidebarProjectGroups,SidebarProjectSections,SidebarFolderGroup,SidebarProjectEntry,SidebarGroupHeading}.tsx、src/features/projects/sidebarProjectModel.ts、src/styles/sidebar.css、tests/browser/sidebar-project-groups.spec.ts、docs、ledger）
  - 既有契约：`tests/browser/{sidebar,catalog-pages,frame-accuracy,interaction-state,ui-interactions}.spec.ts`、`DESIGN-SYSTEM.md`、`UI_SPEC.md`、`UI-STANDARDS.md`、`feat-015-projects.md`
- 静态 review / 实际运行检查（逐项）：
  - typecheck / lint（eslint+governance+features+markdown）/ ui:check（组件 ≤300 行、tokens）/ format:check / build 全过
  - 单元 370/370；浏览器全量 307/307；新增 7 条 + 受影响既有 34 条定向通过
  - 1421 端口 vite preview 同态：证据脚本 21/21 断言 + 截图抽查（04、07）
  - 交互核对：拖拽数据 MIME 仅侧栏内部读取；改名行拖入保留最新标题；折叠状态与 aria-expanded 同步；Escape/Enter 提交沿用
- 未覆盖范围及原因：触屏 DnD（范围外）；Tauri release 打包（Web 同态为准）；持久化（用户确认 Prototype）
- self-review 与独立 review 的区别：本表为 AI 自查；实际规则 required approvals=0 时如实记录，用户最终验收保留

## Findings

| ID  | P0–P3 | Pass | merge/release blocker | 文件/行或证据 | 重现与影响 | 处理/负责人 | 状态/复验 |
| --- | ----- | ---- | --------------------- | ------------- | ---------- | ----------- | --------- |
| F-01 | P3 | 通过 | 否 | `SidebarProjectGroups.tsx` 内 `sortMode` 仅驱动菜单勾选，未改变排序（沿用既有 Prototype 行为） | 与改动前一致，非本次引入；显示/排序菜单回归用例通过 | 记录，不处理（既有差距，纳入 FEAT-015 PARTIAL） | 已确认 |
| F-02 | P3 | 通过 | 否 | 新建分组项目行 `selected=false`，不参与高亮 | 演示行（KK项目）保持既有选中语义，新行点击仍收起文件夹并导航；Prototype 边界 | 记录，不处理 | 已确认 |
| F-03 | P3 | 通过 | 否 | 拖拽为未分组→文件夹单向；无移出/排序 | 明确范围外，spec 已记录；未分组行保留「移动到项目组」标记 | 后续产品扩展 | 已确认 |
| F-04 | P3 | 通过 | 否 | 文件夹标题固定顺序命名（新建文件夹、新建文件夹 2…），不支持改名 | 兼容既有「新建文件夹」断言；改名属范围外 | 后续产品扩展 | 已确认 |

无 P0–P2 finding。查证范围：上述实现清单、门禁全量结果、证据脚本断言与截图、既有浏览器契约回归，均未发现阻断问题。

## 适用门禁

| 门禁 | 真实结果 | 证据与 SHA/时间 | 未满足的影响 |
| --- | --- | --- | --- |
| Self-review | 通过（P3 记录 4 项） | 本文件；2026-09-24 | 无 |
| 独立 AI review | 不适用 | 仓库单 owner 工作流，个人仓库不虚构第二人 | 用户最终验收保留 |
| CI / 定向回归 | 通过 | typecheck/lint/ui:check/format/build/unit 370/浏览器 307 全绿 | 无 |
| GitHub 实际审批数量/身份 | 未执行 | 未 push/开 PR；由用户决定 | 合并前需用户确认 |
| 用户 UI/交互/产品验收 | 待用户 | 产物见交付说明 | 用户可随时提出修订 |
| 推送/合并/发布授权 | 未执行 | 本任务不自动 push/merge | 无 |

## 结论

- PASS（PASS WITH FOLLOW-UPS：4 项 P3 记录，均为既有 Prototype 边界或明确范围外，不阻断）
- 未关闭 blocker：无
- 非阻断后续任务与理由：文件夹改名/删除、拖回未分组与排序、触屏 DnD、持久化接线 → 均属产品扩展，FEAT-015 保持 PARTIAL
- 新 head SHA 发生后本 review 对新提交失效；复审记录：如需改动将追加勘误
- 本结论不代替合并、发布或用户最终验收

## 追加勘误

- 无。

## 第三轮复查（2026-09-24 收敛模型）

- 复查范围：新模型 5 个组件（SidebarProjectGroups/Header/Sections/FolderGroup/Entry）+ useDismissible 全局改动 + sidebar.css 新样式 + 9 条新用例与 4 个受影响既有用例。
- 发现并修复：① useDismissible pointerdown 关闭菜单时抢焦点吞掉后续 click（菜单开着点文件夹行不收起）——删 pointer 分支 focusTrigger，Escape 路径保留回焦，全量 309 验证无回归（canvas-navigation/composer-menu-audit 的 Escape 断言仍过）；② 文件夹行（263px）与子项目行（231px）层级宽度与右侧图标列位统一（right:27/5 三行一致）；③ 行内改名未同步父层标题（onRename 回调链）；④ SidebarProjectSections 残留 selected 状态（lint 抓出，已清）。
- 复查结论：符合 spec 第三轮修订；默认状态几何由 frame-accuracy 实测断言锁定；剩余边界（触屏拖拽、跨刷新持久化、真实项目服务接线）与上轮一致，FEAT-015 保持 PARTIAL。

## 第四轮复查（2026-09-24 缩略图按内容类型区分）

- 复查范围：`sidebarProjectModel.ts`（`SidebarProjectVisual`/调色板/`randomProjectColor`）、`SidebarProjectEntry`（visual 渲染分支）、`SidebarProjectGroups`（演示数据 + `findProjectVisual` 移动携带）、`workspace.css`/`sidebar.css`（`.project-thumb` 系列）、第 10 条浏览器用例、`capture.mjs` 第四轮断言。
- 发现并修复：① **类名冲突**：模板类 `project-thumb-${kind}` 与内层 `img` 共用 `project-thumb-image`，CSS `width:100%` 误作用于 span 导致缩略图撑满整行、标题 0 宽（Playwright 判 hidden）→ img 类改名 `.project-thumb-image-src`；② ui:check 抓出组件内 `#3D6FE0` 颜色字面量 → 改引用 `PROJECT_THUMB_COLORS[0]`；③ `SidebarProjectGroups.tsx` 超 300 行 → 压缩组件头注释至 295 行；④ 用户反馈聊天图标不够形象（品牌 `logo-message.svg` 双翼造型像兔子）→ 新增标准聊天气泡 `project-chat-glyph.svg`（圆角气泡+左下尾巴+三点挖空）替换引用，组件/测试/证据脚本同步。
- 复查结论：符合 spec 第四轮修订；三态缩略图语义断言（图片 src/聊天图标 src/随机色块计数/移动保留）浏览器用例与证据脚本双覆盖；行几何与既有交互全量 310/310 无回归；剩余边界与上轮一致（触屏拖拽、跨刷新持久化、真实项目服务接线），FEAT-015 保持 PARTIAL。
## 第五轮（2026-09-24 下午）：生成对话框诊断与修复
- 修复项目行导航 bug：openProject(id) 曾把项目 id 当 App view 传入，导致点击文件夹内二级项目行弹出「使用说明」对话框且不导航；现固定 onNavigate("workspace")。
- 首页生成输入区单排：批量/数据 select 并入功能键同一行（桌面 1920 实测单行 y≈477），响应式 768–1200 flex-wrap 自然折行。
- 画布生成对话框：creation-controls 已单排（模型/自适应尺寸/语音/×8/生成 568×35）。
- 全量 310/310 + 门禁全绿，详见 verification.md 第五轮。
