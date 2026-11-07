# 研究发现：AI 短剧 / 视频创作工作台品类（2026-10-26）

> 模式：`read_only_static_research`；`runtime_verified=false`；证据来源为 GitHub 公开仓库的元数据、README、目录与 package.json（检索时间 2026-10-26）。标记约定：**FACT**＝仓库公开结构/自述直接可见；**INFERENCE**＝由结构合理推断；**UNKNOWN**＝未获取。

## 1. 品类总表（7 个推荐项目，均为 2026 年新建，合计约 68.6k star）

| 项目 | 仓库 | Star | 创建 | 交付形态 | 画布底座 | Agent 形态 | 后端/存储 |
|---|---|---|---|---|---|---|---|
| Toonflow | HBAI-Ltd/Toonflow-app | 19.4k | 2026-01-29 | desktop + mobile + web + server | Vue Flow（打补丁）**FACT** | 内置 Agent + MCP 包 + 多 Agent 团队 **FACT** | bun monorepo，自更新服务器 **FACT** |
| 火宝短剧 | chatfire-AI/huobao-drama | 16.6k | 2026-01-05 | 桌面安装包 + web | 无画布，线性流程 **FACT** | 4 个分工 Agent（改编/提取/分镜/提示词）**FACT**（文章） | Nuxt 3 前端 + TS 后端 + FFmpeg 拼接 **FACT** |
| Waoowaoo | waooAI/waoowaoo | 14.7k | 2026-01-22 | web（self-hosted + cloud 双版本） | @xyflow/react 12 **FACT** | 对话式 Assistant **FACT** | Next.js 16 + Prisma/MySQL + Redis + MinIO + **Temporal** **FACT** |
| 无限画布 | basketikun/infinite-canvas | 9.1k | 2026-05-18 | web（Docker/Vercel/Render） | **自研渲染器**（依赖无画布库）**INFERENCE** | 本地 canvas-agent 接 Codex/Claude Code，经 MCP 操作画布 **FACT** | 纯前端 + IndexedDB + canvas-proxy **FACT** |
| DramaClaw | dramaclaw/dramaclaw | 6.5k | 2026-03-27 | web（self-hosted） | React 前端（库未确认）**UNKNOWN** | agent-kit（hosts + skills + manifest）**FACT** | Python/FastAPI + gateway + 许可合规体系 **FACT** |
| 影策 | ddcat-ai/open-ai-canvas | 1.4k | 2026-07-22 | web + 后端 | tldraw 5.2.5 + Excalidraw + leafer + pixi（数字人）**FACT** | yingce-agent（云端 Agent 只读阶段）**FACT**（文章） | backend + web + plugins/plugin-packages **FACT** |
| BeefTV | glanderness/BeefTV | 1.9k | 2026-09-24 | 桌面（macOS/Windows） | Excalidraw 0.18 + leafer + three **FACT** | agent-host + Skills 市场 + 工作流模板 **FACT** | React + **Go + Wails** **FACT** |

## 2. 逐项目实现解剖

### 2.1 Toonflow（19.4k★，最值得学的工程组织）

- **结构**：bun monorepo（`packageManager: bun@1.3.14`），`apps/{desktop, mobile, server, updateServer, web}`，`packages/{nodes, tools, teams, ext, skills, mcp, providers, ffmpeg, asr, i18n, startup, …}`。**FACT**
- **桌面壳用 Electrobun**（`electrobun.config.ts`），非 Tauri/Electron。**FACT**
- **插件工业化**：`nodeScaffold / toolScaffold / teamScaffold / extScaffold` 四个脚手架生成器 + `create:ext` 脚本；节点/工具/团队/扩展都是 workspace 包，`build:nodes / build:tools / build:ext / build:teams` 分别构建。**FACT**
- **Skills 是包**：`packages/skills/{canvas, v118workflow, workflow}`；`packages/mcp` 是独立 MCP server 包（含 `skills/` 与 `src/`）。**FACT**
- **补丁依赖**：`patchedDependencies` 定制 `@vue-flow/core@1.48.2`（画布底座打补丁）。**FACT**
- **治理**：AGENTS.md 20KB + CONTRIBUTING 16KB + docs/ + cspell。**FACT**
- **可学点**：脚手架化的插件/技能/团队体系；独立更新服务器（`updateServer` + `publish:update`）；五端单一 monorepo。**INFERENCE（适配性需评估）**

### 2.2 火宝短剧（16.6k★，线性流程 + 人工介入点）

