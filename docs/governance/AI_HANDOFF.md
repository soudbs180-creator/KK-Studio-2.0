# AI handoff

- docId: AI_HANDOFF
- status: current
- updatedAt: 2026-10-15
- source: `docs/governance/PROJECT_STATE.md`
- supersededBy: null

本文是最短恢复入口，不是任务状态或产品能力的第二事实源。任务状态只读 [`task-ledger.json`](task-ledger.json)；当前项目事实只读 [`PROJECT_STATE.md`](PROJECT_STATE.md)；历史验证只按带日期的 change package、commit、运行模式和 receipt 回读。

## 本轮恢复入口

最新54a2 aggregate PASS/Delivery706/0后quality38645328109 Node1301PASS/1FAIL/13skip，仅gateway首次ready超时；无child日志，alive/crash UNKNOWN，未POST/Provider/恢复/Browser/Rust，时长variance不证明slow CI。单测试启动握手84+/14-保留20s/恢复断言，preload7s RED→延迟4GREEN/focused21PASS，真实8.3 Node1304PASS/14skip与lint/typecheck/format PASS。非完整verify-6，产品不变、Browser747/Native56/Rust163沿用；新head独立复审/Hosted/PR59/main及旧54 push38645320833结果待验，REVIEW/NOT_VERIFIED、main694。

最新阻断：c498独立exact aggregate review PASS，quality38643592443 snapshot3/0后Node1294PASS/8FAIL/13skip，Windows agentPackage发布fixture的非canonical short TEMP被既有no-link guard拒绝，Browser/Rust未运行。source agent只修测试realpath；安全脚本/回滚断言保持。fixture await realpath仅4+/1-，真实8.3 RED3PASS/8FAIL→GREEN11/11；首轮短TEMP Node1299PASS/2FAIL/14skip与canary1的失败是自建目录过深的git路径前置条件，原件保留。较浅actual8.3根下canary7PASS/3Linux skip、run2 Node1301PASS/14skip与lint/typecheck/format全部PASS。非完整verify-6；产品/config/Rust及安全脚本不变，Browser747/Native56/Rust163沿用原范围。最终修复head exact review/新Hosted待验，PR59未合并/main694，REVIEW/NOT_VERIFIED。

TASK-UI-FULL-20261015 REVIEW / 整体NOT_VERIFIED（本地验收PASS），先读[验证](../changes/2026-10-15-ui-full/verification.md)、[覆盖矩阵](../changes/2026-10-15-ui-full/coverage.md)与[计划](../changes/2026-10-15-ui-full/plan.md)。工作树 D:/kk-studio/.worktrees/branch-consolidation-20261011，branch fix/TASK-UI-FULL-20261015，当前source `241f3050124ad7773ced0b47a55629373177205e`，Desktop/Web2.1.27、Mobile2.1.1规划。main694已本地承接为1653966f，104实际冲突/25自动差量逐项审计、21历史blob保全；远端origin/main仍694，尚未PR落地主线。15包/原任务branch/status与primary254条dirty/index、109登记worktree保持。

165完整verify在Browser740PASS/5FAIL处退出，Node1295PASS/14skip、Agent199PASS/2skip、UI242/0与Rust163等通过不代填完整PASS；正式source/integration review三P2均CHANGES_REQUIRED。241修复text纯prompt、坏audio及rightpan，连同首页16:9/旧fixture修正后14条定向GREEN，source241/integration241精确复审PASS关闭三P2；官方隔离Native56checks/0errors与资源字节身份、owned正常关闭均PASS，完整verify-3已PASS：Node1295/14skip、Agent199/2skip、Browser747/747首试、UI242/0及development；f090最终doc/test-only独立aggregate review已PASS，ready PR59已建立。原79/50、首次五失败、有效RED/误设夹具勘误均保留；收据在D:/kk-studio/.analysis/ui-full-20261015。verify-2音频selector双匹配夹具失败与修正后实际播放2PASS保留；首次Hosted quality38641803780 verify在snapshot检查、产品测试前FAIL，外部父目录依赖由root只修scripts/tests；Gitguards push/PR与governance/delivery/deploy-linux PASS。有效RED2FAIL/3PASS、定向24PASS与verify-4 lint失败/继承JSON NOT-RUN均保存；完整verify-5无外部env exit0（snapshot3/0、Node1301/14skip、Agent199/2skip、Browser747、development四步），显式外部4/0 PASS。Native仍current/input与EXE不变；CLI24/offline AI-evals为有限dirty预检，最终修复head待root提交后exact-SHA复审/新Hosted/main待验；产品/Rust/Native源字节未变。main694未合并，不沿用旧2.1.26产物或165 review批准后续head。

