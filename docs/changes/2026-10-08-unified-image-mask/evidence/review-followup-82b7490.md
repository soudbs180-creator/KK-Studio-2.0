# 统一图片 Mask：IM-010–013 独立返修复验

**结论：CHANGES REQUIRED。IM-010、IM-012、IM-013 CLOSED；IM-011 OPEN，P1，阻断合并与发布。** 本结论仅绑定下列已提交 HEAD，不覆盖历史报告或后续修正。

## 身份、版本与独立性

- Reviewer：独立只读 Codex 子代理 `/root/mask_audit`，不是本次实现者；精确模型版本 **UNKNOWN**。
- 审查时间：2026-10-08 14:06:13–14:23:51 UTC（北京时间 22:06:13–22:23:51）。报告写入后的最终 clean 核对另见工程外 `review-followup-probes-82b7490/final-check.log`。
- 工作树：`D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-IMAGE-EDIT-001`。所有工程命令显式使用该 cwd；开始、验证过程中、报告前均确认 HEAD 不变且 tracked clean。
- 总 base：`78cea37af9359fd2d9f58f2854525516deee8a06`。
- 重点增量 base：`7532e949e272784e0684b7ea0383901a8b23eeeb`。
- HEAD：`82b7490da6102092fdd240ff2e7dc69cdc1cc9d7`，`fix(image-edit): protect recovery and unify editing validation`。
- 环境：Windows；Node 24.20.0；rustc 1.97.1；Playwright/Edge production preview；真实 Tauri release。未调用真实 Provider，未使用用户工作区数据或用户凭据；Tauri fixture 使用工程外独立 data/profile、随机 UUID 提供商和自有测试凭据，结束后确认清理。
- 原始用户要求、当前 AGENTS/AI_RULES/REVIEW/PROMPTING、intent/spec/plan/ADR-010 与真实增量源码均独立读取。实现者的 PASS、旧 review、dirty-run 收据均没有充当本 reviewer 的执行结果。

规则/需求 Git blob：

| 文件 | 当前版本 |
| --- | --- |
| AGENTS.md | `0771bc63c13276fbe12f4deea92a1add7befaa22` |
| AI_RULES.md | `a39b009e1efb55531b59bdf39debf9dc42bfc9b0` |
| docs/engineering/REVIEW.md | `08ce14fb5033758c38de9125f9f80625cdb87914` |
| docs/engineering/PROMPTING.md | `0d317f6e0f5f894b334aa0520c0acdf6f4583282` |
| intent.md | `2cbb02e641c52163f39d40593a464f6878921f51` |
| spec.md | `1e6d92b20fec8c693702f5aa55975404b7cc144f` |
| plan.md | `bd758b0fe8a9ff14bf333be191486da2e505c0e8` |
| docs/architecture/adr/ADR-010-unified-image-mask.md | `7b602b4f744a48e9942bd0dd73d77b99bbb60838` |

## 已审范围与做得可靠的部分

本轮检查 portable Mask/context/crop schema、Web 导出/预检与 Rust 项目包、native marker 请求/回执/journal/fingerprint、live/recovery 共用校验、缺/非法编辑元数据、legacy 整图兼容与自由文本、已发布合成证据保留、清空/撤销/重做/重开/刷新、空主输入多色块预算及独立裁剪意见隔离，并抽查相邻原像素、融合、审批取消、部分成功/重试和窄屏回归。

独立 marker 沿用现有队列和 journal；native mask 强制 true，标注 fallback 也由 App 的 `task.imageEdit` 设 true，无区域连续编辑 false。mask 自动规范化也参与 fingerprint，缺省普通任务的可选字段不写入序列化，历史普通请求身份保持兼容。校验在 live 与 recovery 的原有共享入口执行。已发布合成图和用户草稿不被旧 raw crop 覆盖。

清空只提交空 regions，复用原有 undo/redo，并取消未提交 drawing；原图、prompt、参考图及色号计数不被清空。空输入的占位只用于连接 preflight，真实区域编译仍使用用户原始输入。这些改动符合最小增量与统一 Mask 目标。

## 逐项复验

| ID | 严重度 / 状态 | 复验结果 |
| --- | --- | --- |
| IM-010 | P2 / **CLOSED** | Web/Rust 均拒绝未知 doc/region/context/snapshot/crop 字段和显式非法 optional 值。无 color 的 colorName/number 也校验类型及上限。原未知字段、null/0 counters、5000 字 orphan metadata 的独立向量均被拒绝；Web 包导出和重新计算 checksum 后的预检均拒绝，合法包仍往返。 |
| IM-011 | P1 / **OPEN** | 新 true marker 与通常 legacy local 缺快照路径得到 unknown、无 raw 读取/发布/重发；但旧局部色块意见可以包含合法整图模板副本，`endsWith` 把它错认整图，仍发布 raw crop。详见下一节。 |
| IM-012 | P2 / **CLOSED** | 实际生产浏览器保存混合矩形/画笔/色块后重开，撤销历史为空但清空按钮可达；清空、撤销、重做、整图发送、刷新恢复均通过。原件 ID、主 prompt、计数保留。独立真实 Tauri 也验证清空 undo/redo。 |
| IM-013 | P2 / **CLOSED** | 两个独立色块生成两 crop：各自意见出现一次，异区意见零次；四个色块空主输入生成整图一次，每条意见一次且任务 prompt ≤4000。均实际审批并成功归档，0 retry，没有预算假失败或占位污染。 |

