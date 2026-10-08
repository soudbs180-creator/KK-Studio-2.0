# 独立 Review：TASK-ORCH-002 阶段计划工作台

- 结论：**CHANGES REQUIRED**。
- 审查时间：2026-10-08 12:20，Asia/Shanghai。
- Reviewer：Codex 独立 fresh-context 只读 reviewer `/root/stage_workbench_review`；未参与实现，没有创建子代理。
- Base：`21d121d2b884b2b7ced4a98eb0e03c590de5c3cd`。
- Reviewed head：`dfd4c12ca001e409068f96879767078c8555c039`。
- Branch/worktree：`codex/TASK-ORCH-002-stage-workbench` / `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-ORCH-002-stage-workbench`。
- 规则版本：上述 head 的 AGENTS.md、AI_RULES.md、docs/engineering/{REVIEW,BRANCH-POLICY,PROMPTING,SDLC}.md、docs/UI_INDEX.md 及 UI_RULES/UI_ARCHETYPES。
- 本报告是唯一写入文件；产品、Git index、HEAD、分支和历史 evidence/test-results 未修改。开始/结束 `git status --short` 均为空。

## 审查方式和范围

独立读取本轮 intent/spec/plan/verification/comparison、实际 base/head diff、App/TaskWorkbench/StagePlanPanel/StagePlanDetail/orchestrator、StagePlan schema/state machine、AgentHost、useCreationStorage/storage/snapshotCodec、原生 creation_storage 和对应测试；读取当前 PROJECT_STATE、FEAT-030 功能卡、浏览器/原生测试及留存日志。查验 ba9adbb 到 dfd4c12 的 src/tests diff 为空，所以源码验证证据与本次文档 head 没有源码漂移。

实际运行定向领域测试，以及不落盘的内存 harness（esbuild `write:false`）。Harness 执行候选真实源码；React hooks/存储 IO 用确定性测试边界替身，未将其描述为原生 GUI 或 OS 故障实测。人工查看 `web-390.png` 与 `desktop-result-rework.png`。未重复全量 verify、没有调用收费服务。

## Findings

### SWB-R1 — P1：排队保存冲突后，未落盘审批被宣称已保存

- Pass：行为与回归、安全与数据、原生故障路径。
- 门禁：**merge-blocker / release-blocker**；违反 AC-3 及“失败不能假成功”。
- 新增代码定位：`src/App.tsx:2544`、`src/App.tsx:2553` 的 `await persistence.flush()`；`src/components/StagePlanPanel.tsx:69–70` 无条件成功提示。根因在既有 `src/features/creation/useCreationStorage.ts:114–142`，尤其第 116 行。
- 复现条件：项目已有保存请求尚未结束（UI 状态为 saving，允许审批）；用户提交审批，第二次 flush 进入队列；前一保存因另一窗口的 revision 更新返回 `conflict:`。第一次 catch 将 ready 置 false。随后第二次 enqueuePersist 看到 `!ready.current` 直接 return，导致第二次 flush resolve，尽管没有执行第二次写入。Panel 于是显示“阶段状态已保存到当前项目”。
- 独立动态证据：在实际 useCreationStorage 源码上，初始化读取完成 → commit+flush 保留第一次 IO pending → 第二次 commit+flush → 令第一次 IO reject 字符串 `conflict: native snapshot changed in another window`。输出为：

```json
{"previous":"rejected: conflict: native snapshot changed in another window","approval":"resolved","writes":1,"state":"conflict","revision":3}
```

- 原生路径核对：`storage.ts` await `write_creation_snapshot`；`src-tauri/src/creation_storage.rs:149–150` 对真实 revision 冲突返回该类错误；storageError 将其归类 conflict。不是仅适用于测试构造的错误类型。原生磁盘数据仍受 CAS 保护，但新审批仅在内存，成功提示错误，用户可能据此结束操作。
- 建议：在队列实际执行时重新验证可写性；尚未确认落盘的目标 revision 在 ready=false 时必须 reject。只在 durable acknowledgement 达到所请求 revision 时允许 flush 成功，保留已确认 revision 的幂等行为。补“前一写入冲突、后一审批已排队”的回归，检查第二次 Promise 拒绝、无成功提示、草稿保留及恢复动作。不能只在 UI 增加开始前状态检查，因为状态会在排队期间改变。
- Owner：实现者；状态：OPEN；修复复验：未发生。
- 区分基线：队列静默跳过分支既存，本轮新增阶段操作依赖它并生成明确保存成功文案，构成本轮验收缺陷。

