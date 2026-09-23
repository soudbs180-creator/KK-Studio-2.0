# Spec：功能体系与图片参数后端化样板

- Task ID：FEATURE-SYSTEM / BACKEND-IMAGE-PARAMS
- 状态：IMPLEMENTED
- 日期：2026-09-21
- Intent / 账本：见 intent.md；ADR-001、ADR-002
- Source of truth：功能状态以 `docs/features/features.registry.json` 为权威；任务以 `docs/governance/task-ledger.json` 为权威；不另写冲突副本。

## 用户行为与入口

- 任意 AI/开发者打开仓库：从 AGENTS.md → docs/features/README 看板 → 功能卡片，即可定位入口、代码、测试、证据、状态与待办。
- 新增功能：复制卡片模板 → registry 登记 → 关联/新建账本任务 → features:write → 实现 → 证据 → 升状态。
- 图片参数：图片节点参数弹层选择比例与清晰度，生成时真实生效；“自适应”使用供应商默认；视频参数仍为草稿（视频未后端化）。

## 架构、数据与权限

- `scripts/features/registry.mjs` 导出 validateFeatures/renderFeatures；`scripts/check-features.mjs` 是 CLI，`--write` 生成 README。
- 图片参数映射集中在纯函数模块 `src/domain/imageParameters.ts`，TS 与 Rust 不重复映射：TS 算出 `WxH` 字符串，Rust 仅透传。
  - 清晰度长边：1K=1024、2K=2048、4K=4096；按比例定向，短边对齐到 8 的倍数并夹在 256–4096。
  - 自适应或非法比例：返回 undefined（不传 size，保持供应商默认）。
- 数据流：节点 parameters → CreateProjectInput.imageSize → CreationTask.imageSize →
  - Web：generateImages → requestImageChunk（JSON body 与 multipart 都带 size）；
  - Desktop：NativeTaskHostRequest.size → Rust TaskHostRequest.size（camelCase）→ JSON/multipart。
- 无凭据变化、无新增数据外发；size 是非敏感参数。

## 平台能力

| 能力 | Desktop | Web | Mobile | 降级/禁用理由 |
| ---- | ------- | --- | ------ | ------------- |
| 功能卡片/门禁 | 适用 | 适用 | 适用 | 仓库级，与端无关 |
| 图片 size 透传 | 真实（Rust 透传） | 真实（fetch 透传） | 无原生端 | Mobile 未实现（T12） |
| 视频/音频/平台服务 | Prototype | Prototype | 无 | 见路线图 Wave 1/3 |

## 验收映射

| AC | 预期 | 检查环境 | 证据 |
| -- | ---- | -------- | ---- |
| AC1 | features:check 零违规，看板为生成结果 | Node 24 | verification.md |
| AC2 | 非 REAL 功能均挂开放任务 | 门禁脚本 | 脚本 + registry |
| AC3 | 路线图覆盖全部演示/计划功能 | 文档评审 | BACKEND-ROADMAP.md |
| AC4 | size 在 Web/Rust 两条路径透传，单测通过 | node:test、cargo check | imageParameters.test.ts、cargo check |
| AC5 | 规则入口更新，typecheck/单测/构建通过 | npm | verification.md |

## 风险和决策

- 供应商尺寸集合不同：发送通用 WxH，报错即真实错误；后续可按供应商能力吸附（记入 FEAT-003 差距）。
- 本轮不实现视频参数透传，UI 仅移除图片侧“草稿”误导文案。
