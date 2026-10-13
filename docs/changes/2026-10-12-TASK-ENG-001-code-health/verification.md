# Verification：TASK-ENG-001 代码健康棘轮与 Windows 不安全模式扫描

- Task ID：TASK-ENG-001
- 分支 / worktree：`feat/TASK-ENG-001-code-health` / `D:/kk-studio/.worktrees/TASK-ENG-001-code-health`
- base SHA：`1f6cbd37091326a899fa600baba53bf6efd9cf16`（origin/main）
- 结论：**PASS**（本任务 AC 全部满足；`npm test` 的 3 项失败为 PRE-EXISTING，已在基线复现）

## 1. 验收标准逐条核对

| AC   | 内容                                                       | 证据                                | 结论 |
| ---- | ---------------------------------------------------------- | ----------------------------------- | ---- |
| AC-1 | 提供 TS/TSX 代码健康棘轮：新代码必须达标，存量只许变小     | §3.1 ratchet 自测 + §3.3 全树report | PASS |
| AC-2 | 支持行内豁免 `// health: allow <RULE> -- 理由`             | §3.1 豁免用例                       | PASS |
| AC-3 | 模式规则（EMPTY_CATCH/AS_ANY/CONSOLE_LOG）按多重集指纹裁决 | §3.1 指纹用例                       | PASS |
| AC-4 | Windows 不安全模式扫描（9 条规则）                         | §3.2 footgun 自测 + 全库 0 命中     | PASS |
| AC-5 | 门禁接入 `npm run lint`，ENFORCEMENT 从 origin/main 读取   | §2.2、§3.4                          | PASS |
| AC-6 | GitHub Actions 固定到 commit SHA                           | §2.3                                | PASS |

## 2. 命令与结果

命令均在 worktree 根目录、`npm ci --ignore-scripts`（244 包）后执行。

### 2.1 基线与工具链

| 项                        | 结果                                       |
| ------------------------- | ------------------------------------------ |
| base = origin/main        | `1f6cbd37091326a899fa600baba53bf6efd9cf16` |
| Node                      | 24.20.0（engines `>=24`）                  |
| `npm ci --ignore-scripts` | PASS（244 包）                             |

### 2.2 静态检查

