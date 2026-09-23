# 默认 Codex 与模型目录验收

日期：2026-09-22。状态：Web 首批已回传原工程并最终验收 PASS；完整结果见下方追加记录。整个能力仍为 PARTIAL，桌面托管、其他登录软件和非兼容 API 不是本次通过项。

## 对象与运行链

- HEAD `cf344ddcdf039c6e62aeb9c65106e2a2339c0bb4` 加未提交实现；隔离分支 `feat/TASK-AGENT-001-codex`。保留原工程已存在的 UI、Design System、提示词库和任务变更，不 commit/push。
- Node 24；没有升级依赖。源快照和回传 SHA-256 清单在工程外 `D:/kk-studio/output/agent-codex-20260922/`。该目录同时保存完整命令日志、失败复现与恢复副本。
- 实际启动：`npm run dev:agent`；Vite development `http://127.0.0.1:1421/`，脚本 `/src/main.tsx`，`data-runtime-mode=development`。Agent 17381 使用官方 Codex app-server 的现有登录，未新增 API Key，未操纵 Codex 图形输入框。
- 生产回归：`npm run verify` 内先 build，再 Playwright 在固定 1423 上启动 Vite preview；浏览器证据绑定当前 dist 的哈希，见 evidence/acceptance.json。
- 页面链：`src/main.tsx → App.tsx → ConversationPanel → AgentComposer/ConversationComposer → ModelPickerMenu`；画布链 `CanvasNodeItem → CreationComposer → ImageModelParameters/ModelVariantControl`；设置链 `SettingsPanel → ModelProviderSettings → ProviderModelCatalog`。全部沿用 KK 组件和 Design System。

## 实际能力证据

| 场景 | 结果与范围 |
| --- | --- |
| KK 输入框 → 已登录 Codex | 真实回复 `KK_CODEX_READY`，不是 mock；无需 OpenAI API Key。evidence/real-ui-smoke.json |
| KK 画布 MCP | 真实 Codex 读取画布、新建指定文本节点；刷新并重新进入项目后节点仍在。evidence/codex-mcp-canvas.png |
| 连续对话、刷新恢复 | 两次真实 turn 的 threadId 与 conversationId 相同；第二轮准确答出第一轮暗号 `KK_CONTINUITY_472`；刷新仅恢复两条 assistant，无重复。evidence/real-continuity.json |
| 模型与额度 | 当前账号返回实际模型目录；2026-09-22 13:49 UTC 的额度快照显示共享周额度剩余 26%，09-27 09:12 本地时间重置。百分比是快照，非固定承诺；未知/请求失败如实显示。evidence/usage-smoke.json |
| Codex 内置生图 | 从 KK 请求一张蓝色玻璃球，真实 native image_generation 完成，归档到 KK 自有素材和画布。evidence/native-image-smoke.json、codex-native-image.png；使用 Codex 账号额度，不等于所有 ChatGPT 功能已接通。 |
| Agent → KK 已配 API | 受控 HTTP 供应商验证真实请求、正确 connectionId、生成任务受理与结果归档。没有本轮逐个调用用户真实收费厂商，不能声称逐厂商验收。 |
| 参数映射与搜索 | 浏览器测试准确提交 `aurora-1-2k-high`，未猜造 quality 字段；搜索厂商、4K、16:9、错拼候选；8K/反向比例不误匹配；切型号清除不兼容尺寸；图中型号参数位于参数区。model-parameters.png |
| 交互和身份 | 来源分级、返回、全部、置顶、关闭保留页面；重名多账号按连接身份路由；Agent/API 草稿独立；连接失败不转收费生成。 |
| 凭据 | Agent Token 不写 localStorage/URL；同源桥后端注入；跨站探测 403。未读取或复制登录凭据；本轮浏览器均为临时测试 context。 |

## 最终候选门禁

`merged-verify-replay-fix.log`：`npm run verify` exit 0。

