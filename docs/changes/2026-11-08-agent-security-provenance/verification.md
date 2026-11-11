# Agent 依赖暴露面与插件隔离复核

- Task：TASK-SEC-AGENT-AUDIT-20261028；关联 TASK-MOD-P5 与 vendor 追溯。
- 日期：2026-11-08（UTC+8）；基线 HEAD：cc222004d8b3104357854d9c6b7a331d0c52a869。
- 结论：PARTIAL，静态暴露面评估完成；没有实施依赖升级，没有漏洞利用复现，也没有关闭原任务。现有历史验证不改写。

## 证据与审计范围

读取 task-ledger.json 中原任务及 TASK_LEDGER.md 对应正文、2026-10-28-zod-security/verification.md、当前 Agent package.json/package-lock.json、server/http.ts、server/mcp.ts、已安装包版本及相关解析实现。历史验证记载剩余六个包（4 moderate/2 high），并未完成暴露面评估。

本轮只读命令：`npm audit --prefix vendor/canvas-agent --omit=dev --package-lock-only --json`；原始 JSON 保存于工程外 `../output/security-provenance-2026-11-08/agent-production-audit.json`（相对仓库根）。结果为七个受影响包，5 moderate / 2 high / 0 critical；不是七条公告，SDK 与 fast-uri 各含多条公告。新增 @hono/node-server，不能继续把历史“六项”称为当前计数。npm audit 非零退出代表发现公告，不是账户/额度限制。

锁定与安装版本一致：SDK 1.30.0、body-parser 2.3.0、fast-uri 3.1.8、hono 4.13.8、ip-address 10.7.2、qs 6.16.0；@hono/node-server 锁定 2.1.1。审计不等于已运行二进制/分发包溯源，也不覆盖 dev 依赖。

## 逐项暴露面

| 包 / 公告                                                    | 当前路径与结论                                                                                                                                                                                                                                                                                  | 修复边界 / 未决项                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| body-parser 2.3.0；GHSA-27r3-jxmh-p828，high，>=2.0.0 <2.4.0 | Express 5.2.1 -> body-parser。http.ts:114 在 Origin 与 token 中间件之前执行 express.json({limit: "30mb"})；已安装 read.js 支持内容解压。FACT：压缩 JSON 处理在鉴权前可达。INFERENCE：公告所述尾随压缩字节导致 DoS 的入口真实存在，loopback 限制远程直接访问但不是认证保护；未进行实际崩溃复现。 | 优先隔离验证 body-parser >=2.4.0 的最小锁文件更新，再做压缩尾字节 RED/GREEN、正常 JSON/30MB/认证与 Agent 回归。不能声称 token 已挡住解析器，也不对正在运行的 Agent 发攻击请求。                                                                                         |
| @modelcontextprotocol/sdk 1.30.0，high                       | mcp.ts 只导入 McpServer 与 StdioServerTransport，注册固定 Canvas/CodeBuddy 工具。源码检索未发现 SDK OAuth 客户端、HTTP MCP transport、bearer auth 或 MCP experimental task 注册。因此 OAuth 凭据、跨源 HTTP 重定向、HTTP 批次、bearer audience、任务会话公告的特定入口未在该生产路径发现。      | 公告 GHSA-6qxp-vccf-f47h、22jm-h49p-29qw、46jr-4wx8-v453、rvq5-wwqv-78pq、f897-62hf-6gxq、6prh-2h8m-c8cw。边界修复版本包含 1.30.1/1.31.0/1.32.0；不能因 stdio 就宣布验证内存公告不可能受影响，公共 JSON/schema 校验的 stdio 影响仍 UNKNOWN。无利用复现，不做 SDK 盲升。 |
| fast-uri 3.1.8，moderate                                     | SDK -> ajv -> fast-uri；已读 SDK AJV provider 在 schema 编译/校验使用 Ajv。Agent 工具 schema 本地固定，未见外部提供 $id/$ref 或用 fast-uri 作网络安全决策。当前公告触发输入是否到达 URI 规范化仍 UNKNOWN，不声称完全不可达。                                                                    | GHSA-w74x-v6f9-j3xg、xhq7-xmqj-769h、wjr9-j795-jxcr、333x-w4r6-6crp；审计范围均在 <3.1.9。隔离更新并验 schema/工具协议。                                                                                                                                                |
| hono 4.13.8 / @hono/node-server 2.1.1，moderate              | SDK 的传递依赖。Agent 源码未导入 Hono、其 Node adapter 或 serveStatic；独立 HTTP 服务为 Express。双重解码静态路径入口未在本 Agent 生产调用链发现。                                                                                                                                              | GHSA-5r4p-p66f-jhc7（>=4.12.4 <4.13.11）、GHSA-rmxm-3fg6-px4f（>=1.19.10 <2.1.3）。不代表其他应用使用这些依赖安全。                                                                                                                                                     |
| ip-address 10.7.2，moderate                                  | SDK -> express-rate-limit -> ip-address。Agent 源码无 rateLimit/Address6 直接调用；独立 Express 没有接 SDK HTTP 限流器。长 zone identifier 到 Address6 的生产输入链未发现。不要混淆 Express proxy-addr 所用 ipaddr.js 与本包。                                                                  | GHSA-rxp7-6hxx-x8q5，<=10.7.3。未证明全项目/第三方动态使用不可达。                                                                                                                                                                                                      |
| qs 6.16.0，moderate                                          | Express/body-parser 的传递依赖。当前公告针对 qs.stringify 的 arrayFormat: comma 及对象自有非函数 toString；源码未发现 qs.stringify 或 urlencoded 中间件。req.query 的解析存在不等于该 stringify 漏洞入口。                                                                                      | GHSA-6pq8-jhm2-2vcw，>=6.7.0 <=6.16.0；修复版本需另核 npm 元数据，未猜版本。                                                                                                                                                                                            |

