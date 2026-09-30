# 项目落地审查

## Self-review（2026-09-30）

- 范围：origin/main@1e95a13 到集成候选的完整 diff；分支承接、四页 UI 基线、实际加载链、项目/素材/任务/记忆与 Provider/CLI 的数据边界、测试维护、证据及未完成项。
- 原 checkout、其它 dirty worktree、存储 key/identifier、远端 main 保护保留；历史截图先保存再按 HEAD 恢复，本轮证据独立存放。
- 原生连续保存/CAS、async确认、未配置生成、项目 unknown 删除、隔离记忆与 composer 重叠已先失败后修复，并分别用 production preview/真实原生运行复验。
- 外部真实调用、持久分组、Installer、Mobile、VPS 和用户最终视觉验收保留其状态，见 [remaining](remaining.md)。没有删除有效断言或新增 skip。

## 独立上下文与精确 HEAD

此文件是提交时的审查入口，不代填尚未发生的独立审查结果。实现完成后按 docs/engineering/REVIEW.md 和 executing-plans/requesting-code-review 调用 fresh-context 只读 reviewer；输入完整 base/head、intent/spec/plan、Review Focus 和技术裁定。审查报告、复核发现、最终精确 HEAD 与 CI 结果追加在本集成 PR 的描述/记录及交付收据；该记录是最终是否可合并的依据。

本地验证详见 [verification](verification.md)。head 改变时必须补审并重新满足托管门禁，不能把旧 review 的 SHA 修改成新 SHA。

## 第一轮独立审查与修复（2026-09-30）

- Base `1e95a13d3490a39b35ce39e9df0ab55a09dc13f7` / head `d7ee51c4ba2387731af1a1bad364b977be31e01f`；fresh-context reviewer 通过实际 hooks 在隔离 Chromium 中复现，结论 CHANGES REQUIRED。原报告完整保留在 [独立报告](evidence/independent-review-d7ee51c.md)。
- LANDING-R1（P2，画布验收阻断）：相连节点删除时，history 保存了节点已删、旧边仍在的过渡快照；撤销后连线清理再次入栈，无法恢复节点。修复为 history 与连线协调使用相同的有效图规则，并用现有 ProjectCanvas 协调完整位置。
- LANDING-R2（P2，画布验收阻断）：连续移动逐帧入栈，一次长拖动丢失起点和更早编辑。修复为 node/pan 手势的可见状态只预览，结束才入栈；取消恢复起点且保留 redo。新回归同时复现并修复节点焦点处 Escape 提前消费事件、未取消拖动的问题。
- 修复前新增 6 项真实 UI 回归全部失败；初修 23/24 通过、Escape 仍失败；完整修复后 24/24 通过，均 retries=0，保留每轮日志。测试覆盖相连节点三轮删除/撤销/重做、90 帧拖动及之前历史、Escape/pointercancel/blur/平移取消与 redo。
- delivery 初检有 19 项结构违规：缺失交付入口和导入包未绑定当前集成任务。现补录缺失文件并把 13 个导入包绑定 TASK-PROJECT-001；原 branch、原时间和原 SHA 保留，不改门禁。正式结果须在提交后的真实 HEAD 上重跑。
- 最终新 SHA 的完整检查、Desktop 实际运行与独立复审/CI 仍按下述托管流程完成。旧 371 项通过及旧 exe 身份保留为原候选证据，不能代表修复后产物。

## 返修后独立复审与来源勘误（2026-09-30）

- Base `1e95a13d3490a39b35ce39e9df0ab55a09dc13f7` / head `9656011267d7a51c954bf18c42088a477e492b75`；完整原报告保留在 [返修复审](evidence/independent-review-9656011.md)，不改写旧 SHA。
- 结论 PASS WITH FOLLOW-UPS。LANDING-R1/R2 已由 reviewer 使用真实 Controls → Workbench → History 和 Chromium pointer 独立复验关闭；39 项相关单测、提交后 delivery 618 文件 / 0 违规通过。
- LANDING-R3（P3，来源勘误）：PR #17 实际为 Codex 配置（2618344），PR #18 为 Claude 配置（dbeee9d）；Memory/CodeBuddy 是本地来源分支。已按远端 PR 元数据和 Git 源码比较更正 [audit](audit.md)，本次文档新提交需精确 HEAD 补审关闭。
- ledger 的两个 DONE 只表示已验证的本地候选范围；全量结果为根 623/631（8 原平台 skip）、Agent 169/171（2 原平台 skip）、browser 377/377，最新实际 Desktop 及 compare/plugin/version 通过。Installer/Mobile/真实外部服务仍保留开放任务。
- 此次文档提交不修改产品、测试、CI 或远端规则；最终新 HEAD 审查、托管 verify/delivery、实际 merged/main 和分享包启动身份记录在集成 PR 与交付收据中，不能把候选检查当成主线推广完成。

## 当前托管门禁返修（2026-09-30）

- 5818418 的独立文档补审 PASS，R1/R2/R3 全部关闭；报告完整附于集成 PR #31 的描述，保留其原 SHA。
- 初次 Hosted verify 在 Agent 阶段有两项 CodeBuddy 路径预期失败（167 PASS / 2 FAIL / 2 原平台 skip），后续 browser/Rust/client 未运行；delivery 和 deploy-linux 通过。不能用本地 PASS 代替此次失败。
- CI 的 TEMP 使用 Windows RUNNER~1 短路径；实现按既有本机路径安全规则 realpath 后返回 runneradmin 实际路径，测试却期待原别名。工程外独立 TEMP junction 重现同两项失败（6/8），改为比较真实文件的 canonical path 后 8/8，完整 Agent 169/171 通过。
- 本次仅调整两个测试的预期和文档；真实代码的 realpath/本机绝对路径/UNC/目标文件名检查、HTTP token/取消/超时/隔离断言、CI 均保留。证据与原日志 SHA 见 [验证补录](verification.md#托管-windows-路径预期返修)。新 HEAD 必须补审与重新 Hosted 验证。

## 托管规则与用户授权

- 2026-09-30 实际回读 main 规则：必须 PR、严格 verify/delivery、评论解决；required approvals=0，无 bypass，禁止删除与非快进。独立 AI review 不能称作第二个人类审批，作者不会自行 approve。
- 用户已明确授权“全部检查一遍并且合并分支”，并继续任务；该授权覆盖通过有效门禁后的技术主线合并。最终美观偏好/正式外部发布未被虚构。
- 回滚：保留主线基线、候选 snapshot、原分支/PR和前一可用产物；需要回退时通过新的 revert PR，不强推 main，不恢复覆盖用户数据。
