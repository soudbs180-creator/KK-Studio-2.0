# canvas-proxy 上游追溯

## 来源与固定版本

- 上游地址（FACT）：https://github.com/basketikun/infinite-canvas 。依据：[vendor/README](../README.md) 与 [历史来源清单](../../docs/changes/2026-09-22-agent-desktop/evidence/vendor-source-manifest.json)。
- 固定上游提交 SHA：UNKNOWN。现有材料只将 `e6d0911e9d509d00150eaab02f9ca05be94ffc46` 标为审计参考提交 / `referenceCommit`，并明确为本地适配快照；不能据此证明当前副本逐文件来自该固定提交。
- 本仓首次引入 LICENSE 的提交（FACT）：`b45c5bc7a180c641dbcc3d127d1106f05174df12`，`chore: integrate KK Studio 2.1.0 source into main (#9)`。这是 KK 集成提交，不是上游 SHA。一级目录未发现 `.git`；本轮未访问上游。
- 许可证（FACT）：MIT，Copyright (c) 2026 basketikun；见本目录 [LICENSE](LICENSE)，保留许可证、作者声明与源码注释。
- 上游目录（FACT）：`canvas-proxy/`；package.json 为 @basketikun/canvas-proxy 0.1.0、MIT，无声明依赖。

## KK 补丁与已知缺口

- 已知适配：index.js 导出 createProxyServer，并以 import.meta.main 限制启动监听；作为测试或宿主模块导入时不启动服务。依据当前 index.js 与 vendor/README.md。
- 相对真实固定上游 SHA 的完整补丁集：UNKNOWN。版本号及历史文件指纹不等于上游固定版本证明。
- 保留 README 的 loopback 安全边界；这是本地转发代理，不是认证网关，也不得通过来源同步开放公网监听。

## 同步与验证步骤（后续操作方案，本轮未执行）

1. 新建有界同步任务，先确认真实上游基准及完整 40 位 SHA；无法确认则保持 UNKNOWN，不把参考提交升级为已验证基准。
2. 保存当前源码/锁文件指纹与本地 Git 差异；历史 manifest 仅是历史快照，不能当作当前完整指纹。
3. 在独立临时目录准备已确认提交，逐文件对照本模块上游路径、LICENSE 与上述 KK 补丁；人工审查并重放补丁。禁止直接拉取覆盖当前 vendor，禁止夹带 node_modules、dist、会话、日志或凭据。
4. 依锁文件在隔离环境安装依赖（禁用依赖安装脚本），运行下述模块验证；失败保留原文件及失败证据，不弱化根检查或生产门。
5. 补充确证 SHA、完整补丁清单、输入指纹与回归证据，经审查后由独立授权的提交/合流任务处理。本轮不 commit、不 push。
   模块验证：根代理相关回归、导入无监听副作用、loopback 启动/停止和 HTTP/SSE 透传；不把本轮文档检查说成真实外部 Provider 验收。