### SWB-R2 — P2：拒绝计划后解除阻断，用户没有重新申请审批的入口

- Pass：用户意图与范围、恢复与可用性。
- 门禁：**merge-blocker（本轮审批恢复验收）**。
- 定位：`src/components/StagePlanDetail.tsx:85–90`，以及 `160–168` 的解除阻断按钮。
- 复现：打开 plan_review → 拒绝计划 → 解除阻断。实际领域正确保留 `planApprovedAt=undefined`，状态变为 doing。详情只显示“请等待宿主重新提交计划审批”，没有任何可操作按钮。`rg requestStageApproval/planTools` 确认 App 没有重新提交调用，Agent 工具尚未注册/自动驱动尚未接入，因此等待不会自行结束。
- 独立动态证据：使用真实 orchestrator 执行上述迁移，并用真实 StagePlanDetail 源码在内存 hooks harness 中渲染，得到：

```json
{"afterRejectRetryStatus":"doing","planApprovedAt":null,"detailButtons":0}
```

- 影响：本轮已暴露的“拒绝/解除阻断”普通用户流程陷入死路，必须在应用外修改/重新导入数据才有机会继续。现有浏览器测试只断言 doing 和未批准文案，没有验证再次进入计划审批。
- 建议：在原工作台对 doing 且 approvalGate=plan、尚未批准的阶段提供“重新提交计划审批”，复用既有 requestStageApproval，并补 expectedProjectId 与 revision 防护、持久化/失败处理、双击与切项目回归。不能通过设置 planApprovedAt 或绕过人工审批来恢复。自动生成/自动执行仍可保持非范围。
- Owner：实现者；状态：OPEN；修复复验：未发生。

### SWB-R3 — P2：合法零工作项结果阶段无法拒绝

- Pass：输入边界、领域/UI 契约一致性。
- 门禁：**merge-blocker（结果拒绝边界验收）**。
- 定位：`src/components/StagePlanDetail.tsx:139–145`。
- 复现：导入有效 `workItems: []` 且 status=result_review 的阶段，点击“返工结果”。确认区要求至少选择一个工作项，但没有可选项，确认按钮永久 disabled。
- 领域证据：`src/domain/stagePlan.ts:82` 允许零工作项；`orchestrator.ts:162` 仅在 `stage.workItems.length && !selections.length` 时拒绝空选择，明确保留空阶段拒绝语义。现有 stale result-review 单测也使用零工作项阶段。不是要求新增领域语义。
- 独立动态证据：真实 orchestrator 创建空工作项阶段、进入 result_review；真实 StagePlanDetail 事件处理设置返工确认状态后读取元素；同时调用领域拒绝验证：

```json
{"emptyStageValid":true,"confirmDisabled":true,"selectableItems":0,"domainRejectStatus":"doing"}
```

- 影响：对于合法的纯阶段审阅/摘要计划，用户只能接受结果或取消，无法使用已承诺的拒绝结果能力。
- 建议：无工作项时允许确认“拒绝阶段结果”，发送省略或空 reworkItems，保留现有领域语义；仅当阶段有工作项而用户未选任何项时禁用并说明原因。补零工作项 UI 回归。若选择禁用整个返工入口，则必须明确调整产品契约并给出真实理由；当前领域已支持，直接复用更小。
- Owner：实现者；状态：OPEN；修复复验：未发生。

没有 P0；没有额外 P3 建议。

## Review Focus 逐项结果

