# GPT-6 Astra Implementation Plan

> **For agentic workers:** 使用 superpowers:subagent-driven-development 或 superpowers:executing-plans 按任务实施。此文件是用户要求的规划成果；勾选框均表示未来实施工作。

**Goal:** 为 KK Studio 接入真实的 GPT-6 Astra 助手，保持图片生成和本地项目安全，并在满足任务持久化门禁后接入受限图片工具。

**Architecture:** 独立 assistant 配置与共享 Responses 适配器，分别提供 Desktop/Web transport。Astra 负责文字、视觉理解和规划，已有图片服务继续产出素材；assistant 历史纳入有原件保护的 v3 快照。

**Tech Stack:** React 18、TypeScript strict、Vite、Tauri 2、Node 24、npm、Zod、fetch、reqwest。

**Spec:** [spec.md](spec.md)

## Global Constraints

- 唯一 Git 仓库 <local-checkout>；当前基线为 main@80544af，保护原 dirty checkout。每个 task 使用独立注册 worktree 与 `<type>/<TASK-ID>-<description>` 分支；主线禁止直接开发、普通 direct push 和 force push。
- assistant model 固定 gpt-6-astra；图片、视频、音频和历史任务模型不批量替换。
- Desktop First / Local First；local_only 不发送 Astra 远程请求。
- 凭据只在 com.kkstudio.provider 或 Web 请求内存，不进快照、URL、日志、导出。
- Figma 最新 Frame → Tokens → Shared Components → Actual Source → 同状态浏览器验证。
- npm lockfile 为唯一依赖锁；在 task worktree 使用 npm ci。原目录无关 pnpm/临时文件不复制、不清理、不提交。
- 不扩大 Gateway、VPS、ComfyUI、计费或个人订阅登录范围。

## Review Focus

- assistant 消息被旧 normalizer 变为 user，或旧版本写回抹去新历史：Task 3 锁定版本、角色、降级与原件测试。
- 用户只想生成图片，模型选择却改变原路径：Task 1/4 验证两种模式路由分离。
- 取消、切换项目后迟到 SSE 仍写回：Task 2/4 使用 runId/attempt 围栏测试。
- 图片参考缺失、local_only 或未批准远程传输仍发送：Task 2/5 对出站请求数作零断言。
- 工具已受理但超时，重试造成重复生成/消费：Task 5 持久去重及 unknown 状态测试。

## 顺序、工作量与依赖

| 阶段   | 交付                 | 粗估工程时间 | 前置                                     |
| ------ | -------------------- | ------------ | ---------------------------------------- |
| Task 1 | 基线、能力与角色配置 | 0.5–1 天     | 当前工作区重新盘点                       |
| Task 2 | Responses 与两端传输 | 1.5–2.5 天   | Task 1、可测试的 API 访问                |
| Task 3 | 消息/快照兼容和恢复  | 1–1.5 天     | Task 1 契约，可与 Task 2 并行            |
| Task 4 | 助手入口与状态闭环   | 1–2 天       | Task 2、Task 3、最新 Figma               |
| Task 5 | 受限图片工具         | 1–2 天       | Task 4；T4 已完成、T5 剩余运行态验收通过 |
| Task 6 | 实际评估与发布验收   | 1–1.5 天     | 第一交付需 Task 1–4；第二交付还需 Task 5 |

第一交付约 5–8.5 工程日；图片工具约再加 1–2 日。API 权限等待、Figma 缺失、T5 剩余运行态验收及发现的修复和受信 Web 后端建设不包含在估算内。这是基于当前代码的计划估算，不是工期承诺。

## Task 1：角色配置与可复现基线

**Files:** 新增 `src/features/assistant/model.ts`、`profile.ts`、`tests/unit/assistantProfile.test.ts`；必要时在 `src/domain/providerConnections.ts` 增加明确的 input/output 与协议能力元数据，兼容旧连接；保留 `src/features/creation/model.ts` 图片判断。

**Interfaces:**

```ts
export type AstraEffort = "low" | "medium" | "high" | "xhigh" | "max";
export interface AssistantProfile {
  version: 1;
  enabled: boolean;
  model: "gpt-6-astra";
  connectionId: string;
  reasoningEffort: AstraEffort;
  maxOutputTokens: number;
}
// profile.ts: 只解析非敏感配置，非法配置返回明确错误。
export function parseAssistantProfile(value: unknown): AssistantProfile;
```

- [ ] 再读 main 的 AGENTS、governance ledger、PROGRESS、Git/worktree 和当前主路径；从最新已验收 main 建立独立 task 分支，只复制本计划经过审查的文档。不使用旧根目录的未提交实现作为隐式依赖。
- [ ] 用 Node 24 建立当前 typecheck/unit 的实际基线，失败按来源记录。旧文档中的测试数量不当作本次通过。
- [ ] 先写 schema 测试：enabled 默认 false；none/minimal/ultra 不属于上述 API effort；profile 不含 secret；旧图片 profile 和历史 task.model 保持不变。
- [ ] 增加路由防回归断言，然后实现最小配置。

