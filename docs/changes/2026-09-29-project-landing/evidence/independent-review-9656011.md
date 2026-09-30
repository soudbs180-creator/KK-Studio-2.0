# 项目落地独立最终技术审查（9656011）

## 身份、范围与规则版本

- Reviewer：新的独立 Codex 上下文；工具为 PowerShell/Git、Node 24.19.0、仓库现有 esbuild/Playwright Chromium。未取得可验证的精确模型标识，不虚构人类或独立 GitHub 账号身份。
- 审查日期：2026-09-30，Asia/Shanghai；最后证据读取约 15:53 +08:00。
- BASE：`1e95a13d3490a39b35ce39e9df0ab55a09dc13f7`。
- HEAD：`9656011267d7a51c954bf18c42088a477e492b75`。
- 仓库：`D:/kk-studio/KK-Studio-2.0`。开始及中途复核 HEAD 相同，git status --short 为空；本 reviewer 未改仓库、index、HEAD、分支，不启动项目服务，不启动子代理，不访问真实用户记忆/凭据。只在工程外写报告/探测脚本/日志，隔离 Chromium 采用 about:blank 内存页面。
- 完整范围是 618 文件（66840 additions / 10656 deletions）的集成 diff，采用风险导向分阶段抽查，不宣称逐行审阅全部历史文档、图片和测试。深入检查真实 Canvas hooks、启动门禁、App 项目确认/CAS、Memory、CLI/Google 的相关边界；另完整阅读 `d7ee51c..9656011` 的产品修复 delta。
- 独立读取 AGENTS/AI_RULES、REVIEW/PROMPTING/SDLC/BRANCH-POLICY、PROJECT_STATE、UI_INDEX、landing intent/spec/plan/verification/audit/remaining/review、完整集成计划与前次独立报告；读取 executing-plans 及 code-reviewer 模板。仓库 rg --files -g AGENTS.md 只返回根文件。按当前仓库 exact-head 规则执行复审。

规则 SHA-256（工作树字节）：

| 文件 | SHA-256 |
| --- | --- |
| AGENTS.md | 683c7d1d25e727212de3290d2f469ffa50b4270861bd1b5e6e3fe23d8903ae87 |
| AI_RULES.md | be1d3febf73e0c03ddbfaf3e16372a46c07f99c6e53079eddd03340303d0d8fe |
| docs/engineering/REVIEW.md | 469968b635ad30fa3059a70c42f88885bda6fa80b63f1da17fb20364433e5f05 |
| docs/engineering/PROMPTING.md | 7fc43b6803050f1a42b88af8418e50a49c6eaeb278f0514593e2da9fb8f06028 |
| docs/engineering/SDLC.md | 61e559ad8a2ac30555b82c8f7193b988d130fb416e569e4d9124bc31c19db603 |
| docs/engineering/BRANCH-POLICY.md | dc0ac5adffbb017a00b519d8c01195c7d2a847a62563da716c35d0d5ec36409c |
| landing/plan.md | c1c5735b2cdf7193a358b612d9c90899f2afce68718d56b3d26274d82463e54c |

## 审查 passes 与证据

### 用户意图、范围和架构

MiniMax 的已有本地 Skill/MCP 与 Kaworkai 历史/吸附/图层进入当前真实项目路径；spec 没有把竞品付费/云端能力当作本轮交付。App 保留原生存储身份和按项目/loadEpoch 的 Canvas 生命周期，settings 仍承接项目包/伴随服务能力。remaining 明确记录外部服务、持久分组、编排执行 UI、Installer、Mobile、VPS 的开放范围。当前 Canvas task REGRESSION / integration REVIEW 是等待返修审查的中间状态，没有被本报告视作已合并。

### 行为、取消和历史协调

独立探测脚本：`D:/kk-studio/.tmp/landing-review-hooks-9656011.cjs`；输出：`D:/kk-studio/.tmp/landing-review-hooks-9656011.log`。

esbuild write:false 导入真实 `useCanvasControls`、`useCanvasConnections`、`useCanvasWorkbenchState`，后者实际调用 `useCanvasHistory`。React production 页面以真实 Playwright mouse/keyboard 驱动 DOM pointer handlers；无 HTTP 服务、无持久用户存储。断言均 PASS，进程退出码 0：

- 相连节点删除/一次 undo 恢复节点及边/redo 删除，连续三轮。
- ArrowRight 独立编辑后真实 90 步 mouse move；第一次 undo 回到拖动起点，第二次 undo 恢复键盘编辑之前，redo 保持可用。
- 节点焦点处 Escape、window blur、pointercancel 取消恢复起点并保留 redo。
- middle-button pan 后 Escape 恢复 viewport 并保留 redo。
- 模拟 provider 经上游 items 与 initialEdges 同批发布新节点和 result 边，自动位置协调后 undo/redo，再继续键盘编辑，历史未卡住。

