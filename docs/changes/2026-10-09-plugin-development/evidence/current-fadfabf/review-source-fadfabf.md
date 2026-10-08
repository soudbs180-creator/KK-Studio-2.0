# Review：TASK-PLUGIN-DEV-001 精确源码与原生验收补审

- Task ID：TASK-PLUGIN-DEV-001；关联 TASK-PLUGIN-RECOVERY-001、TASK-PLUGIN-MARKDOWN-001、TASK-DESKTOP-FLUSH-001。
- Reviewer/context：`/root/mask_final_doc_review`，独立于 root 实现者的只读 Codex 上下文。
- 日期/时区：2026-10-09，Asia/Shanghai；独立37项测试 UTC19:56:00.1886198–19:56:01.9450236，另6项 UTC20:02:14.0624757–20:02:14.8208967；实际保存UTC见末尾。
- Base SHA：`8c921a525ae505a558b0efee641830f1d61166fa`。
- Exact reviewed head SHA：`fadfabf886641ee5590a14f28924cc4ae497be8a`，parent `c8ce21c84608f0451f13aa383cb2bf699f13ef50`。
- Branch：`fix/TASK-PLUGIN-DEV-001-same-origin-modules`。
- Worktree：`D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-PLUGIN-DEV-001`。
- 原独立报告保留：`D:/kk-studio/.verification/TASK-PLUGIN-DEV-001-20261009/review-source-dc3c03e.md`，SHA256 `5671871e562893fbf870245ec2ee666ca80967eeb5719e68030a9afc54f98711`。其 dc3 CHANGES REQUIRED/001 OPEN 结论未改写。
- 已独立读取 AGENTS/AI_RULES/REVIEW/BRANCH-POLICY/SDLC/PROMPTING、intent/spec/plan/verification、实际产品/测试增量和原始证据。规则blob与原报告相同，末尾列出。
- 工具：只读 Git/PowerShell、Node v24.21.0、TypeScript内存VM、实际相关单元测试及原始文件/EXE SHA256回读；不访问网络或端口，不运行新的native app或完整suite，不修改项目、索引或Git状态。
- 正式范围是已提交 fad。root 正在准备的未提交最终文档/归档不属于本报告，后续新 head 必须另补审；此报告没有把 dirty 文档预检当最终文档 PASS。

## 评审范围和方式

base→fad 为37文件、1971插入/72删除。先审 dc3→e3 的关闭修复及此前driver修正，再独立审 e3→bdb 的真实hook用例/生成权限、bdb→be5 的owned cleanup、be5→c8 的锁持有期原件检查、c8→fad 的仅诊断/事实文档增量。

原已审同源导入、JSX动态key校验、snapshot plugin完整保留/输入保护、精确marked14.1.4随包等产品blob未再改变。新产品范围只有 useCreationStorage 的 native关闭生命周期、nativeClose helper、main窗口 allow-destroy及其真实生成权限；CSP、存储schema/身份、远程HTTPS拒绝、旧任务状态机未变。验收driver与测试维护不替换产品保存队列。

本轮实际独立运行37项相关测试、6项真实hook回归、额外实际hook VM组合探针和diff/语法检查；另读取原始完整verify/browser reporter/Rust/client/fresh build/native收据和保护文件。native运行由root执行，本审查核对已提交驱动、原件、哈希和截图，不声称审查者重跑native或全量suite。

## 已查范围与证据

1. **关闭入口/队列。** App只挂载一处useCreationStorage。Native effect使用本地已锁定Tauri API的onCloseRequested；SDK实际await handler，未prevent时才自动destroy。handler在任何await前同步prevent；closing私有状态去重，每次事件都prevent。初次或重试读取以pendingRead等待，只有可写时flush；实际hook的串行queue/acknowledged/dirty继续负责耐久写，helper按dirty循环补存等待期间的新revision。失败不destroy，safe错误和现有重试/草稿入口保留；dirty读保护直接阻止关闭而不调用写。已卸载owner不destroy/report，异步晚到subscription及时unlisten。Web beforeunload原保存/阻止契约保持；native beforeunload不再在销毁阶段追加IPC写。只有成功排空后才destroy，没有直接绕过保存的新正常退出入口。