1. **旧项目事件/同 ID 计划：通过已查范围。** App 决策/重试传显示项目 ID；orchestrator 先检查当前项目，再读计划/revision。重新运行的跨项目单测拒绝旧审批和解除阻断并保持状态不变。TaskWorkbench 用 project.id 作为 Panel key，项目变化会卸载旧局部选择/错误。
2. **双击与迟到 revision：通过已查范围。** Panel busyRef 同步围栏；真实编排方法校验 expectedRevision；42 项领域/编排测试包含同状态返回后的旧结果拒绝。已有生产浏览器及 Desktop dblclick 测试断言 revision=1，未删除/放宽相应断言。
3. **原 prompt 与依赖失效：普通工作项路径通过，空阶段存在 SWB-R3。** UI 发送 id 选择、不重写 prompt；领域保留原 prompt 与 reworkPrompt，并递归使依赖结果失效。现有领域多阶段回归通过。浏览器 fixture 下游本来 queued，因此该浏览器断言单独不足以证明“已成功下游失效”，由实际领域回归补足。
4. **保存失败与禁用原因：普通直接 IO 错误路径有证据；排队冲突存在 SWB-R1。** Web 浏览器故障注入覆盖 readwrite IO 失败、无成功提示、后续审批 disabled 和可见原因；原生 storage/Rust 保留原件并传播错误。此次独立源码+harness 发现未被现有 Web quota/native happy-path 覆盖的排队冲突。未宣称独立运行了 native GUI 故障注入。
5. **共享实例和镜像陈旧状态：通过已查范围。** App useMemo 创建一个 orchestrator，注入 AgentHost，getProject 每次读取 creationRef；commitCreation 同步更新 ref；Panel 每次 render 直接读取 project.stagePlans，无第二份可变计划快照。局部状态只保存选择/忙碌/错误。实际外部 Agent/MCP 并行调用未接入，不以源码接线声称 live 成功。

## UI、真实性和测试观察

- 新 UI 沿用现有 TaskWorkbench、timeline 顺序和语义 token。阶段 tab 隐藏空队列的“配置模型”Primary，只渲染当前阶段单个 Primary；返工确认替换原审批 Primary。按钮为原生 button，select/checkbox 有 label，焦点样式来自 token。现有 modal 负责 Escape/focus，未另开重复 modal。
- 实际查看 390px Web 和 Desktop 返工证据；窄屏通过滚动访问内容，tabs 横向滚动；已有 390/1099/1920 生产浏览器及键盘 Enter 用例。没有声称这相当于 Mobile 原生验收。
- 没有专属新 Figma frame，本轮是 UI 治理下的工程补充；没有 Figma live 读取或精确视觉映射结论。
- 无新队列/计划存储/依赖、无供应商调用。FEAT-030 保持 PARTIAL，自动执行、MCP 注册、媒体真实生成的未实现文案与比较文档一致。comparison 映射现有 feature/task，未因入口新增重复功能登记。

实际 reviewer 运行：

```text
D:/tools/node-v24.20.0-win-x64/node.exe --test tests/unit/stagePlan.test.ts tests/unit/orchestrator.test.ts
exit 0; tests 42; pass 42; fail 0; skipped 0
```

另外两个 stdin 内存 harness 均 exit 0，其断言用于确认上述缺陷仍存在，并不表示产品验收通过。仅通过 esbuild write:false 读取/执行源码，没有生成测试文件或覆盖 evidence。

留存证据抽查：verify-initial.txt 记录根 634/642（skip 8）、Agent 172/174（skip 2）；首轮浏览器 386 pass + 1 flaky 的原错误保留。browser-no-retry.txt 记录 387/387，无重试；没有以删除断言掩盖该失败。native-check/stage-native-build 记录完成与 5 条已有 dead-code warning。desktop-acceptance.json 记录 production entry、release EXE hash `5cdb9d86d50e3d97cf144b6d2da46912d2188711f7bc2f132ff32a9b7d3bd6b0`、两次启动、planRevision=2、无 pageerror；范围确为本地 fixture 审批/返工/原生保存/重启。

## 门禁和 Declined to judge

- 独立 AI review：CHANGES REQUIRED，3 个未关闭 finding；修复后按新 SHA 补审。
- 全套本地验证：实现者留存证据已抽查；reviewer 未重跑全套。定向 42 项通过，新增失败边界由独立 harness 复现。
- Self-review：仓库已有记录；本报告没有把 self-review 当独立审查。
- Hosted CI、GitHub approval、用户最终产品验收、推送/合并/发布：本次未发生或未核验，本报告不代填。
- Declined to judge：MiniMax 在线服务/模型质量/价格、真实 Provider/GPU/MCP 执行、Mobile、安装器发布、远端 CI/ruleset 当前状态、用户最终视觉认可，均缺本轮必要运行或授权证据且不属于此次只读代码审查；不影响上述可本地修复问题的判断。

本结论只绑定 reviewed head，不代表已合并、发布或产品整体完成。
