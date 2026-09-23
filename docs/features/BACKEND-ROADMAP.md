# 本地演示后端化路线图

- 状态：现行
- 最近更新：2026-09-21
- 关联任务：BACKEND-IMAGE-PARAMS（透传已实现，双端验收未完成）、BACKEND-TEXT-NODE、BACKEND-MEDIA-001、T6、BACKEND-MCP-AUTO、T8、BACKEND-PLATFORM、T9、T10、T12、BACKEND-ASTRA-001
- 功能状态看板：[`README.md`](README.md)；任务权威：[`../governance/task-ledger.json`](../governance/task-ledger.json)

## 目标

把所有“UI 已显示但只有本地演示”的能力，逐波次接入真实后端，达到 REAL。原则：

1. **先打通链路，再接付费服务**：不依赖外部 Key/服务器的先做；需要 Key 的，代码链路先就绪、用户填 Key 即可用；需要部署的平台服务放最后。
2. **复用，不新建第二套**：所有模态统一走 FEAT-002 的任务宿主、连接门禁、journal、幂等、取消、素材归档；不得为视频/音频另起队列。
3. **替换 seam，不混用状态**：每接通一个模态，就从 `useLocalGeneration`（FEAT-025）移除该模态的演示分支，真实与演示结果不得同态展示。
4. **Web 与 Desktop 分别验收**：浏览器验证不替代 Tauri/WebView 运行态；证据不足只能标 PARTIAL。
5. **每个功能一张卡 + 一个账本任务**：状态变化先改代码与证据，再更新 registry/卡片/账本。

## 波次

### Wave 1 — 本地可完成，无外部依赖（最高优先）

| 顺序 | 功能 | 任务 | 做什么 | 验收依赖 |
| --- | --- | --- | --- | --- |
| 1 | FEAT-003 图片参数 | BACKEND-IMAGE-PARAMS | 比例/清晰度→供应商 size，双链路透传 | PARTIAL：双端参数运行验收与模型尺寸约束 |
| 2 | FEAT-008 文本节点 | BACKEND-TEXT-NODE | Web/原生 TaskHost 流式、取消、编辑保存及重载已通过本机 HTTP fixture | PARTIAL：实际 Provider 与完整进程恢复/health 验收 |
| 3 | FEAT-004 ComfyUI 出图 | T6 | invoke 桥接 Rust `comfyui_*`，接入 submitImageCommand，工作流执行/取消/恢复 | 用户本机 ComfyUI（EXT-COMFY）做终验 |
| 4 | FEAT-012 MCP 自动调用 | BACKEND-MCP-AUTO | 工具发现、授权、自动调用编排、结果回填 | 第三方 MCP 服务器做终验 |
| 5 | FEAT-006/007 视频/音频链路 | BACKEND-MEDIA-001 | provider 抽象 + 异步作业轮询 + 参数透传 + 结果归档 | 供应商 Key/额度（EXT-PROVIDER）做付费终验，代码先行 |
| 6 | FEAT-013 连接器 | TASK-CAP-001 / TASK-MINIMAX-001 | 连接器 registry、安装/启用生命周期 | 真实连接器终验 |

### Wave 2 — 桌面后端整合与持久化

| 功能 | 任务 | 做什么 |
| --- | --- | --- |
| FEAT-024 Gateway 与 Rust TaskHost 分工 | T8 | 定 Core 职责边界：桌面是否内置/托管 Node Gateway，统一队列与持久层，避免两套引擎 |
| FEAT-002 原生 TaskHost 运行态 | T5 | 隔离 Tauri 下进程重启/恢复与 health 回写；文本并发已由原生 jobs 管理，WebView 重载不能释放仍执行的原生任务占用 |
| FEAT-021 应用内代理 | BACKEND-PLATFORM（桌面部分） | reqwest 代理配置、loopback 例外、凭据安全、连通性校验 |
| FEAT-015 Web 项目包 / FEAT-019 本地容量 | T9 | Web 容量/离线/跨 origin 项目包，收掉 Web 上的 Desktop 专属失效入口 |
| FEAT-026 安装包 | T7 | Desktop 安装、恢复、回滚实机验收 |

### Wave 3 — 平台服务（需要服务器/部署/外部授权）

| 功能 | 任务 | 前置 |
| --- | --- | --- |
| FEAT-017 账号与登录、FEAT-018 积分计费 | BACKEND-PLATFORM、T10/T10-PREP | VPS、域名/DNS、身份服务、HTTPS、计费集成 |
| FEAT-019 云端保存/同步、FEAT-020 长期记忆 | BACKEND-PLATFORM、T9/T10 | 身份体系、云存储、隐私与保留策略 |
| 旧 Web/Vercel 退役切换 | T11 | 旧部署权限 |
| FEAT-027 Astra | BACKEND-ASTRA-001 | 产品定义 + 平台后端 |

### Wave 4 — 形态扩展

| 功能 | 任务 | 前置 |
| --- | --- | --- |
| FEAT-028 Mobile | T12 | 运行形态产品决策、共享 Core 契约（T8） |

## 推进规则（任何 AI 照做）

- 领一个 Wave 1 任务：先建/更新 `docs/changes/<date>-<task>/` 的 intent/spec/plan，再改代码，最后补 verification/review、卡片状态和账本。
- 任务分支命名 `<type>/<TASK-ID>-<desc>`；main 禁直推；未获授权不提交不推送（当前整合分支保持用户控制的提交节奏）。
- 每完成一个模态，更新 `features.registry.json` 状态并 `npm run features:write`；门禁会拦截“标 REAL 但无对应平台运行证据或 DONE/PASS 任务”的造假。
- 外部条件未具备时，本地可完成部分照做并标 PARTIAL + NOT VERIFIED，不得整体标 BLOCKED 后停摆。

## 依赖口径勘误（2026-09-22）

Wave 1 表示可先推进本地实现，不能把 T5 的代码存在等同于其运行验收完成。T5 的未验收项若影响该功能，最终 REAL/完成结论必须等待对应验收；Wave 2 是剩余原生验收归组，不是禁止 Wave 1 开工。账本 dependencies 目前也包含来源关联，不能机械要求所有历史依赖 DONE；真正硬前置应在 acceptance 明确，未来结构化之前以相关 spec/验收为准。

功能卡人工维护，README/TASK_LEDGER 是生成视图。features 门禁仅证明结构与证据引用存在，证据内容/同态真实性仍需独立审核；不能宣称静态脚本证明产品或 AI 永远正确。