定位：IM-010 修正在 `src/features/image-edit/schema.ts:2`、`mask.ts:187/214/233`、`snapshot.ts:18/47/99`、`src-tauri/src/image_edit_schema.rs:110`；IM-012 在 `ImageEditor.tsx:214`、`EditToolbar.tsx:182`；IM-013 在 `src/App.tsx:1987/2065/2096`。上述路径均相对于本报告指定工作树。

## IM-011 仍开放：整图模板后缀可出现在合法局部意见里

- Pass：行为/恢复、数据保护；负责人：实现 AI；P1，merge-blocker / release-blocker。
- 文件：`D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-IMAGE-EDIT-001/src/features/image-edit/recovery.ts:21–31`，尤其第 30 行 `task.prompt.endsWith(wholeBody)`；接受后经 `nativeTaskHost.ts:198` 进入原有 raw 发布路径。
- 条件：旧无 marker 的局部任务，合法 context 保留，整个 `imageEdit` 字段丢失。最后一个色块意见粘贴本版本 `formatEditPrompt({current:context.lastInstruction, local:false, instructions:[]})` 的自动 body 去掉最后一行“图片角色”。真实 `compileEditPrompt` 与 `formatEditPrompt(local:true)` 编译该合法区域意见，外层自动“图片角色”行补齐一个整图 body 后缀。
- 复现输入及结果：原图 8×8、局部 crop/mask 4×4、colorName/number/instruction 有界且快照先经真实 decoder 验证。增强副本同时提供当前原图与区域标注图的两个附件，并让原图、crop 与透明 mask 像素坐标对应。仅删除 imageEdit；native receipt 的 task/idempotency/output 身份一致。结果 `status=succeeded`，读取 raw asset，发布 4×4 raw crop，没有 8×8 合成保护。
- 不是模糊自由文字推断，也没有伪造最终 task.prompt：最终 prompt 由真实局部编译器产出。marker、context 同时丢失的不可判定多字段损坏边界并非本 finding 的条件。
- 影响：缺编辑快照时仍可能把未经合成的方块标成成功候选，尺寸和区域外保护失效；归档原件仍保留。独立 marker 修复的新任务不受该 legacy 条件影响，但同一 IM-011 的旧任务恢复验收尚未完成。
- 最小建议：识别完整编译结构，不能仅接受末尾副本。无 previous 先重编译整串精确比较；有 previous 只在确定的初始约束/最近修改标签边界提取有界 previous，再重编译整串精确比较。旧 previous 中出现完整自动任务 body 头造成边界歧义时 unknown；正常用户正文/root 的相似文字不应模糊拒绝。覆盖 previous.trim() 真/假两种预算、有/无 previous 的局部模板副本、正常整图及已归档证据保留。

关键失败证据（均为本 reviewer 在该 HEAD 独立执行，退出 0 表示“缺陷断言成立”，不是测试通过产品验收）：

- [完整角色复现脚本](D:/kk-studio/output/unified-image-mask-20261008/review-followup-probes-82b7490/legacy-whole-suffix-collision-complete.mjs)
- [完整角色失败日志](D:/kk-studio/output/unified-image-mask-20261008/review-followup-probes-82b7490/legacy-whole-suffix-collision-complete.log)
- 初始同一编译器碰撞副本 `legacy-whole-suffix-collision.mjs/.log` 同样保留，没有覆盖历史证据。

## 独立执行证据

新证据目录统一为 [review-followup-probes-82b7490](D:/kk-studio/output/unified-image-mask-20261008/review-followup-probes-82b7490)。原 `review-audit-probes-7532e94`、旧报告、实现者证据保持原样。