### 此前2.1.26基线（保留历史）

TASK-UI-DETAILS-20261015 本地DONE/PASS。先读[验证](../changes/2026-10-15-ui-details/verification.md)和[审查](../changes/2026-10-15-ui-details/review.md)。当前Desktop/Web2.1.26工作区 D:/kk-studio/.worktrees/branch-consolidation-20261011 / fix/TASK-UI-DETAILS-20261015；base18e143f，产品ab878ffd。用户五处细节已统一：紧凑设置、首页/Agent职责、控件形状与尾组、空/非空上传、扩展轴线。完整verify退出0：Node1278/14skip、Agent199/2skip、browser635首试、UI239/0及development PASS；精确源码独立审查与新官方Desktop38项Native PASS，EXE0f65d382/input864b0376，production JS/CSS和当前dist同字节。现有快捷方式同路径，下次打开是新版；两个owned实例均正常关闭，未接管日常资料。所有失败记录在D:/kk-studio/.analysis/ui-details-20261015，primary旧dirty/index保留。Mobile2.1.1规划、真实Provider/Hosted/签名及用户视觉接受继续分别开放。

### 此前2.1.25基线（保留历史）

TASK-SETTINGS-LATEST-20261015 本地DONE/PASS。先读[验证](../changes/2026-10-15-settings-latest-ui/verification.md)和[审查](../changes/2026-10-15-settings-latest-ui/review.md)。最新UI基线c1fae190，当前2.1.25工作区 D:/kk-studio/.worktrees/branch-consolidation-20261011 / fix/TASK-SETTINGS-LATEST-20261015；源2a4e66d1，完整verify784039e7，独立源/测试054cd53f。Desktop快捷方式已指向此工作区，正式新建EXEc9c3b4e/input2a09db54；最新1280/240/192绿色和手机分级导航有Web/Tauri当前证据。原primary51fcc+428a旧基线保留源码/index恢复，不据此启动最新版；旧截图、旧2.1.24包和历史PASS不代填新差异。

本次629浏览器首试、Node1278/Agent199及原skip14/2、UI242/0、development5步，Native20+11+1+5均PASS且owned凭据/fixture清理。全部失败与旧Native浏览器route纠正保留，工程外证据 D:/kk-studio/.analysis/settings-ui-latest-20261015。Mobile2.1.1、真实账号/付费Provider、Hosted/签名及用户视觉验收继续按原开放任务分开验收。

### 此前2.1.24交付基线（保留历史）

TASK-223-ACTIONS-20261014：Desktop/Web2.1.24产品58b5c07f34718769e10b76c89d510615bea2fefc，本地授权范围DONE/PASS。先读[验证](../changes/2026-10-14-action-usability-223/verification.md)及[独立审查](../changes/2026-10-14-action-usability-223/review.md)，按最终收据回读实际官方/便携Native与CLI、输入哈希、最终纯文档和output；不复用64fc失败或旧0e的过期产物身份。保留primary dirty/index、原资料与全部历史失败；手机布局/主题/独立背景沿用确认版本，Native Mobile2.1.1、真人账号/付费Provider/Hosted/签名及人工验收仍分别开放。

### 此前2.1.23交付基线（保留历史）

