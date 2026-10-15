# Agent 画布同步验证记录

最终2.1.19原工作区生产浏览器520/520（零重试）与相关本地门禁均通过；节点位置、连线、IndexedDB重载、拖动取消和快速撤销已验。任务保持PARTIAL：Desktop/Tauri和发布验收未执行。compound verify遇另一任务端口占用出口1，后续独立完整浏览器/开发检查通过，保留原出口。

## 来源与运行链路

- 原 checkout：`D:/kk-studio/KK-Studio-2.0`，`codex/ui-redesign-20261011@51fccfc7879cf90f7caaf3ae8e10af4d97a2aa2c`，130 tracked + 70 untracked 候选；原 index 和全部初始文件哈希先快照。
- 隔离候选：`D:/kk-studio/.worktrees/TASK-CANVAS-SYNC-20261014`，`fix/TASK-CANVAS-SYNC-20261014-agent`。原 dirty 实现只作为未验收候选输入，本任务不接管其余改动。
- 首轮隔离 Desktop/Web 源码版本 2.1.18，Mobile 2.1.1；不是已发布版本，既有 EXE 未换包。
- Web production：`npm run build` 后 Playwright 原配置启动 `node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 1423 --strictPort`；URL `http://127.0.0.1:1423`，mode=production、entry=dist/index.html。真实页面入口 `src/main.tsx → App.tsx → Canvas.tsx → canvas hooks`；测试项目 route 为 /（应用内部 project 视图）。
- Agent 请求使用原 loopback fixture，经过现有 Agent/MCP 图更新调用链；未调用真实 Codex/Provider 或读取用户密钥。

## RED → GREEN

1. Agent 已移动图片至 (160,180)、新增节点 (320,500) 并删/加 reference 边；旧画布仍显示 (82,107)、新节点落在默认 (732,627)，旧线被回写，新线缺失。修复后 DOM、SVG 连线端点和 IndexedDB snapshot 一致。
2. 本地拖动中 Agent 移动另一节点至 (900,400) 并新增节点，Escape 原先把其他节点一并退回。取消只回滚本手势节点后通过。
3. 独立审查发现拖动预览被保存并 ACK 后，同节点 Agent 更新会覆盖活跃拖动。新增用例先观察 (162,147) 跳到 (900,400)，保护活跃 drag ID 与冲突回写后通过。
4. 删除 local/session 恢复副本，再 reload；只从权威 `kk-studio-next / creation / snapshot` IndexedDB 恢复位置、reference 边及原三个 item 内容。没有存储 schema、项目 ID、密钥或数据迁移。

## 首轮隔离2.1.18结果（历史）

| 检查 | 结果 |
| --- | --- |
| 定向纯函数/调用链回归 | [related-unit.log](evidence/related-unit.log)，exit 0 |
| 新增三项浏览器同步/取消/同节点拖动 | 全量 production report 中全部 PASS；另专项含菜单/引用能力为 5/5 PASS |
| 全量 Node unit/deploy | 1084 pass、0 fail、14 skip（1098 total） |
| Agent suite | 172 pass、0 fail、2 skip（174 total） |
| lint / typecheck / format / UI / build | PASS；UI 224/0 |
| 全量 production 浏览器 | 517/518 PASS，1 FAIL，两次 attempt 均失败，0 flaky |
| 完整 npm run verify | exit 1，停在浏览器失败；后续 development 在该命令中 SKIPPED |
| 单独隔离 development | exit 1；依赖 junction 导致字体 403，不能计 PASS；回写后在 primary 正常依赖路径再验证 |
| 独立静态预检 | 首轮任务7文件哈希绑定，无新增 P1/P2；不是 committed-HEAD approval |

首次完整检查还因隔离目录缺少 ignored 的 canvas-agent/dist 与 public/plugins 失败；补齐仓库原构建产物后相关单测与菜单通过。未改门禁或依赖版本。当前完整结果以 [原始日志](evidence/full-verify.log) / [生产浏览器报告](evidence/production-browser-results.json) 为准。

## 首轮2.1.18独立布局失败（历史与TODO）

