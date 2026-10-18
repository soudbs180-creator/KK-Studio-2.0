# 编码规范

本文件定义 KK Studio 的源码约束：命名、文件边界、模块依赖、错误处理和状态管理。

本文分两类条目：**有门禁的**在下表与各节「硬约束」中列出，**靠评审执行的**在正文中显式标注「约定（评审执行，无门禁）」。未标注即视为有门禁，发现标注与实际不符时以脚本为准并修正本文。

结构与命令见 [DEVELOPMENT](DEVELOPMENT.md)，流程门禁见 [SDLC](SDLC.md)，UI 视觉与组件契约见 [`../UI_INDEX.md`](../UI_INDEX.md)。

## 门禁映射

当前已承接 `npm run health:check` 与 `npm run footguns:check`，并接入 lint。两者基于主线配置的独立开关运行，当前 advisory；执行输出不能冒充 blocking 已启用。函数/文件规模棘轮、差异范围、静态例外和 Windows 模式规则见 [DEVELOPMENT](DEVELOPMENT.md#代码健康棘轮与-windows-不安全模式扫描)。不为本轮 UI 改动放宽阈值或补白名单。Actions 固定到主线已审 SHA；同步其输入契约。

写代码前先确认要满足哪条门禁。以下命令都在仓库根执行，全部已并入 `npm run lint` 或 `npm run verify`。

| 门禁                   | 命令                                                              | 拦截内容                                                                                                                                            |
| ---------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint                 | `eslint src tests scripts *.config.{ts,mjs} --max-warnings 0`     | 未使用变量（`^_` 前缀豁免）、`debugger`、TS 推荐规则集错误                                                                                          |
| 架构边界               | `node scripts/check-governance.mjs`                               | `src/domain` 依赖 UI/宿主层、服务端专用模块被浏览器侧引用                                                                                           |
| UI 标准                | `node scripts/check-ui-standards.mjs`                             | 未定义 CSS 令牌、新增颜色字面量、新增 Lucide 直连、组件超 300 行、Iconsax 绕过 `UiIcon`                                                             |
| DESIGN.md 一致性 | `npm run design:check` / `npm run design:lint` | 当前 tokens.css 的生成漂移、YAML/引用/章节错误及固定版本官方格式校验；已并入 ui:check |
| 类型                   | `tsc --noEmit`                                                    | 类型错误                                                                                                                                            |
| 格式                   | `prettier --check`                                                | 格式偏差                                                                                                                                            |
| Markdown 链接          | `node scripts/check-markdown.mjs`                                 | 断链、跨仓库链接                                                                                                                                    |
| 文档索引与 ADR 编号    | `node scripts/check-doc-index.mjs`                                | `docs/{engineering,architecture,governance}/` 下的 `.md` 未在 `docs/README.md` 索引、ADR 编号重复、ADR 文件名不合规、重建已废止的 `docs/decisions/` |
| 文档命令引用           | `node scripts/check-doc-commands.mjs`                             | 文档中引用的 `npm run` 脚本在 `package.json` 中不存在                                                                                               |
| 代码健康棘轮 | `npm run health:check` | 只评变化文件；新增单元须达标，超标存量只许变小；主线 ENFORCEMENT 为 blocking 时拦截未豁免增长，配置缺失同样失败关闭 |
| Windows 不安全模式 | `npm run footguns:check` | 扫描变化脚本与 workflow 中的不安全模式；主线 FOOTGUNS_ENFORCEMENT 独立决定 advisory/blocking/off，缺失回退 blocking |
| 文档生命周期与时间冲突 | `npm run snapshot:check`                                          | 当前治理文档的稳定 `docId`、`updatedAt`、`source`、`status`、`supersededBy` 缺失/冲突，以及重复 `current` 入口                                      |
| 代码健康棘轮与 Windows 不安全模式 | 是 | `npm run lint` 顺序执行；两个总开关仅读主线配置，不能由任务分支自行放宽 |
| 交付包完整性           | `node scripts/check-delivery-completeness.mjs`                    | 本次 diff 触及的交付包缺 intent/spec/plan/verification/review 任一件                                                                                |
| 任务账本               | `node scripts/check-governance.mjs`                               | 账本与 `TASK_LEDGER.md` 不同步、状态字段缺失                                                                                                        |
| 平台交付与最小 AI 链路 | 人工评审：`AGENTS.md`、`PROJECT_GOALS.md`、`ADR-011` 与功能卡证据 | 当前没有自动 guardrail；检查 Desktop → Web → Mobile 顺序、UI/交互与文本/图片链路、Mobile 目录隔离、VPS 控制面状态，不能仅凭 lint/verify 宣称通过    |
| UI 体积预算 | 同版本生产构建、gzip 与输入 SHA 的人工量测/评审 | 主入口 JS gzip 增量上限见下节；当前没有自动脚本，不因 lint exit 0 声称预算已检查 |

格式范围同时覆盖独立预览 design/preview 下的 TS、TSX、CSS、HTML 和 JSON。设计工具依赖仅用于开发：yaml 保留 AST/注释，postcss 解析真实 CSS 作用域，固定 @google/design.md 提供官方 lint/export/spec/diff；不进入产品 import 链或原生运行时白名单。

### 门禁接入状态

| 门禁                | 是否并入 `npm run lint` | 说明                                                                                                                              |
| ------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 文档索引与 ADR 编号 | 是                      | 全库静态校验，无历史欠账                                                                                                          |
| 文档命令引用        | 是                      | 全库静态校验，无历史欠账                                                                                                          |
| 交付包完整性        | **否**，需显式执行      | 依赖 `origin/main...HEAD` diff。本分支存在 7 个早于本门禁的历史缺件包，属存量欠账；清零或标注 `legacy-incomplete` 后再并入 `lint` |

**ESLint 实际覆盖范围小于命令字面**：`eslint.config.mjs` 的 `files` 为 `src/**/*.{ts,tsx}`、`tests/**/*.ts`、`scripts/**/*.mjs`、`*.config.{ts,mjs}`。因此：

- `tests/` 下的 `.mjs` 与 `.ps1` **不受 ESLint 约束**——实测 `tests/desktop/` 19 个、`tests/local-service/` 2 个、`tests/support/` 1 个、`tests/deploy/` 2 个文件全部未被检查。给这些文件加未使用变量不会报错。
- `.tsx` 只在 `src/` 下生效，`tests/` 中的 `.tsx` 不被覆盖。
- 调整 `files` glob 属代码改动，需单独授权；在此之前，改动上述不受检文件要靠自检与评审。

`eslint.config.mjs` 当前 ignore：`node_modules/`、`dist/`、`.worktrees/`、`src-tauri/`、`docs/`、`.tmp/`、`tmp/`、`test-results/`、`design/`、`public/`。`docs/` 不参与 lint，Markdown 由 `check-markdown.mjs` 单独校验。

## 目录职责与依赖方向

`src/` 六个一级目录各自职责固定。下表「当前实际依赖」一列是**实测存量现状**，不是门禁，也不是推荐目标。

| 目录               | 职责                                                                           | 门禁强制的依赖约束                                                            | 当前实际依赖（实测）                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/domain`       | 纯领域模型与规则                                                               | 禁React、Tauri、`components`、`features`、`integrations`、`styles`、Node 内置 | 存在 2 处导入 `runtime/storage-contract.ts`（`modelProvider.ts`、`settings.ts`），门禁**允许**（禁令列表不含 runtime）                                          |
| `src/components`   | 展示组件                                                                       | 无                                                                            | 178 处导入 `features`（涉及 101 个文件）、7 处导入 `runtime`（`AccountPopup`、`TopBar`、4 个 settings 文件、`useAssetCollections`）。与 features 为**双向**依赖 |
| `src/features`     | 业务能力（agent、creation、mcp、local-service、generation-server、prompts 等） | `generation-server/**` 与 local-service 五个 server 文件不得被浏览器侧导入    | 导入 `components`、`domain`、`integrations`、`runtime`                                                                                                          |
| `src/integrations` | 外部系统适配                                                                   | 无                                                                            | 少量导入 `features`                                                                                                                                             |
| `src/runtime`      | 宿主运行时桥接                                                                 | 无                                                                            | 被 domain、components、features 导入                                                                                                                            |
| `src/styles`       | token 与全局样式                                                               | 无业务依赖（CSS 无 import）                                                   | 不适用                                                                                                                                                          |

### 硬约束：领域层纯净

`scripts/governance/import-boundaries.mjs` 强制 `src/domain/**` 不得 import 或 require：

- `src/components`、`src/features`、`src/integrations`、`src/styles` 下任何路径
- `react`、`react-dom`、`@tauri-apps/*`
- Node 内置模块（`node:*`、`fs`、`path` 等）

**注意**：禁令列表**不含 `src/runtime`**。`src/domain/modelProvider.ts` 与 `src/domain/settings.ts` 当前导入 `runtime/storage-contract.ts` 是门禁允许的既有做法，不是违规。新增 domain → runtime 依赖不会报错，但也应保持克制——runtime 属宿主边界，只有存储契约这类纯常量级内容适合下沉到 domain 可消费的位置。

领域逻辑必须能在无 DOM、无宿主环境下被单元测试直接执行。需要平台能力时用参数注入，不在领域层调用宿主 API。

### 硬约束：服务端专用模块

以下文件只能在服务端上下文运行，浏览器侧与共享代码不得 import：

```
src/features/local-service/main.ts
src/features/local-service/manifest.ts
src/features/local-service/server.ts
src/features/local-service/session.ts
src/features/local-service/store.ts
src/features/local-service/standaloneRoot.ts
```

`src/features/generation-server/**` 同样受此约束。违规信息形如 `browser/shared source cannot import server-only ...`。

## 文件规模边界

### 已被门禁覆盖

`src/components/**/*.tsx` 超过 **300 行**由 `check-ui-standards.mjs` 直接报错。这条是硬门禁，不是建议。

### 尚未被门禁覆盖的存量

实测：`src/` 下 `.ts`/`.tsx` 超过 300 行的文件共 **32 个，其中 0 个被门禁覆盖**（当前 `src/components/**/*.tsx` 无一超限，说明该规则已被遵守）。全部属已知技术债，只能靠评审约束。

排名前十：

| 文件                                           | 行数 |
| ---------------------------------------------- | ---- |
| `src/App.tsx`                                  | 3152 |
| `src/features/generation-server/repository.ts` | 1063 |
| `src/features/creation/model.ts`               | 972  |
| `src/features/agent/agentConnection.ts`        | 942  |
| `src/features/creation/taskRecovery.ts`        | 835  |
| `src/features/creation/nativeTaskHost.ts`      | 824  |
| `src/features/mcp/mcpClient.ts`                | 821  |
| `src/features/agent/orchestrator.ts`           | 819  |
| `src/features/local-service/store.ts`          | 775  |
| `src/features/prompts/promptLibrary.ts`        | 644  |

其余 22 个（300–635 行）：`features/local-service/client.ts` 635、`features/skills/skillRegistry.ts` 581、`features/projects/projectPackage.ts` 567、`features/agent/googleAgentConnection.ts` 548、`features/generation-server/assets.ts` 497、`features/agent/agentCanvas.ts` 485、`features/generation-server/provider.ts` 477、`domain/stagePlan.ts` 467、`features/creation/assetRepository.ts` 462、`features/memory/storage.ts` 460、`features/local-service/migration.ts` 419、`features/creation/imageGeneration.ts` 416、`features/plugins/pluginLoader.ts` 399、`features/local-service/server.ts` 385、`features/creation/providerSubmission.ts` 376、`features/creation/imageTaskCommand.ts` 363、`features/creation/useSpeechInput.ts` 335、`features/creation/storage.ts` 322、`features/memory/memoryService.ts` 321、`components/canvas/useCanvasControls.ts` 320、`features/agent/agentHost.ts` 316、`features/generation-server/http.ts` 306。

注意 `src/components/canvas/useCanvasControls.ts`（320 行）与 `src/App.tsx` 同样**不匹配** `^src/components/.+\.tsx$`——前者因路径匹配成立但扩展名是 `.ts`，后者因不在 `components/` 下。这说明规则的扩展名与目录两个条件都很窄。

约定（评审执行，无门禁）：

- 改动这些文件时不做无关重写；若本次改动能自然切出独立模块，允许在本次 diff 内拆分。
- 不为「凑行数」做机械拆分。拆分的判断标准是职责是否可独立命名、独立测试。
- 不新增超过 600 行的 `.ts` 或 `.tsx` 文件。确需更大时在 PR 描述说明理由。
- 不把这些文件加入 `ui-legacy-baseline.json` 或任何白名单以绕过门禁。

## 命名规范

以「约定（评审执行，无门禁）」为主，**一处例外受 `check-ui-standards.mjs` 强制**：图标映射（见下方「标识符」最后一条）。

关于 CSS 令牌需分清：门禁只校验 `var(--x)` 引用的令牌**是否已定义**（报 `未定义的 CSS 令牌`），**不校验定义写在哪个文件**——把 `--kk-*` 定义写到 `tokens.css` 之外不会被拦。因此「定义位置」属约定，「引用未定义」属门禁。ESLint 不检查文件名与多数命名约定；`import-boundaries.mjs` 会解析 import 路径但不管命名。

### 文件

| 类型           | 风格                                  | 示例                                            |
| -------------- | ------------------------------------- | ----------------------------------------------- |
| React 组件     | PascalCase.tsx                        | `ConversationPanel.tsx`                         |
| 组件附属类型   | PascalCase.types.ts                   | `ConversationPanel.types.ts`                    |
| Hook           | useCamelCase.ts                       | `useSidebarLayout.ts`                           |
| 领域/服务/工具 | camelCase.ts                          | `agentConnection.ts`、`promptLibrary.ts`        |
| 样式           | kebab-case.css                        | `workspace.css`、`ui-tokens.css`                |
| 测试           | camelCase.test.ts / camelCase.spec.ts | `agentConnection.test.ts`、`sidebar.spec.ts`    |
| 脚本           | kebab-case.mjs                        | `check-ui-standards.mjs`、`desktop-release.mjs` |
| 文档           | UPPER-CASE.kebab.md                   | `BRANCH-POLICY.md`、`UI_RULES.md`               |

组件私有子组件用父组件名做前缀，保持家族可辨识：`ConversationPanel` / `ConversationPanel.types`、`TaskWorkbench` / `TaskWorkbenchContent` / `TaskWorkbenchExport` / `TaskWorkbenchReview` / `TaskWorkbenchStages`。

### 标识符

- React 组件、类型、接口：`PascalCase`。
- 函数、变量、模块内常量：`camelCase`。
- 真正全局不可变的常量：`UPPER_SNAKE_CASE`（如 `KK_STUDIO_ROOT`）。局部常量用 `camelCase`，不滥用全大写。
- CSS 令牌：`--kk-*` 为语义源，`--ui-*` 为兼容别名。`--kk-*` 定义只写在 `src/styles/tokens.css`；`--ui-*` 兼容别名定义在 `src/styles/ui-tokens.css`（实测 127 条）与 `src/styles/responsive-content.css`（媒体查询内 4 条覆盖）。职责划分见 [`../UI_RULES.md`](../UI_RULES.md) 3.1。**定义位置属约定；引用未定义属门禁**——使用未定义令牌会报 `未定义的 CSS 令牌`，但把定义写到 `tokens.css` 之外不会被拦。
- 图标：通过 `src/components/UiIcon.tsx` 映射使用。禁止直接 `import` 新增 `lucide-react` 符号；`iconsax-react` 只允许出现在 `UiIcon.tsx` 内。**受门禁约束**：新增 Lucide 导入会报 `新增 Lucide 导入`，Iconsax 绕过报 `Iconsax 必须通过 UiIcon 映射使用`。

### 导入别名

`@/` 映射到 `src/`。`import-boundaries.mjs` 同时解析相对路径和 `@/` 前缀，写边界的判断不能只靠肉眼看 import 字符串。

## 组件化与复用

约定（评审执行，无门禁）。唯一有门禁的相关项是 `src/components/**/*.tsx` 的 300 行上限（见「文件规模边界」）；拆分粒度、复用判定、props 设计均靠评审。

### 拆分原则

1. 一个组件一个明确职责，名称能独立表达它做什么。
2. 展示与状态分离：有状态编排留在容器，无状态渲染留在子组件。
3. 子组件通过 props 接收数据，不反向 import 父组件或读取父级 context 内部实现。
4. 同类交互不得出现两套实现。发现重复先查 `src/components/` 是否已有可复用件，再新增。

### 复用判定（约定）

新增组件前必须回答：

- 现有组件能否通过 props 扩展满足需求？扩展优于复制。
- 如果复制，是否只在「结构相似但语义不同」时允许（如 `GoogleConversationPanel` 与 `ConversationPanel` 分属不同 provider）。
- 语义相同、结构略有差异的，必须抽公共子件，不允许整份复制后再各自改。

### 组件契约

图标 + 文本对齐、子菜单结构、选中态表达等细则以 [`../UI_RULES.md`](../UI_RULES.md) 为唯一来源，本文不重复定义。

## 状态与数据流

约定（评审执行，无门禁）。无脚本检查状态重复或派生数据。

- 单一事实源：同一份状态不允许同时存在 React state、模块级变量和 store 三处副本。发现第二处来源视为缺陷。
- 派生数据用计算得出，不额外存一份可同步的副本。
- 跨端共享的业务规则放 `src/domain`，不下沉到组件。
- 持久化结构变更走 ADR + schema 迁移，见 [`../architecture/DATA-STORAGE.md`](../architecture/DATA-STORAGE.md)。

## 错误处理

第2 条有空 `catch {}` 检查（来自 `js.configs.recommended` 的 `no-empty`，在 ESLint 覆盖范围内），其余为约定。

1. 错误必须可定位：保留原始 message 与上下文（任务 ID、provider、阶段），不只返回布尔。**约定。**
2. 不吞异常。`catch` 后要么处理并记录，要么原样抛出；空 `catch {}` 会被 ESLint `no-empty` 拦截。**有门禁。**
3. 用户可见失败与内部日志分离。用户界面展示可行动的提示（如「重试」「检查凭据」），不展示堆栈。**约定。**
4. 失败路径与成功路径同等测试：重复提交、迟到响应、取消、超时、离线恢复都要有覆盖。**约定**（覆盖充分性靠评审，见 [`TESTING.md`](TESTING.md)）。
5. 不为通过测试而删减有效断言。可以修正被证实过时的断言，但要在 `docs/changes/` 记录契约依据与前后差异。**约定。**
6. 网络与宿主调用必须有超时和取消路径，不允许无界等待。**约定。**

## TypeScript

部分条目**有门禁**（来自 `tseslint.configs.recommended`，在 ESLint 覆盖的 `src/**`、`tests/**/*.ts` 范围内生效），其余为约定。

- `strict` 下不允许 `any` 逃逸业务边界；外部输入用类型守卫或 schema 校验后再使用。**有门禁**：`@typescript-eslint/no-explicit-any`，报 `Unexpected any. Specify a different type`。
- 类型定义跟随使用者就近放置，不建全局 `types.ts` 垃圾桶。只有两个以上模块共享时才提升到 `domain`。**约定**（无门禁）。
- 不为绕过类型错误使用 `@ts-ignore`。**有门禁**：`@typescript-eslint/ban-ts-comment`，报 `Use "@ts-expect-error" instead of "@ts-ignore"`。
- 不使用 `as` 双重断言绕过类型错误。真实修法是补类型或修数据流。**约定**（`no-unnecessary-type-assertion` 未启用，实测 `as unknown as` 可通过）。
- 导入类型用 `import type`，避免运行时循环依赖。**约定**（`consistent-type-imports` 未启用）。

## 文档与代码同步

代码改动若改变契约，必须在同一分支同步对应文档，不留待办：

| 改动类型                       | 必须同步的文件                                                                                                                                                        |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 新增/移除功能                  | `docs/features/features.registry.json` + 对应 `docs/features/feat-*.md`，再跑 `npm run features:write`                                                                |
| 数据结构、存储、协议、依赖变化 | `docs/architecture/adr/` 新增 ADR                                                                                                                                     |
| 跨模块契约、领域规则           | 本文件与 `AI_RULES.md` 对应章节                                                                                                                                       |
| 平台顺序与跨端边界             | `AGENTS.md` + `docs/governance/PROJECT_GOALS.md` + `docs/architecture/adr/ADR-011-platform-delivery-gates-and-vps-control-plane.md`；当前靠人工评审，无自动 guardrail |
| 新增门禁或放宽既有门禁         | 对应 `scripts/` 脚本 + 本文「门禁映射」表                                                                                                                             |
| UI 令牌、组件契约              | [`../UI_INDEX.md`](../UI_INDEX.md) 指向的唯一承载文件                                                                                                                 |

提交前跑 `npm run lint`。门禁全绿仍不等于规则正确，规则变更类改动按 [AI-EVALS](AI-EVALS.md) 做场景回归。

参考：[TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)、[ESLint Rules](https://eslint.org/docs/latest/rules/)、[typescript-eslint](https://typescript-eslint.io/rules/)。

## 依赖与体积预算

约定（评审执行，无自动门禁）：本轮 UI 的主入口 JS gzip 允许增长量为 max(冻结基线 gzip 字节 × 3%, 16 × 1024 字节)。对同一平台、同一构建模式与相同 Node/gzip 参数比较冻结基线和候选，分别记录源码 commit/tree、主入口文件 hash、原始字节和 gzip 字节。未量测保持 NOT VERIFIED；超预算先检查重复资源、未用代码与按需功能边界，并记录必要增量的原因和受影响能力，经评审接受后才能交付。

同时报告全部 JS/CSS 和 Agent/插件/原生运行时的包内体积、运行白名单与新增依赖用途；仅把代码移到异步 chunk 不能证明整体变轻。按需加载须有真实入口、离线/失败/重载覆盖，不能通过漏构建插件、删原件/功能或省略 Agent 依赖凑指标。资源重复按 hash 计量，已加载分页数量不当成全库统计。默认复用现有控件、标准库和已安装依赖；新依赖需说明随包字节、收益与退出路径。

文档与产物落点从 [文档入口](../README.md#源码数据与文档的落点) 路由。运行日志、截图、恢复包和构建缓存不随新 change package 大量复制入库；历史原件按既有保留契约处理，体积预算不授权删除。
