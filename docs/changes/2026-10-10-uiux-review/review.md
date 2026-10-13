# Review：场景模型菜单与扩展入口质量收口

- Task ID：UIUX-2026-10-10（本地 UI 变更包，未改变 Provider/Tauri/发布边界）
- 时间与时区：2026-10-11 Asia/Shanghai
- Reviewer/context/工具或模型：root；独立只读复核子代理 `/root/ui_contract_review`
- 独立于实现上下文：是；子代理独立读取菜单结构、提出问题，并在 aria-disabled 修复后再次只读确认
- Base SHA / head SHA / 规则版本：HEAD `8933692e326af6f1989efae6d8a9dfe5c192e7e4`；工作树含并发未提交改动
- PR / branch / worktree：无 PR / `main` / `D:/kk-studio/KK-Studio-2.0`
- Intent / Spec / Plan / Verification：本目录四份记录

## 评审范围和方式

- 读取的真实 diff、实现、规范和证据：`ModelPickerMenu.tsx`、`ModelPickerRows.tsx`、`ComposerExtensionsMenu.tsx`、`model-picker.css`、相关 Playwright 测试和本目录验证记录。
- 静态与运行检查：TypeScript、ESLint、Prettier、UI standards、治理/功能/目标/Markdown/版本门禁；本地生产预览模型/扩展/响应式/Agent fixture；全量 unit/deploy。
- 未覆盖范围及原因：真实付费 Provider、Tauri 安装包、Hosted CI、第二环境、物理移动设备和用户最终视觉验收不在本地变更包范围。
- self-review 与独立 review 的区别：本地修复由 root 完成；子代理独立指出 roving tabindex、禁用候选、场景同步、唯一 ID 和全禁用可达性问题；最后一项修复后仅由定向浏览器测试复验。

## Findings

| ID  | P0–P3 | Pass | merge/release blocker | 文件/行或证据                                       | 重现与影响                                                        | 处理/负责人                                          | 状态/复验                                                  |
| --- | ----- | ---- | --------------------- | --------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| R-1 | P2    | 否   | 否                    | `ModelPickerRows.tsx`                               | 初始键盘候选包含禁用项，且箭头后 tabindex 不随焦点更新            | root：过滤禁用候选并维护 active tabindex             | FIXED；模型菜单定向测试 2/2                                |
| R-2 | P2    | 否   | 否                    | `ModelPickerMenu.tsx`、`ComposerExtensionsMenu.tsx` | 固定 DOM ID 和 tab/tabpanel 语义可能在多实例菜单中冲突            | root：使用 `useId`，扩展分类改为 tab/tabpanel        | FIXED；扩展/设置定向测试通过                               |
| R-3 | P2    | 否   | 否                    | `ModelPickerRows.tsx`、`model-picker.css`           | 全部模型不可选时原生 disabled 按钮不可键盘聚焦，原因不可读        | root：改为可聚焦 `aria-disabled`，点击早退并保留原因 | FIXED；全禁用搜索结果键盘测试通过；2026-10-11 独立复核确认 |
| R-4 | P2    | N/A  | 是                    | 外部运行态                                          | 本地 fixture 不能证明真实 Provider、Tauri、Hosted、发布或用户验收 | 交接给对应 P1/P2 任务                                | NOT VERIFIED；不由本包关闭                                 |

## 复核摘要与交接

- 已确认：模型按 Agent/图片/视频/音频分场景；未知用途模型保留原因且不可选择；扩展分类和面板关联唯一；方向键/Home/End 与 Tab 焦点可用；同名模型置顶按钮包含来源详情；视频菜单明确未接入发送链。
- 仍为 PARTIAL / NOT VERIFIED / BLOCKED：真实 Provider/GPU、移动设备效果、Tauri 安装、Hosted CI、第二环境安装、用户最终验收；账本中的外部任务保持原状态。
- 没有形成新的 blocker；R-1 至 R-3 为本地可复验修复。
- 新 HEAD 或工作树来源变化后，本 review 需要重新绑定 exact diff；不代替独立 PR approval、合并或发布。

## 适用门禁

| 门禁                  | 真实结果     | 证据与时间                                                     | 未满足的影响     |
| --------------------- | ------------ | -------------------------------------------------------------- | ---------------- |
| Self-review           | PASS         | 定向源码/测试检查，2026-10-11                                  | 外部能力不适用   |
| 独立 AI review        | PASS         | `/root/ui_contract_review`；R-3 修复后再次只读确认，2026-10-11 | 不提供合并批准   |
| CI / 定向回归         | PASS（本地） | 浏览器定向、全量 955 单测/部署测试、静态门禁                   | Hosted CI 未运行 |
| 用户 UI/交互/产品验收 | NOT VERIFIED | 未做真实用户与物理设备验收                                     | 保持开放         |
| 推送/合并/发布授权    | NOT RUN      | 未 commit/push/release                                         | 保持开放         |

## 结论

- PASS WITH FOLLOW-UPS
- 本地 UI 质量范围无未关闭的已知代码 blocker；R-3 已由独立复核确认。
- P1 外部证据任务、Tauri/Hosted/发布和用户验收不由本包关闭。
- 本结论不代替合并、发布或用户最终验收。