- **结构**：`backend/`（TS，Hono + Mastra Agent + 可插拔多厂商 Adapter——来自二开仓库自述，上游未直读）**INFERENCE**；`frontend/` 为 Nuxt 3 **FACT**；`desktop/` 桌面端 **FACT**；CLAUDE.md 4.7KB **FACT**。
- **流程**（文章 FACT）：梗概 → 剧本生成/修改 → 提取人物/场景/道具 → 分镜 → 每镜头选视频模型生成 → FFmpeg 拼接成片。
- **4 个 AI Agent 分工**：改编、角色场景提取、分镜拆解、生成提示词；用户可在每个页面修改中间结果（如改参考图再继续）。**FACT（文章）**
- **模型**：Seedance、MiniMax、通义万相等，设置中配置文字/图片/视频模型。**FACT（文章）**
- **可学点**：阶段化流水线 + 每阶段人工确认点；桌面安装包分发（Releases）。

### 2.3 Waoowaoo（14.7k★，任务编排与版本治理的参照系）

- **结构**：Next.js 16.3 + React 19 + `@xyflow/react` 12.10 画布 + Prisma 6.19/MySQL + Redis + MinIO/S3 + NextAuth + Vercel AI SDK v6 + assistant-ui + `@modelcontextprotocol/sdk` 1.30。**FACT**
- **Temporal 1.21 持久工作流**：`dev:temporal-worker`、`temporal:worker:rollout`、`test:critical:temporal`——用 durable workflow 引擎跑生成任务编排。**FACT**
- **双版本（editions）**：self-hosted 与 cloud（`ee/` 目录）两套，`edition:prepare / check-boundaries / export-self-hosted` 脚本管边界。**FACT**
- **架构门禁脚本**：`architecture:impact`、`check-durable-kernel-budget`、`check-failure-governance`、`verify:push`、`test:conformance`；critical 测试覆盖 provider/task/temporal/billing/billing-concurrency/security。**FACT**
- **计费**：billing ledger 对账（`billing:reconcile-ledger`）、积分冻结清理。**FACT**
- **可学点**：Temporal 式持久任务编排（对照 KK FEAT-024）；"架构影响 + 内核预算"门禁脚本化；editions 双版本导出。

### 2.4 无限画布 Infinite Canvas（9.1k★，MCP 操作画布的样板）