2. **真实hook而非逻辑替身。** 独立37/37覆盖新增7关闭契约及原30插件/codec/assets。独立6/6包括原3队列断言和新3真实hook断言，原conflict/新draft/acknowledged断言均保留。额外内存VM执行实际committed hook，验证read等待、revision6→7、重复事件、IO失败后同revision重试、保护draft零写、晚到unlisten和Web beforeunload；VM只模拟React生命周期和IO/窗口边界，不冒充真实磁盘/native行为。

3. **权限与生成来源。** 仅main能力添加allow-destroy，同既有allow-close范围；未新增文件、网络或系统权限。bdb保留gen/schemas/capabilities.json的真实生成语义，permissions/windows与源配置一致。两个desktop/windows schema的EOL变化已由root核实后恢复，正式delta无这些schema变化。e3→fad产品源码、SDK/marked/CSP/source配置等保持相同。

4. **完整验证和构建来源。** 原verify-e3实际exit1（809 tests，798pass/3fail/8skip）：原creationSaveQueue VM未映射新增Tauri import，尚未执行原断言。bdb仅显式映射平台边界并加入真正hook用例；没有删除断言。随后verify-close-final原件exit0，root804/812（原skip8）、Agent172/174（原skip2）；原browser reporter逐项检查447tests/447attempts/retry0，unexpected/flaky/skipped/errors皆0。development收据实际sourceHead=bdb、四正文/启停/刷新/unsafe0、零错误。Rust e3产品组合102/102及fmt有真实联合exit0；client/fresh Agent --no-bundle build实际exit0，5个旧Rust warning和既有构建warning保留。build来源be5，native来源c8，产品delta为空；不把原件sourceHead改为fad。428源码/config、2入口bundle和4插件来源身份另有原件且本审查回读，最终EXE实际19572224字节、SHA25612009ce4452f9b61e495f3d6931c0d4a0ef3040bf4ded501a88eb46d1e521e69。

5. **立即关闭及真实IO故障。** native-immediate-close-red原件保留：@026 driver+未提交立即关闭探针，旧EXE eaa83a…正常exit0却丢失最后SVG comment，closing=true时write_creation_snapshot ERR_CONNECTION_REFUSED。本审查读取实际原件3642字节/revision19，确认缺失该comment。新c8 native-close-protected-final实际8步PASS（UTC20:08:13.414–20:08:22.731）：最后SVG编辑Escape后直接关闭，没有磁盘等待替代；重启读取四正文；Windows独占真实fixture文件使Rust IO失败，两次raw close仍留窗、草稿可读；释放后正常关闭重试完整保存；坏width0+dirty draft阻止关闭；重新读取不改主备；恢复原件四正文。receipt errors/consoleDetails/requestFailures实际全[]。四个真正进程exit为0、0、SIGTERM、0；SIGTERM只清理保护draft验收的自有进程，不冒充正常关闭。

6. **原件保护时序维护有依据。** be5 native实际FAIL原件未覆盖：首轮立即关闭和重启已通过，失败留窗已发生，之后fixture在释放锁后错误要求文件仍不变，而恢复后的queued autosave已写入完整新草稿。c8在独占handle尚未Dispose时CopyTo取得真实主件字节；backup在锁持有期间检查，随后才释放、重试。原主备、正文、留窗、零console、正常exit断言保留。独立回读锁内副本与上一版pristine-backup逐字相同（revision21），含立即关闭comment且没有后来的IO草稿comment；pristine-main revision22和最终磁盘revision23 items完整相等且两comment都存在。corrupt-input仅将该pristine首个plugin.width置0，原件/SHA关系实际核实。bad-read前pristine主备和corrupt-input以wx保留。不是要求恢复后禁止合法自动保存。

