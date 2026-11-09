# Agent body-parser 最小安全修复

- Task：TASK-AGENT-BODY-PARSER-20261109。
- 日期：2026-11-09（Asia/Shanghai）。
- 基线：`cc222004d8b3104357854d9c6b7a331d0c52a869`；隔离分支：`fix/TASK-AGENT-BODY-PARSER-20261109`。
- 范围：Agent 独立锁文件、既有 HTTP 测试及本记录；不修改主 checkout、共享账本、存储格式、插件生产门或 Provider。

## 修复与兼容

[body-parser 官方公告 GHSA-27r3-jxmh-p828](https://github.com/expressjs/body-parser/security/advisories/GHSA-27r3-jxmh-p828)确认 2.4.0 修复压缩请求解码后的未处理异常。Agent 的 JSON 解析器在鉴权前运行；本次用上游修复替换受影响版本，不改变中间件顺序或关闭既有压缩请求支持。

精确更新 `body-parser` 2.3.0 → 2.4.0，及其新依赖范围要求的 `qs` 6.16.0 → 6.16.1。既有 `iconv-lite` 0.7.3、嵌套 `content-type` 2.1.0 已满足新范围，不升级。仅这两个锁项变化；package.json 与其他依赖版本不变。新增版本的 tarball URL、integrity 和依赖范围取自官方 npm registry 元数据。

依赖通过 `npm ci --prefix vendor/canvas-agent --ignore-scripts --no-audit --no-fund` 安装到本 worktree 的实体 `vendor/canvas-agent/node_modules`。根 node_modules 只作为已有工具/根依赖的只读联接使用，没有运行根 npm ci。安装后确认 Express 实际解析到本 worktree 的 body-parser 2.4.0。

既有 HTTP 测试增加普通 JSON、有效 gzip JSON、损坏 JSON、两字节不完整 gzip 头检查；错误输入之后 `/health` 仍返回成功。保留原有解析错误的 HTTP 500 响应契约。测试仅使用临时目录、随机 loopback 端口和本机 CLI fixture；未发送可触发公告崩溃的尾随压缩数据或高耗载荷。

## 验证

- 完整 Agent 基线与修复后测试均为 205 pass / 2 skip / 0 fail。最初未连接根依赖时 session.test.ts 无法解析 `@tauri-apps/api`；完成工具依赖联接后重跑通过，原始失败日志保留。
- `npm run agent:build` 通过；新增 HTTP 兼容检查在升级前、升级后均通过，是输入兼容检查，不是漏洞利用复现。
- 根 `npm test`：2749 pass / 20 skip / 0 fail；`npm run typecheck` 通过。
- `npm run lint`、`npm run ui:check` 均退出 0；保留存量 code-health advisory、25 项设计 warning 和 267 项 Figma 待复核 advisory，不作为视觉验收结论。
- 同命令生产审计 `npm audit --prefix vendor/canvas-agent --omit=dev --package-lock-only --json`：升级前 7 个受影响包（2 high / 5 moderate），升级后 5 个（1 high / 4 moderate）；body-parser、qs 不再报告公告。两次 audit 均退出 1，升级后仍有其他包公告。

原始命令回执、官方 registry 元数据、安装树及审计 JSON 位于容器 `output/closure-20261109/security-audit/body-parser/`。完整目录以该路径为准，不改写先前安全审计证据。

## 剩余边界

`@modelcontextprotocol/sdk`、`@hono/node-server`、`hono`、`fast-uri`、`ip-address` 仍被生产审计列出，本次不批量升级。未验真实 Provider、原生安装包/已运行二进制、全窗口 UI、漏洞利用或完整 verify；未提交、推送或合并。vendor 整体固定上游 SHA 与完整补丁来源仍需独立追溯，不因两项 npm 锁版本更新成为已闭环。

## 2026-11-09 当前 checkout 复核（追加）

本节记录主 checkout `D:/kk-studio/KK-Studio-2.0` 的重新核验，基线 HEAD 仍为 `cc222004d8b3104357854d9c6b7a331d0c52a869`，分支为 `chore/sync-local-main-20261106`，存在无关未提交改动。前文的隔离 worktree、安装命令和通过数字保留为先前记录，**不作为本节当前候选的通过证明**。本次未执行安装、提交、推送、切换、重置、暂存或清理。

### 公告与真实暴露

FACT：[上游 GHSA-27r3-jxmh-p828](https://github.com/expressjs/body-parser/security/advisories/GHSA-27r3-jxmh-p828)和 [OSV](https://osv.dev/vulnerability/GHSA-27r3-jxmh-p828)于本次复核时均确认 CVE-2026-111181：影响 `>=2.0.0 <2.4.0` 及 `<1.20.9`，修复版本为 `2.4.0 / 1.20.9`。合法压缩帧后的尾随数据可能在响应之后触发解压流未处理的 error，使 Node 进程退出。`inflate:false` 是拒绝压缩请求的替代措施，会改变现有兼容行为，本次不采用。

FACT：生产源码只有 `vendor/canvas-agent/src/server/http.ts` 使用 `express.json`；选项为 `{ limit: "30mb" }`，默认允许解压。解析器先于 `setCors`、`validToken` 和路由运行；服务绑定 `127.0.0.1`。具备本机 HTTP 访问能力的客户端无需 token 或匹配路由即可到达解析器。此处未证明公网可达或任意跨域网页能够绕过浏览器预检。

### HEAD、锁文件与安装树分别核对

| 对象 | Express | body-parser | qs |
| --- | --- | --- | --- |
| `git show HEAD:vendor/canvas-agent/package-lock.json` | 5.2.1 | 2.3.0 | 6.16.0 |
| 当前 `vendor/canvas-agent/package-lock.json` | 5.2.1 | 2.4.0 | 6.16.1 |
| 当前 Express 实际加载的安装树 | 5.2.1 | 2.4.0 | 6.16.1 |

实际解析路径为 `vendor/canvas-agent/node_modules/express/package.json` → `vendor/canvas-agent/node_modules/body-parser/index.js`，通过以 Express package 路径为基准的 `require.resolve` 核验。`package.json` 的 Express 范围仍为 `^5.1.0`；Express 锁项对 body-parser 的范围为 `^2.2.1`，允许 2.4.0，无需增加直接依赖或 override。

对 HEAD 与当前锁文件逐项 JSON 比较，仅 `node_modules/body-parser`、`node_modules/qs` 两项改变。qs 6.16.1 满足 body-parser 2.4.0 的新下限；已有 iconv-lite/content-type 锁项满足范围。根、Mobile、canvas-plugins、creation-contracts 的四份锁文件均无 body-parser；不进行跨工程批量更新。`@types/body-parser` 1.19.6 是类型包，不是运行时 1.x 副本；`.tmp` 的旧副本和此次旧版复现实例也不计入生产源码入口。

### 有界崩溃对照与回归

旧版对照使用 npm 本机缓存的 body-parser 2.3.0、Express 5.2.1、qs 6.16.0 tarball，逐个核对其 SHA-512 与 HEAD 锁文件 integrity 一致后，仅解包到 `.tmp/agent-body-parser-20261109-review/legacy/`。其余相同依赖只读复用。没有运行 npm install/npm ci，也没有修改现有安装树。

独立 Node v24.20.0 进程运行最小 Express app，使用生产解析选项并仅监听随机 `127.0.0.1` 端口；没有全局 uncaughtException/error 吞错处理。每次只发一个约 100 KiB 的 POST：合法 gzip JSON + 一个零字节 + 尾随字节，无 token、无匹配路由。载荷与[上游修复回归](https://github.com/expressjs/body-parser/commit/f7075eae3a84c3473ab4bf0a777da28db208e916)采用相同触发方式。

| 对照 | 首次响应 | 后续 health | 独立进程 |
| --- | --- | --- | --- |
| HEAD 对应 body-parser 2.3.0 | 401 | ECONNREFUSED | Gunzip 未处理 `Z_DATA_ERROR`，退出码 1 |
| 实际安装 body-parser 2.4.0 | 401 | 200，ok=true | 保持存活；检查后仅停止本次创建的进程 |

既有 HTTP 测试现增加 `survives trailing gzip bytes before token and route checks` 子测试，调用真实 `startHttpServer`，同样断言无 token/不存在路由的请求得到 401，等待尾随解压事件后 health 仍成功。没有把仅普通 gzip/损坏 gzip 测试称为 CVE 复现，也没有改动生产解析顺序或关闭 inflate。

### 当前验证结果与限制

| 命令或证据 | 本次结果 |
| --- | --- |
| `npx --no-install tsx --test src/server/codebuddy-http.test.ts`（Agent 目录） | 退出 1；Node test runner 启动文件子进程时 `spawn EPERM`，未执行业务断言 |
| `npm test --prefix vendor/canvas-agent` | 退出 1；14 个测试文件均在启动子进程时 `spawn EPERM`，不是 205 pass |
| `npm run build --prefix vendor/canvas-agent` | 退出 0；生产 TypeScript 编译通过 |
| 用现有 tsc 将当前 HTTP 测试及实际源码编译至 `.tmp` | 退出 0；包括新增测试的 strict 类型检查 |
| 编译产物以 `node --test --test-isolation=none` 执行真实 HTTP 测试 | gzip 崩溃回归子测试 1 pass；随后既有 CodeBuddy probe 因 CLI `spawn EPERM` 失败，总命令退出 1，不能视为完整测试通过 |
| 同一真实 HTTP 测试加载旧版依赖 | gzip 回归期间出现 `Z_DATA_ERROR`，命令退出 1；不是仅靠版本字符串判断 |

所有新原始脚本、日志、HEAD 锁快照、初始改动指纹和复核输入指纹均在本地 `.tmp/agent-body-parser-20261109-review/`，未入库。`legacy-gzip02-run.log` 记录旧版独立进程退出码 1，`fixed-gzip02-run.log` 记录新版仍存活；`current-integration-native.log` 和 `current-integration-legacy.log` 记录实际 HTTP 路径。早先临时运行的缺少 agent-instructions.md、并发快照中 500/4xx 不一致，以及未复现的 deflate 尝试均保留失败记录，不用于证明修复通过。

CONFLICT：复核期间，其他进程同时修改 `http.ts` 的解析错误处理和既有 4xx 断言。本次没有编写或覆盖这些生产改动；其错误状态调整不是修复此 CVE 的必要条件。上述真实 HTTP 结果绑定日志对应的编译快照，不能自动推广到后续并发变化；输入 SHA-256 见 `verified-inputs.json`。本节只追加本次事实，不改写前文 500 契约历史，也不修改共享治理、FEAT-037、UPSTREAM 或旧安全来源包。

FACT：另读到 `src-tauri/agent-runtime/agent/node_modules/body-parser/package.json` 仍为 **2.3.0**。这是现存桌面打包运行树，不能用 vendor 安装树 2.4.0 宣称其已修复。本次未重打包、覆盖或启动该运行树，未检查安装中的二进制/Hosted Windows，也未运行全仓 verify、Figma 或真实 Provider。当前结论为 **PARTIAL：源码依赖候选及有界漏洞对照已核实，完整 Agent 测试受 EPERM 阻断，桌面运行包修复尚未验证**。

独立只读预审由新的 reviewer 上下文完成，范围为 `review-snapshot/snapshot.json` 绑定的五项 dirty 候选文件及原始日志抽查；base/head 均为上述完整 SHA。未发现需修正的新增 P0–P3 finding，并发解析错误处理中间件另行检查且未发现具体集成缺陷。审查未重跑测试，结论仍为 PARTIAL / NOT_VERIFIED；这不是正式提交审批、发布验收或完整测试通过证明。审查后仅追加本段收据，代码和锁文件不变。