TASK-222-ACTIONS-20261014：Desktop/Web2.1.23本地授权修复已完成，产品HEAD为b4fa7b0e，最终纯文档提交与产物由工程外current-release收据绑定。恢复时先读[验证](../changes/2026-10-14-action-usability-222/verification.md)和最终独立补审，不复用旧2.1.22或中断回执。保留原资料与已确认手机布局；Native Mobile2.1.1、真人CLI/付费Provider、Hosted、签名安装与实体手机等验收仍分别开放。

### 此前2.1.22交付基线（保留历史）

TASK-PROTOCOL-CLI-20261014：Desktop/Web2.1.22产品da6141e6完整verify通过：551浏览器首试、Node1214pass/14既有skip、Agent172pass/2既有skip、UI241/0、development5步骤PASS；Rust163与原生源一致性确认，独立源码审查PASS。官方Agent构建、真实Tauri22项和同字节便携目录23项通过，5协议文本均保存/重载/GET检测/NativeTaskHost一次POST/结果恢复，无重复；4取消/超时场景实际socket关闭且目录字节保持。手机为响应式WebView/Web，非Native Mobile。新依赖0，入口gzip增加3247B<16384；4278生产白名单519462029B，其中8个缺失的当前平台Codex必要文件407521436B已恢复，不把旧残包当同功能体积基线。原资料身份、primary dirty/index和历史失败保留。最终ZIP/源码/Web/恢复与哈希由工程外current-release收据绑定；Hosted、真人CLI安装/登录、付费Provider、签名安装器、日常资料和人工视觉验收继续各自开放。按[验证](../changes/2026-10-14-protocol-cli-completion/verification.md)与工程外当前哈希收据恢复，不能把旧回执覆盖到新源码。

### 此前2.1.21基线（保留历史）

TASK-UI-CONSOLIDATE-20261014保留2.1.17冻结与2.1.18中间候选；最新主目录2.1.20一致源f2b0466的凭据恢复、Agent展示和画布同步已逐项承接。当前Desktop/Web2.1.21产品7a463742完整verify通过（545browser首试、开发5步骤）、真实Tauri9项检查及0e/7a独立源码复审通过，账本133项。CLI随包桥和绝对路径命令已实测字节身份，仍使用用户已有Node/npm环境。按[验证](../changes/2026-10-14-ui-consolidation/verification.md)回读工程外最终分享包/源码/恢复增量收据，后续从此版本继续[开放计划](../changes/2026-10-14-ui-consolidation/plan.md)。原资料、历史失败与在途源保留；Native Mobile、未接协议、Hosted、安装器和用户资料/视觉验收分别开放。

## 2026-10-13 历史恢复快照

- canonical repository：`D:/kk-studio/KK-Studio-2.0`
- branch：`codex/ui-redesign-20261011`
- HEAD：`51fccfc7879cf90f7caaf3ae8e10af4d97a2aa2c`（dirty 集成；原暂存区保留）
- local `origin/main`：`694a00607f6f63de1b8c43d0ebb117adf5d34f67`；本轮只回读本地 ref，未 fetch
- worktrees：103 个登记项；当前 git inventory，未删除或移动其他 worktree
- task ledger：126 records; 75 DONE, 32 PARTIAL, 11 TODO, 4 BLOCKED, 4 REVIEW; 51 open records.
- 当前分支为 dirty 开发集成，不是已发布的 `origin/main` 树。TASK-AGENT-RECOVERY-20261013 已取得完整本地、canonical Tauri 和系统凭据证据；Hosted、真实 Provider、签名、安装与用户视觉验收保持各自边界。

## 权威顺序

1. 用户当前意图与已确认范围。
2. `AGENTS.md`、`AI_RULES.md` 和专项规范。
3. `docs/governance/task-ledger.json`：任务状态、负责人、依赖和证据唯一来源。
4. `docs/governance/PROJECT_STATE.md`：当前事实。
5. 本文件：恢复顺序和短入口。
6. `docs/changes/<date>-<task>/`、`docs/evidence/`：历史或范围化证据，不覆盖当前状态。