7. **邻接真实原生证据。** 同EXE原CSP启停driverexit0、模块同tauri origin且errors[]；TaskHost sourceHead=c8，11组、5次launch、passed=true/errors[]、credentialCleanupComplete=true，未输出合成凭据值；native选择收据sourceHead=fad，13组passed/errors[]/相同EXE。titlebar第一轮横向真实拖动断言exit1，原FAIL与initial PNG保留；诊断完整复跑exit0，actual movement从(0,0)到(80,60)，同EXE、production/main入口和40px titlebar，原>=50/30阈值、真实拖动/maximize/restore/minimize/menu/exit0没有改。新增wx诊断写发生在movement已取得之后，没有重测/重写movement。该诊断运行于c8工作区加诊断行，后于fad提交；receipt本身没有sourceHead，不伪标其曾在已提交fad运行。首次失败原因仍UNKNOWN，不能推断根治或零不稳定性。

8. **范围/账本。** 从base106项到fad109项，新增3直接相关PARTIAL对象，唯一active仍DEV；本审查独立deepEqual核对105个无关任务完整保留。源码head的未验收状态没有靠改账本DONE掩盖。最终文档/任务状态的更新另审。

## Findings

| ID | P0–P3 | Pass | merge/release blocker | 文件/行或证据 | 重现与影响 | 处理/负责人 | 状态/复验 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PLUGIN-REVIEW-001 | P2 | Native driver进程退出/重启 | 旧dc3阻断；fad已无该阻断 | 原dc3报告；plugin-recovery.mjs stop；c8 receipt processExits | 同机code=null/signal=SIGTERM被旧exitCode-only断言误判。新逻辑观察exit事件及exitCode/signalCode，有界10秒并保存真实pid/code/signal；c8保护清理真实SIGTERM通过且后续重新spawn完成 | root，已修正driver；reviewer独立复核 | **CLOSED at c8，fad增量确认产品/driver主体未变化**；旧dc3原报告仍OPEN |
| PLUGIN-REVIEW-002 | P1 | Native最后编辑耐久保存/失败留窗 | 旧产品真实数据丢失；fad已无该阻断 | native-immediate-close-red原件；nativeClose.ts:18–44、useCreationStorage.ts native effect；c8 8步原件 | 正常立即关闭丢失最后comment并有late IPC error。新源同步prevent、等待read/queue/latest dirty、失败留窗/重复去重/卸载保护；真实新EXE立即关闭、IO失败、完整重试、坏读保护全部通过，主备字节和最后正文核实 | root实现；reviewer以真实原件及actual hook/source复核 | **CLOSED at c8，fad产品blob无变化已核对**；不是仅正常已保存关闭通过 |
| PLUGIN-REVIEW-003 | P3（维护观察） | 原生手势验收重复性 | 否；当前完整标题栏验收已通过，未证实由本变更引入产品缺陷 | native-titlebar-c8ce21c.txt exit1；diagnostic exit0、drag-movement/receipt | 首轮横向拖动断言FAIL，随后相同动作/阈值/EXE完整PASS，原因UNKNOWN。不能把后一次PASS写成首轮从未失败或已修复根因 | 后续原生测试环境维护；root保留原FAIL和movement原件 | **OPEN / 待调查的非阻断风险**；本轮不扩大重复运行或虚构解释 |

本次已审范围未发现其它新增P0–P2。P3是已有实际失败/后续PASS的不稳定性观察，不是推断新的产品缺陷。

## 适用门禁