- **结构**：`web/`（React 19.2 + zustand + antd 6 + tailwind 4 + shadcn/radix + tanstack-query + localforage + i18next）**FACT**；**依赖中无任何画布库**，画布为自研渲染 **INFERENCE**。
- **本地 Canvas Agent**：`canvas-agent/`（TS + bun，内含 94KB `codex-server.md` 与 `agent-instructions.md`）连接 Codex / Claude Code，**Agent 通过 MCP 操作当前画布**。**FACT**
- **Codex App 插件**：`plugins/infinite-canvas`，安装后自动注册 MCP 并尝试拉起本地 Agent。**FACT**
- **canvas-proxy/**：画布代理服务。**FACT（细节未读）**
- **插件系统**：URL 动态安装/启用/更新/卸载远程节点插件 + TypeScript SDK 自研节点插件。**FACT**
- **Skills**：`skills-lock.json` 锁定技能版本。**FACT**
- **数据本地优先**：API Key、画布、素材、生成记录默认存浏览器本地（IndexedDB）；提示词库内置 7 个开源来源 + 自定义 JSON，前端直连并缓存。**FACT**
- **自定义接口调用**：用户可自写生图/视频接口调用脚本，适配各类中转站。**FACT**
- **商业模式**：README 内置 API 赞助商返利链接（APIMart/Atlas/88API/Infistar/PackyCode/HeyRoute/MiniMax H3）。**FACT**
- **可学点**：MCP 画布工具契约 + skills-lock + 中转站适配脚本 + "本地 Agent 经代理操作画布"的整体模式。

### 2.5 DramaClaw（6.5k★，agent-kit 与合规体系）

- **结构**：Python（uv.lock）+ `src/novelvideo` + `frontend/`（React）+ `agent-kit/{hosts, skills, manifest.json}` + `.mcp.json` + `schemas/` + `examples/` + `deploy/`。**FACT**
- **定位**：通用 AIGC 视频引擎——漫剧、广告、电商、乙游一条流水线（剧本→成片）。**FACT（README）**
- **agent-kit**：可插拔 Agent 宿主（hosts）+ 技能 + manifest 的独立分发单元，带自己的 LICENSES/NOTICE。**FACT**
- **合规体系**：`sbom.spdx.json`（113KB）、`REUSE.toml`、`license-inventory.csv`（365KB）、`ce-allowlist.toml`、`.gitleaks.toml`、pre-commit、GOVERNANCE.md。**FACT**
- **可学点**：agent-kit 式可插拔宿主；SBOM/许可清单的门禁化（对照 KK 的二进制污染治理）。

### 2.6 影策（1.4k★，导演台与多渲染层）

- **结构**：`backend/` + `web/` + `yingce-agent/` + `plugins/` + `plugin-packages/` + `tools/` + AGENTS.md 17.8KB。**FACT**
- **画布/渲染层**：tldraw 5.2.5 + Excalidraw 0.18.1 + leafer-ui + three/react-three-fiber + pixi.js + pixi-live2d-display（数字人）+ ffmpeg.wasm + vidstack + tiptap。**FACT**
- **功能**（文章 FACT）：结构化分镜、3D 导演台（人物站位/镜头距离/构图预演）、时间线剪辑、服务端导出成片、任务队列进度查看与失败重试；云端 Agent 只读阶段。
- **测试**：bun test + Playwright e2e（`previs-p0-chrome-e2e`）+ happy-dom。**FACT**
- **可学点**：3D 导演台（three/fiber 预演构图）；多渲染层分工（tldraw 白板 + leafer 图形 + pixi 数字人）；时间线+服务端导出。

### 2.7 BeefTV（1.9k★，Agent 三段式与技能市场）

- **桌面壳**：React + **Go + Wails**（非 Tauri）。**FACT**
- **许可**：分范围——新增原创内容为 Source Available License 1.0，历史内容保持 MIT；明确禁止未授权商业转售/托管。**FACT**
- **Agent 实例**（README FACT）：一句话需求 → Agent 自建 **25 节点 / 48 连线**（剧本架构→8 镜分镜→角色/场景/首帧→视频→旁白）；"先规划→再执行→可检查可继续"，读回实际产物核对设定。
- **Skills 市场**：固定版本安装、更新、**回退历史版本**、复制为私人改写、作者投稿送审；市场标注"效果尚未验证"的诚实标签。**FACT**
- **工作流模板**：节点编排保存为模板版本（本地 v2.0.1 已有 v13/v14 成功运行记录），换素材复用编排。**FACT**
- **其他**：ffmpeg.wasm 浏览器内视频处理；`@fal-ai/client`；前端特性开关文档化（FRONTEND_FEATURE_TOGGLE.md）；媒体检查工具保存检查记录。**FACT**
- **可学点**：Agent"规划-执行-回读检查"三段式；技能版本/回退/私人化；工作流模板版本化；特性开关文档。

## 3. 二开与生态信号（需求热度验证）

| 信号 | 证据 | 含义 |
|---|---|---|
| "接本地 ComfyUI"是二开最热方向 | huobao-drama-comfyui 24★、DramaClawLocalhost 10★、mujiang-studio-tv（BeefTV+ComfyUI）、qisiTV（BeefTV+Codex/MCP）、toonflow_to_comfyui、DramaClaw-H3 等 **FACT** | 直接验证 KK FEAT-004/005（ComfyUI 出图链/工作流库）的优先级 |
| Skills 已成独立内容品类 | libtv-skills 1.2k★、screen-creative-skills 475★（31 个影视创作 Skill）、juben 169★（40+ agents）、omniailab-ai-director 53★、dream-skill（融合三大体系）**FACT** | KK FEAT-011 本地技能的产品化有现成内容生态可对接 |
| 参照系项目 | ai-shotlive 344★（自述参考 BigBanana-AI-Director / CutOS / CineGen-AI / Toonflow）、open-canvas 291★（LibTV/TapNow 开源替代）**FACT** | 逆向拆解类仓库可作后续研究对象 |
| 桌面分发 | InfiniteCanvasLauncher 5★（Windows 启动器合集）、huobao-drama-releases、BeefTV Releases **FACT** | 对照 KK FEAT-026 启动器与分享包 |
| 垂直场景 | Canvex 35★（电商无限画布）、Kinema 234★（Codex/Claude Code 驱动）、Pi-Paper 17★（local-first + MCP + 导演台）**FACT** | 电商画布与 KK 用户背景（电商视觉）相关 |

## 4. 品类共识模式（多数项目收敛的做法＝行业标准）

1. **无限画布是唯一交互范式**：7/7 皆为画布或画布+对话；节点=素材/生成任务，连线=参考/依赖关系。**FACT**
2. **Agent 经 MCP 操作画布**：无限画布（Codex/Claude Code via MCP）、Toonflow（mcp 包）、BeefTV（agent-host）、DramaClaw（agent-kit + .mcp.json）、影策（yingce-agent）。**FACT**
3. **Skills 作为方法载体**：Toonflow packages/skills、BeefTV 技能市场、DramaClaw agent-kit/skills、无限画布 skills-lock。**FACT**
4. **插件系统 + 脚手架**：Toonflow 四个 scaffold、BeefTV/影策 plugin-packages、无限画布 URL 动态安装 + TS SDK。**FACT**
5. **BYOK + OpenAI 兼容 + 多供应商**：全部支持自配 Key；无限画布进一步支持自定义调用脚本适配中转站。**FACT**
6. **本地优先 / 数据自持**：BeefTV local-first、无限画布浏览器本地、Toonflow 自部署。**FACT**
7. **前端栈收敛**：React 19 + Vite 7/8 + TS + bun/pnpm + antd/shadcn + zustand + tanstack-query + tiptap + idb/localforage；测试 bun test + Playwright；门禁 tsc + eslint + prettier。**FACT**
8. **AGENTS.md 驱动 AI 协作开发**：7/7 仓库带 AGENTS.md（9–20KB），火宝另带 CLAUDE.md。**FACT**
9. **生成执行外包**：ComfyArt 外包 ComfyUI 工作流（上一轮研究）；本品类外包云端视频/图片 API。**FACT**
10. **线性阶段流程仍有一席之地**：火宝用阶段流水线 + 4 Agent 分工 + 人工介入点，而非纯画布。**FACT**

## 5. 与 KK-Studio-2.0 的对照（事实基线，2026-10-26）

| 维度 | 品类共识 | KK 现状 | 判断 |
|---|---|---|---|
| 画布底座 | tldraw / Excalidraw / Vue Flow / xyflow / 自研（仅无限画布） | `components/canvas` 约 50 文件自研；27 个依赖无任何画布库 | **偏差**：唯一"造轮子"的一家，且违反自身 AGENTS.md 反重复造轮条款 |
| 画布交互 | 节点+连线+参考关系 | FEAT-001 创作画布 REAL（节点/连线/编辑） | 对齐 |
| Agent 操作画布 | MCP 服务端暴露画布工具 | `features/mcp` 仅客户端 2 文件（FEAT-012 PARTIAL） | **缺口**：缺"把自己暴露成 MCP 服务端"一侧 |
| Skills | 市场 + 版本 + 回退 | FEAT-011 PARTIAL（本地技能） | 半对齐：有雏形，无版本/市场 |
| 本地 ComfyUI 链 | 二开最热需求 | FEAT-004 适配器/Rust 原语"已写未接"（2026-09-21 至今） | **缺口且高优先级** |
| 持久任务编排 | Temporal / 队列 + 重试 | FEAT-024 Generation Gateway/Worker PARTIAL | 半对齐 |
| 插件 | 脚手架 + 包市场 | features/plugins PARTIAL | 半对齐 |
| 治理 | 竞品无 KK 式治理；Waoowaoo 架构门禁最接近 | AGENTS/AI_RULES/ADR/账本/十道门禁 | **KK 优势，保持** |
| 三端 | Toonflow 五端但无治理；其余 web 或单桌面 | Desktop→Web→Mobile 顺序 + 双端同态门禁 | **KK 优势，保持** |
| 平台层（账号/云同步/积分） | 纯开源竞品均无 | FEAT-017/018/019（PROTOTYPE/PARTIAL） | **KK 差异化，保持节奏** |
| 前端代次 | React 19 + Vite 7/8 + TS 7 | React 18.3 + Vite 7 + TS 5.6 | 落后一个代次，非功能阻塞 |

## 6. 证据分级与未知项

- **FACT**：仓库公开结构、依赖清单、README 自述、star/创建时间（2026-10-26 检索）。
- **INFERENCE**：无限画布画布为自研（依据依赖无画布库）；火宝后端为 Hono/Mastra（依据二开仓库自述，上游 package.json 未直读）。
- **UNKNOWN**：DramaClaw 画布库选型；各竞品真实运行行为、生成质量、计费真实性；影策 yingce-agent 实现细节。
- 全部结论 `runtime_verified=false`；文章中的案例数据（如 Toonflow 130 天开发、BeefTV 25 节点实例）为项目自述，未独立验证。
