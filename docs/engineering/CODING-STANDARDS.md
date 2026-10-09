# 编码规范

本文件定义 KK Studio 的源码约束：命名、文件边界、模块依赖、错误处理和状态管理。规则条目全部对应可执行门禁；没有门禁支撑的条目标注为「约定」，靠评审执行。

结构与命令见 [DEVELOPMENT](DEVELOPMENT.md)，流程门禁见 [SDLC](SDLC.md)，UI 视觉与组件契约见 [`../UI_INDEX.md`](../UI_INDEX.md)。

## 门禁映射

写代码前先确认要满足哪条门禁。以下命令都在仓库根执行，全部已并入 `npm run lint` 或 `npm run verify`。

| 门禁 | 命令 | 拦截内容 |
| --- | --- | --- |
| ESLint | `eslint src tests scripts *.config.{ts,mjs} --max-warnings 0` | 未使用变量（`^_` 前缀豁免）、`debugger`、TS 推荐规则集错误 |
| 架构边界 | `node scripts/check-governance.mjs` | `src/domain` 依赖 UI/宿主层、服务端专用模块被浏览器侧引用 |
| UI 标准 | `node scripts/check-ui-standards.mjs` | 未定义 CSS 令牌、新增颜色字面量、新增 Lucide 直连、组件超 300 行、Iconsax 绕过 `UiIcon` |
| 类型 | `tsc --noEmit` | 类型错误 |
| 格式 | `prettier --check` | 格式偏差 |
| Markdown 链接 | `node scripts/check-markdown.mjs` | 断链、跨仓库链接 |
| 任务账本 | `node scripts/check-governance.mjs` | 账本与 `TASK_LEDGER.md` 不同步、状态字段缺失 |

`eslint.config.mjs` 当前 ignore：`node_modules/`、`dist/`、`.worktrees/`、`src-tauri/`、`docs/`、`.tmp/`、`tmp/`、`test-results/`、`design/`、`public/`。`docs/` 不参与 lint，Markdown 由 `check-markdown.mjs` 单独校验。

## 目录职责与依赖方向

`src/` 六个一级目录各自职责固定，依赖只能单向向下。

| 目录 | 职责 | 允许依赖 |
| --- | --- | --- |
| `src/domain` | 纯领域模型与规则 | 自身、`src/domain` 内部。禁止 React、Tauri、`components`、`features`、`integrations`、`styles` |
| `src/components` | 展示组件 | `domain`、`components` 内部 |
| `src/features` | 业务能力（agent、creation、mcp、local-service、generation-server、prompts 等） | `domain`、`components` |
| `src/integrations` | 外部系统适配 | `domain` |
| `src/runtime` | 宿主运行时桥接 | `domain`、`integrations` |
| `src/styles` | token 与全局样式 | 无业务依赖 |

### 硬约束：领域层纯净

`scripts/governance/import-boundaries.mjs` 强制 `src/domain/**` 不得 import 或 require：

- `src/components`、`src/features`、`src/integrations`、`src/styles` 下任何路径
- `react`、`react-dom`、`@tauri-apps/*`
- Node 内置模块（`node:*`、`fs`、`path` 等）

领域逻辑必须能在无 DOM、无宿主环境下被单元测试直接执行。需要平台能力时用参数注入，不在领域层调用宿主 API。

### 硬约束：服务端专用模块

以下文件只能在服务端上下文运行，浏览器侧与共享代码不得 import：

```
src/features/local-service/main.ts
src/features/local-service/manifest.ts
src/features/local-service/server.ts
src/features/local-service/session.ts
src/features/local-service/store.ts
```

`src/features/generation-server/**` 同样受此约束。违规信息形如 `browser/shared source cannot import server-only ...`。

## 文件规模边界

### 已被门禁覆盖

`src/components/**/*.tsx` 超过 **300 行**由 `check-ui-standards.mjs` 直接报错。这条是硬门禁，不是建议。

### 尚未被门禁覆盖的存量

以下文件已超出 300 行，但当前门禁规则不匹配（`src/App.tsx` 不匹配 `src/components/**`；`src/features/**` 非 `.tsx`），属于已知技术债，只能靠评审约束：

| 文件 | 行数 |
| --- | --- |
| `src/App.tsx` | 3152 |
| `src/features/generation-server/repository.ts` | 1063 |
| `src/features/creation/model.ts` | 972 |
| `src/features/agent/agentConnection.ts` | 942 |
| `src/features/creation/taskRecovery.ts` | 835 |
| `src/features/creation/nativeTaskHost.ts` | 824 |
| `src/features/mcp/mcpClient.ts` | 821 |
| `src/features/agent/orchestrator.ts` | 819 |
| `src/features/local-service/store.ts` | 775 |
| `src/features/prompts/promptLibrary.ts` | 644 |

约定（评审执行，无门禁）：