```ts
assert.equal(modelSupportsKind("gpt-6-astra", "image"), false);
assert.equal(modelSupportsKind("gpt-image-1", "image"), true);
assert.throws(() =>
  parseAssistantProfile({
    version: 1,
    enabled: true,
    model: "gpt-6-astra",
    connectionId: "c1",
    reasoningEffort: "none",
    maxOutputTokens: 4096,
  }),
);
```

- [ ] 执行 `node --test tests/unit/assistantProfile.test.ts tests/unit/creation.test.ts` 与 `npm run typecheck`。验收配置分离后再做 scoped diff review。

## Task 2：Responses 请求、事件与传输

**Files:** 新增 `src/integrations/assistant/{responsesRequest,responsesEvents,responsesTransport,webResponsesTransport,desktopResponsesTransport}.ts`；`src-tauri/src/assistant_responses.rs`、`assistant_responses_tests.rs`；在 `src-tauri/src/main.rs` 只注册新模块/命令；新增 `tests/unit/assistantResponses.test.ts`。

**Interfaces:** `buildAstraRequest(input)` 产生受限 Responses body；`decodeAssistantEvent(value: unknown)` 归一化事件；`AssistantTransport.run(request, onEvent, signal): Promise<void>` 在完成/失败/取消时终止；所有 event 包含 projectId/runId/attempt。Rust 命令为 assistant_start / assistant_cancel，事件为 assistant_event，取消以 runId 定位。

最小请求基线如下；4096 是本项目首轮试验输出上限，评估时调整，不是模型限制。

```json
{
  "model": "gpt-6-astra",
  "input": [
    {
      "role": "user",
      "content": [{ "type": "input_text", "text": "分析这个设计需求" }]
    }
  ],
  "reasoning": { "effort": "low" },
  "max_output_tokens": 4096,
  "stream": true,
  "store": false
}
```

- [ ] 先写 body 白名单测试：无 temperature/top_p/logprobs/max_tokens/n；图像输入来自成功解析的资产；缺失 asset 或 local_only 时 fetch 调用数为零。
- [ ] 在首次文字/图像外发前执行 remote_transfer 门禁；无有效审批时停在 awaiting_approval，fetch/invoke 启动请求次数为零。审批绑定目的地、输入和资产范围，修改后失效，同一 run 可复用仍有效的审批。
- [ ] 写历史输入映射测试：既有 system 状态消息不会成为模型 system/developer 指令；用户或工具内容中出现类似指令的文字不会改变其消息权限。
- [ ] 写分片/终态测试：中文 UTF-8 跨 chunk、单 chunk 多 event、error/failed/incomplete/refusal、未知 event、正常 EOF 前未完成、只有 function_call、取消后的晚到 event。
- [ ] 实现请求构造和 SSE 解析；只从 output message 的 output_text 提取最终文本，不读取 choices，不假设 SDK helper 存在。
- [ ] 实现 Desktop transport：native 根据连接引用读凭据、固定 HTTPS endpoint/模型、拒绝重定向、限制请求大小和事件大小；错误返回分类和安全提示，不转发原始响应体。保留旧聊天命令但不把它们接入新 UI。
- [ ] 实现 Web session BYOK transport，并在实际 origin 测试 CORS；第三方“OpenAI 兼容”服务必须单独通过 Responses 能力探测，不能从 `/models` 成功推断。
- [ ] 验证 401/403 不自动重试，429 尊重 Retry-After，断流/受理未知不自动重新发送；所有连接与模型绑定提交时快照。
- [ ] 执行 `node --test tests/unit/assistantResponses.test.ts`、`npm run typecheck`、`cargo test --manifest-path src-tauri/Cargo.toml assistant_responses`、`npm run client:check`。

## Task 3：assistant 历史、快照 v3 与原件保护

**Files:** 修改 `src/features/creation/{model,snapshotCodec,storage,snapshotAssets,useCreationStorage}.ts` 中实际负责该契约的文件（hook 当前为 .ts）；`src-tauri/src/{creation_validation,creation_storage}.rs`；新增 `src/features/assistant/snapshotMigration.ts`、`tests/unit/assistantSnapshot.test.ts`；补充现有 snapshotCodec/snapshotAssets/creation_storage 测试及 DATA-STORAGE.md。

项目包联动文件：`src/features/projects/projectPackage.ts`、`src-tauri/src/project_package_snapshot.rs`、`src-tauri/src/project_package.rs`、`tests/unit/projectPackage.test.ts`、`tests/browser/project-package.spec.ts`。

