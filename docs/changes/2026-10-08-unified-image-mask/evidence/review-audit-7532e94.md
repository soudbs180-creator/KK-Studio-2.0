# 独立只读复审：统一图片 Mask（7532e94）

结论：**CHANGES REQUIRED**。已确认 IM-010–013 四项；其中 IM-011 是 P1 合并阻断。没有修改被审工程、文档、索引或分支，没有调用真实 Provider、系统凭据或用户数据。此前 IM-001–009 的关闭记录不是本次结论依据。

## 身份与范围

- 时间：2026-10-08 13:30:39 UTC（Asia/Shanghai 21:30:39）。
- reviewer：Codex 独立委派上下文 /root/mask_audit；准确模型版本 **UNKNOWN**。
- checkout：D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-IMAGE-EDIT-001。
- base：78cea37af9359fd2d9f58f2854525516deee8a06。
- head：7532e949e272784e0684b7ea0383901a8b23eeeb。
- 开始及报告前 git status --short 均为空；报告前 HEAD 回读相同。
- 工具：Node v24.20.0；rustc 1.97.1 (8bab26f4f 2026-07-14)；PowerShell。
- 规则 blob：AGENTS 0771bc63c13276fbe12f4deea92a1add7befaa22；AI_RULES a39b009e1efb55531b59bdf39debf9dc42bfc9b0；REVIEW 08ce14fb5033758c38de9125f9f80625cdb87914；PROMPTING 0d317f6e0f5f894b334aa0520c0acdf6f4583282。

独立读取 AGENTS、AI_RULES、REVIEW、PROMPTING、SDLC、BRANCH-POLICY、PROJECT_STATE 当前条目、intent/spec/plan、ADR-010，以及原始用户文字 C:/Users/Administrator/.codex/attachments/53cab66e-6237-458c-bcce-e5a14e6507fa/已粘贴的文本.txt。查看 base..head 实际 diff 和相关源码；优先审查模型能力/参考数、Web/native 请求、项目包、Mask 有界验证与恢复边界。主代理的 UI 两项复现被作为补充输入；本 reviewer 重新核对源码、DOM/状态 JSON 和截图，并独立复现 IM-013 的纯函数预算路径。

已审部分有明确的复用边界：三种工具使用相同原像素 runs；局部任务要求已声明 edit/inpaint，标注开销纳入参考限额；原件、mask、输入裁剪各自归档；Web/native 正常输出通过同一个前端 compositor。已有的异常坐标、缺失引用和回执身份检查有相应定向测试。以下 finding 是这些边界仍未覆盖的实际条件。

## Findings

### IM-010 — P2：Web 接受并导出 Desktop 拒绝的 Mask/context 结构

- Pass：架构与平台 / 安全与数据。
- 位置：src/features/image-edit/mask.ts:185–246；src/features/image-edit/snapshot.ts:74–93（crop 同样在 65–71 克隆）；src-tauri/src/image_edit_schema.rs:7–14、71–141。
- 条件：在几何和必需字段都合法的编辑文档内加入 document.futureField、region.extension，或在 context 内加入 futureField。Web createProjectPackageManifest 和 preflightProjectPackage 均成功且保留这些字段；Rust shape 则拒绝同输入。Web 还接受显式 colorCounters:null/0；无 color 时，Web 与 Rust 都接受长达 5000 的 colorName 与对象类型 number。
- 影响：异常 Mask metadata 绕过 Web 的声明结构和部分有界字段验证；Web 可生成自身预检成功但 Desktop 无法恢复的项目包。这里没有证明真实秘密外泄，也不将其称为已经发生的内存攻击。
- 最小建议：Web 对 document/region/crop/context 使用与 Rust 一致的字段 allowlist；显式存在的每个可选字段都校验类型和长度（包含没有 color 时的 colorName/number）。未知字段应拒绝，不能通过静默删字段伪造无损恢复。加入同一组输入的 Web/Rust parity 回归。
- 直接证据：review-audit-probes-7532e94/schema.mjs、schema.rs、web-schema.log、rust-schema.log。真实 Web 函数 export/import accepted；直接 include 当前 Rust schema 的 harness 对 document/region/context 扩展和 null counters 返回 Err；baseline 返回 Ok。两端 harness exit 0。
- Owner：TASK-IMAGE-EDIT-001 实现者。状态 OPEN；复验 NOT RUN。局部 P2，不单独定为 P1 合并门禁；本轮异常输入/跨端契约修正项。

### IM-011 — P1：恢复时丢失整个 imageEdit 会发布未合成的原始裁剪结果

