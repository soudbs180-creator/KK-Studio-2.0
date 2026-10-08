# TASK-IMAGE-EDIT-001 独立正式复验（历史候选）

结论：**CHANGES REQUIRED**。IM-001–008 关闭；新增 IM-009（P2）仍在本提交开放。

- Base: `78cea37af9359fd2d9f58f2854525516deee8a06`
- Reviewed HEAD: `1527b481cf80499ae25f9136ad164dbe1a20f039`
- Worktree: `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-IMAGE-EDIT-001`
- Reviewer: 独立只读 reviewer `/root/mask_review`，与实现者 `/root` 分离；未参与任何源码/Git 修改，未派生代理。仅运行定向检查和保存本工程外收据。
- 审查开始确认 HEAD 为上述 SHA 且工作树 clean。此收据绑定提交对象；审查后半段实现者开始修复 IM-009 的测试脚本，未把这些 dirty 修复计入旧 SHA 结论。

重新读取了适用 AGENTS.md、AI_RULES.md、engineering/REVIEW.md 与 PROMPTING.md、intent/spec/plan/verification/review、ADR-010 和相关索引。读取用户原需求附件 `C:/Users/Administrator/.codex/attachments/53cab66e-6237-458c-bcce-e5a14e6507fa/已粘贴的文本.txt` 并查看统一 Mask 原图示；直接审查实际 base..head diff（79 文件）及图片编辑、任务执行/审批/取消/重试/恢复、Web/Rust 包、请求适配和灯箱代码。

## IM-001–008 逐项状态

| ID | 严重度 | 状态 | 独立复核依据 |
| --- | --- | --- | --- |
| IM-001 | P2 | CLOSED | useMaskDrawing.ts:137–166 将色块提交推迟到单指 pointerup；第二触点走 cancel。生产 Web brush/color 双指取消用例通过。 |
| IM-002 | P2 | CLOSED | App.tsx:1650–1673、1745–1753 将审批拒绝送入整组取消。两个 crop 均 cancelled、0 provider 请求且草稿保留，浏览器实际通过。 |
| IM-003 | P2 | CLOSED | editTasks.ts:105–116、170–181 与 regions.ts 的同源 overhead 检查；native 色块仍发送标注图，颜色/稳定编号共用 drawMaskAnnotation。native 同色 A/B 与空 composer 提交用例、轮廓及单色 overhead 单测通过。 |
| IM-004 | P1 | CLOSED | Rust image_edit_schema.rs 对 Mask/context/crop 做有界验证，project_package_snapshot.rs:462–468、605–608 允许合法字段；project_package.rs:251、293、325 与 Web collector 收集仅历史引用原件。Web 单测和独立 Rust Mask/history-only assets roundtrip 均通过。 |
| IM-005 | P2 | CLOSED | App.tsx:317、2815–2822 稳定承载共享灯箱，节点入口调用 openPreview；ImageLightbox 在删除后选相邻候选。已审阅绑定同源的实际 EXE 删除来源、切候选及再生收据和截图；独立 Web 共享预览入口测试通过。 |
| IM-006 | P2 | CLOSED | nativeTaskHost.ts:549–575 保留已归档成功输出及 durable resultItemId 发布证据，不再要求候选仍在 items。独立已删除 image candidate 恢复单测通过。Native 既有验收删除的是来源原图，不将其冒称为已删除生成候选的新增现场复现。 |
| IM-007 | P2 | CLOSED | prompt.ts:62 起对本轮指令和上下文分配总预算，过长 required 早拒绝、当前指令不截断；validateEdit 与 prepare 使用同一编译器，App 编辑任务跳过二次 design prompt 编译。独立 prompt 总预算单测通过。 |
| IM-008 | P2 | CLOSED | App.tsx:635–651 共用 group controller/同步 pending approval guard；1625–1647 在 finally 释放后调度 queued；retry/resume 均经过同一 executeTask。独立三 crop 部分失败→区域重试浏览器用例通过；关闭亦基于入口和锁的静态检查，并未声称额外运行专门的人工并发竞态现场用例。 |

## 新开放问题

**IM-009 / P2 — Desktop 验收脚本可能覆盖/删除非本轮凭据，且 PASS 不证明清理成功。**

位置：`tests/desktop/image-edit.mjs:144–149`、`:414–420`、`:448–457`（上述 reviewed HEAD）。脚本使用固定 provider 名称 `Image edit fixture` 和可复用 loopback 端口推导 vaultId，不先读取并确认凭据为空就保存 fixture key；finally 也不凭 ownership 判断就删除该 ID，并静默吞掉删除错误。PASS 收据与 stdout 在 finally 之前写入，因此存在 exit 0/PASS 而未完成系统 vault 清理的确定路径。

