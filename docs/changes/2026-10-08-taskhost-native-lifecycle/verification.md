# Verification：T5 原生生命周期

- Task ID：T5；状态：本机验收 PASS，独立审查与托管门禁待完成；2026-10-08。
- [Intent](intent.md) · [Spec](spec.md) · [Plan](plan.md) · [Review](review.md)
- Base：`5b0eb6a341335c6bcdefcadf59be3ae4c2e4cdb3`。
- 环境：Windows，Node 24.21.0 / npm 11.19，独立根/Agent/plugin npm ci，未借用 node_modules。

基线 npm run lint、npm run typecheck、`node --test tests/unit/nativeTaskHost.test.ts tests/unit/taskRecovery.test.ts` 通过；53 tests / 53 pass / 0 fail / 0 skip。日志暂存工程外 `D:/kk-studio/.verification/T5-native-lifecycle/`，新运行文件不覆盖历史证据。

## 失败先行与修复

1. 未修复 fresh release 在 HTTP 响应头等待中取消，超过 5 秒仍为 submitted；[原始 RED](evidence/red-cancel.json)。图片请求、响应体读取和结果下载未等待取消通知。复用文本宿主的 race-safe `cancelled`，在三个异步等待及 DNS 解析处接入取消；已发送请求保留 unknown，已归档 slot 不丢失。
2. 合法 IPC 请求省略 `promptHash`，或供应商响应不含 `id`，宿主写入 null 导致严格资产元数据校验拒绝归档；[原始 RED](evidence/red-optional-metadata.json)。现在只在可选值存在时写入，不削弱资产校验。

嵌套 journal 假设、数量 2、编译后 prompt 标记、首页导航和启动读取时机均为验收脚本设置问题，原失败保留在工程外 `.verification/T5-native-lifecycle/`，不计为产品 RED。前端 intent 在原生 IPC 返回前仍可能 queued；请求到达时必须同时有同身份项目 intent 与 submitted native journal。旧 Web 的提交前 submitted 门禁继续通过。

## 当前本机验证

| 检查 | 结果与证据 |
| --- | --- |
| 独立安装和基线 | 根/Agent/plugin 正常 npm ci；lint/typecheck；53 项恢复相关 Node 全部通过 |
| 完整 `npm run verify` | [日志](evidence/verify-initial.txt)：root 702/710，Agent 172/174，0 fail；原有 8/2 skip；浏览器 388/388，无 flaky |
| Rust | fmt/check PASS；[97/97 test](evidence/rust-test.txt)，[client check](evidence/client-check.txt)；原有 dead_code warning 保留 |
| 原生构建 | `client:build:agent -- --no-bundle` 与 CI 同款 `client:build -- --no-bundle` 均通过 |
| 实际原生运行 | `npm run client:taskhost:test`：[十组 PASS](evidence/native-ci-equivalent.json)，5 次实际进程启动、errors=[]、合成凭据 cleanup=true |
| AC-1/2 | UI intent/native journal 在 POST 前落盘；重放、WebView reload、同数据根异常重启只有一次 POST；改变同身份请求被拒绝 |
| AC-3/4 | 响应头/响应体/下载中取消分别实测 14/15/128ms；unknown 保守受理；归档原件 hash/身份保持；[恢复 UI](evidence/native-unknown-recovery.png)为 1 success + 3 unknown，无普通重试 |
| AC-5 | WebView reload 后文本容量仍占用；满载在 journal/POST 前被拒；取消后新任务成功；异常终止后的流式草稿保留 unknown |
| AC-6 | 本机完整回归通过；当前 committed SHA 审查、PR 当前头 CI、主线推广分别记录，不从本机证据推断 |

实际命令、data root/profile、源文件 hash、EXE hash、每次 URL/script/styles、POST 与 key 计数在原生收据中。Desktop production URL `http://tauri.localhost/`、CDP 9349；`src/main.tsx → App → StartPage/Canvas/TaskWorkbench → nativeTaskHost → Tauri TaskHost`。Web 的现有验证使用固定 1421 development/1423 preview；未改可见 UI，截图只证明恢复状态。CI 增加同一原生脚本，不能用 mock IPC 替代。

初次成功产物 Desktop 2.1.5 / Web 2.1.5 / Mobile 规划 2.1.1；EXE SHA-256 `41cb2112779ac2de049ba1d45f362657577d712e6166713b9a20dc65809991d8`，JS `index-CznBbzGu.js`。此收据的 sourceHead 是基线，实际 dirty 源文件 hash 已逐项记录；最终提交/最新主线组合须补新证据，不能改写旧收据。

## 分支收敛与边界

PR #34 已 squash 合入 `main@5b0eb6a341335c6bcdefcadf59be3ae4c2e4cdb3`，候选/合并 tree 一致；[主线 hosted CI](evidence/pr34-main-ci.json) verify/deploy-linux 成功。PR #35 的阶段工作台由另一执行上下文集成，模型能力分支仍由原执行者处理；不覆盖其源码或重复 cherry-pick。详见[状态盘点](status.md)。

本机 fixture 证明原生宿主，不能证明付费 Provider 质量、最终账单、VPS/Mobile/ComfyUI 或安装器发布。新保存的浏览器供应商元数据在立即强杀整个 WebView 进程树时曾丢失，[现场](evidence/provider-abrupt-exit-observation.json)；系统凭据和原生任务/素材保留，正常应用退出后配置恢复通过。该配置落盘缺口和既有 native image health/连接门禁缺口分别登记 TASK-PROV-005/006，保持开放，不能随 T5 验收升级。
