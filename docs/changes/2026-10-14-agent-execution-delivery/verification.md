# 验证记录

- Task ID：TASK-AGENT-UX-20261014；日期：2026-10-14。
- 本轮实现、受控 UI 与失败恢复验收通过；真实 Provider、Hosted、安装/签名发布和用户日常数据验收不在本轮完成声明中。
- 独立审查及最终测试源码：4e38351c3743abeb9169bf680b629fbcd3fba513；基线：388f418e3f0e59065933f2ef5b48ec93922d9d7e。原 checkout HEAD 51fccfc7 的 dirty 上下文是未验收输入。
- 初始 Desktop/Web 2.1.17；隔离首轮 2.1.18。并发任务将 primary 推进 2.1.19 后刷新其上下文，本轮 Desktop/Web 2.1.20，Mobile 2.1.1。没有更换存储 key、项目 ID、凭据或 schema。

## 实现与 RED/GREEN

复用 AgentChatItem.detail、既有活动流与审批/停止入口，以原生 details/summary 展示过程；同项更新合并，终态不回退，保留 thread/turn 归属。只有明确 exit/status/error 才判成功或失败，完成阶段但无结果显示“已执行 · 结果未报告”。

画布复用 CanvasHud.projectStatus、task.completedOutputs、persistence.saveState。内存派生标志只提示“结果已返回，正在保存”，已归档计数才可显示完成；未知/部分/取消保持原门禁。最终保存失败保留已经发布的结果，重试仅保存，不再次发送生成请求。

Agent 首轮 5 个预期失败及后续归属/终态竞争 RED 已修复；HUD 4 个状态 RED 和 loading 边界 RED 已修复。107 定向检查最终通过；独立源码检查另有 38/38 单测。新增 5 项 production 场景含归档延迟、坏数据、IDB 写入失败、只保存重试、重载及受控 native 回执。

完整回归暴露长状态文字阻挡图片真实点击。保留原测试断言，6 行 CSS 让信息和父容器穿透，按钮/任务控件保持可点击。独立审查 R1 又发现 1099 展开对话的父 HUD auto 覆盖；响应式规则修正，并在真实开/关对话后排除整个 HUD、检查取消命中。

保存夹具原先先解除故障、后台保存抢先移除按钮，产生一次 flaky；现到真实点击捕获阶段才解除故障。组合历史测试的固定右键旧点实际命中视频 model-button，见[RED 命中证据](evidence/canvas-history-red-hit.json)；改为每次复用原空白扫描，撤销/重做/键盘/图层全部断言保留。未放宽 timeout、retries 或 forceClick。

## 最终检查

| 检查 | 结果 |
| --- | --- |
| lint、版本、功能/账本/Markdown/索引门禁 | PASS |
| typecheck、UI、format、production build | PASS |
| Node unit/deploy | 1100 PASS、0 FAIL、14 既有 SKIP（1114 total） |
| Agent suite | 172 PASS、0 FAIL、2 既有 SKIP（174 total） |
| 全部 production browser | 525/525 PASS、0 retry、0 flaky、0 skip |
| development 1421 四插件加载/编辑/恢复 | PASS、errors=[] |
| official Tauri release 2.1.20 | 构建 PASS，17/17 隔离 WebView2 检查 PASS |
| 独立源码审查 | SOURCE PASS / NO FINDINGS，绑定 4e38351c |

最后 npm run verify 在固定 1423 被其它任务占用时以 1 退出；此前各阶段通过。没有复用或终止它的进程。端口释放后从同一冻结源码、同一 production build 补跑全部 browser，再串行执行 development，所有门禁阶段最终通过；compound 原出口保留为 1，不能称该命令出口 0。见[占用原日志](evidence-manifest.json)、[最终浏览器日志](evidence-manifest.json)、[525 项机器报告](evidence/production-browser-results.json)、[开发收据](evidence/development-receipt.json)。

首次缺 canvas-agent/dist 和 public/plugins 导致门禁失败；按原 agent:build/plugins:build 流程补齐生成物，未改测试或检查器。依赖最初为 junction，后换为隔离 npm ci --ignore-scripts --no-audit --no-fund，primary 依赖目录保留。原失败见[首轮完整记录](evidence-manifest.json)与[组合记录](evidence-manifest.json)。

## 实际运行链路与身份

Web production：原 Playwright 配置启动 node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 1423 --strictPort；URL http://127.0.0.1:1423/、mode production、应用内部 project route。Agent 链 main.tsx → App → ConversationPanel → ConversationMessageFeed → AgentConversationMessages → AgentExecutionProcess；保存链 App → Canvas → CanvasHud.projectStatus。主入口 tokens/global/ui tokens、AgentComposer 引用 agent-panel.css，App 管理页面 CSS；responsive-content 的平板规则最终保持 HUD 穿透。