**Interfaces:** `migrateCreationV2ToV3(value: unknown): CreationSnapshotV3`；v3 新增显式 assistant role、消息 runId/状态和项目 assistant 配置。正常图片字段原值保留。迁移输入只能是通过 v2 校验的快照；未知版本返回 unsupported。

- [ ] 写 v2 fixture，包含项目、画布、参考 assetId、历史图片任务、sourceItemId、submissionState、submittedAt、稳定 idempotencyKey、unknown、逐 slot 输出和 user/system 消息；迁移后深相等。assistant encode/decode 重开保持角色；native reconcile 必须先于 interruption recovery，unknown 不能变成普通可重试任务。
- [ ] 写 10,001 字符、多字节中文、65,536 边界和超限正文测试；前后端一致保留有效原文，超限不能静默截断或覆盖既有快照。原有 user/system 消息迁移不提升为模型指令。
- [ ] 写磁盘满、原件备份失败、CAS 冲突、损坏主备和过新版本测试；断言写入次数为零或事务整体回滚，原件 hash 保持不变。
- [ ] 在前端和 Rust 同步增加 v3 校验；normalizer 对未知 role 拒绝，不能用 user 兜底。保留 v2 读取以生成迁移预览。
- [ ] 实施 spec 中 pre-astra-v3 原件保护，记录原件 hash/版本/revision；提供整个项目存储库的迁移预览与明确升级操作，再单独选择启用助手的项目。运行中保存以有界频率写 checkpoint，完成/失败/取消落盘，重开把未完成 run 标 interrupted。
- [ ] 锁内按“不可变 v2 原件→有效 v3 普通备份→v3 主文件”提交；IDB 则同一事务更新原件/backup/snapshot。逐个写入边界注入退出，尤其验证成功迁移后主文件损坏，旧 release 也不能从普通 v2 backup 回退并继续写。主文件提交前不得写 assistant 历史。
- [ ] 分别固定项目包 manifest 与内嵌 snapshot 的版本策略，联动 Rust 白名单/正文上限和 TS 预检；验证旧 v2 包读入，以及含 assistant 配置、run 状态、65,536 字正文的 v3 包导出→预检→隔离恢复，校验素材 hash、引用和任务状态。
- [ ] 测试功能开关关闭仍可读/导出 v3；旧版读 v3 返回 unsupported，不覆盖、不把旧备份恢复为可写项目。
- [ ] 执行 `node --test tests/unit/assistantSnapshot.test.ts tests/unit/snapshotCodec.test.ts tests/unit/snapshotAssets.test.ts` 与 `cargo test --manifest-path src-tauri/Cargo.toml creation_storage`；同步更新数据存储说明。

## Task 4：助手入口与实际产品闭环

**Files:** 新增 `src/features/assistant/{useAssistantRun,assistantPrompt}.ts`；修改 `src/App.tsx`、`src/components/{ConversationPanel,ConversationModelPicker,StartComposer}.tsx`、相关 settings 子组件；新增 `tests/browser/assistant-flow.spec.ts`。只改必要样式。

**Interfaces:** `useAssistantRun` 消费 AssistantProfile、当前项目快照、Task 2 transport 与 Task 3 storage；暴露 start/cancel 和当前 run 状态。assistantPrompt 只定义设计任务目标、输出结构和授权边界，不注入仓库 AGENTS.md 作为产品提示词。

- [ ] 读取 UI-ALIGNMENT/UI-STANDARDS/UI_SPEC 与最新 Figma Frame，确定既有组件内“助手/生成”切换及模型入口；原稿缺失状态标工程补充。
- [ ] 写 browser 测试：选助手只命中 `/responses`；选图片只命中 `/images/*`；API key 缺失保留草稿；开关关闭时无法发起 assistant run。
- [ ] 写助手远程传输的确认/取消测试：未批准文字或图像都不发请求，取消保留草稿；已有审批覆盖同一 run，输入/目的地/参考图变化后按门禁重新判断。
- [ ] 写 A 项目发送→切 B→A 迟到响应的隔离测试，以及刷新恢复、取消重试、IME、Escape、焦点回归和长模型名称省略测试。
- [ ] 实现模式路由和消息渲染；Astra 已输出文字但未完成时显示运行中；未连接或未验收路径给出具体原因，不显示虚构连接成功。
- [ ] 将默认 system 提示词限制为清晰目标/交付物/边界：已授权工作直接完成，只有影响结果的缺失信息才提问；远程传输和付费工具仍服从应用审批。只做与迁移相关的提示词调整。
- [ ] 执行 `npm run build` 后 `node node_modules/@playwright/test/cli.js test tests/browser/assistant-flow.spec.ts tests/browser/creation-flow.spec.ts tests/browser/interaction-regressions.spec.ts`，并取同状态 DOM/截图。

