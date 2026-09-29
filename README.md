# KK Studio 2.1.0

KK Studio 是以无限画布为中心的多模态 Agent 工作台。本机唯一工程目录为 `D:\kk-studio\KK-Studio-2.0`。2.0.0 是融合基线，当前版本为 2.1.0；当前能力和未完成项以治理账本为准。

2.1.0 源码已通过 [PR #9](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/9) 合入 `main`。桌面 ZIP 和源码 ZIP 仍待构建与验收，通过后放入 `releases/2.1.0/` 供分享。不要直接压缩整个开发目录：`.git` 是历史，`node_modules` 是开发依赖，`src-tauri/target` 是可生成产物，用户项目和恢复归档也不属于分享内容。分享包使用说明见 [RELEASE.md](RELEASE.md)。

- [环境要求](#环境要求)
- [安装步骤](#安装步骤)
- [使用示例](#使用示例)
- [常用命令](#常用命令)
- [代码边界](#代码边界)
- [数据和文件放在哪里](#数据和文件放在哪里)
- [贡献指南](#贡献指南)
- [设计和交付依据](#设计和交付依据)

## 环境要求

| 组件 | 要求 | 用途 |
| --- | --- | --- |
| Node.js | `>= 24`（见 `package.json` 的 `engines`） | Web 开发、构建、单测、脚本 |
| npm | 随 Node 自带 | 唯一包管理器，锁文件为 `package-lock.json`，不使用 pnpm/yarn |
| Rust 工具链 + Tauri 2 CLI | 稳定版 | 仅桌面壳：`client:check` / `client:dev` / `client:build` |
| WebView2 Runtime | Windows 常驻运行时 | 运行桌面 EXE 的前置条件 |
| Playwright + Edge/Chromium | `npm run test:ui` | 浏览器端到端回归（不跑 UI 回归可不装） |
| 操作系统 | Windows 为当前主验证平台 | Web 三档断点同样在浏览器验证 |

所有 AI 先读 [AGENTS.md](AGENTS.md) 和 [AI_RULES.md](AI_RULES.md)。你可以直接用日常语言提出想法，AI 负责转成工程需求、实现、验证和独立复核，最终用简洁中文汇报。多端分支、PR 和发布见 [BRANCH-POLICY](docs/engineering/BRANCH-POLICY.md)。

## 安装步骤

### 1. 获取源码

```powershell
git clone https://github.com/soudbs180-creator/KK-Studio-2.0.git
cd KK-Studio-2.0
```

新任务不要直接在 `main` 上开发：从 fetch 后的 `origin/main` 创建隔离 worktree，详见[贡献指南](#贡献指南)。下方路径是本机仓库示例，不表示可以在历史 dirty 根目录直接开发。

### 2. 安装依赖

```powershell
npm ci
```

`postinstall` 会自动串联 `agent:install`、`agent:build`、`plugins:install`、`plugins:build`，即安装并编译 `vendor/canvas-agent` 与 `vendor/canvas-plugins`。这一步耗时较长，不要中断；失败时先看 `vendor/` 下对应子工程的 `npm ci` 输出。

### 3. 安装 Git 保护钩子

```powershell
npm run git:guards
```

本地钩子只是补充防线，不能替代远端 ruleset 保护。

### 4. 启动并自检

```powershell
npm run dev          # 浏览器打开 http://127.0.0.1:1421
```

首次启动时确认页面加载的是当前源码：`index.html` 指向 `/src/main.tsx`，而不是旧的 `dist/assets/index-*.js`。端口固定为 1421（`strictPort: true`），被占用时不会自动切换。

### 5. 桌面客户端（可选）

```powershell
npm run client:check   # cargo check
npm run client:dev     # tauri dev
```

Windows 桌面和项目根目录的“启动 KK Studio”快捷方式统一进入 `start-kk-studio.bat`，再由现有 `scripts/windows/desktop-release.mjs` 检查发布包新旧。源码比包新或 EXE 缺失时自动执行 `npm run client:build`，构建成功且产物检查通过后才启动 `src-tauri/target/release/kk-studio.exe`；检查或构建失败时不会继续启动旧包。包已是最新时直接进入“开始创作”页。快捷方式图标使用 `src-tauri/icons/icon.ico`，浏览器标签图标使用 Figma logo。启动器的完整行为见 [LAUNCHER.md](docs/engineering/LAUNCHER.md)。

Windows 如果终端没有 npm PATH，可直接运行 `verify-kk-studio.cmd`，它会沿用桌面启动器的 Node 24 路径并执行同一套验证。

## 使用示例

### 示例一：Web 工作台日常开发

```powershell
cd D:\kk-studio\KK-Studio-2.0
npm run dev
```

打开 `http://127.0.0.1:1421`，典型链路是：**首页 Start → 对话 Composer → 画布 Canvas → 结果继续编辑**。首页、对话、画布共用同一套 Design System 1.3 输入控件（`ComposerTextarea` + `composer.css`），附件和型号参数进入流布局，三档断点下自动分行。

### 示例二：桌面客户端（Tauri）

```powershell
npm run client:build       # 生成 src-tauri/target/release/kk-studio.exe
npm run client:build:agent # 打包随包 Agent 运行时
```

桌面版使用 `%APPDATA%\kk-studio\` 作为数据根目录；API Key 只进 Windows Credential Manager（service `com.kkstudio.provider`）。移动或重命名文件夹不会迁移用户数据。

### 示例三：连接本机 Codex Agent

```powershell
npm run dev:agent
```

`scripts/agent/dev.mjs` 会先占用本地端口（默认 17381，可用 `KK_AGENT_PORT` 覆盖），生成一次性内存 Token，等 `/health` 通过后再拉起 Vite，并注入 `KK_AGENT_URL` / `KK_AGENT_TOKEN`。启动成功后访问 `http://127.0.0.1:1421`，打开项目即自动复用本机已有的 Codex 登录。

```powershell
# 只启动 Agent 服务，不启动前端
npm run agent

# 端口自定义
$env:KK_AGENT_PORT = "18080"; npm run dev:agent
```

### 示例四：以 MCP 方式接入外部客户端

```powershell
npm run agent:mcp
```

等同于 `node vendor/canvas-agent/dist/index.js mcp`，以 stdio 方式提供 MCP 服务，支持读取/移动画布视口、单/多/空选择与恢复。接入外部 MCP 客户端时，令牌与地址只走进程环境，不要写进配置文件或仓库。

### 示例五：本地生成网关与代理

```powershell
# 生成网关：配置里不含密钥，凭据只由环境变量注入
$env:KK_GATEWAY_SESSION = "<session-token>"
$env:KK_OWN_API_CREDENTIAL = "<provider-key>"
npm run gateway -- config/generation-gateway.example.json
# 输出：KK Generation Gateway listening on 127.0.0.1:4318

# 画布代理：默认 127.0.0.1:23210
npm run proxy
```

示例配置见 `config/generation-gateway.example.json`。`rejectSecrets` 会拒绝配置中出现明文密钥；缺失的环境变量会直接让进程启动失败。

### 示例六：提交前完整验证

```powershell
npm run typecheck
npm run test
npm run lint
npm run format:check
npm run build
```

完整浏览器回归使用 `npm run test:ui`；完整闭环使用 `npm run verify`（包含 lint、typecheck、test、ui:check、format:check、test:ui）。治理状态、任务账本和交接入口位于 `docs/governance/`。

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | Vite 开发服务器，`http://127.0.0.1:1421` |
| `npm run build` / `npm run preview` | 生产构建与预览 |
| `npm run dev:agent` | 本机 Agent + 前端联调（默认 17381） |
| `npm run agent` / `npm run agent:mcp` | 单独启动 Agent 服务 / MCP stdio 模式 |
| `npm run gateway -- <config.json>` | 本地生成网关（配置不含密钥） |
| `npm run proxy` | 画布代理（默认 23210） |
| `npm run typecheck` | TypeScript 全量类型检查 |
| `npm run test` | Node 单测（`tests/unit/*.test.ts`） |
| `npm run test:ui` | Playwright 浏览器回归 |
| `npm run ui:check` | UI 规范静态检查 |
| `npm run client:check` / `client:dev` / `client:build` | Tauri 桌面壳检查 / 开发 / 构建 |
| `npm run features:check` / `governance:check` / `markdown:check` | 功能卡、任务账本、Markdown 链接门禁 |
| `npm run verify` | 提交前完整闭环 |
| `npm run git:guards` | 安装本地 Git 保护钩子 |

## 代码边界

```text
src/
  App.tsx                 # 工作台壳、路由和会话级状态
  components/             # 按页面和交互拆分的 UI
  domain/                 # 纯领域类型、Zod schema 和本地示范数据
  integrations/           # 外部模型/API adapter；不保存凭据
  runtime/                # 运行时契约和存储 key 常量
  styles/                 # 全局令牌、响应式和工作台样式
src-tauri/
  src/main.rs             # 桌面启动和 command 注册
  src/storage_paths.rs    # 桌面数据目录与旧文件保留
public/design/figma/      # Figma 导出的 UI 图标和占位资源
public/fixtures/demo/     # 可播放、可编辑的本地演示素材
design/figma-plugin/      # 可编辑 Figma 补充稿插件源码
tests/                    # 单元测试与 browser 回归
docs/                     # 当前规范、架构、计划和验证证据
```

## 数据和文件放在哪里

代码仓库只放源码、设计导出资源、演示素材、schema、测试和脱敏文档。模型权重不进 Git，也不复制到仓库。

桌面客户端的运行时根目录是 `%APPDATA%\kk-studio\`（由 Tauri `dirs::data_dir()` 决定），并按 `app/`、`providers/`、`profile/`、`memory/`、`projects/`、`conversations/`、`assets/`、`models/`、`comfyui/`、`tasks/`、`cache/`、`backups/` 和 `logs/` 分区。API Key 只进 Windows Credential Manager；JSON、SQLite、浏览器 localStorage、URL 和日志都不得保存密钥。模型权重继续使用用户选定的 ComfyUI/模型目录，客户端只保存路径、类别、大小、mtime 和 hash 等索引信息。

Web 的项目、任务、创作消息与素材使用 IndexedDB 本地持久化；localStorage 保存非敏感 UI 设置、供应商元数据和恢复副本。Desktop 创作快照与素材使用原生文件仓库。这些本地能力不代表云端同步；用户账号、记忆和云保存等未接真实服务的能力保持 Prototype 或禁用。准确存储键、恢复和失败保护边界见下方存储契约。

完整数据分类、schema、迁移和删除策略见 [docs/architecture/DATA-STORAGE.md](docs/architecture/DATA-STORAGE.md) 与 [docs/architecture/DATA-CLASSIFICATION.md](docs/architecture/DATA-CLASSIFICATION.md)。

## 贡献指南

完整流程见 [CONTRIBUTING.md](CONTRIBUTING.md)；AI 协作规则见 [AGENTS.md](AGENTS.md)、[AI_RULES.md](AI_RULES.md)、[SDLC](docs/engineering/SDLC.md)、[分支规则](docs/engineering/BRANCH-POLICY.md)、[审核](docs/engineering/REVIEW.md) 和 [开发环境](docs/engineering/DEVELOPMENT.md)。

### 1. 开工前

1. 读 `docs/governance/PROJECT_STATE.md`（当前事实）与 `docs/features/README.md`（功能现状），再读 `docs/governance/task-ledger.json`（任务现状）。
2. 从最新 `origin/main` 创建隔离 worktree，一个逻辑目标一个分支一个 PR；分支命名 `<type>/<TASK-ID>-<description>`。
3. 不要在历史 dirty 根目录直接开发，不要 `reset` / `clean` / `stash` 或广泛 stage 他人改动。

### 2. 实现约束

- 技术栈固定：React 18 + TypeScript strict + Vite；桌面壳 Tauri 2；Node 24；npm 锁文件唯一。
- 新功能优先按 `src/features/<feature>` 拆分；组件超过 300 行按职责拆分。
- UI 必须消费 [Design System](docs/DESIGN-SYSTEM.md) 的 tokens；每个可见控件要么有真实行为，要么显示禁用原因；异步操作必须覆盖 loading / success / error / cancel / 离线。
- 凭据只进系统凭据库或请求内存，禁止进入 localStorage、项目文件、导出包、URL 和日志。
- 新增功能先在 `docs/features/` 建卡片并更新 `features.registry.json`，再实现；看板由 `npm run features:write` 生成，禁止手改。

### 3. 交付包

一次需求交付应包含 `docs/templates/` 下的 intent、spec、plan、verification、review，放入对应日期的 `docs/changes/<date>-<task>/`。没有验证证据不得把功能标为 `REAL`，按实际情况标 `PARTIAL` / `PROTOTYPE` / `NOT VERIFIED`；占位 UI、硬编码账号或本地 demo 不能描述成真实服务。

### 4. 提交门禁

| 门禁 | 命令 | 说明 |
| --- | --- | --- |
| 类型 | `npm run typecheck` | 全量 `tsc --noEmit` |
| 单测 | `npm run test` | Node 内置 test runner |
| 静态检查 | `npm run lint` | ESLint + 治理/功能/Markdown 门禁 |
| 格式 | `npm run format:check` | Prettier |
| UI 规范 | `npm run ui:check` | UI 标准静态检查 |
| 浏览器回归 | `npm run test:ui` | Playwright |
| 桌面路径 | `npm run client:check` | 受影响原生路径必跑 |
| 完整闭环 | `npm run verify` | 以上全部 |

### 5. PR 与合并

- 使用 `.github/PULL_REQUEST_TEMPLATE.md`，一项逻辑目标一个 PR；默认 squash merge。
- 合并后核对 PR / head / main 的 SHA 与完整项目树；`main` 禁止 direct push 和 force push。
- UI 改动必须给出实际启动命令、URL/端口、运行模式（Vite dev / preview / Tauri release）、当前 route 与同状态 DOM/截图证据；代码 diff 和构建通过不能代替浏览器验证。
- 合并前同步 `docs/PROGRESS.md`、任务账本和受影响的功能卡片。

## 设计和交付依据

颜色、字阶和基础组件以 [Design System 1.3](docs/DESIGN-SYSTEM.md) 为现行规范；页面布局和图标资产依据 [kk Figma 主画板](https://www.figma.com/design/0nU0A7pq6eyjwfwm1TtWkO/kk?node-id=404-28667)。Workspace 基线为 `404:28667`，收纳为 `410:67357`，Landing 为 `410:59708`；历史 `1:2` 不覆盖当前 Frame。仓库是代码、测试和交付文档的权威。各能力的实现与验收范围见治理账本；未接后端或未验收的能力必须标记 `Prototype / NOT VERIFIED`，不能把本地演示或构建通过描述成真实后端生成、账号服务或云端保存。

工程文档从需求到验证按 AI-native SDLC 组织，入口见 [docs/README.md](docs/README.md)。每个 PR 的交付包包含 intent、spec、plan、verification 和 review；历史截图与旧账本保存在 `docs/archive/`，不作为当前实现的事实来源。