静态完整链确认：pointer start 设置 dragging；Controls 透传 pointer；Workbench 仅 node/pan 标记 gestureActive；History 在手势期间跳过提交并禁止 undo/redo，结束后提交一次。键盘位置编辑没有伪造 dragging。cancel 恢复节点/viewport 与 selection 后清除 dragging。连线 cleanup 和 history snapshot 采用同一有效图筛选；ProjectCanvas 提供完整位置，消除了本次已复现的过渡快照。apply fingerprint 在正常恢复/上述异步到达路径解除，不再形成原 R1 循环。

探测最初因测试组件每次 render 新建 initialEdges 引用导致 React render-loop（#301），修正为符合真实 App 稳定 state 输入后运行；这不是产品 finding。保留最终脚本/日志，未修改项目测试以掩盖失败。

### 数据、安全和平台

- `persistCreationSnapshotAsync` 在原生 invoke 成功之后更新 expectedRevision，失败不推进 revision；未改浏览器/伴随服务身份。
- `confirmAction` await 现代 Tauri dialog，失败返回 false；App 删除确认之后重新检查项目、unsettled tasks 与保存状态。Memory/MCP 调用也 await 确认。
- Memory 的 --data-dir 使用私有路径，启动只计算路径，不迁移共享文件；读取时锁内校验后 seed，写入使用 expected store CAS 和临时文件提交，Web 共享视图只读，损坏不静默降为空。UI 明示相关片段用于模型请求及其他产品尚未接入。
- CodeBuddy 本机路径 realpath/文件名校验、无 shell、空 tools/MCP 配置、隔离 cwd、环境白名单、超时/abort/输出上限；stderr 不回送给模型。未实际调用用户 CLI。
- Codex/Claude 配置路径与渲染只写受管非密钥字段，旧内容保守合并；真实 CLI 消费仍未验收。Google 项目变更 invalidate/epoch 与 unknown 护栏按代码抽查，未将 fixture 当真实登录/付费调用。

### 启动与产物

`desktop-release.mjs` 新输入包含 Agent 源码/说明/依赖/打包脚本、平台版本及 Tauri build/config/capability/icon。过期构建调用 `client:build:agent -- --no-bundle`；package script 先 agent:package，再带 tauri.agent.conf 构建。失败或构建后仍过期会抛错，不启动旧 exe。

本 reviewer 重跑：`node --test tests/unit/desktopRelease.test.ts tests/unit/canvasHistory.test.ts tests/unit/memoryStorage.test.ts tests/unit/memoryService.test.ts`，39/39 PASS，0 fail/skip；日志 `D:/kk-studio/.tmp/landing-review-unit-9656011.log`。其中覆盖构建失败/仍过期拒绝启动及七个新增输入，不只是字符串测试。

独立计算本机文件 SHA-256，与 history-fix/build-identity.json 一致：

- exe：`fda10f06689d0d993fa6b3d856d808b88ee8947185abbe8d88f9bb8677fc19a7`。
- JS index-DBl3l-J0：`a2f2ffda4fdfbd63b3c775ac4933051c1a07b34e68e15a4a7a1b51ace24af57c`。
- CSS index-Dajq2fwF：`315e74abc31a372ae27ca3733606d8f68cca91fa856847486430b2b1ebb5e557`。

这证明现有产物字节一致，不代表 reviewer 重新编译或重新启动了 Tauri。Agent 4277文件逐项校验是实施者证据，本 reviewer 未重新逐个校验。

### UI、测试及交付记录

读取实际 App→StartPage/ConversationPanel/Canvas/Settings 路由导入链与统一 CSS 入口；查看当前 Desktop 390/1099/1920 截图，未观察到首页控件重叠/横溢出。CSS 与前候选相同，本次历史修复没有页面样式改动。截图是已有实施者证据，不能称为本 reviewer 实时 native 操作或用户审美通过。

抽查 browser/desktop 历史新增断言和 unified-image-command fixture diff：空项目实际新增节点、无模型 disabled CTA、取消等待请求受理都有契约理由；新增 90 帧与三轮恢复是真实操作断言。Desktop 右键位置改为实际空白命中点后仍保留菜单和数据断言，未发现该抽查中删有效检查/新增 skip。

读取当前 verify.log：根 623/631（8原平台skip）、Agent169/171（2原平台skip）、browser377/377；读取原生runtime关于三视口、重启、真实确认和 Canvas 修复报告及已保留前次97 Rust结果。这些均为实施者已有日志，本 reviewer 未重跑完整 verify/Agent/Rust/native。

本 reviewer 另运行 `node scripts/check-delivery.mjs --base 1e95a13d3490a39b35ce39e9df0ab55a09dc13f7 --branch codex/TASK-PROJECT-001-landing-integration`，退出码0：618 files / 0 violations。结构检查不证明功能和审批。