## Task 5：通过已有任务系统执行受限图片工具

**Files:** 新增 `src/features/assistant/{imageTaskTool,toolExecutionLedger}.ts`、`tests/unit/assistantTools.test.ts`；在 `src/domain/agentWorkflow.ts` 和既有 TaskHost 接点增补必要事件。TaskHost 接点以既有 launch-readiness T4/T5 完工代码为准，本任务不另建第二套图片队列。

**Interfaces:** submit_image_task 的 arguments 仅为 `{ prompt: string, outputCount: number, referenceAssetIds: string[] }`；执行端根据固定 project/run/connection 解析其余内容；结果 `{ taskId: string, status: "queued" | "awaiting_approval" | "unknown" }`，绝不返回伪造 asset 或“已生成”。

- [ ] T4 已 DONE；首先核对 T5 剩余运行态验收及 EXT-PROVIDER 条件。未通过则维持 tools=[]，第一交付可以独立发布。
- [ ] 写工具参数越权、未批准 remote_transfer、高成本批次、重复 call_id、重启去重、未知受理和用户取消测试；拒绝场景断言底层 submit 次数为零。
- [ ] 实现 Zod strict 参数校验，复用 requiredApprovalGates。审批绑定具体参数与参考图；参数修改后重新计算，不接受模型声称“用户已批准”。
- [ ] 持久保存 `(runId, call_id) → taskId/idempotencyKey` 和审批绑定，再调用统一 submitImageCommand/现有 TaskHost。复用 durable intent/native journal；同一 call_id 返回已存在 taskId，映射已提交但响应丢失时核对，不创建第二个 taskId，不普通 retry。
- [ ] 把 function_call_output 通过原始 call_id 回传 Responses。tools、instructions、必要 output items 每轮正确传入；memory-only reasoning context 不进可见历史。
- [ ] 执行 `node --test tests/unit/assistantTools.test.ts tests/unit/generationQueue.test.ts tests/unit/nativeTaskHost.test.ts tests/unit/imageTaskCommand.test.ts tests/unit/taskRecovery.test.ts`，以及 `task-intent.spec.ts`、`unified-image-command.spec.ts` 浏览器回归；native TaskHost 做真实 IPC 验收，再做有授权和预算的 Provider 工具回路与重开资产检查。只有修改 Gateway 时运行其相关回归，Gateway 测试不代替 Desktop 链验收。

## Task 6：评估、逐步启用与发布

**Files:** 新增 `tests/evals/astra-cases.json`、`scripts/eval-astra.mjs`（仅实现阶段添加，默认不发 live 请求）；本目录 verification.md；`docs/PROGRESS.md`、`docs/architecture/DATA-STORAGE.md`。

- [ ] 建立 30 条固定案例：需求/多轮 8、参考图与限制保留 8、错误/离线/取消 6、工具与审批 8；第一交付中工具案例期望“不执行工具”。把每例可判断的成功条件写入数据，不用模型自评替代检查。
- [ ] 先跑 mock 与数据恢复测试，再以明确连接和预算跑低流量 live；对 low/medium 各保留成功率、p50/p95、usage、模型和日期。没有 API 访问时只交付已测适配器，不声称迁移完成。
- [ ] 评估成本采用实施时官方价格与实际 usage；不把内部图片 credits 当 Astra 账单，不假定 per-token 更贵必然单任务更贵。缓存写入、工具、长输入与服务等级分别核算。
- [ ] 执行 `npm run verify`、`npm run client:check`、`cargo test --manifest-path src-tauri/Cargo.toml`、`cargo fmt --manifest-path src-tauri/Cargo.toml --check`、`npm run client:build -- --no-bundle`。
- [ ] 固定 1421 development、1423 production preview、tauri.localhost release 验证；记录命令/URL/route/import 链/runtime-mode/runtime-entry/bundle 指纹/截图/DOM/控制台异常。
- [ ] 启用顺序为隔离测试项目→单个用户项目→更多明确选择的项目。现有项目不自动改模型；真实错误率/成本异常立即关闭 assistantEnabled，保留历史和图片流程。
- [ ] 实际验收后更新 PROGRESS 和 verification，审查 scoped diff。仅在当前工作区依赖与文件归属明确后按 Task 边界提交，不执行 git add . 或将并发文件混入提交。

## 执行前尚需获取的事实

API 项目对 Astra 的访问权限、余额/限额、允许的测试预算；正式使用的连接是官方 API 还是明确兼容 Responses 的服务；最新 Figma 中助手入口的位置；T5 剩余运行态验收状态（T4 已完成）。这些不阻止完成本计划，但决定 live 验收和第二交付何时可开启。
