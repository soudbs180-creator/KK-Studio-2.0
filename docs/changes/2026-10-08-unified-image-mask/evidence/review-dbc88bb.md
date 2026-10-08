# TASK-IMAGE-EDIT-001 独立最终源码复验

结论：**PASS（本次已审范围）**。IM-001–009 全部 CLOSED；没有新 P1/P2 finding。此结论不代表已合并、发布或用户完成产品/真实模型视觉验收。

- Base: `78cea37af9359fd2d9f58f2854525516deee8a06`
- Reviewed HEAD: `dbc88bbd1a3425c04b509730780ff50547788e67`
- 前一候选：`1527b481cf80499ae25f9136ad164dbe1a20f039`，其 CHANGES REQUIRED 历史收据保持原样。
- Worktree: `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-IMAGE-EDIT-001`
- 审查完成时间：`2026-10-08 12:55:05 UTC`（Asia/Shanghai 为 `2026-10-08 20:55:05 +08:00`，UTC 及 Asia/Shanghai 时间由主机时钟读取；此前亦用 clock 工具交叉核对）。
- Reviewer: `/root/mask_review`，与实现者 `/root` 分离的独立只读 agent。精确模型版本为 **UNKNOWN**：当前接口未暴露可验证的具体版本，不虚构型号。
- 工具：functions.exec / exec_command（Windows PowerShell），git、Node v24.20.0、Playwright/msedge/CDP、现有 Tauri release、SHA-256、clock。未修改源码、Git 状态、其他 checkout 或用户数据；按授权运行仅本轮 UUID 系统凭据的隔离测试。
- 审查前后 HEAD 均为上述 SHA，`git status --porcelain=v1` 均为空。未派生代理。

## 当前规则与范围

重新读取适用 AGENTS.md、engineering/REVIEW.md 和 intent/spec/plan；沿用同一独立上下文已读取的 AI_RULES、PROMPTING、原始用户文本/统一 Mask 图示、verification、ADR 和 UI 索引，并读取本轮全部实际增量文档。已审查 `1527b48..dbc88bb` 的实际 diff 和 `base..head` 最终变更集合。

规则 Git blob 身份：

- AGENTS.md: `0771bc63c13276fbe12f4deea92a1add7befaa22`
- AI_RULES.md: `a39b009e1efb55531b59bdf39debf9dc42bfc9b0`
- engineering/REVIEW.md: `08ce14fb5033758c38de9125f9f80625cdb87914`
- 本任务 spec.md: `f43e37a103b1ad46d65c4bb4ac2f8176c1772213`

最终 base..head 是 81 文件；本轮增量是 7 文件：3 个测试脚本/helper/单测与 4 个文档。直接执行针对 `src src-tauri config VERSION package.json package-lock.json` 的 1527b48..dbc88bb diff，结果为空，产品源码与运行配置没有变化。因此 IM-001–008 基于本 reviewer 自己的前轮源码审查和独立验证，加本轮产品内容等同性、61 个单测及实际 Native 复跑继续关闭，不把实现者摘要当作独立审查。

## IM 状态

| ID | 严重度 | 当前状态 | 独立复核依据 |
| --- | --- | --- | --- |
| IM-001 | P2 | CLOSED | 单指抬起提交、第二触点取消的源码无变化；前轮 production Web brush/color 用例独立通过。 |
| IM-002 | P2 | CLOSED | 审批拒绝走整组 cancel 的源码无变化；前轮两个 cancelled、0 请求及草稿保留的 Web 用例独立通过。 |
| IM-003 | P2 | CLOSED | native 颜色标注与 reference overhead 共用方案无变化；本轮 annotation/单色 overhead 单测通过，前轮 native 同色 A/B Web 通过。 |
| IM-004 | P1 | CLOSED | Web/Rust 有界编辑 schema 与仅历史原件引用收集无变化；本轮 package 单测和实际 4 素材 Native 导出/恢复通过；前轮独立 Rust roundtrip 通过。 |
| IM-005 | P2 | CLOSED | 稳定 App 灯箱 host 无变化；本轮实际 Tauri 删除原图后灯箱保持、切候选、按原快照再生通过。 |
| IM-006 | P2 | CLOSED | 已发布但删除的候选恢复保护无变化；本轮 nativeTaskHost 已删除候选单测通过。实际 Native 脚本删除的是来源原图，不冒称硬件现场删除生成候选的专项复现。 |
| IM-007 | P2 | CLOSED | 4000 总 prompt 预算、当前指令完整与提前拒绝无变化；本轮总预算单测通过。 |
| IM-008 | P2 | CLOSED | retry/resume 共用 group controller/审批 guard、finally queued 调度无变化；前轮三区域部分失败与区域重试 Web 用例独立通过。未额外声称专门人工竞态现场测试。 |
| IM-009 | P2 | CLOSED | 实际读增量确认 UUID provider、空值认领、仅本轮 ownership 删除、删后读回、错误传播和 finally 完成后写 PASS；本轮独立安全单测与实际 OS 凭据冲突保留/清理读回均通过。 |

## IM-009 关闭证据

