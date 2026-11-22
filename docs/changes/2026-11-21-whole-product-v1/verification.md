# Verification：Desktop 整包 V1

- Task ID：TASK-WHOLE-V1-20261121
- 记录状态：IN PROGRESS（文档与范围已落地；**用户整盘终验未执行**）
- 执行时间与时区：2026-11-21（Asia/Shanghai）起
- Intent / Spec / Plan / AC：[intent.md](intent.md)；[spec.md](spec.md)；[plan.md](plan.md)；AC-1…AC-5
- cwd / branch：`D:/KK Design` / `main`
- 被验证 base SHA / head SHA / tree SHA：文档落地时 HEAD `e4383a1e323c895286d9f08fe901a27e341a10da`（终验时重读并更新）
- dirty 状态：以 git status 为准；本包允许文档/治理变更
- 交付包角色：`current`
- 当前包绑定账本 `taskId`：TASK-WHOLE-V1-20261121

## 实际命令和结果

| 命令/检查 | 时间 | 退出码 | PASS/FAIL/NOT RUN/N/A | 证据路径 | 范围与限制 |
| --------- | ---- | ------ | --------------------- | -------- | ---------- |
| 功能 registry 盘点 → scope-map | 2026-11-21 | 0 | PASS | [scope-map.md](scope-map.md) | 文档分类，非运行态 |
| 走查单就绪 | 2026-11-21 | N/A | PASS | [walkthrough.md](walkthrough.md) | 待用户执行 |
| `npm run governance:check` | 2026-11-21 | 0 | PASS | 157 tasks / 0 violations | 含 WHOLE-V1 与搁置 |
| P0-6 演示诚实标注 + `npm run build` | 2026-11-21 | 0 | PASS | GenerationAction 等；dist 已重建 | preview 必须吃新 dist |
| `npx playwright test demo-results` | 2026-11-21 | 0 | PASS | 2/2 | 端口 1423 preview |
| `generation-flow` + `ui-motion` | 2026-11-21 | 0 | PASS | 13/13 | 含演示音频/视频按钮名 |
| 本树 Desktop `client:build --no-bundle` | 2026-11-21 | 0 | PASS（历史烟测） | 原 `.tmp/whole-v1-desktop/kk-studio.exe` SHA256 `466C8598…A713E8` | **已作废作终验入口**；2026-11-22 移入 quarantine |
| 日常安装包晋升为最新 2.1.88 | 2026-11-22 | 0 | PASS（路径+版本+启动） | `%LocalAppData%\Programs\KK Design\kk-studio.exe` · **2.1.88** · SHA256 `49B68581…B40A30`；窗口标题 KK Design；旧 2.1.81 已备份 | 用户要求保证最新后晋升；桌面快捷方式已指向此包 |
| 浏览器主路径 UI 走查（preview 1423） | 2026-11-21 | 0 | PARTIAL | blockers-queue P0-7；截图 Temp `page-2026-11-21T11-10-31` | 非 Desktop 终验；账号/设置诚实态已见 |
| UI 赘字/密度/行距收口 + 矮屏 600 + model-access | 2026-11-21 | 0 | PASS | GeneralSettings/AgentComposer/OAuth 等；9/9 model-access | 1920 与 1280×600 preview；≠ Desktop 终验 |
| `agentConnection` Failed to fetch 中文化 + `npm run build` | 2026-11-21 | 0 | PASS | 点「连接 Codex」见中文 alert；`agentConnection.ts` | preview 1423 已换新 dist |
| `text-generation` + `unified-image-command` | 2026-11-21 | 0 | PASS | 23/23；`.tmp/whole-v1-text-image-tests.log` | fixture/受控，非用户 Key 计费链 |
| 用户整盘走查 AC-2/AC-3 | | | NOT RUN | walkthrough | **完成门禁** |
| 日常 Desktop 版本身份钉死 | | | NOT RUN | 本文件下方 | 终验时填写 |

## 验收覆盖

| AC | 平台/状态 | 预期 | 观察结果 | 证据 | PASS/FAIL/NOT VERIFIED |
| ---- | --------- | ---- | -------- | ---- | ---------------------- |
| AC-1 | 文档 | 算进/不算进清晰 | 已写 scope-map + spec | 本包 | PASS（文档） |
| AC-2 | Desktop | 主路径跑通 | 未走查 | walkthrough | NOT VERIFIED |
| AC-3 | Desktop | UI 过关 | 浏览器主路径 PARTIAL；Desktop 待用户 | walkthrough / blockers P0-7 | NOT VERIFIED |
| AC-4 | Desktop | 演示不冒充 | P0-6 已测；账号/设置诚实文案浏览器已见 | scope-map / P0-6/7 | PARTIAL |
| AC-5 | 全项目 | 基线+迭代规矩 | 规矩已写；基线未钉 | [iteration-rules.md](iteration-rules.md) | PARTIAL |

## UI / 运行态证据（不适用写原因）

- 浏览器（Vite preview `http://127.0.0.1:1423/`，production dist）：已创建走查项目、画布节点、Codex 未连接失败提示、设置通用/模型接入、个人信息「账号服务尚未接入」。**不能**代替 Desktop Tauri 终验。
- 历史模块 PASS **不**自动升级为本包 AC-2/AC-3。
- 终验时必填：启动命令、EXE/入口路径、版本、数据根、是否日常资料、文本/图片通道。

## 版本身份（终验通过后填写）

| 项 | 值 |
| --- | --- |
| 终验日期 | |
| HEAD / tree / EXE hash | |
| 用户结论 | 通过 / 不通过 |
| 基线标签说明 | 例如「Desktop 整包 V1 基线」 |

## 已知限制（不假装完成）

- Web/Mobile 整包不在本 verification 完成范围内。
- PROTOTYPE 功能保持演示。
- 旁路任务仅为搁置，不是 DONE。

## 结论（当前）

**整包产品完成：NOT VERIFIED。**  
已完成：需求整理、能力地图、范围冻结、旁路搁置、走查单、迭代规矩、**P0-6 演示不冒充（已测）**、**P0-1 候选 EXE**、**浏览器 P0-7 UI 抽查（赘字/密度/行距/矮屏）**、fixture 文本/图片 23/23、`Failed to fetch` 中文化。  
缺口：用户 Desktop 真实文本/图片 + 重开（P0-3/4）与 walkthrough 终验。  
下一步：只用 `%LocalAppData%\Programs\KK Design\kk-studio.exe`（桌面「KK Design」）按 [walkthrough.md](walkthrough.md) 终验 → 钉基线。**禁止**再启动 `.tmp` 候选或 quarantine 内旧包。
