# Intent：Codex 卡片使用连线参考图

- Task ID：TASK-CODEX-REF-20261015；日期：2026-10-15，Asia/Shanghai。
- 状态：IMPLEMENTED；功能/live 验收 PASS，交付 PARTIAL；交付包角色：`current`。
- 用户请求/授权：卡片连上产品参考图后，直接使用 Codex 内置生图，并实际桌面验证；这是已有请求范围内的技术实施，不是新的 API 接入。
- Owner：root；branch：`fix/TASK-CODEX-REF-20261015`；worktree：`D:/kk-studio/.worktrees/TASK-CODEX-REF-20261015`。
- Base/初始 HEAD：`cbda65e4389fc807769a8faf7654892415992589`；另承接 TASK-CODEX-HOME-20261015 的未验收候选快照（64 个 dirty/untracked 路径），不视为已验收主线。
- 实施进展：Desktop/Web 2.1.33、Mobile 2.1.1；root 已将本任务限定源码/测试/版本补丁及本包整合到活动 `branch-consolidation-20261011`，其余作者的新改动保留。真实桌面验收已通过，完整交付仍PARTIAL，详见最新 verification。
- [Spec](spec.md)、[plan](plan.md)、[verification](verification.md)、[review](review.md)；[账本](../../governance/task-ledger.json)。

## 原意与范围

用户在画布为 Codex 图片卡片连接产品参考图，点击生成后，参考图原件随本次指令送入当前 Codex 会话；内置 imagegen 的结果自动归档并连回来源卡片。复用已有附件、事件归档和来源路由，保留原件、项目与会话身份。

范围为图片参考附件收集/传输、取消与过期请求保护、来源及结果连线、定向回归与真实 Desktop 证据。不新增 Provider、API fallback、队列、独立生图系统或蒙版流程；不扩写首页候选的整体验收。

## 验收条件

| ID   | 用户可观察结果                                      | 证明方式                                            |
| ---- | --------------------------------------------------- | --------------------------------------------------- |
| AC-1 | Codex 卡片接受连线参考图，实际调用账号内置生图      | 定向回归及真实桌面 turn/工具回执，证明包含参考原件  |
| AC-2 | 图片归档到当前项目并连回正确来源卡片，重载可恢复    | 原件 hash、来源/结果边、保存与重载证据              |
| AC-3 | 缺失原件、取消、节点删除、连线/项目切换不误发或降级 | 发送前校验与异步回归；错误保持可见，无 API fallback |
| AC-4 | 原有无参考 Codex、显式 API、聊天附件行为保持        | 邻域回归；完整适用检查与独立复核                    |

## 事实与风险

FACT：基线 App 对 Codex 卡片的参考图提前拒绝；`generateFromCanvas` 未向现有 `sendMessage` 传入参考附件和调用方 signal。现有 `canvasImageAttachments` 读取归档原件并拒绝缺失/非法素材，可复用。

AI 技术决定：接通已有 seam，并在异步读取后、真正提交前复查来源图与项目；不另造状态源。真实账号额度、桌面产物身份与实际图像质量待本轮运行证明；历史 Codex 成功不代填本次验收。FEAT-002 保持 PARTIAL，其他 Provider 差距继续原账本。