- Pass：行为与回归 / 安全与数据 / 恢复。
- 位置：src/features/image-edit/snapshot.ts:16；src/features/image-edit/editTasks.ts:266；src/features/creation/nativeTaskHost.ts:578–620；src-tauri/src/task_host.rs:81–113、263–286。
- 条件：一个已提交局部编辑任务在恢复输入中仅缺失 imageEdit 整字段，其它 task/source/attachment/context 及同 taskId/idempotencyKey 的成功 native 回执仍完整。decodeSnapshot 将其当作兼容的普通历史任务接受。原生 JobRecord/JournalRecord 没有独立记录该任务需要合成，composeNativeEditAsset 因缺字段直接返回 raw asset。
- 影响：成功候选失去原图尺寸及 Mask 外像素保护。合成数据复现中 8×8 原图的 4×4 raw crop 被新增为 succeeded 结果；仅读取 raw asset，未读取原图或蒙版。原图本身没有被覆盖。缺失 metadata 是 plan Review Focus 明确要求保护的恢复失败模式，并非要求任意伪造所有字段仍可被识别。
- 最小建议：将需要合成的身份独立持久化到原生 request/receipt/journal，例如 imageEditRequired:true，并纳入 request fingerprint；maskAssetId 应强制该标志，参考编辑 fallback 也设置。恢复若 marker 为 true 而快照缺失/非法，应 unknown/quarantine、禁止发布 raw 或自动重新提交。普通历史任务兼容 marker 缺省；无 marker 的旧编辑回执不能事后获得可靠证明，必须如实记录此边界。
- 直接证据：review-audit-probes-7532e94/missing-edit-metadata.mjs、missing-edit-metadata.log，exit 0。脚本生成有效合成 PNG，完整快照先通过真实 decodeSnapshot；仅删除 imageEdit 后再解码并用假的 IPC 成功回执调用真实 reconcileNativeTasks，断言 succeeded 且 result.assetId 等于 raw crop。另 missing-edit-metadata-compiled.mjs 使用真实 formatEditPrompt 产生当前版本局部任务的自动头（原始最小脚本 prompt 曾简化为普通文字）；同路径仍 succeeded/raw crop，missing-edit-metadata-compiled.log exit 0。没有真实 IPC/凭据/Provider 调用。
- Owner：TASK-IMAGE-EDIT-001 实现者。状态 OPEN；复验 NOT RUN。**merge-blocker / release-blocker**：保护编辑结果的关键恢复路径必须修正后复验。

### IM-012 — P2：保存并重开矩形/画笔 Mask 后无法清除以进行整图编辑

- Pass：用户意图 / 行为 / UI。
- 位置：src/features/image-edit/useMaskDocument.ts:34–38；src/features/image-edit/EditToolbar.tsx:112–185；src/features/image-edit/useMaskDrawing.ts:85–91；src/features/image-edit/ImageEditor.tsx:119–124；src/features/image-edit/editTasks.ts:77–78。
- 条件：创建一个矩形或画笔区域，关闭后重新打开相同图片。Mask 被持久保留，但 undo/redo 被清空；工具栏只有绘制、撤销/重做、视图复位，没有清除或擦除。色块模式仅能选中 r.color 的区域，因此不能调用现有 ColorInstruction 删除入口清除无颜色的矩形/画笔。
- 影响：用户无法将该图片恢复到“无选区，输入意见执行整图连续编辑”的状态；所有后续发送仍被 active.regions 判定为局部编辑。视图复位不应清 Mask，但需要独立可撤销的区域清除入口。
- 最小建议：增加有真实行为的清除编辑区域操作，复用 commit/统一历史；保留原图、prompt、refs 和单调 colorCounters。按钮在 loading/空 regions 时明确 disabled。
- 证据：主代理当前 production preview 的 .tmp/image-edit/audit-7532e94/ui-audit-before.json：重开后 regionCount=1、undoDisabled=true、clearButtonCount=0；与上述源码一致。本 reviewer 已核对 JSON、工具代码和保存/重开链路。persisted-rectangle.png 实为关闭编辑后的主画布，**不能当成重开编辑态的同状态截图**。
- Owner：TASK-IMAGE-EDIT-001 实现者。状态 OPEN；复验 NOT RUN。P2、阻断本轮无选区连续编辑验收；总体合并门禁已由 IM-011 阻断。

### IM-013 — P2：空主输入色块指令被双重展开并污染其它 crop 的 prompt