所有“未发现”均限定本轮读取/检索到的当前 Agent 源码与锁定依赖路径，不是数学上不可达证明。七包 audit 均报告 fixAvailable，但这不是兼容性/验收通过证明。本轮未执行 npm audit fix、安装、升级或锁文件改写；没有受控漏洞复现与升级后 Agent 编译/回归证据，保留明确的 body-parser 高优先级后续，不随机改依赖。

## 插件隔离现状（未修改）

读取 P5 intent/spec/plan/review/verification 与 ADR-031；台账仍 PARTIAL，ADR 为 PROPOSED。已有验包、权限交集、受限 RPC、消息额度/身份/重放/撤销与实验 T1；历史 Edge fixture 不等于生产沙箱。

当前源码事实：pluginLoader.ts:153 的 options 默认空对象；:186 要求 enableSandboxPackages === true，否则拒绝执行新清单包；:713 生产单例为 createPluginLoader()。src 检索未找到任何生产 opt-in。生产门仍关闭，本轮未打开。legacy 继续宿主 realm，并非隔离；T1 仅实验 Web，Desktop IPC、跨浏览器/WebRTC 等逃逸面、资源耗尽、独立安全审查、Figma 授权/撤销 UI 与 T0/T2/T3 尚未验收。

## 追溯与边界

已新增三个 vendor 一级 UPSTREAM.md：共同上游 URL 有仓内证据，MIT/basketikun 已核对；e6d0911e9d509d00150eaab02f9ca05be94ffc46 只保留为 referenceCommit，固定上游 SHA 与完整补丁差异均为 UNKNOWN。保留原 LICENSE，写明模块路径、已知 KK 适配与后续独立同步/验证步骤；未访问/拉取上游，未覆盖 vendor 源码。

初始 git status 已有未跟踪 agent、help，两项未读取、未修改或清理。本轮不改存储格式、不改生产/验收/CI 门、不改台账状态、不 commit、不 push；未使用 Antigravity 或第三方工具，未观察到 Antigravity 额度、限流或账号受限信号。未运行完整 verify、真实 Provider/原生或独立审查，不能标为全量交付。

## 本轮限定验证

- 四个新增 Markdown 文件经本机已有 Prettier 格式化，未格式化其他文件。
- 插件权限限定测试：8 pass / 0 fail / 0 skip，含 production never evaluates new code；不代表真实浏览器或原生隔离验收。
- 仓库目录检查脚本退出 0；未修改任何规则或基线。
- Git whitespace 与新增文件 UTF-8/本地相对链接另作最终检查；没有运行完整 verify 或 Agent 编译/测试（本轮未改变 Agent 实现/依赖）。