同一任务或文档更新时沿用稳定的 `taskId`/`docId`，更新 `updated`/`updatedAt`；不通过复制一个新日期文件制造第二条 current。旧入口写 `status: superseded`、`supersededBy: <新入口>`，历史证据保留原 commit 和含义。

## 本轮治理边界

- B1+B2 已在本分支提交并保留原验证记录。
- `R+B3-1+B3-2` 当前改动：文档生命周期门禁、任务快照刷新、本入口瘦身。
- B3-3、B4-1、B4-2、B4-3 未授权，禁止在恢复过程中删除、移动、取消跟踪、合并或清理 worktree/二进制/临时目录。
- 当前变更记录见 [`docs/changes/2026-10-12-governance-currentness/`](../changes/2026-10-12-governance-currentness/)；P1 前序记录见 [`docs/changes/2026-10-12-p1-audit-closeout/`](../changes/2026-10-12-p1-audit-closeout/)。

## 恢复顺序

1. 运行 `git status --short --branch`、`git rev-parse HEAD`、`git rev-parse origin/main` 和 `git worktree list --porcelain`。
2. 读取本文件、`PROJECT_STATE.md`、`task-ledger.json`、相关 change package 的 `intent/spec/plan/verification/review`。
3. 检查 task ID、文档 ID、`updated`/`updatedAt`、`status`、`supersededBy` 和 exact SHA；旧日期只能作为历史线索。
4. 只在当前用户授权范围内继续；发现源冲突时记录 `CONFLICT`，缺证据时记录 `UNKNOWN` 或 `NOT VERIFIED`。
5. 完成修改后重新生成 `TASK_LEDGER.md`，运行适用的治理、文档、格式和测试门禁，并把命令、退出码和当前 SHA 写入 verification。

## 历史恢复锚点

本文件被瘦身前的完整历史内容仍可从 Git 祖先提交 `7f29db98a00a9f0662c9a0dd8909337a988a4baa` 的同一路径读取；不改写或伪造历史验证。后续历史材料以 dated change package 为准。

## 2026-10-13 分类修复恢复入口

TASK-UI-CLASSIFY-20261013：[验证记录](../changes/2026-10-13-capability-ui/verification.md)。canonical 已集成本轮分类与交互修复；基线 51fccfc7，任务隔离分支 fix/TASK-UI-CLASSIFY-20261013-capability。用户补充的模型弹层批量/数据项已移除，相关 40 项定向回归通过。最终 Web development 7 项、preview 7 项、Desktop 2.1.14 14 项实际验收通过，原生 Agent 可用/启动/健康/停止通过；全量浏览器 492/495，余下 3 个既有 UI 失败列在 verification，独立补审通过，任务保持 REVIEW/PARTIAL。预存 WindowControls、mic 与两份测试哈希及空暂存区均保留，未推送或正式发布。

## 2026-10-13 自动恢复交付入口

TASK-AGENT-RECOVERY-20261013：[验证](../changes/2026-10-13-agent-recovery/verification.md) / [独立审查](../changes/2026-10-13-agent-recovery/review.md)。生产源6f8ff257、完整门禁59c013ce，canonical HEAD51fccfc dirty保持原index。官方2.1.16重建及Agent38/38、凭据6/6正常重开通过，桌面快捷方式已重新生成。打开自动恢复原线程，主动断开保持暂停；API秘密在Windows凭据库、输入不回填。本任务 DONE/PASS，最终交付文档独立补审通过；未合并/推送/发布，未知线程仍拒绝接管。

## 日常 APP 实际验收补充（进行中）

用户授权正常关闭/重开默认数据APP并直接修复。2.1.16实际83652→87180恢复同项目/thread，API metadata未变；主动断开后87180正常exit0→75784仍暂停。原当前API ref在关闭前就是missing，不将配置active冒充实钥保留。聊天横幅危险色/按钮未同步已RED，共享2.1.17修复和最终复验在执行中；原2.1.16证据保留。