| 门禁 | 真实结果 | 证据/SHA/范围 | 未满足的影响 |
| --- | --- | --- | --- |
| Self-review | root实现/修复与事实文档存在；本报告独立于其上下文 | 当前intent/spec/plan/verification | 本报告不代填其最终自检记录 |
| 独立AI review | **PASS WITH FOLLOW-UPS at fad** | 本报告，原dc3报告完整保留；001/002已关闭 | 新文档head须另补审，P3原因仍未知 |
| 本地相关/完整检查 | 37项、6项实际独立PASS；bdb全量verify原件exit0/447attempts0retry | 下方原件指纹及附录；后续driver源码差异另审/实际执行 | 没有宣称在fad重新跑全量suite |
| 真实Tauri关闭/恢复及邻接 | 新EXE8步PASS、TaskHost11、选择13、CSP；标题栏首轮FAIL/末次PASS | c8/fad各自来源身份，不改raw | fixture范围不代替用户UI/最终产品验收 |
| 当前Hosted CI/实际ruleset/审批数量 | **NOT VERIFIED，本子任务未访问GitHub** | 无实际当前head托管证据 | 推送/普通合并前由root完成适用门禁；本报告不是approval |
| 用户UI/交互/最终产品验收 | 未由本审查确认 | 截图只证明该时刻状态；四节点有重叠，未声称同时视觉可读 | 不代填用户最终接受 |
| 推送/合并/landing/main/发布 | 本报告未执行/未验证 | 本报告只是精确源码与现有原生证据审查 | root按已有授权及实际保护继续；不代填结果 |

## 结论

**PASS WITH FOLLOW-UPS，绑定exact fadfabf886641ee5590a14f28924cc4ae497be8a的已审源码/测试driver/现有原生证据。** PLUGIN-REVIEW-001与002已由源码、独立相关运行和真实新EXE收据复验关闭；没有未关闭P0–P2。保留P3原生手势首轮失败原因UNKNOWN的维护风险。

尚待root的最终文档/归档精确提交补审、当前Hosted/真实审批/普通合并和main落地事实；本结论不替代这些结果或用户最终产品接受。正式范围没有包含root正在写的未提交文档和归档，新head不能直接沿用本报告SHA。

## 原件指纹与来源

全部SHA256。根目录为 `D:/kk-studio/.verification/TASK-PLUGIN-DEV-001-20261009`。

| 原件 | Bytes / SHA256 | 核对事实 |
| --- | --- | --- |
| review-source-dc3c03e.md | 21960 / 5671871e562893fbf870245ec2ee666ca80967eeb5719e68030a9afc54f98711 | 保持旧结论 |
| native-immediate-close-red/desktop-runtime.json | 2423 / ca47b3453a1fa3abc9ca9764e4347853a842b03c75cceb164181b10aca83985e | 实际数据丢失FAIL |
| native-immediate-close-red/isolated/data/projects/creation-v2.json | 3642 / 2b9ea6f445cebf08a305d4f46c60a2ba390f3e0674c0adcebf82d2f8a9fd5cb4 | 实体正文缺最后comment |
| verify-e3a6660.txt | 72093 / ebc993e25a3117db92e3b33f4416865727a718432939776d530a0c58cf016633 | exit1，3旧VM映射失败 |
| verify-close-final.txt | 160010 / 8f2e70d4bdab06130ac453fddb11311a5fb0c8d577c976c1ecb6e3d2f2c1c24d | bdb实际exit0 |
| browser-results-close-final.json | 592972 / 4ff8bb2d3a932acb8207614aee2a58efc8d8ca9121a21f3d7e1f7829bf3eb9bb | 本审查遍历447/447、retry0/errors[] |
| fresh-agent-build-close-final.txt | 5412 / 7de4a46aed7306482fe210c06b7ae197f09ea2110aa28c37a357242ebf0cd844 | release实际完成/exit0 |
| rust-test-e3a6660.txt | 10953 / 6b1f6ed8ecdecb6391d6d3231713148ca76a28e8b42f33304c3b5fdf2ef7c135 | 102 PASS |
| rust-e3a6660.exit.txt | 14 / c2c107bf3af2084585c4bef48ab2cd3733405daa939dd0228c971a1114982dbe | fmt=0 test=0 |
| client-check-close-final.txt | 1383 / f526e54a9df4bcaa7c3dd4f4ab380c30e8c6714ee75396610161cb586e987cc9 | exit0 |
| identity-c8ce21c.json | 49744 / ff95d201f98ad64e5237b640c6375992d0243580bed453c2eb06a9e4e82e609c | 428来源、bundle/plugin/EXE、bdb→be5→c8 |
| native-close-final-be5f327/desktop-runtime.json | 7525 / 42e0dce904298d8d7aec5e55462473bd3d7ce2d439678c805c32a7e4a1ce60d0 | 保留释放锁后断言错误FAIL |
| native-close-protected-final/desktop-runtime.json | 11810 / 8d2fa688ec6f45b0d2af67d540638773c41327048ac9d0b382c7e93fab1d2d60 | c8 8步PASS、4exit、零记录错误 |
| native-taskhost-c8ce21c/receipt.json | 13556 / 2106423509b5166eb8e90fc7ace0eff1db97730e5ea72e96ebdbd7abdfe1f167 | 11组/cleanup true |
| native-csp-c8ce21c.txt | 1423 / f59b01c06be80ff6a6abea44eb5ea93132814089e26bee09edec4a5672353d2a | exit0/errors[] |
| native-titlebar-c8ce21c.txt | 429 / 9d0cc0933621ae6b2be206790fd1180228a16b2190953a92d6a7687890e4bab2 | 首轮exit1，原因UNKNOWN |
| native-titlebar-diagnostic-c8ce21c.txt | 123 / 9ff4d58a31813fb51f4351a3beeda1e6585452047dc50321c656d02bcec30502 | 下一完整轮exit0 |
| native-selection-final.txt | 186 / 6482d5409144d8fd1e7f7ccccae20feccbbdd1d0638d3e85ddd34c2c88ced4ab | fad 13组exit0 |