复现路径：先使目标 credentialId(baseUrl, 固定 provider 名称) 已存在，再执行设置保存路径，旧值会被替换，finally 又删除该 ID；或令 credential_delete 拒绝，catch 忽略错误而旧 PASS 仍存在。此轮未对真实用户 vault 注入故障或覆盖任何数据；结论来自实际注册、清理和收据控制流，现有随机端口不构成 ownership 证明。

建议：UUID provider 名称；写入前明确读为空后才赋本轮 ownership；只清理本轮拥有的条目，delete 后读回必须为空；失联时仅重连本轮 EXE；cleanup 失败传播并使验收失败；全部清理成功后才写 PASS。需合成冲突原值保留与清理失败路径证明。实现者已开始修复，新 HEAD 应另行复验，本历史结论不回写为 PASS。

## 独立运行的检查

环境：Windows PowerShell，Node v24.20.0；将 `D:/tools/node-v24.20.0-win-x64` 加入本命令 PATH。

- `node --test tests/unit/imageEdit.test.ts tests/unit/imageEditSnapshot.test.ts tests/unit/nativeTaskHost.test.ts tests/unit/projectPackage.test.ts`：exit 0，57/57 PASS。
- `node --test tests/unit/imageMaskAnnotation.test.ts`：exit 0，2/2 PASS；合计 Node 59/59，0 skipped。
- `npm run typecheck`：exit 0。
- `KK_TEST_PORT=1437 node node_modules/@playwright/test/cli.js test tests/browser/image-edit.spec.ts --workers=2 --retries=0 --reporter=line --output=.tmp/review-1527b48/browser`：exit 0，11/11 PASS，单文件实际使用 1 worker，0 retry。使用 strictPort 的独立 production preview，未占用实现者端口。
- `cargo test --manifest-path src-tauri/Cargo.toml image_edit_draft_mask_and_history_only_assets_round_trip`：1/1 PASS。
- `cargo test --manifest-path src-tauri/Cargo.toml mask_is_optional_fingerprinted_and_requires_an_image_original`：1/1 PASS。
- `cargo test --manifest-path src-tauri/Cargo.toml image_output_without_optional_receipt_metadata_can_be_archived`：1/1 PASS。

未在 IM-009 修复前再次运行存在凭据缺口的 Desktop image-edit 验收脚本。没有重跑整套 verify/全 Rust/main 11 组生命周期；这些结果仅作为已审阅的实现者证据。

## 验收内容与提交的绑定

独立读取 `run-integrated-78cea37/source-manifest-integrated.json` 并逐个 SHA-256 重算其 64 个源码/配置/测试文件：审查开始时 64/64 相符。清单明确写的是 `integration working tree before merge commit`，其 `currentHead=ba8806d25ccb35020e2a9dce6baaa1fe4dded57c`；保留该历史字段，没有冒称它是运行时的 1527b48。

独立重算当前构建：

- JS `dist/assets/index-Buq7teU0.js` = `c286fc5ef28daf1670aeca408e12a2beae3df0cffdc5cf4ced3471fb6f59a2d9`。
- EXE `src-tauri/target/release/kk-studio.exe` = `3b5e388fe2932ea3bf02576a8c69db9523a75702f2478b4f5b28b02660cb9b22`。

它们与 Web/Desktop runtime 收据和 commit-binding-1527b48.json 相符。实际源码内容相同、开始时 clean 提交树和独立定向重跑，使既有组合证据可按内容关联本 HEAD；原始收据 SHA 仍为历史事实。已审阅完整 verify 尾部 420 passed、Native 两次 PNG Mask/4 assets 包恢复/删除来源/再生/重启和 mask 外 RGBA 改动 0、main TaskHost 11 组收据，以及 Web 窄屏与实际灯箱截图。Native 原验收证明了图像流程，因 IM-009 尚不能证明 vault cleanup。

## 拒绝超范围判定 / follow-ups

此复验评价统一 Mask 的本地确定性契约与已有证据，不宣布用户全部体验验收完成。真实付费 Provider、物理手机/系统键盘与硬件触摸、任意同宽高比语义几何漂移、真实模型融合视觉质量和用户最终视觉验收未被本轮验证；TASK-IMAGE-EDIT-VERIFY-002 与 FEAT035 PARTIAL 边界应保留。

ImageLightboxStage 的 swipe start 不在共享 cancel 回调显式清空属静态观察；尚未证明正常系统 pointercancel 后还有匹配 pointerup，所以不构造新 P2，也不冒称物理触摸通过。没有推送、创建 PR、合并到 main 或发布。