- Pass：用户意图 / 行为 / 模型请求。
- 位置：src/App.tsx:1975–1984、2061–2062；src/features/image-edit/editTasks.ts:67–68、102–108、192–199；src/features/image-edit/prompt.ts:69–80。
- 条件：只确认色块意见，主输入保持空。App 将所有结构化区域意见复制到 effectivePrompt 并传入 input.prompt；prepareEditInputs 随后将这份复制文本当 global prompt，又从区域状态展开相同意见。UI validateEdit 使用原始空输入，没有相同重复，所以显示可发送。
- 影响：合法约 2192 字区域意见、本应只生成 2383 字请求，却因重复越过 3800 required budget 而在点击后失败。指令短而能够发送时，每个局部 crop 的 current 仍包含其它 crop 的修改意见，造成定位指令混杂；区域过滤没有去掉这份 global 副本。
- 最小建议：预检查可从结构化意见判断非空，但实际 prepareEditInputs 必须接收原始主输入；不要先将全部区域意见复制到用户 global prompt。每个 crop 只编译自己的区域意见与真实用户全局意见。保留本轮指令不截断。
- 直接证据：review-audit-probes-7532e94/color-budget.mjs、color-budget.log，exit 0；真实 compileEditPrompt/formatEditPrompt 确认原始空输入合法、App 当前转换后过长，并断言 crop0 的 prompt 包含其它 crop 独有指令。主代理 .tmp/image-edit/audit-7532e94/ui-audit-before.json 和 color-only-duplicated-budget.png 显示 4 个确认色块、空主输入、过长错误、0 task/0 request；本 reviewer 已检查其源码一致性及实际图片。
- Owner：TASK-IMAGE-EDIT-001 实现者。状态 OPEN；复验 NOT RUN。P2、阻断本轮空主输入色块发送验收；总体合并门禁已由 IM-011 阻断。

## 本次运行与限制

1. 在被审 checkout 运行 Node --test tests/unit/imageEdit.test.ts tests/unit/imageEditSnapshot.test.ts tests/unit/imageMaskAnnotation.test.ts tests/unit/projectPackage.test.ts tests/unit/nativeTaskHost.test.ts：**59/59 PASS，0 fail/skip，exit 0**。现有测试通过不覆盖上述新增失败条件。
2. 新建工程外 schema.mjs/schema.rs 并执行：两端真实 validator 分歧已复现，均 exit 0。Rust 使用当前 checkout 的现有 serde_json rlib 直接 rustc 编译到工程外，没有 Cargo 全量重编译。
3. 新建工程外 missing-edit-metadata.mjs、color-budget.mjs 并执行：关键异常恢复和指令重复已复现，均 exit 0。
4. 未重跑完整 verify、浏览器全集、真实 Tauri 生命周期脚本或任何需要系统凭据的流程。没有将旧 PASS、实现者总测数量或 HTTP fixture 等同于此次真实服务验收。
5. 报告绑定当前已提交 HEAD；实现者修改后需独立补审新提交，不能修改本文的 head 让旧结论继续有效。

Legacy 修正说明：单独凭首输入素材的“编辑输入”tag 不能可靠判定该次任务角色；资产按内容去重并合并 tags，相同字节的普通整图或上传素材可能继承该 tag。imageEditContext 单独也不足以判断局部编辑。若以旧编译器固定局部头加合法 context 保守 quarantine，必须严格识别自动 body 边界，不能模糊搜索用户自由文本，并覆盖普通整图及同字节 tag 继承不误判。新 marker 单独保护未来任务，不能据此关闭当前无 marker 的旧失败复现；compiled probe 是更符合实际任务创建路径的旧任务复验输入。

## Declined to judge / 未作 finding 的行为

- 真实 Provider 是否接受具体 multipart 协议、模型视觉质量和任意语义几何漂移：当前未授权真实调用，静态/合成 fixture 不足以证明。
- 物理手机手势、虚拟键盘及完整 Figma 视觉一致性：未运行硬件或完整设计同态验收；不冒称浏览器布局为原生 Mobile。
- 普通整图旧任务允许 unknown edit 能力：spec 明确保留原兼容行为，本次没有新的可靠证据推翻该技术取舍。
- Rust 10 附件硬上限：base 已存在；正常 Mask 标注开销受当前 model/connection 限额校验。未以此前存在的总体传输上限单列本次新缺陷。
- 已成功归档候选的 cache marker 被任意人为改写：没有正常产品路径复现，未把先前猜测列为 finding。IM-011 单独针对 plan 明确约束的整字段缺失恢复。
- 新增参考图是否必须永远变为下一轮“初始参考”：原始用户要求与有界上下文的角色语义不足以支持永久携带所有新增附件；当前 task 附件保留，本轮未据此报告问题。

仅上述已审范围的判定是 CHANGES REQUIRED；本报告不是合并、发布、用户产品验收或完整产品能力证明。