标题栏receipt及movement原件当前位于 `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-PLUGIN-DEV-001/.tmp/titlebar/desktop-1791490392229`：receipt.json 1260 bytes/SHA256 `3da959981dd68be8fdaec832f7144531b46be2357a107eb87d53d5ac9950249f`，drag-movement.json 88/`d34bedb0dca172c7974d1fc8e39ee5bcbeb09fd6b8b05c54ce61303f6e2ac8ac`。诊断mtime20:13:14.659Z、receipt20:13:15.884Z、PASS日志20:13:16.017Z早于fad提交20:14:24Z；报告保留其运行工作区来源，未冒称已提交fad执行。

选择收据 `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-PLUGIN-DEV-001/.tmp/desktop/image-selection/1791490464548-cc42fcac-506c-495a-8607-7ad2e60d088f/receipt.json` 81341 bytes，SHA256 `52eba5208ff2b56d1d552d9168843dfd1d78ae38d3bc12ac6c0efe2ace9426d0`；其自身sourceHead=fad、EXE12009ce4…、13组/errors[]。

标准exit0原件（3 bytes，内容0 CRLF）hash `13bf7b3039c63bf5a50491fa3cfd8eb4e699d1ba1436315aef9cbe5711530354`；标准exit1原件hash `f1b2f662800122bed0ff255693df89c4487fbdcf453d3524a42d4ec20c3d9c04`。本审查实际读取上述相应退出原件，未从空输出推断exit0。

## 原始独立输出附录

### 37项相关单元：实际exit0 @e3，产品blob到fad未变

