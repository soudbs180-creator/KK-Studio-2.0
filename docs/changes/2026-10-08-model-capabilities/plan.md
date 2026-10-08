# Image Model Capabilities Implementation Plan

> For agentic workers: execute with superpowers:executing-plans; tests follow superpowers:test-driven-development. The project spec and AGENTS govern approvals and delivery.

- Task ID：TASK-MODEL-001；状态：IMPLEMENTED（本地AC与head71ddb625技术补审通过，PR当前SHA CI另验）；日期：2026-10-08。
- Goal：现有目录成为图片参数和已知限制的统一来源。
- Architecture：domain 白名单 → account-scoped catalog → shared resolver → UI/共享提交校验。
- Tech Stack：React 18 / TypeScript / Node 24 / Tauri 2；无新增依赖。
- [Intent](intent.md) · [Spec](spec.md) · [ADR](../../architecture/adr/ADR-009-image-model-capabilities.md)。
- branch：codex/TASK-MODEL-001-capabilities；worktree：`D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-MODEL-001-capabilities`。
- 开工 Base：21d121d2b884b2b7ced4a98eb0e03c590de5c3cd；最新目标 main@5dd6e6dddaf00cf2d5c14ae02ef5974c72238232；集成提交577ed3ee。开始时main clean；当前main@5dd6e6dd clean，本任务只写隔离候选。

## 开工与全局约束

已读 AGENTS、AI_RULES、PROMPTING、工程/治理/功能卡、UI_INDEX 及实际 catalog/参数/提交/请求实现。原生 worktree 工具在容器 cwd 报 Not a git repository，使用仓库已忽略目录的 Git fallback 并登记。失效回环代理仅在 fetch 命令内覆盖，未改系统设置。

锁文件 `npm ci --offline --no-audit --no-fund` 成功；Node/npm 使用现有 Node 24 工具目录；基线 lint/typecheck/全量单测日志保留在任务 worktree 的 `baseline-*.log`，结果追加到 verification。

保持 source id、凭据引用、localStorage key 和原有队列；无 ArtCraft 代码/名单复制，无外部付费调用。仅本分支写入；独立上下文 reviewer 最后只读全分支。新增可选模型声明是本任务唯一公开契约变化。

## Task 1: Model declaration and recovery

**Files:** `src/domain/imageModelCapabilities.ts`（new）、`src/features/models/modelCatalog.ts`、`src/features/models/imageModelCapabilities.ts`（new）、`tests/unit/imageModelCapabilities.test.ts`（new）。

**Produces:** ImageModelCapabilities 白名单和 `resolveImageModelCapabilities(connection, model, catalogs?)`；exact account/model 三态与有效限额。

1. 写失败测试：报告/手动恢复保留 false/zero；非法字段丢弃；同名账号/身份变化；未知旧模型；provider 不允许时不能提升；保存刷新保留手动字段。
2. `node --test tests/unit/imageModelCapabilities.test.ts`；Expected：新元数据或 resolver 断言失败，定位为缺少能力契约。
3. 最小实现解析、保存/读取归一化和 resolver；来源沿用 source。
4. 运行该测试及 modelCatalog/modelDiscovery/modelRouting；Expected：全部通过。

## Task 2: Shared submission gate

**Files:** `src/features/creation/providerSubmission.ts`、`imageTaskCommand.ts`、`src/App.tsx`、同一新增单测文件。

**Consumes:** Task 1 的 resolver；**Produces:** outputCount 可选 binding 与三类 prepare/再次提交门禁。

1. 写失败测试：已知 edit=false、0 refs、任务数量超限、普通未知兼容、租约获得后声明变化阻止提交。
2. 运行新增单测；Expected：无新限制时应暴露允许了被禁止操作的断言失败。
3. 共用校验接到所有 prepare、Web reservation 和 native submit；保持 task state/请求分块。
4. 运行新增测试和 providerSubmission/imageTaskCommand；Expected：新旧行为都通过。

## Task 3: Capability form and existing controls

**Files:** `ProviderModelCatalog.tsx`、`ImageModelCapabilityFields.tsx`（new）、`useImageModelCapabilities.ts`（new）、`ImageModelParameters.tsx`、`CanvasImageCommand.tsx`、`CreationComposer.tsx`、`GenerationOptions.tsx`、画布参考图规则相关组件、`tests/browser/model-capabilities.spec.ts`（new）、`tests/desktop/model-capabilities.mjs`（new）。

