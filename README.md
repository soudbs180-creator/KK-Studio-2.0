# KK Studio

KK Studio 是以无限画布为中心的多模态 Agent 工作台。当前唯一有效工程目录是 `D:\kk-studio-next`；旧的 `D:\kk-studio` 已清理，不参与开发、构建或运行时写入。

## 开始开发

所有 AI 先读 [AGENTS.md](AGENTS.md) 和 [AI_RULES.md](AI_RULES.md)。你可以直接用日常语言提出想法，AI 负责转成工程需求、实现、验证和独立复核，最终用简洁中文汇报。多端分支、PR 和发布见 [BRANCH-POLICY](docs/engineering/BRANCH-POLICY.md)。新任务从 fetch 后的 origin/main 创建隔离 worktree；下方路径是本机仓库示例，不表示可以在历史 dirty 根目录直接开发。

```powershell
cd D:\kk-studio-next
npm ci
npm run git:guards
npm run dev
```

浏览器开发地址为 `http://127.0.0.1:1421`。桌面壳使用 Tauri 2：

```powershell
npm run client:check
npm run client:dev
```

Windows 桌面和项目根目录的“启动 KK Studio”快捷方式统一进入 `start-kk-studio.bat`，再由现有 `scripts/windows/desktop-release.mjs` 检查发布包新旧。源码比包新或 EXE 缺失时自动执行 `npm run client:build`，构建成功且产物检查通过后才启动 `src-tauri/target/release/kk-studio.exe`；检查或构建失败时不会继续启动旧包。包已是最新时直接进入“开始创作”页。快捷方式图标使用 `src-tauri/icons/icon.ico`，浏览器标签图标使用 Figma logo。

提交前至少执行 `npm run typecheck`、`npm run test`、`npm run lint`、`npm run format:check` 和 `npm run build`。完整浏览器回归使用 `npm run test:ui`；完整闭环使用 `npm run verify`。治理状态、任务账本和交接入口位于 `docs/governance/`。项目只使用 npm 与 `package-lock.json`。

Windows 如果终端没有 npm PATH，可直接运行 `verify-kk-studio.cmd`，它会沿用桌面启动器的 Node 24 路径并执行同一套验证。

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

## 设计和交付依据

Figma 是 UI 的唯一设计权威：[kk Figma 主画板](https://www.figma.com/design/0nU0A7pq6eyjwfwm1TtWkO/kk?node-id=404-28667)。Workspace 基线为 `404:28667`，收纳为 `410:67357`，Landing 为 `410:59708`；历史 `1:2` 不覆盖当前 Frame。仓库是代码、测试和交付文档的权威。各能力的实现与验收范围见治理账本；未接后端或未验收的能力必须标记 `Prototype / NOT VERIFIED`，不能把本地演示或构建通过描述成真实后端生成、账号服务或云端保存。

工程文档从需求到验证按 AI-native SDLC 组织，入口见 [docs/README.md](docs/README.md)。每个功能交付单元包含 intent、spec、plan 和 verification；历史截图与旧账本保存在 `docs/archive/`，不作为当前实现的事实来源。