| 命令                                                                                                   | 退出码 | 结果                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run typecheck`                                                                                    | 0      | PASS                                                                                                                                                   |
| `npx eslint scripts/check-code-health.mjs scripts/check-windows-footguns.mjs scripts/governance/*.mjs` | 0      | PASS（无输出）                                                                                                                                         |
| `npm run format:check`                                                                                 | 0      | PASS                                                                                                                                                   |
| `npm run ui:check`                                                                                     | 0      | PASS（214 文件，0 违规）                                                                                                                               |
| `npm run markdown:check`                                                                               | 0      | PASS                                                                                                                                                   |
| `npm run health:check`                                                                                 | 0      | 7 files vs `1f6cbd370913`：0 blocking, 0 allowed (blocking)                                                                                            |
| `npm run footguns:check`                                                                               | 0      | 2 files scanned: 0 findings (blocking)                                                                                                                 |
| `npm run governance:write`                                                                             | 0      | 116 tasks, 0 violations                                                                                                                                |
| `npm run lint`（全链）                                                                                 | 0      | eslint 全绿 → version:check → project-goals → governance 0 violations → features 35/0 → markdown 102 文件 0 violations → health:check → footguns:check |

### 2.3 Actions SHA 固定

`.github/workflows/git-guards.yml`、`.github/workflows/quality.yml` 共 9 处引用，全部由 tag 改为 commit SHA + 版本注释：

| Action                  | 固定 SHA                                   | 版本 |
| ----------------------- | ------------------------------------------ | ---- |
| actions/checkout        | `11d5960a326750d5838078e36cf38b85af677262` | v4   |
| actions/setup-node      | `49933ea5288caeca8642d1e84afbd3f7d6820020` | v4   |
| actions/upload-artifact | `ea165f8d65b6e75b540449e92b4886f43607fa02` | v4   |

SHA 取自 GitHub API 对应 tag 的实测值，未使用记忆中的哈希。

### 2.4 测试

| 命令                                             | 结果                                           |
| ------------------------------------------------ | ---------------------------------------------- |
| `npm test`（本分支）                             | 830 tests / 814 pass / **3 fail** / 13 skipped |
| 失败项及归因（均在基线复现或证明与本任务无关）： |

| 失败项                                                                   | 单独运行（`--test-concurrency=1`）                                    | 归因                                                                                                     |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `desktopAgentRuntime.test.ts:10`、`:39`                                  | 基线 `# tests 2 / # pass 0 / # fail 2`（与本分支逐字相同）            | PRE-EXISTING：需启动真实 KK desktop Agent 二进制，本机无该构建产物（`KK desktop Agent failed to start`） |
| git hook `nested directories with spaces`（`gitPushGuardPaths.test.ts`） | 基线 `# tests 10 / # pass 7 / # fail 0`；本分支同参数**结果完全一致** | 并发/时序相关的既有不稳定：仅在全量并发跑时偶发，单跑不现                                                |

同一文件在两次全量 `npm test` 中失败数在 3 与 9 之间波动，确认存在既有不稳定性。新增的 `scripts/**` 为纯 Node 门禁脚本，不参与测试用例，与上述失败无因果关系。

## 3. 定向自测

### 3.1 棘轮四类规则 + 豁免 + 退出码

以 `--base HEAD`（改动全部落在 head侧）构造违规，验证裁决：

| 用例        | 构造                          | 期望             | 实测 |
| ----------- | ----------------------------- | ---------------- | ---- |
| CC 超标     | 嵌套分支函数 CC=26            | 捕获为 blocking  | PASS |
| FILE_LINES  | 2001 行文件                   | 命中             | PASS |
| EMPTY_CATCH | `catch {}`                    | 命中             | PASS |
| AS_ANY      | `as any`                      | 命中             | PASS |
| 行内豁免    | `// health: allow CC -- 理由` | 抑制该行 finding | PASS |
| 退出码      | blocking 模式有未豁免 finding | 1                | PASS |
| 退出码      | 通过 / advisory               | 0                | PASS |

### 3.2 footgun 自测与自匹配修复

首版实现把9 条规则表放在扫描器内，扫描自身时产生 8 条 findings（规则表文本天然含 POSIX 临时路径、`rm -rf`、`schtasks` 等模式）。修复：规则表移入 `scripts/governance/footgun-rules.mjs`，并将 `scripts/governance/**` 加入 EXCLUDE。修复后全库 `--all` 扫描 0 findings。

规则清单：POSIX_TMP、HARDCODED_USER_PATH、SHEBANG_NODE、DESTRUCTIVE_DELETE、CRLF_SCRIPT_WRITE、SCHTASKS_QUOTE、ONEDRIVE_KNOWN、SINGLE_BACKSLASH_PATH、CURL_PIPE_SHELL。

### 3.3 全树存量报告（`npm run health:check -- --report`）

```
code-health report: 607 files in scope
  functions over target: CC>20=69, lines>300=2, nesting>6=0
  files over 2000 lines: src/App.tsx (3152)
  pattern hits: EMPTY_CATCH=41
```

这些是存量债，不构成失败——棘轮以 base 实测值为各自上限，只禁止增长。`src/App.tsx` 是唯一超过 2000 行的文件，也是后续拆分的主要目标。

### 3.4 自测过程中发现并修复的缺陷

| #   | 缺陷                                     | 影响                                                                               | 修复                                 |
| --- | ---------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------ |
| 1   | `globToRegExp` 中 `**/` 强制至少一级目录 | `src/**/*.tsx` 漏掉 `src/App.tsx`（3152 行）完全未被度量，report 显示 0 个超限文件 | `**/` 译为 `(?:[^/]*/)*`（零或多级） |
| 2   | 行数统计把末尾换行多算 1 行              | App.tsx 报 3153，与项目文档记的 3152 不一致                                        | 末尾空串后pop                        |
| 3   | 重复模式违规只报首行                     | 修一个再新增一个会被漏掉                                                           | 按多重集指纹逐条报告各自行号         |
| 4   | `burnDown()` 硬编码 20/300/6/2000        | 改config 目标后report 文案与实际不符                                               | 改为引用 `TARGETS`                   |

## 4. 未验证 / 超出范围

| 项                                               | 状态    | 说明                                                               |
| ------------------------------------------------ | ------- | ------------------------------------------------------------------ |
| CI 实跑                                          | NOT RUN | 推送后由 GitHub Actions 执行；本地已复现 `npm run verify` 各步     |
| `test:ui`（Playwright msedge）                   | NOT RUN | 基线环境受限，非本任务引入                                         |
| CODING-STANDARDS.md 门禁表补齐                   | 后续    | 该文件在未合并的 `codex/ui-redesign-20261011` 上，避免制造第二来源 |
| `windows-release.yml` rust-toolchain@stable 固定 | 后续    | 同上（文件不在 base）                                              |

### 4.1 主线承接复验（2026-10-13）

原始 verification 的 base/head 与失败边界按历史结果保留。当前候选以 `origin/main@bcf55851d296c753d9610e86f1e32bf8db333a41` 为 base，补齐当前 `.github/workflows/*.yml` 的 action SHA 固定（包括 `dtolnay/rust-toolchain@e2a55d2ffb04f378e9626c28d38b36d230d1e12f`），并验证 `--head` 检查读取指定 git revision、无效 revision fail-closed。新的 lint、测试、delivery 与独立 exact-SHA review 结果不覆盖本节之前的历史命令回执。

### 4.2 合并复审修复（2026-10-13，待新 HEAD Hosted 回执）

`9c849aa2ac640a3db4a05335a537247fbe1b2a4d` 的[PR quality run](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/38334665495) 与[git-guards run](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/38334665501) 全部成功，但随后独立复审仍复现 5 项阻断。保留这些旧 SHA 的成功记录，不把它们移作新 HEAD 证明。

在隔离副本 `D:/kk-studio/post-pr55-main-20261013`，`node --test tests/unit/diffScope.test.ts` 首次为 5 项/3 pass/2 fail（健康 blocking 错读为 advisory/off），修复后 5/5 pass；`node --test tests/unit/codeHealthCliModes.test.ts` 首次 0/4 pass（错误退出码 0/1），修复后 4/4 pass。两个模式明确拒绝 revision 参数，工具错误 2；不更改正常工作区清单入口。

Rust action 以固定 SHA 的官方 input 定义核对并显式提供 `toolchain: stable`；未创建 release tag、未修改已发布版本、未声称正式安装器已验收。完整本地门禁、重复模式真实 CLI 回归以及最终独立审查/Hosted 结果须绑定后续精确 HEAD。

重复模式的真实 CLI 回归首次 3 项/2 pass/1 fail：新增未豁免 `AS_ANY` 被错误报在旧豁免行，CLI 为 exit 0；修复后 3/3 pass，插入前后未豁免重复均 exit 1，全部显式豁免仍 exit 0。另补“旧语句新加豁免不能覆盖新重复”场景；不能根据旧允许行排在首位而放行增长。

上述修复工作区完成后，13 项定向回归全过；`npm run lint`、`typecheck`、`format:check`、policy sync 均 exit 0，健康/footguns 10 文件零发现（blocking）。完整 `npm test` 为 1019 项/1005 pass/14 skipped/0 fail，日志在 `D:/kk-studio/git-diagnostic-20261013/pr56-merge-repair-tests.log`。这些结果证明本地修复内容，随后提交的精确 SHA 必须单独通过 delivery、独立复审和 Hosted CI。
