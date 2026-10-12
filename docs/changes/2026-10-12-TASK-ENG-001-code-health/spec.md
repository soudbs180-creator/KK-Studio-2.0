# Spec：引入 hermes-agent 工程实践——代码健康棘轮、Windows 不安全模式扫描与 Actions SHA 固定

- Task ID：TASK-ENG-001
- 状态：IMPLEMENTED
- 日期：2026-10-12
- Intent / 账本：intent.md；`docs/governance/task-ledger.json` TASK-ENG-001
- 当前规范与实现基线：origin/main `1f6cbd37091326a899fa600baba53bf6efd9cf16`；AGENTS.md、SDLC.md、BRANCH-POLICY.md、docs/engineering/DEVELOPMENT.md
- Source of truth：`scripts/governance/code-health.config.mjs`（目标/规则/开关）、`scripts/governance/footgun-rules.mjs`（footgun 规则表）；语义描述唯一位于 docs/engineering/DEVELOPMENT.md「代码健康棘轮与 Windows 不安全模式扫描」一节

## 用户行为与入口

- 主流程：贡献者/AI 在 task worktree 改代码 → `npm run lint`（含两个新检查，advisory）→ 命中时按输出修复或加 `health: allow <RULE> -- 理由` → `npm run health:check -- --report` 看存量 burn-down。
- 入口：`npm run health:check`、`npm run footguns:check`（可直跑 `node scripts/check-code-health.mjs [--base <rev>] [--head <rev>] [--report]`）。
- loading/success/error/cancel/offline/timeout：不适用（纯本地静态检查，无异步 UI）。失败路径：git 缺失或 base 不可解析 → 打印原因 exit 2；无变化文件 → 打印 skipped exit 0；度量解析失败 → MEASURE finding（不是"无发现"）。
- 重试/幂等：只读检查，可重复运行，无副作用。

## 架构、数据与权限

- 模块职责与依赖方向：
  - `scripts/governance/diff-scope.mjs`：git 作用域（merge-base、changed files、读修订内容、开关读取、glob）。被两个入口共享，无其他依赖。
  - `scripts/governance/code-health.config.mjs`：目标/范围/模式规则/总开关（数据 + 两个字符串常量）。
  - `scripts/governance/code-health-measure.mjs`：TS AST 度量（CC/函数行/嵌套/单元身份/体哈希/模式命中/allow 注释），仅依赖 typescript。
  - `scripts/governance/code-health-compare.mjs`：base↔head 单元匹配与裁决。
  - `scripts/check-code-health.mjs` / `scripts/check-windows-footguns.mjs`：CLI 编排与退出码。
  - 依赖方向：入口 → compare/measure/diff-scope → config；无环，无产品代码被引用。
- schema/API/事件/文件格式：无持久化格式；输出为人类可读文本（JSON 输出为 v1 预留，未暴露开关）。
- 数据归属/并发/原子性：只读仓库文件；`git show` 与工作区读取双轨；不写任何文件。
- 凭据与日志边界：不读取凭据、不联网、不打印文件内容（命中行截断 100 字符）。
- 相关 ADR：不需要（工具链内部实现，不改公共契约、持久化格式或安全边界；按 SDLC「普通局部实现不用新增 ADR」）。

## 平台能力

| 能力             | Desktop                           | Web                 | Mobile | 降级/禁用理由              |
| ---------------- | --------------------------------- | ------------------- | ------ | -------------------------- |
| 代码健康棘轮     | 适用（CI verify, windows-latest） | 同左（同一 CI job） | 不适用 | 纯静态检查，与端运行时无关 |
| footgun 扫描     | 适用                              | 同左                | 不适用 | 同上                       |
| Actions SHA 固定 | 适用                              | 同左                | 不适用 | CI 配置                    |

全部为真实实现（非 fixture/Prototype）：脚本在 origin/main 基线上实跑通过，自测覆盖全部规则类型。

## 生命周期与恢复

- 初始化/安装：`npm ci` 后即可运行（typescript 为既有 devDependency）。
- 正常使用/取消/离线：只读、秒级；无取消语义需求。
- 升级和旧 schema：不适用（无数据格式）。
- 损坏/写失败/进程重启：不适用（无写入）。
- 备份/还原/回滚：删除新增脚本 + 还原 package.json/workflows/docs 三处 diff 即完全回滚；无数据迁移。
- 导出/卸载：不适用。

## 验收映射

| Intent AC | 预期状态/结果                                  | 检查/运行环境                       | 证据要求                       |
| --------- | ---------------------------------------------- | ----------------------------------- | ------------------------------ |
| AC-1      | 超标新代码被捕获；allow 豁免生效；四类规则命中 | worktree 内 node 24 直跑            | verification.md 命令表与退出码 |
| AC-2      | advisory 不改变 lint 退出码；存量清单可输出    | `npm run lint`、`--report`          | 退出码 0；清单数字             |
| AC-3      | footgun 规则命中带 fix；自匹配已修             | 直跑 + 自测文件                     | findings 输出                  |
| AC-4      | 无 tag 固定 action                             | grep .github/workflows              | SHA + 注释                     |
| AC-5      | 文档同步且命令引用有效                         | markdown:check、doc:commands 类检查 | exit 0                         |
| AC-6      | 账本与五件套一致                               | governance:check                    | exit 0                         |

## 风险和决策

- 可自主解决的技术决定及依据：CC 口径与 ruff C901 对齐（不计可选链/逻辑赋值/默认参数）；体哈希覆盖 token 流（改名不换身份）；嵌套函数为独立单元；`**/` glob 匹配零或多个目录段（修掉 `src/**/*.tsx` 不匹配 `src/App.tsx` 的实测 bug）；ENFORCEMENT 从 origin/main 读取、缺失失败关闭。
- 待用户决定的产品语义（无则写无）：无。
- 规范冲突、外部依赖与阻断范围：CODING-STANDARDS.md 门禁表需在本分支合并 ui-redesign 后补齐——记录为后续任务，不在本任务 BLOCKED（不影响本次验收）。
- 与 intent 的差异及授权依据：无差异。
- 明确未承诺的能力：不做存量修复；不做跨文件迁移抵扣；不提供 JSON 输出开关；不自动 bump action SHA。
