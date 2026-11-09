# canvas-plugins 上游追溯

## 来源与固定版本

- 上游地址（FACT）：https://github.com/basketikun/infinite-canvas 。依据：[vendor/README](../README.md) 与 [历史来源清单](../../docs/changes/2026-09-22-agent-desktop/evidence/vendor-source-manifest.json)。
- 固定上游提交 SHA：UNKNOWN。现有材料只将 `e6d0911e9d509d00150eaab02f9ca05be94ffc46` 标为审计参考提交 / `referenceCommit`，并明确为本地适配快照；不能据此证明当前副本逐文件来自该固定提交。
- 本仓首次引入 LICENSE 的提交（FACT）：`b45c5bc7a180c641dbcc3d127d1106f05174df12`，`chore: integrate KK Studio 2.1.0 source into main (#9)`。这是 KK 集成提交，不是上游 SHA。一级目录未发现 `.git`；本轮未访问上游。
- 许可证（FACT）：MIT，Copyright (c) 2026 basketikun；见本目录 [LICENSE](LICENSE)，保留许可证、作者声明与源码注释。
- 上游目录（FACT）：`plugins/canvas/` 与 `web/src/lib/canvas/`，依据 vendor/README.md；本地含 sdk、html、markdown、sticky-note、svg 与 host 参考源码。

## KK 补丁与已知缺口

- 本地工作区 package.json 命名为 kk-studio-canvas-plugins，聚合 SDK 与四个插件；sdk/build.mjs 将产物同步到 KK 根 public/plugins，而非旧 web/public/plugins 路径。
- 完整上游差异及 host 参考源码逐文件映射：UNKNOWN；目录映射不能证明所有文件来自同一固定 SHA。旧子目录 README 仍包含上游构建路径，不作为当前同步指令。
- 插件权限/实验隔离状态见 [ADR-031](../../docs/architecture/adr/ADR-031-plugin-permissions-and-sandbox.md)。legacy 在宿主 realm；实验 T1 不等于生产隔离，不得借同步开启生产门。

## 同步与验证步骤（后续操作方案，本轮未执行）

1. 新建有界同步任务，先确认真实上游基准及完整 40 位 SHA；无法确认则保持 UNKNOWN，不把参考提交升级为已验证基准。
2. 保存当前源码/锁文件指纹与本地 Git 差异；历史 manifest 仅是历史快照，不能当作当前完整指纹。
3. 在独立临时目录准备已确认提交，逐文件对照本模块上游路径、LICENSE 与上述 KK 补丁；人工审查并重放补丁。禁止直接拉取覆盖当前 vendor，禁止夹带 node_modules、dist、会话、日志或凭据。
4. 依锁文件在隔离环境安装依赖（禁用依赖安装脚本），运行下述模块验证；失败保留原文件及失败证据，不弱化根检查或生产门。
5. 补充确证 SHA、完整补丁清单、输入指纹与回归证据，经审查后由独立授权的提交/合流任务处理。本轮不 commit、不 push。
   模块验证：工作区 typecheck/build、SDK/四插件产物与宿主加载兼容回归；权限默认拒绝与新包生产门保持关闭。生成 public/plugins、dist 与 node_modules 不作为上游源文件引入。