## Findings 与复验状态

### LANDING-R1 — P2 — CLOSED / VERIFIED

- Pass：行为/回归；原 merge/release blocker：是；当前已关闭。
- 原问题与证据保留在 independent-review-d7ee51c.md，不能改写旧结论。
- 修复位置：src/components/canvas/useCanvasHistory.ts snapshotOf，src/domain/canvasConnections.ts，useCanvasConnections.ts cleanup。
- 复验：本次三轮相连删除/undo/redo恢复节点与边通过；规范化位置与边使 cleanup 不再成为额外历史步骤。
- Owner：TASK-PROJECT-001 / TASK-CANVAS-KAWORKAI-001 实施者。

### LANDING-R2 — P2 — CLOSED / VERIFIED

- Pass：行为/回归；原 merge/release blocker：是；当前已关闭。
- 修复位置：useCanvasWorkbenchState.ts:32、useCanvasHistory.ts:107/132/142、useCanvasControls.ts Escape 分支。
- 复验：真实90帧拖动一次撤销并保留此前键盘历史；Escape/blur/pointercancel/pan取消与redo通过。没有用手工 gestureActive 替代真实 pointer 链来冒充集成测试。
- Owner：同上。

### LANDING-R3 — P3 — OPEN / DOCUMENTATION FOLLOW-UP

- Pass：验证/可追溯性；代码合并 blocker：否；最终交付记录应在待定文档提交纠正，并补审新 HEAD。
- 位置：docs/changes/2026-09-29-project-landing/audit.md:17–20。
- 已知问题由实施者先提出；reviewer 独立读取工程外 landing-pr-17.json/18.json 与 Git 对象核实：PR17 是 TASK-PROV-003 Codex（2618344），PR18 是 TASK-PROV-004 Claude（dbeee9d），当前 audit 错把 Memory/CodeBuddy 标成17/18。
- 影响：错误追溯标签可能让后续关闭旧 PR 或承接审计对错对象；当前不代表缺少这两模块源码，也不证明旧PR已merged。
- 复现：对照 audit 对应行和导出 JSON 的 number/head.ref/head.sha。git show 2618344 显示仅2行历史 head 文档补录。
- 建议：改正来源PR与本地分支标签，保留旧历史含义；下一新SHA文档补审关闭。
- Owner：TASK-PROJECT-001 实施者；状态 OPEN，已承诺本轮后续文档修正，尚未视为完成。

## Declined to judge（逐项）

- 真实 Provider/Google/CLI 登录、收费调用、ComfyUI/GPU：缺当前真实环境，保留 PARTIAL/BLOCKED，不将fixture通过当外部验收。
- Codex/Claude目标CLI真实消费及设置接线：既有开放TASK-PROV-003/004，不额外扩大本次集成验收。
- 豆包/WorkBuddy原生跨应用记忆：没有适配联调，本地共享文件契约不证明其它软件已接入。
- Installer、签名、干净系统安装卸载、离线升级恢复：无安装器验收；no-bundle exe只证明当前桌面受测路径。
- Mobile原生与VPS/域名/生产迁移：responsive Web/本机产物不能替代，仍须单独验收与授权。
- Sidebar分组/置顶跨重启持久化、ORCH执行UI/完整持久任务恢复：文档明确后续范围；不把会话态伪称完整能力。
- 用户最终美观选择、实时Figma像素级一致：只读落盘规范及已有截图，不替用户做产品结果确认。
- 全部22个其他worktree未承接dirty实现及所有历史测试diff：没有穷尽逐行审查，不声称可以删除原分支或所有旧工作已集成。
- 任意多输入同帧并发、所有provider与拖动交叉时序：本次明确动态样例通过，不声称穷举全部竞态或证明完整任务恢复。
- Hosted最新CI/ruleset/评论解决/最终PR merge：未独立实时读托管状态，导出17/18仅用于来源纠正；必须由最终exact-head托管门禁确认。
- 最终发布/真实用户数据迁移：本报告未授权、未执行、未验收。

## 结论

**PASS WITH FOLLOW-UPS（限上述已提交 BASE/HEAD 和本地技术审查范围）**。两个前审 Canvas P2 验收阻断已独立复验关闭；未发现新的已证实 P0/P1 或代码验收 blocker。R3 文档追溯更正尚待下一提交复核。当前技术结论不等于已合并、托管审批、人类approval、用户最终产品验收或正式发布。

下一HEAD如仅按说明修正文档和如实更新ledger/review，应核对diff与规则、重跑相应文档/托管gate后记录新精确SHA，不能简单替换本报告HEAD。若出现产品代码/基线变化，须按实际影响重新审查和验证。