`tests/desktop/image-edit-credential.mjs:2–12`：claim 只有 credential_get 严格为 null 后才返回 ID；原条目存在或读取失败时不会给调用方 cleanup ownership。release 不吞掉 credential_delete 的错误，读回非 null 也拒绝成功。

`tests/desktop/image-edit.mjs:24–28`、`:154–181`、`:475–505`：本轮 UUID provider 避免固定名称身份重用；vaultId 在 claim 成功后才赋值。所有受控路径只清该 ID，page/browser/app 失联才关闭并重新启动本轮 executable/dataRoot。嵌套 finally 完成凭据校验、App 关闭和 HTTP server 关闭后，才设置 credentialCleanupComplete 并写/打印 PASS；清理异常使整个脚本非零失败。原有用户数据、既存凭据没有成为可清理目标。

两项有意义的单测同时覆盖“已有值被拒绝且无 ownership/无删除”和“删除拒绝/无效删除必须报错”。实际 Native 脚本在自己的空 UUID ID 中预置合成值，再次 claim 被拒绝、原值读回一致；之后删除并读回为空，再认领执行图片验收，最终清理再次读回为空。

## 本轮独立执行

将 `D:/tools/node-v24.20.0-win-x64` 加入本命令 PATH；Node v24.20.0。

1. `node --test tests/unit/imageEditFixtureCredential.test.ts`：exit 0，2/2 PASS。
2. `node --test tests/unit/imageEdit.test.ts tests/unit/imageEditSnapshot.test.ts tests/unit/imageEditFixtureCredential.test.ts tests/unit/imageMaskAnnotation.test.ts tests/unit/nativeTaskHost.test.ts tests/unit/projectPackage.test.ts`：exit 0，61/61 PASS，0 skipped。
3. `node node_modules/prettier/bin/prettier.cjs --check tests/desktop/image-edit.mjs tests/desktop/image-edit-credential.mjs tests/unit/imageEditFixtureCredential.test.ts`：exit 0。
4. `node tests/desktop/image-edit.mjs`：exit 0。独立本轮证据目录 `.tmp/image-edit/desktop/run-1791463898383-70816/`；receipt SHA-256 `699dd1f1abd070db1fd8bf597cb015184f85ff7f961fc2eb508e0c775e226284`。

本轮实际 Native 结果：

- `http://tauri.localhost/`，production，`src/main.tsx` 入口。
- 两次 PNG Mask multipart，各 1 张 source image、1024x1024。
- 4 素材项目包导出/恢复，删除来源原图、相邻候选、重新生成、关闭/重新启动和不重复提交通过。
- Mask 内 RGBA 改动 1071，Mask 外 RGBA 改动 0；errors 为空。
- credentialConflictPreserved=true，credentialCleanupComplete=true。
- 脚本结束后独立查询 CDP 9364，无监听；工作树仍 clean。

本輪未重跑整套 verify/全 Rust/全部浏览器，因为产品源码与配置无增量且已有本 reviewer 的定向独立证据。读取实现者本轮实际完整 verify 日志及 browser-final-summary：root 741/749（8 原 skip）、Agent 172/174（2 原 skip）、browser 420/420、unexpected 0、flaky 0。该全套结果明确作为实现者执行证据，不冒称 reviewer 自行运行。前轮独立执行的 typecheck、production Web 11/11、Rust 3/3 已绑定本轮未变产品内容。

## 哈希与历史绑定

独立逐个重算 `run-credential-fixed-IM009/source-manifest-credential-fixed.json` 的 66 个源码/配置/测试文件：66/66 相符，0 mismatches。原 manifest 明确为 `fixture safety fix working tree before commit`，currentHead 仍为历史 1527b48；不把它改写成已在 dbc88bb 时执行。

当前构建独立重算，并由本轮实际 Tauri runtime 读回确认：

- JS `dist/assets/index-Buq7teU0.js` SHA-256 = `c286fc5ef28daf1670aeca408e12a2beae3df0cffdc5cf4ced3471fb6f59a2d9`。
- EXE `src-tauri/target/release/kk-studio.exe` SHA-256 = `3b5e388fe2932ea3bf02576a8c69db9523a75702f2478b4f5b28b02660cb9b22`。

两者与 1527b48 的组合收据完全相同，符合产品源码无变化事实。源码/配置清单实际内容相同、clean committed tree 和 reviewer 本轮运行，使旧与新收据可按内容关联当前提交；原始收据历史 SHA 保留。

`review-1527b48.md` 的 SHA-256 审查前后均为 `c26e4ced22ce9f4017580e14c2ed48d24b28bf2a252b41956572817072c59947`，没有覆盖其 CHANGES REQUIRED。

## 范围边界

真实付费 Provider、物理手机/系统键盘与硬件触摸、任意同宽高比语义几何漂移、真实模型融合视觉质量和用户最终视觉验收仍未验证；TASK-IMAGE-EDIT-VERIFY-002、FEAT035 PARTIAL 应继续保留。尚未证明灯箱 pointercancel 后仍会有匹配 pointerup，相关 swipe start 的静态观察不构造已复现 P2。

没有推送、创建 PR、合并到 main 或发布。实现者后续只收尾文档形成的新 SHA 仍须短补审；本收据不会自动把未看过的新文档 head 批准。
