# Verification：Codex 卡片使用连线参考图

- Task ID：TASK-CODEX-REF-20261015；日期：2026-10-15，Asia/Shanghai；角色：`current`。
- 结论：**功能/live PASS；整体交付 PARTIAL**。FEAT-002 保持 PARTIAL。
- Base：`cbda65e4389fc807769a8faf7654892415992589`；最终源码尚未提交，精确 SHA 正式review/Hosted/PR 未完成。
- 独立 source：`D:/kk-studio/.worktrees/TASK-CODEX-REF-20261015` / `fix/TASK-CODEX-REF-20261015`；root 限定整合到活动 `D:/kk-studio/.worktrees/branch-consolidation-20261011` / `fix/TASK-CODEX-HOME-20261015`，保留其他作者更新。
- Desktop/Web **2.1.33**；Mobile **2.1.1**。证据根：`D:/kk-studio/.analysis/codex-card-reference-20261015`；fixture 日志：独立树 `.tmp/codex-reference/`。
- [Intent](intent.md)、[spec](spec.md)、[plan](plan.md)、[review](review.md)；[账本](../../governance/task-ledger.json)。

## 实际 Desktop/Codex 验收

实际卡片经 `App → canvasImageAttachments → generateFromCanvas → sendMessage/prepareAgentAttachments → /agent/codex/turn → 内置 imagegen → 既有事件归档` 完成真实请求。HTTP 200、推理模型 `gpt-6-astra`；`image_gen__imagegen` 的 `referenced_image_paths` 临时 JPG 与产品参考原件 SHA 完全相同。共1次实际turn、外部图片请求0。

- 参考 `reference-kimo.jpg`：1792×2400、3,277,591 bytes，SHA256 `42452f4d3ad7fddc3e5606176d218d376ff9c457121bb18a6014507d8aed3a72`。
- 输出 PNG：1,667,823 bytes，asset `asset-6531e6ac822167c64f0aac95`，SHA256 `6531e6ac822167c64f0aac9535c59b32db1720d8fd3e7b75fad414cf71257fda`；来源/生成卡片、原reference边保持，恰1条生成卡片→结果的`kind=result`边。
- 页面重载：1结果/1结果边，两个完整hash不变，累计turn仍1。正常关闭、官方重建后重启：1结果/1结果边/1reference边，两个hash不变，restartTurns=0。
- 日常重开：root正常关闭自有隔离实例后，通过现有桌面“启动 KK Studio.lnk”启动，未重写快捷方式。native=true、原资料root `C:/Users/Administrator/AppData/Roaming/kk-studio`、PID57824且无`--data-dir`；另一个无关实例PID37780保持。

直接证据：`native/turn-evidence.json`、`imagegen-calls.json`、`imagegen-original-hashes.json`、`outcome.json`、`after-generation-snapshot.json`、`reload-check.json`、`restart-check.json`、`daily-reopen.json`；截图/图像为`before-card-generate.png`、`after-card-generate.png`、`final-restart-restored.png`、`generated-kimo.png`。root已看图确认保留KIMO绿黑产品形态并移除原场景，质量评价只限此样例。Agent早期文案“归档未确认”早于异步import；后续native snapshot与资产读回直接确认ready/正确连线，保留该时序边界。

证据边界：同SHA临时JPEG是在文件仍存在时实际捕获；turn后由runtime清理，不能宣称当前临时文件仍可读，当前归档参考和结果仍可hash。截图中有一次“不支持的附件导入”活动失败，不能把整个Agent过程写成无错误；实际内置imagegen、归档/连线及恢复结果由后续直接回执证明。基线结论是13项同断言失败，原始错误中的poll次数和瞬时值可能不同。

## 最终运行身份

官方最终重建34.96秒PASS，保留其他作者composer.css；本任务App/store字节与dirty reviewer所读版本一致。`native/final-build-identity.json`记录version2.1.33、reason=current：

- EXE：活动树`src-tauri/target/release/kk-studio.exe`；SHA256 `6353aba3faf9570d932e5f5514256af1af3c16c31bdda2cb27b4979580953c2c`。
- source input SHA256：`ee1e43bee92bc3a6e54ef26bf972eee5273b0caf5810b2e1ddde31bc89bd816c`。
- 实际Tauri：`http://tauri.localhost/`，native=true，bundle `index-vihgOeA0.js`；隔离验收CDP9517，独立`native/data`和`native/profile`，沿正常现有CODEX_HOME。重启与日常重开均读到同bundle。

初始52秒构建的EXE2ca62296/inputdc759772/index-Ck9lePiK仅属先前构建；活动并发漂移曾令其不能代表当前源码，最终收据以上述新身份为准。

## 实际检查与限制