- 改动这些文件时不做无关重写；若本次改动能自然切出独立模块，允许在本次 diff 内拆分。
- 不为「凑行数」做机械拆分。拆分的判断标准是职责是否可独立命名、独立测试。
- 不新增超过 600 行的 `.ts` 或 `.tsx` 文件。确需更大时在 PR 描述说明理由。
- 不把这些文件加入 `ui-legacy-baseline.json` 或任何白名单以绕过门禁。

## 命名规范

### 文件

| 类型 | 风格 | 示例 |
| --- | --- | --- |
| React 组件 | PascalCase.tsx | `ConversationPanel.tsx` |
| 组件附属类型 | PascalCase.types.ts | `ConversationPanel.types.ts` |
| Hook | useCamelCase.ts | `useSidebarLayout.ts` |
| 领域/服务/工具 | camelCase.ts | `agentConnection.ts`、`promptLibrary.ts` |
| 样式 | kebab-case.css | `workspace.css`、`ui-tokens.css` |
| 测试 | camelCase.test.ts / camelCase.spec.ts | `agentConnection.test.ts`、`sidebar.spec.ts` |
| 脚本 | kebab-case.mjs | `check-ui-standards.mjs`、`desktop-release.mjs` |
| 文档 | UPPER-CASE.kebab.md | `BRANCH-POLICY.md`、`UI_RULES.md` |

组件私有子组件用父组件名做前缀，保持家族可辨识：`ConversationPanel` / `ConversationPanel.types`、`TaskWorkbench` / `TaskWorkbenchContent` / `TaskWorkbenchExport` / `TaskWorkbenchReview` / `TaskWorkbenchStages`。

### 标识符

- React 组件、类型、接口：`PascalCase`。
- 函数、变量、模块内常量：`camelCase`。
- 真正全局不可变的常量：`UPPER_SNAKE_CASE`（如 `KK_STUDIO_ROOT`）。局部常量用 `camelCase`，不滥用全大写。
- CSS 令牌：`--kk-*` 为语义源，`--ui-*` 为兼容别名。定义只写在 `src/styles/tokens.css`。
- 图标：通过 `src/components/UiIcon.tsx` 映射使用。禁止直接 `import` 新增 `lucide-react` 符号；`iconsax-react` 只允许出现在 `UiIcon.tsx` 内。

### 导入别名

`@/` 映射到 `src/`。`import-boundaries.mjs` 同时解析相对路径和 `@/` 前缀，写边界的判断不能只靠肉眼看 import 字符串。

## 组件化与复用

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

- 单一事实源：同一份状态不允许同时存在 React state、模块级变量和 store 三处副本。发现第二处来源视为缺陷。
- 派生数据用计算得出，不额外存一份可同步的副本。
- 跨端共享的业务规则放 `src/domain`，不下沉到组件。
- 持久化结构变更走 ADR + schema 迁移，见 [`../architecture/DATA-STORAGE.md`](../architecture/DATA-STORAGE.md)。

## 错误处理

1. 错误必须可定位：保留原始 message 与上下文（任务 ID、provider、阶段），不只返回布尔。
2. 不吞异常。`catch` 后要么处理并记录，要么原样抛出；空 `catch {}` 视为违规。
3. 用户可见失败与内部日志分离。用户界面展示可行动的提示（如「重试」「检查凭据」），不展示堆栈。
4. 失败路径与成功路径同等测试：重复提交、迟到响应、取消、超时、离线恢复都要有覆盖。
5. 不为通过测试而删减有效断言。可以修正被证实过时的断言，但要在 `docs/changes/` 记录契约依据与前后差异。
6. 网络与宿主调用必须有超时和取消路径，不允许无界等待。

## TypeScript

- `strict` 下不允许 `any` 逃逸业务边界；外部输入用类型守卫或 schema 校验后再使用。
- 类型定义跟随使用者就近放置，不建全局 `types.ts` 垃圾桶。只有两个以上模块共享时才提升到 `domain`。
- 不为绕过类型错误使用 `as` 双重断言或 `@ts-ignore`。真实修法是补类型或修数据流。
- 导入类型用 `import type`，避免运行时循环依赖。

## 文档与代码同步

代码改动若改变契约，必须在同一分支同步对应文档，不留待办：

| 改动类型 | 必须同步的文件 |
| --- | --- |
| 新增/移除功能 | `docs/features/features.registry.json` + 对应 `docs/features/feat-*.md`，再跑 `npm run features:write` |
| 数据结构、存储、协议、依赖变化 | `docs/architecture/adr/` 新增 ADR |
| 跨模块契约、领域规则 | 本文件与 `AI_RULES.md` 对应章节 |
| 新增门禁或放宽既有门禁 | 对应 `scripts/` 脚本 + 本文「门禁映射」表 |
| UI 令牌、组件契约 | [`../UI_INDEX.md`](../UI_INDEX.md) 指向的唯一承载文件 |

提交前跑 `npm run lint`。门禁全绿仍不等于规则正确，规则变更类改动按 [AI-EVALS](AI-EVALS.md) 做场景回归。

参考：[TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)、[ESLint Rules](https://eslint.org/docs/latest/rules/)、[typescript-eslint](https://typescript-eslint.io/rules/)。