| 命令 | 结果 |
| --- | --- |
| `npx tsc --noEmit`（verify 的 typecheck 等价命令） | PASS |
| `node --test tests/unit/*.test.ts` | 351 PASS / 0 FAIL；未加 --import tsx |
| `npm run lint` | PASS，含 53 任务与 29 功能门禁，0 违规 |
| `npm run ui:check` | PASS，151 组件文件、0 违规 |
| `npm run format:check` | PASS |
| `npm run build` | PASS；大 bundle 与上游 PURE 注释提示仍在，不作为错误隐藏 |
| Playwright `tests/browser`（verify 的 test:ui） | 246 PASS / 0 FAIL / 0 flaky |
| `npm run features:check` | PASS，29 功能、0 违规 |
| `npm run agent:build` | PASS，包含条件会话准备安装校验 |
| `npm run test:agent` | 125 PASS / 2 SKIP / 0 FAIL；两个 POSIX 权限用例在 Windows 跳过 |
| 独立审查复验 | 当前重连补丁 24 项 PASS + 3 个内存复现场景 PASS；未发现新增 P1/P2。review.md |

## 失败记录与修正

1. 初始 port 的具名 SSE、握手、会话/Token 适配失败已用真实协议修正；旧审计报告保留，不改写历史结论。
2. 合并并发 UI 时首次完整浏览器回归 238 PASS / 8 FAIL：新设置字段尺寸、单一目录回退，以及 Agent/API 独立草稿、插件入口和文本预设的旧测试预期不一致。逐项修正真实实现/行为断言，59 项定向 PASS，随后 246 项完整 PASS；未禁用检查。
3. 真实多轮初测刷新出现重复回复。持久历史的复合 ID 与 SSE 的 itemId 不同；现按 thread/turn/item 去重，已完成历史不再追加 delta。真实复验 PASS。
4. 独立审查复现旧 hello 覆盖新 SSE，以及初始化缓存工具迟到执行。现在先播种历史再顺序重放新状态；初始化写工具直接返回“未执行”，结束事件取消队列，下一回合创建新取消信号。RED→GREEN 并独立复核。
5. 操作已受理但回执失败时，阻止新 requestId 的自动重试；显示未知状态并中断，避免重复收费。项目切换、迟到审批/取消、未登录/断流继续覆盖。

## 尚未证明

没有运行本轮 Tauri release 同态验收，没有完成一键服务托管、Google/豆包/WorkBuddy/后台网页登录，也没有证明任意 API 可通用适配。相关开放任务与原因见 remaining.md。真实 API 目录标准通常只给 ID，不能保证返回全部参数；provider-research.md 记录了逐协议证据和人工声明边界。

## 原工程最终回传与验收

原工程 `D:/kk-studio/KK-Studio-2.0` 已按逐文件 SHA-256 前置校验与备份回传本任务 117 项增量，保留并发 TASK-DS-002、TASK-UI-005、TASK-UI-006 的实现和当前状态。回传前发现目标文件更新时曾主动拒绝写入并重新合并；未覆盖并发修改，未 commit/push。

原工程最终 `npm run agent:build`、`npm run test:agent` 和 `npm run verify` 均 exit 0：**351 Node、266浏览器、153组件0违规、29功能/54任务0违规**；Agent125通过/2 Windows权限跳过。完整日志 `root-verify-final.log`、`root-agent-build.log`、`root-agent-test.log` 保存在工程外证据目录。原工程实际 `npm run dev:agent` 再次完成两轮同线程与刷新恢复，最新额度快照25%；本次启动仍在运行。

最新产物哈希及源码清单为 evidence/acceptance.json 和 evidence/source-manifest.json。浏览器 route `/` 的页面链同上，实际脚本 `/src/main.tsx`。所有浏览器均使用独立测试 context，不读取真实项目或 Provider Key。门禁产生的旧目录证据先备份，完整结果另存工程外，再恢复原文件；本任务证据保留在本变更目录。

最初九项搬运清单的当前增量见 port-audit-update.md；Agent 可用不等于插件、WebDAV、音频、严格 vendor 交付及所有外部软件均已完成。原本 Tauri release 是此前其他任务产物，未包含本轮新的原生同态验收。