| 检查                             | 结果                                                | 证据/边界                                                                                                                                      |
| -------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 单元基线/修改后                  | 基线39 PASS；store新增8项RED→GREEN；最新定向45 PASS | root回执；与独立reviewer自跑5文件50项分开，不合并成一次总数                                                                                    |
| 独立fresh dirty precheck         | 文本/竞态修正后5文件50 PASS，无剩余blocker          | root转述；仅dirty范围，不是最终SHA正式批准                                                                                                     |
| 参考图browser                    | 原2项RED2/2→GREEN2/2                                | `.tmp/codex-reference/red-playwright-2.log`、`green-playwright.log`                                                                            |
| 文本参考/Agent                   | 新文本参考先RED，修正后全文件13/13 GREEN            | `text-red-playwright-2.log`、`text-green-playwright.log`                                                                                       |
| 相邻browser                      | 前一轮39/39 PASS，0retry                            | `related-playwright.log`：Agent12/image-edit14/unified13，与后续Agent13分别报告                                                                |
| 完整Node                         | 1341 total，1327 PASS，0 FAIL，14 skip              | `verify-full.log`；初轮1338/1322PASS/2FAIL/14skip因独立树缺vendor dist，补Agent依赖/build后中间1339/1325PASS/0FAIL/14skip，原日志均保留        |
| Agent                            | 201 total，199 PASS，0 FAIL，2 skip                 | `agent-tests.log`；skip保留                                                                                                                    |
| lint/typecheck/UI/format/version | PASS；UI242/0                                       | version consistency另警告既有CHANGELOG2.1.0漂移；health advisory8 warnings含上游与本任务增长，未削弱门禁                                       |
| 完整verify/browser               | **FAIL：784 total，771 PASS，13 FAIL，0flaky/skip** | `verify-full.log`；development **NOT RUN**，不得写完整PASS                                                                                     |
| 13项基线差分                     | **全部PRE-EXISTING FAILURE**                        | `baseline-diff-comparison.json`：任务前源码逐项重现13项同断言，all13SameFailures=true、allAssertionsSame=true；候选源码byteexact恢复并重建PASS |

13项分别为catalog-pages4、composer-voice1、figma-483-ui1、input-contract4、ui-unification3。证明预存失败不等于完整门禁已通过。

| AC                            | 当前验收                                                 |
| ----------------------------- | -------------------------------------------------------- |
| AC-1 参考卡片直接内置生图     | 实际Desktop PASS，同SHA参考/1turn/0外部图片请求          |
| AC-2 归档/来源边/原件与恢复   | 实际Desktop PASS，重载/正常重启/日常重开hash和唯一边保持 |
| AC-3 缺原件/取消/图或项目变化 | 定向与browser回归PASS，文本引用图片明确拒绝且保留草稿    |
| AC-4 相邻既有能力             | 定向/邻域PASS；完整verify仍FAIL，13项已证明预存          |

## 文档保全与交付状态

两个工作树的governance/features生成与检查均为141 tasks/0 violations、37 features/0 violations；markdown均122 active files/0 violations。仅本包5文档、ledger/registry/FEAT-002卡片格式化检查通过；未整份覆盖其他作者活动文档。

快照与保全回执：`D:/kk-studio/.analysis/codex-card-reference-20261015/docs-reconcile-20261015T064035740470Z/preservation-receipt.json`。活动账本原140条raw record、registry其他36条raw record保持；FEAT-002仅加task link。PROGRESS/HANDOFF除本任务段之外原文一致；PROJECT_STATE仅新增本任务事实与派生数量；卡片仅改task/date/link及本任务段。最终两树保全检查全部true，task-owned5文档同步。

功能/live **PASS**，账本与整体交付 **PARTIAL**：仍欠有效mandatory fullverify、最终SHA正式review及Hosted/PR。没有commit/push/远端操作，不宣称main集成、发布、全项目REAL或所有Provider验收完成。参考原件、存储身份、其他作者工作与原始失败证据保持。

## 验收后的并发源码漂移

验收后并发漂移边界（2026-10-15T06:48:06Z）：其他任务随后修改无关Rust项目包/vendor/runtime/build输入及dist；native/closeout-source-drift.json最新reason=unverified，当前input627e5b40...，受测inputee1e43be...。此前真实验收/日常重开及EXE6353aba3.../本任务App23a0625a...、agentConnection52a1d8db...仍有效且字节未变，日常PID57824继续运行受测2.1.33；不能宣称最新整个checkout已验收。不继续重建、关闭或覆盖其他作者工作，整体PARTIAL。

完整漂移input SHA256：`627e5b402e9bb0cdcc84394f2876be3f179560200ab17acd4240ab6d2787d595`；此前受测input `ee1e43bee92bc3a6e54ef26bf972eee5273b0caf5810b2e1ddde31bc89bd816c` 与`final-build-identity.json`原时点reason=current均保留。此条只补充验收后的新状态，不撤销或改写已完成的卡片功能/live/重载/重启/日常重开证据。