实际加载 index-C31ISFx5.js、index-CnbkXRxN.css；生成提示与执行过程在 390/1099/1920 的 DOM、键盘操作、12px 最小文字与溢出检查通过。1099 的保存截图为展开对话状态。见[390 过程 DOM](evidence/execution-390.dom.json)、[1099 过程 DOM](evidence/execution-1099.dom.json)、[1920 过程 DOM](evidence/execution-1920.dom.json)、[1099 保存截图](evidence/saving-1099.png)。已逐张查看过程与 native 截图。

Desktop：官方 build:agent --no-bundle 经 ensureDesktopRelease 生成 current receipt，官方 start-kk-studio.bat --background --data-dir 启动候选 EXE。http://tauri.localhost/ 的 WebView2、原生创作/记忆数据根、隔离 profile/CODEX_HOME、EXE/PID/启动时间与 CDP9354 后代归属均验证；自有实例已关闭，不接管日常窗口。只有 Agent runtime start/status/stop 使用 loopback transport，真实 invoke/storage/close 透传；没有模型 turn 或 native vault 写入，CDP 接入前活动不宣称验证。

EXE SHA-256：f2b71804a8831d309f7850e846b784b5bb6bb66e3398429a2a1ffb266203e4d1；输入指纹 db01d5500da525ea66962fc44c8e1ea5f376fe80ad2e255e564c81ab155f8f98。加载 JS SHA-256 167a76f10524ed7a9816eb3d9e5f6c7754cac01fa28c14066edc62b6f3c18285、CSS 1cb7490bddae2a2052630abd24b75f600b5043d2912851d3299be749ae1393c8。见[原始收据](evidence/receipt.json)、[构建身份](evidence/desktop-build-identity.json)、[native DOM](evidence/native-running.dom.json)、[折叠截图](evidence-manifest.json)。

## 保全与范围

隔离捕获当前 200 个文件，210 个初始文件保留 SHA 与副本。并发上下文刷新后 151 个源码/测试相关文件在集成前无漂移，原 index 不变；只同步本轮拥有的增量，账本/功能卡和变化文档采用语义合并保留其他任务。主目录 lint/typecheck、107/107 相关单测、UI225/0、format 与 official build通过，canonical同17/17实际WebView2检查通过。140个未拥有源码哈希保持，旧任务和未触及功能语义保持；暂存内容仍为空且tree匹配原HEAD。同步当刻index字节相同，后续stat/cache字节刷新，不混作暂存内容变化。见[集成收据](evidence/primary-source-sync.json)。未 push/merge/release。

治理生命周期 updatedAt 沿用 UTC 2026-10-13，本地任务日期是 Asia/Shanghai 2026-10-14。FEAT-009/016 继续 PARTIAL；本轮 UI 验收不升级真实供应商能力。

## 主目录桌面补验

canonical EXE FileVersion/ProductVersion均为2.1.20；dirty checkout HEAD仍为51fccfc7，本轮src/tests SHA与冻结candidate4e一致。官方EXE SHA-256 e0003b71a2a4223e382e8621abfab026aac2138408afbb693b5069c0d0e0dcce，输入ccb59dfb3742a3ea9e951d50630873257a8f1e5da295b3c390d7dee292961362，receipt current。使用独立data/profile/CODEX_HOME启动主目录EXE后同17/17检查通过、errors=[]，加载JS/CSS与候选SHA相同，自有实例关闭。没有打开用户日常项目。见[canonical收据](evidence/canonical-native-receipt.json)、[DOM](evidence/canonical-native-running.dom.json)、[截图](evidence-manifest.json)。

版本化日志使用gzip无损归档，解压SHA与保留原件一致；未删除原件或改写失败。归档仅用于保存原始诊断空白，不放宽源码/Markdown格式门禁。


## 2026-10-30 历史原始证据外置说明

本次ORG-6将历史E2截图/原始日志/录屏外置到容器output；原引用现指向[2026-10-14-agent-execution-delivery manifest](evidence-manifest.json)。原始sourcePath、commit/blob、sha256、大小与原链接目的地逐项可查；原图片嵌入改为同文字的清单链接。原结论、失败、时间和数字未重写，不代表当前功能重新验收或main已合流。E1摘要、JSON、关键图及活跃运行资料仍留仓；恢复仅写新空目录并复核字节。