```text
✔ native close is prevented synchronously until durable save resolves (1.1869ms)
✔ duplicate native close events cannot bypass the same pending save (0.1377ms)
✔ failed save keeps the window open and a later successful retry may close (0.1465ms)
✔ disposed native listener cannot close or report against an unmounted owner (0.0863ms)
✔ close drains edits arriving while a preceding revision is being saved (0.1343ms)
✔ protected read with a dirty draft rejects close without issuing any write (0.2714ms)
✔ native destroy failure is reported without escaping an async event callback (0.1333ms)
✔ plugin jsxs preserves static child validation, Fragment and element key (35.6147ms)
✔ plugin jsx retains validation for genuinely dynamic unkeyed lists (8.1301ms)
✔ plugin jsxDEV preserves the compiler's static-child distinction (10.2236ms)
✔ installFromUrl：求值工厂、登记节点、写 store 并激活 (13.0509ms)
✔ setPluginEnabled：禁用卸载节点与样式，重新启用恢复 (0.3704ms)
✔ uninstall：清 store 并卸载节点 (0.2572ms)
✔ ensurePluginsLoaded：rehydrate → 发现本地插件 → 只激活启用项 (0.8372ms)
✔ 随包插件从同源模块 URL 直接导入，不生成 blob 模块 (0.5526ms)
✔ update：带缓存戳重新拉取并替换版本 (0.4734ms)
✔ 无效导出被拒绝 (0.4312ms)
✔ 远程插件拒绝明文、凭据和片段地址，且不发起下载 (0.5483ms)
✔ 远程插件拒绝从 HTTPS 重定向到明文响应 (0.1719ms)
✔ 远程插件禁止自动重定向，避免中途经过明文地址 (0.1917ms)
✔ 旧版明文插件缓存不会在启动或重新启用时执行 (0.2577ms)
✔ deactivate 执行 setup/css 清理 (0.2516ms)
✔ all bundled plugin payloads survive repeated snapshot reads without truncation (7.8008ms)
✔ normalization copies plugin metadata independently of the source snapshot (0.1828ms)
✔ invalid plugin payloads are rejected before normalization preserves the original (0.9487ms)
✔ non-JSON plugin metadata, extensions and nonfinite dimensions cannot be saved (0.8476ms)
✔ nested plugin secrets are rejected without altering the input (0.3303ms)
✔ plain legacy canvas items remain readable without acquiring a plugin (0.1691ms)
✔ 大于16MiB的已归档媒体用稳定引用保存并完整恢复，独立poster不被替换 (55.6754ms)
✔ 缺失引用不能被静默水合，旧内嵌素材不自动迁移 (89.0798ms)
✔ 内存媒体与assetId原件不符时拒绝剥离 (33.8717ms)
✔ 引用附件发送前恢复原件，缺失时不能降级为文生图 (0.2795ms)
✔ 引用与附件身份冲突时阻止发出另一张图片 (0.1457ms)
✔ 原生素材缺失提示保留可操作原因且不泄露原始错误 (0.9695ms)
✔ malformed members, duplicated identities and unknown versions cannot become writable empty data (3.455ms)
✔ normalization may add defaults but cannot truncate existing content on read (0.8931ms)
✔ secret fields are rejected at browser and draft-export boundaries (0.1071ms)
ℹ tests 37
ℹ suites 0
ℹ pass 37
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1193.2065
started=2026-10-08T19:56:00.1886198Z
ended=2026-10-08T19:56:01.9450236Z
```

### 6项真实保存hook：实际exit0 @bdb，到fad该文件未再变

```text
✔ a queued flush rejects when the preceding native conflict pauses saving and keeps the newer draft (56.6461ms)
✔ queued flushes for an acknowledged revision resolve without duplicate writes (18.083ms)
✔ flushing an already durable revision restores saved status without writing again (16.4074ms)
✔ the actual hook drains the latest revision before native destruction (10.0656ms)
✔ native save failure keeps the hook draft and safe error visible until retry (10.3309ms)
✔ a native subscription resolving after unmount is released without a stale close (10.1982ms)
ℹ tests 6
ℹ suites 0
ℹ pass 6
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 539.8118
started=2026-10-08T20:02:14.0624757Z
ended=2026-10-08T20:02:14.8208967Z
```

### 实际hook只读VM组合：实际exit0，窗口/IO/React生命周期模拟

```json
{
  "result": "PASS",
  "head": "e3a6660ce4911e1fadb646c4e9ffe8d5c7a84236",
  "probe": "readonly VM actual hook composition, stubbed IO/window/React lifecycle",
  "checks": [
    "initial read settles before close; synchronous prevent",
    "actual hook drains revisions 6,7; duplicate close prevents twice, destroys once",
    "IO failure keeps actual hook draft/window; retry writes same revision and closes",
    "failed read with dirty draft performs zero writes and keeps window",
    "late subscription after unmount releases once; stale handler cannot destroy",
    "Web beforeunload still saves/prevents; zero native registration"
  ]
}
```