| 命令/检查 | 实际结果 / 日志 |
| --- | --- |
| Node `--test`：imageEdit、imageEditSnapshot、imageMaskAnnotation、imageEditRecovery、imageEditSchema、projectPackage、nativeTaskHost | **86/86，0 skipped，exit 0**；`node-unit.log` |
| `cargo test --manifest-path src-tauri/Cargo.toml task_host::tests -- --nocapture --test-threads=1` | **15/15，exit 0**；`rust-task-host.log`；含 marker 独立 fingerprint/journal reopen、legacy image identity、mask identity、malformed journal 等 |
| 本轮编译生成的 Rust test binary `project_package:: --nocapture --test-threads=1` | **21/21，exit 0**；`rust-project-package.log`；含 shared schema 向量、Mask/history 包往返及故障原子性 |
| 独立旧非法向量副本 `schema-boundary.mjs/.rs` | **exit 0**；`schema-boundary-web.log`、`schema-boundary-rust.log`；有效包成功，10 个 export/preflight 拒绝断言及新增 optional/context/crop 拒绝成立 |
| 原 compiled probe 工程外副本，改期望 unknown/no raw；原简化非编译 prompt probe 副本；新 true marker 副本 | **均 exit 0**；`missing-edit-metadata-{compiled,uncompiled,required}.log`；仅 list/get，无 asset_read、无 submit、无新 result |
| 有效已发布合成图 probe（快照完整 / 缺失） | **均 exit 0**；`published-composite-{intact,missing}-checked.log`；合成 asset、结果草稿及原图 bytes/ID 保留，raw 未读、未重发；缺快照任务保守 unknown |
| production preview 1437，严格端口、reuse=false，image-edit.spec.ts，`--retries=0 --workers=1` | **14/14，flaky 0、skipped 0、unexpected 0，exit 0**；`browser-image-edit.log`、`browser-results.json` |
| 工程外 Desktop 脚本副本（仅 import/证据目录改写，产品断言保留），实际 release EXE + WebView2 + 本地 fixture + 真重启 | **exit 0**；`desktop-image-edit.log`；两次请求，outsideChanged=0，marker 重启保留，包往返、clear undo/redo、已删原图不复活、无重发、无 pageerror；自有凭据 conflict 保留及 cleanup=true |

真实 Desktop 收据：[desktop-acceptance.json](D:/kk-studio/output/unified-image-mask-20261008/review-followup-probes-82b7490/desktop/run-1791468928763-48076/desktop-acceptance.json)。

UI 同状态 JSON 与 PNG 已独立读取/查看：`browser/image-edit-saved-mixed-mas-b573f--before-whole-image-editing/cleared-mask-editor.{json,png}` 为真实可见 editor，1099×900、0 区域、clear disabled、32px 高/14px 字；`browser/image-edit-empty-composer--59b15-eeps-crop-opinions-separate/color-only-4-success.{json,png}` 为 1920×1080、空主输入/四意见/已归档成功 editor。两者 route `/`、production、入口 `src/main.tsx`；390×844 窄屏回归也在 14 项内。旧 7532 的关闭态 PNG 不被当成重开 editor 证据。

产物新鲜度：实际浏览器和 Tauri 加载 `index-BUvutOxY.js`，SHA256 `6b1431869a4b4cafe51150490aa5fcbbc79d16caf7e1527c2f83811629098d6f`；实际 EXE SHA256 `4749989f202dc5b35f103d542b1d02635efb4e43eeddca39c22ba051a98503bd`。Reviewer 独立重算实现者 source manifest 的 **71/71 源文件**与 **30/30 工件**，均匹配；manifest SHA256 `8e7d0e47a2141bffa421e8ae45c86bad41e35563e5410d105d15b54ce6cbea6a`。历史 native receipt.sourceHead 仍为真实 dirty-run 起点 7532，不重写；该字节绑定只证明产物对应当前源码，不替代本次缺陷判断。

审查工具勘误：初次 Rust `image_edit_schema::tests` filter 实际执行 0 项，不算 schema PASS；正确完整路径随后包含于 21 个 project_package 测试。额外已发布 probe 的初版缺 canvas position，第二版全 items 比较又把 source 的正常 pending/error 恢复变化误当失败；两个失败版本/日志保留。最终 `*-checked` 版本完整通过真实 decoder，仅比较被保护的 result/draft、原图 bytes/ID、结果列表及 raw/submit 调用，未改工程测试或隐瞒失败。

## Declined to judge / 未验边界

- 真实 Provider 生成质量、付费行为及外部账号：仅 HTTP fixture 与 synthetic credentials，未调用外部模型；不能据此声称真实模型验收。
- 真机手机触屏与设备性能：执行桌面 Edge 的窄视口和合成 touch 回归，未证明真实手机硬件体验。
- 当前最新 Figma 的人工同状态产品验收：未重新打开 Figma；本轮只判断现有按钮语义、同状态 DOM/截图与回归，不代填用户 UI approval。
- 任意同时删除旧 marker、context、snapshot 的多字段破坏：现有数据不足以证明 editing 角色，明确 UNKNOWN；没有把此边界当作本次已复现 suffix 问题的免责条件。
- 完整 verify、其余所有 native 组及外部 CI/GitHub 门禁：本 reviewer 仅运行上表风险相关范围，未重复实现者全套；没推送、合并、发布或批准 PR。

本次审查没有新增独立 ID；IM-011 按稳定 ID 保持 OPEN。**82b7490 不能作为已关闭恢复 blocker 的候选交付。** 下一提交修复完整编译结构识别后，需要重新绑定 SHA 并复验失败 probe，不能修改本报告为 PASS。