**Consumes:** exact account resolver / outputCount gate；**Produces:** 真实可保存三态表单、数量/参考图约束、明确重绘禁用原因。

1. 浏览器失败先行：保存能力、重载、切换、max count、unsupported redraw、不发送 HTTP。
2. 构建现有 bundle 后运行定向测试；Expected：缺少新控件/未阻止请求。
3. 实现并复用现有 CSS 和 shared controls；数字值严格校验，读取刷新 event/storage；旧超限草稿保留并显示原因。参考图入口/连线/重绘共用归档素材去重计数，源图与incoming相同assetId只算一张；非法或未归档引用保持拒绝。
4. 定向浏览器和既有模型/画布/提交回归；Expected：通过；追加三档 DOM/截图和实际 import chain。

## Task 4: Delivery and review

1. Desktop/Web patch bump；更新 FEAT-003、registry、PROGRESS、PROJECT_STATE、AI_HANDOFF、ledger 和生成视图。
2. `npm run verify`、`npm run client:check`、fresh Tauri production 构建和隔离 data-dir/profile 验证；Expected：相关门禁通过，无新 regression，保留原有 skips。
3. 自审并在任务分支形成可审阅提交；独立 reviewer 只读 actual base..head 与验证证据，修复阻断后重跑受影响范围。
4. 用 PR 模板准备一项逻辑目标的 PR，绑定准确 SHA 和 CI；不自动合并/发布。

## Review Focus

1. exact route/account 匹配与同名跨账号串用：owned tests 为账号、地址/凭据变化与 UI 模型切换。
2. false/0/无效输入与未知兼容：owned tests 为解析/保存/旧记录与 unsupported gate。
3. task 总数和每 HTTP n 上限的不同语义：owned tests 为 maxGenerationCount 门禁及旧批量保留。
4. await/租约/native submit 的迟到声明更新：owned tests 为 lease.assertCurrent 与入口绑定复查。
5. 上传源图计数、图边、UI 重绘与 async 状态一致：owned tests 为参考图额度、浏览器和 Tauri 阻断/恢复。

## 风险、恢复与执行记录

回滚新提交即可恢复旧 UI/校验；旧版本忽略新增可选元数据，用户项目格式无迁移。失败不清空目录/项目/原图。声明不等于真实生成实测，蒙版/扩图不因声明打开。

Pre-flight：Task 2/3 消费 Task 1；Task 3 消费 Task 2 的门禁，输出数量使用 maxGenerationCount（任务级），不得替换 maxOutputs（HTTP 级）。暂无契约冲突。

Task 1–3 已实现并完成 RED→GREEN，首轮审查MC-001已定向修正。历史5b轮完整verify/native通过已留档；融合新main@5dd后，Task4候选版本Desktop2.1.6/Web2.1.7的完整verify、client:check、final Tauri/隔离运行已通过，6da9920e独立补审PASS，MC-001关闭；最终文档head/PR/Hosted门禁以准确交付收据为准。CanvasNodeLayer 达到 317 行时触发 UI check，按职责拆出原参考图映射为 canvasReferences.ts；不是额外界面重构。发现的原主线开发插件错误登记 TASK-PLUGIN-DEV-001，本任务不接管插件修复。文本模型和单张重绘兼容缺陷均有失败先行修正，见 verification。

实施/测试/裁决与结果持续记录在 [verification](verification.md)，不得因上下文恢复重做已完成步骤。

## Hosted增量修正计划

第一轮PR浏览器出现本任务用例1flaky，先保存原始证据再调查。新增受控事件RED，修正无变化通知覆盖草稿；按独立预审补齐family/variant/aliases真实值依赖与仅显示字段刷新RED。重新构建production，定向8例重复且禁retry，再完整1423 verify、clientcheck/fresh Tauri/隔离验收、三档Web及development局部证据、源码指纹、已提交HEAD独立补审和PR当前SHA CI。原CI现场仅按钮局部DOM，原单次flaky的唯一因果仍UNKNOWN，不冒称已证实。