### 新native原件字节/EXE/阶段身份只读断言：实际exit0

审查第一轮探针曾误把receipt的“首次关闭快照hash”与“重启后revision21锁内副本”视为同一字节对象，assert实际exit1（92e12b8… != c633913…）。检查真实阶段后纠正该审查假设：锁内副本应与重试成功后的上一版backup对应，首次关闭hash没有独立同阶段副本供本探针重算。没有把跨阶段合法revision/项目元数据变化列为产品破坏，也没有将该错误探针说成PASS；下方是针对正确阶段的实际完整断言。最终revision23与pristine22的items逐字段相等，未误称整文件相同。

```json
{
  "observedAt": "2026-10-08T20:13:24.594Z",
  "head": "c8ce21c84608f0451f13aa383cb2bf699f13ef50",
  "receiptHead": "c8ce21c84608f0451f13aa383cb2bf699f13ef50",
  "productDifferenceFromFreshBuildHead": "",
  "result": "PASS",
  "steps": [
    "four-plugins-edit-render-and-native-durable-save",
    "immediate-close-retains-last-plugin-edit",
    "fresh-process-restart-and-four-contents-recovered",
    "real-native-io-failure-and-duplicate-close-retain-window-draft-and-originals",
    "successful-close-retry-retains-the-entire-unsaved-draft",
    "protected-read-dirty-draft-blocks-native-close",
    "invalid-plugin-read-and-retry-protect-main-and-backup-bytes",
    "restore-isolated-original-and-four-plugin-contents"
  ],
  "processExits": [
    {
      "pid": 45512,
      "code": 0,
      "signal": null
    },
    {
      "pid": 65456,
      "code": 0,
      "signal": null
    },
    {
      "pid": 14696,
      "code": null,
      "signal": "SIGTERM"
    },
    {
      "pid": 88192,
      "code": 0,
      "signal": null
    }
  ],
  "executable": {
    "bytes": 19572224,
    "sha256": "12009ce4452f9b61e495f3d6931c0d4a0ef3040bf4ded501a88eb46d1e521e69",
    "mtime": "2026-10-08T20:05:47.517Z"
  },
  "stageRevisions": {
    "lockedAfterRestart": 21,
    "pristineAfterRetry": 22,
    "final": 23
  },
  "assertions": {
    "lockedCaptureEqualsPreviousRevisionBackup": true,
    "lockedCopyRetainsImmediateEdit": true,
    "lockedCopyDoesNotHaveLaterUnsavedDraft": true,
    "pristineAndFinalHaveBothLastEdits": true,
    "corruptIsOnlyInvalidWidth0": true,
    "finalItemsEqualPristineItems": true,
    "recordedBackupAndCorruptHashesMatch": true,
    "allObservedPluginResourcesSameOriginAndNoEsmSh": true
  },
  "files": [
    {
      "name": "desktop-runtime.json",
      "bytes": 11810,
      "sha256": "8d2fa688ec6f45b0d2af67d540638773c41327048ac9d0b382c7e93fab1d2d60"
    },
    {
      "name": "locked-main-before-release.json",
      "bytes": 3747,
      "sha256": "92e12b8e74ee59f7ecf422fbecd64d166a63ee1ebb3f355cb471fd0e7b5a7f80"
    },
    {
      "name": "pristine-main.json",
      "bytes": 3797,
      "sha256": "aa2c01ef00efc5df876598213100e988b54d430fbb2ca1b1c634391bae0f786b"
    },
    {
      "name": "pristine-backup.json",
      "bytes": 3747,
      "sha256": "92e12b8e74ee59f7ecf422fbecd64d166a63ee1ebb3f355cb471fd0e7b5a7f80"
    },
    {
      "name": "corrupt-input.json",
      "bytes": 3795,
      "sha256": "fc72973ddbfe3d33134555070979a147960750e09a2b006d42cc0516b29f1fda"
    },
    {
      "name": "isolated/data/projects/creation-v2.json",
      "bytes": 3797,
      "sha256": "c6e950e7283c9826b4b97c2a43597c97a1e3e00d7699b5fe0803ad5a15ad1435"
    },
    {
      "name": "isolated/data/projects/creation-v2.json.bak",
      "bytes": 3797,
      "sha256": "aa2c01ef00efc5df876598213100e988b54d430fbb2ca1b1c634391bae0f786b"
    },
    {
      "name": "save-failure-window-retained.png",
      "bytes": 83185,
      "sha256": "5ab87d1af4927e1a1d6e0567a920cf4efc1746c9a022a79826308ec87dfbf4f0",
      "width": 1920,
      "height": 1080
    },
    {
      "name": "corrupt-protected.png",
      "bytes": 377356,
      "sha256": "b143322fb8421709daa5e5b223bef958a8e6fffca692686aa6d2fae18d20454d",
      "width": 1920,
      "height": 1080
    },
    {
      "name": "before-restart.png",
      "bytes": 75267,
      "sha256": "c0362380e3b60b8d7685384de4c3f82660926ea83869245699ef9459d7197f7d",
      "width": 1920,
      "height": 1080
    },
    {
      "name": "after-restart.png",
      "bytes": 73220,
      "sha256": "b45f2879af21530803ec2247f11e86e09d5f0e0527ce60c36713bf86fad9266a",
      "width": 1920,
      "height": 1080
    },
    {
      "name": "original-restored.png",
      "bytes": 73220,
      "sha256": "b45f2879af21530803ec2247f11e86e09d5f0e0527ce60c36713bf86fad9266a",
      "width": 1920,
      "height": 1080
    },
    {
      "name": "lock.ready",
      "bytes": 5,
      "sha256": "b24d6d33736ecd5604a4b17bc9c6481039fac362bb7df044ef1c10a2bfd21db6"
    },
    {
      "name": "lock.release",
      "bytes": 7,
      "sha256": "a4d451ec23463726f72c43d64c710968f6b602cd653b4de8adee1b556240a829"
    }
  ],
  "oldFail": {
    "bytes": 7525,
    "sha256": "42e0dce904298d8d7aec5e55462473bd3d7ce2d439678c805c32a7e4a1ce60d0"
  },
  "oldReviewSha256": "5671871e562893fbf870245ec2ee666ca80967eeb5719e68030a9afc54f98711"
}
```