首轮2.1.18中，`unified-image-command.spec.ts` 的宽图下游 port hit-test 失败，生成按钮本身通过。最终2.1.19完整production已520/520；固定23.33%development对照发现的既有遮挡仍为独立TODO，当前PASS不覆盖所有缩放值。修复前后用相同实际 UI 操作固定缩放约23.33%时，均命中同一结果节点的 creation-composer（z=10），而 port 所在 node-actions z=8，几何完全相同。见 [对照采样](evidence/wide-layout-comparison.json)。未修改或放宽该生产测试，临时诊断已恢复原字节；独立登记 TASK-CANVAS-WIDE-PORT-20261014。

这是额外布局缺陷，本次未修复；对照是 development 1421，有字体403限制，不能代替正式生产/原生验收。全部同步专项与原全量 production 位置/连线/历史/参考/结果回归已通过。

## 原工作区保护与回写

最初保护检查通过；回写前出现并发供应商任务21文件更新及版本2.1.18，初始保护门禁拒绝覆盖。重新保存当前候选快照，逐文件保留并发代码与共享文档、合并两个任务账本，版本继续自动增至2.1.19。原暂存内容仍为空；index二进制哈希因缓存刷新变化不等于暂存改变。最终回写和 primary 检查另存 [integration.json](evidence/integration.json) 与 [primary 检查记录](evidence/primary-checks.json)。仅本任务8源/测试、版本元数据和文档证据回写；不重置、清理、暂存或提交其他修改，不改真实运行数据。

## 组合候选

最终2.1.19在原checkout承接并发供应商修复；任务8个源/测试仍与独立审查哈希完全相同。最终typecheck/build/lint、36项相关单测、生产专项和正常依赖路径development以primary-checks.json为准；不能把首轮517/518全量结果称为最新组合全量PASS。

## 未验证

Desktop/Tauri 2.1.19 release、真实 Provider、Hosted CI、签名安装和用户实际项目验收未执行；不把 fixture 或共享源码 build 冒充这些结果。

## 保存回声与撤销竞争（最终补充）

原19组合41专项38PASS/3FAIL，快速键盘移动后Ctrl+Z被尚未观察的本地保存ACK覆盖；隔离原始实现三项全部PASS，确认是同步补丁引入的边界。Canvas记录最近发布图的语义fingerprint，外部ACK仅推进观察基线，保留更新的本地undo/edit；边仍执行能力reconcile。现有history测试断言和等待未改。最终隔离19组合Agent/history/connection生产25/25零重试PASS。原41失败与25成功日志、报告均保留，原工作区最终完整检查待记录。

## 最终原工作区2.1.19验收

最终任务8文件patch SHA256 `50feac5330efb52f370f12badd9bca2763408cc3d14ea80c9b4413697a35890f`，独立补审2026-10-14 02:16:28 +08:00匹配primary/worktree各8哈希，无新增P1/P2。ACK ref移入既有controls后Canvas299行，未修改UI门禁。

- Node1089pass/14skip（1103total）、Agent172pass/2skip、lint/typecheck/format/UI224/0/production build通过。
- 最终production1423浏览器520/520 PASS，0 FAIL，0 retry/0 flaky；节点位置、新增/删除/reference/result连线、IDB-only重载、活跃拖动、取消、快速undo均通过。
- 正式development1421四插件加载/编辑/恢复检查PASS，errors=[]。另临时dev Agent专项34/41，7项因fixture固定1423 origin无法连接，原失败保留且不作为产品PASS。
- 原compound verify因另一任务占用1423出口1；未复用/停止其服务器。端口释放后用同一最终build重跑全部生产浏览器；compound原出口不改写成0。
- 当前207文件快照中186个非任务文件SHA完全不变；另外3份供应商change文档在验证期间由并发任务更新，其当前版本与前后SHA均保留，本任务从未写入这些路径。原暂存内容保持空。仅任务既有源/测试/版本/文档与新证据写入，原始候选、恢复备份、worktrees和运行数据保留。

详见[最终检查收据](evidence/primary-checks.json)、[最终浏览器报告](evidence/final-production-browser-results.json)、[截图](evidence/agent-canvas-sync-primary.png)。Desktop/Tauri2.1.19、真实Provider、Hosted/签名发布和用户原项目人工验收仍未执行。