## 规则blob版本

| 文件 | Git blob |
| --- | --- |
| AGENTS.md | 0771bc63c13276fbe12f4deea92a1add7befaa22 |
| AI_RULES.md | a39b009e1efb55531b59bdf39debf9dc42bfc9b0 |
| docs/engineering/REVIEW.md | 08ce14fb5033758c38de9125f9f80625cdb87914 |
| docs/engineering/BRANCH-POLICY.md | 17cf364ac5f46e95b5886f34a24710e19552cb4f |
| docs/engineering/SDLC.md | 9e25f86d2dd78e5037be93e82f46f57e3c1ef1a3 |
| docs/engineering/PROMPTING.md | 0d317f6e0f5f894b334aa0520c0acdf6f4583282 |

## 末次实际保存观察

- UTC：2026-10-08T20:24:45.718Z
- 实际Git HEAD：fadfabf886641ee5590a14f28924cc4ae497be8a
- 实际只读来源断言：identity-c8ce21c 中428源码/config字节SHA256、2入口bundle、4插件public/dist全部匹配；原dc3报告SHA仍一致。
- 正式结论仅绑定fad。root准备的当前未提交变化（不纳入本报告）：

```text
 M docs/PROGRESS.md
 M docs/changes/2026-10-09-plugin-development/verification.md
 M docs/features/README.md
 M docs/features/feat-013-connectors.md
 M docs/features/features.registry.json
 M docs/governance/AI_HANDOFF.md
 M docs/governance/PROJECT_STATE.md
 M docs/governance/TASK_LEDGER.md
 M docs/governance/task-ledger.json
?? docs/changes/2026-10-09-plugin-development/evidence/
?? docs/changes/2026-10-09-plugin-development/status.md
```
