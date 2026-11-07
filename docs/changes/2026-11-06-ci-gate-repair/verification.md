# 主线同步门禁修复验证

GitHub 运行 `42225937415` 与 `42225937453` 的失败点：

- `verify` 停在 `tests/unit/worktreeLifecycle.test.ts`。脱离分支时当前分支名为空，断言要求它非空。
- `delivery` 报告 74 项违规。两套变更包缺文档，其余新增包没有绑到审查分支的任务。
- `installer` 在写回执前发现 `vendor/canvas-agent/src/canvas/atomic-schema.ts` 被构建改写。

本地修复后的复验结果写在提交说明和后续 GitHub 检查里。本文件记录失败原因和修复范围，不把尚未重跑的远端检查写成通过。

## 2026-11-07 全面治理收口

- Cursor 接管本任务。本地：`typecheck`、`lint`、`format:check`、`ui:check`、`tokens:check`、单元测试通过；清除虚假的 test:fast 脚本名 文档命令。
- Hosted `4990025b`：`delivery`/`installer`/`mobile` 成功，`verify` 仍因 6 个 Prettier 文件失败。本轮 dirty 已含格式修复与设置/Mobile/治理增量，推送审查分支后以新 SHA 的 Hosted 结果为准。
- 未做：合并 main、正式 SHA 独审、真实 Provider/扣费、外部桥侧车、UI-004 全页验收。

## 2026-11-06 主线集成与治理续验

任务仍为PARTIAL；本轮不合并PR、删除分支/工作树或发布。全部日志/机器态原件位于容器output/mainline-governance-20261106/，不覆盖旧失败与旧数据。

### 阶段1：工作区与Hosted事实

- 起始main与审查分支均4990025b6a5ac391407aa5b4030a29b5b165018f；唯一worktree、干净；origin/main9b1038a75a62d0fc6fc9c23d6866711138493ab7，220/0。main、master与审查分支均无仅存本地提交。复用审查分支开展后续修改，未直接写main。
- PR83 OPEN、非draft、mergeable=true、mergeable_state=unstable；GitHub reviews/threads均空，不代表独立审核通过。GitHub fetch_pr连接器两次Transport closed，改用只读REST取得紧凑metadata，其他jobs/reviews沿用连接器。
- 当前4990025b：[quality42232887750](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/42232887750) Delivery/Mobile/Governance/deploy-linux成功；Verify失败。根2760 tests中2741 pass/19 skip/0 fail，Agent207中205 pass/2 skip/0 fail，随后format:check列6文件失败，Rust/Native后续步骤未运行。完整原日志hosted-verify-127942959879.log已保存。
- [Windows Installer42232887617](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/42232887617)构建、不可变回执创建/校验和上传均成功；这是候选安装器证据，不是已安装/签名/发布或用户接受。

### 阶段2：全部开放PR和远端分支

只读git fetch不prune。PR81最新HEAD70a66bae91c5dc5f2abf8cb4353292dd5a2da7c9完整包含于PR83；禁止重复合并。其余开放PR仍有非祖先提交，全部保留。

| PR | HEAD | #83包含 | 非祖先提交数 |
|---|---|---|---|
| [#83](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/83) | 4990025b6a5a | 是 | 0 |
| [#81](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/81) | 70a66bae91c5 | 是 | 0 |
| [#80](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/80) | e241e339f03e | 否 | 2 |
| [#58](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/58) | 06f5fde94e32 | 否 | 12 |
| [#52](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/52) | 380ffff39d67 | 否 | 7 |
| [#50](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/50) | b92ee2e9e453 | 否 | 1 |
| [#49](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/49) | b46daae7b000 | 否 | 6 |
| [#47](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/47) | 0f663222addc | 否 | 3 |
| [#45](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/45) | e2bebc96976d | 否 | 4 |
| [#44](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/44) | 19af08498d34 | 否 | 7 |

89个远端分支中7个HEAD为#83祖先/同一提交；82个不是祖先。下面“patch数”是逐提交cherry-pick比较，不能证明复合squash的功能缺失或全树等价，也不授权删除。完整99个HEAD对全部89远端分支的包含集合在all-ref-containment.json；初始三目标的包含/差异在containment.json、branches-containment.tsv。

| 远端分支 | HEAD | #83包含 | 非祖先数 / patch数 |
|---|---|---|---|
| archive/local-master | 805d91bc1edc | 否 | 122 / 122 |
| arena/649ca8f1-kk-studio-2-0 | 3a7ff159d8a0 | 否 | 1 / 1 |
| chore/TASK-CONSOLIDATE-200 | da811283e55c | 否 | 70 / 70 |
| chore/TASK-KK2-MAIN-CLOSE | 08b5e53eb47b | 否 | 1 / 0 |
| chore/TASK-KK2-MAIN-SYNC | 96fc440b4c00 | 否 | 4 / 4 |
| chore/sync-local-main-20261106 | 4990025b6a5a | 是 | 0 / 0 |
| codex/T10-PREP-vps-migration | abe1e99a7f2b | 否 | 8 / 8 |
| codex/T5-native-lifecycle | 04260ad823b1 | 否 | 11 / 11 |
| codex/T7-desktop-installer | c867fd608c52 | 否 | 10 / 10 |
| codex/TASK-AGENT-008-image-transport | f854bfbde2ff | 否 | 2 / 2 |
| codex/TASK-AUDIT-20261003 | cddacaf19d9c | 否 | 45 / 45 |
| codex/TASK-CHERRY-RED-001 | 0e77c54cb879 | 否 | 153 / 153 |
| codex/TASK-CHERRY-RED-001-mainline | 06f5fde94e32 | 否 | 12 / 12 |
| codex/TASK-COMPARE-001-canvas-compare | bcda41ab5aa5 | 否 | 3 / 3 |
| codex/TASK-GOV-005-publish-main-20261012 | 24a8b8ed651a | 否 | 134 / 134 |
| codex/TASK-IMAGE-EDIT-001-unified-mask | 297ba0dd84c6 | 否 | 12 / 12 |
| codex/TASK-LAUNCH-001-quiet-start | a550f3153244 | 否 | 7 / 7 |
| codex/TASK-MAIN-CLOSE-002 | dac81ec1c24d | 否 | 17 / 17 |
| codex/TASK-MODEL-001-capabilities | 12f5f6ab18fe | 否 | 8 / 8 |
| codex/TASK-ORCH-002-stage-workbench | c8de6c2dd3ea | 否 | 5 / 5 |
| codex/TASK-PROJECT-001-landing-integration | 726f5a41070c | 否 | 41 / 41 |
| codex/TASK-UI-011-image-selection-actions | 99ddf641c65b | 否 | 8 / 8 |
| codex/TASK-UI-MAIN-001-alignment | d75e6d2501c8 | 否 | 2 / 2 |
| codex/TASK-UI-MAIN-001-followup | e2cf75154f97 | 否 | 3 / 3 |
| codex/TASK-VERIFY-CONCURRENCY-002 | 9ae856ea5229 | 否 | 7 / 7 |
| codex/TASK-VERIFY-CONCURRENCY-002-closeout | 5a0ff6e0e814 | 否 | 1 / 0 |
| codex/TASK-VERIFY-CONCURRENCY-002-root-cause | b92ee2e9e453 | 否 | 1 / 1 |
| codex/TASK-VERSION-001-platform-versions | 9d558577c918 | 否 | 3 / 3 |
| codex/ui-redesign-20261011 | 7f29db98a00a | 否 | 131 / 131 |
| docs/PLUGIN-DESKTOP-001-closeout | fff8bf9004c7 | 否 | 3 / 3 |
| docs/TASK-ASTRA-001-remote-manifest | 9edb5281b5d9 | 否 | 1 / 1 |
| docs/TASK-CLOSEOUT-2026-09-28 | e9d2e19aff2e | 否 | 3 / 3 |
| docs/TASK-GOV-006-unified-handoff | 89fba48244d5 | 否 | 4 / 4 |
| docs/TASK-MOBILE-12AI-001-production-receipt | d3cb6c7e50ff | 否 | 3 / 3 |
| docs/TASK-MOBILE-COMPOSER-001-production-receipt | 997630ec9ab4 | 否 | 3 / 3 |
| docs/TASK-P0-EVIDENCE-REFS-20261009 | 0f663222addc | 否 | 3 / 3 |
| docs/TASK-P0-REGISTRY-20261009 | 3d358f0ae41f | 否 | 1 / 1 |
| docs/TASK-POSTMERGE-2026-09-28 | d2485dbf4287 | 否 | 2 / 2 |
| docs/TASK-POSTMERGE-FINAL-2026-09-28 | 870a1bcd3ff9 | 否 | 2 / 2 |
| docs/TASK-RULES-004-closeout | 150debab2551 | 否 | 1 / 0 |
| docs/TASK-RULES-004-main | dfed07447486 | 否 | 7 / 7 |
| docs/TASK-RULES-004-md-audit | 5136096cb2c7 | 否 | 74 / 74 |
| docs/TASK-RULES-005-figma-token-governance | 96797c6cc37d | 是 | 0 / 0 |
| docs/TASK-UI-MAIN-001-close | 0d0760a7c6ae | 否 | 1 / 0 |
| docs/TASK-WEB-RELEASE-20261017-production-receipt | 0cb2fc090fb3 | 否 | 1 / 0 |
| feat/TASK-AGENT-004-google-closeout | 13671d7a2e40 | 否 | 12 / 12 |
| feat/TASK-AGENT-005-google-cli-login | 9c5fafd0f3ab | 否 | 3 / 3 |
| feat/TASK-AGENT-007-codebuddy-cli | c9ebd9036cc7 | 否 | 7 / 7 |
| feat/TASK-ENG-001-code-health | a3a4c85281f4 | 否 | 11 / 11 |
| feat/TASK-LOCAL-SERVICE-001-companion | cf95b4ab0652 | 否 | 15 / 15 |
| feat/TASK-MEMORY-001-local-memory | 0a88916dbf8e | 否 | 6 / 6 |
| feat/TASK-ORCH-001-agent-orchestration-closure | 08b5ae1d74d2 | 否 | 13 / 13 |
| feat/TASK-PROV-002-provider-connectivity | d783d0890714 | 否 | 6 / 6 |
| feat/TASK-PROV-003-provider-wiring | 261834484a80 | 否 | 4 / 4 |
| feat/TASK-PROV-004-claude-landing | dbeee9d6f8a5 | 否 | 6 / 6 |
| feat/TASK-UI-009-ui010-integration | 76be5c3b9ee8 | 否 | 6 / 6 |
| fix/PLUGIN-DESKTOP-001-csp | 9b33fb4244c1 | 否 | 3 / 3 |
| fix/TASK-AUDIT-REPAIR-20261017 | bbc8a766740e | 是 | 0 / 0 |
| fix/TASK-CANVAS-RELEASE-20261018 | 4968cfa13b08 | 否 | 5 / 5 |
| fix/TASK-CANVAS-RELEASE-20261018-draft-race | 4d5e5928a16a | 否 | 3 / 3 |
| fix/TASK-CANVAS-RELEASE-20261019-download-asset | e680aeeb6de6 | 否 | 2 / 2 |
| fix/TASK-CANVAS-RELEASE-20261019-installer-lifecycle | 35d8265c26dc | 否 | 1 / 0 |
| fix/TASK-CANVAS-RELEASE-20261019-installer-provenance | d965f30c9202 | 否 | 4 / 4 |
| fix/TASK-CODEX-HOME-20261015 | f5d0c327a4e3 | 否 | 2 / 2 |
| fix/TASK-CODEX-HOME-20261015-main | fc76f84bfac4 | 否 | 5 / 5 |
| fix/TASK-COMPARE-002-touch-target | a6629ab6b62d | 否 | 3 / 3 |
| fix/TASK-EXPLORER-GDI-20261015-main | f9c6aa7186c6 | 否 | 8 / 8 |
| fix/TASK-FIX-PUSH-GUARD-SPACES-001-main-replay | cc3fad969582 | 否 | 7 / 7 |
| fix/TASK-FIX-PUSH-GUARD-SPACES-001-paths | b46daae7b000 | 否 | 6 / 6 |
| fix/TASK-FIX-PUSH-GUARD-SPACES-001-windows | 380ffff39d67 | 否 | 7 / 7 |
| fix/TASK-ISSUE-68-settings-save | d7359851544c | 否 | 2 / 2 |
| fix/TASK-MINIMAX-001-mcp-registry-limit | 381383d33e1c | 否 | 4 / 4 |
| fix/TASK-MOBILE-12AI-001-provider-compat | b0ef662233e6 | 否 | 4 / 4 |
| fix/TASK-MOBILE-COMPOSER-001-focus | 791e4483a4fb | 否 | 4 / 3 |
| fix/TASK-PLUGIN-DEV-001-same-origin-modules | cc28d8cee43d | 否 | 14 / 14 |
| fix/TASK-PROV-CONFIG-004-safe-toml | 19af08498d34 | 否 | 7 / 7 |
| fix/TASK-UI-010-ui-regression | 33ac5b3162e2 | 否 | 6 / 6 |
| fix/TASK-UI-013-single-row-titlebar | c5f0d59b4307 | 否 | 6 / 6 |
| fix/TASK-UI-015-project-drag | e2bebc96976d | 否 | 4 / 4 |
| fix/TASK-UI-FLOATING-20261019 | e241e339f03e | 否 | 2 / 2 |
| fix/TASK-UI-FULL-20261015 | 0ac9e29e36b0 | 否 | 196 / 196 |
| fix/TASK-VERIFY-ORIGIN-003-main-7ebf143 | ce440c679208 | 是 | 0 / 0 |
| fix/TASK-WEB-RELEASE-20261017 | 09c3808ba5f0 | 否 | 4 / 4 |
| fix/TASK-WEB-RELEASE-20261017-mobile-entry | 690d864b12fe | 否 | 1 / 0 |
| main | 9b1038a75a62 | 是 | 0 / 0 |
| pr56-mainline-integration-20261013 | a3a4c85281f4 | 否 | 11 / 11 |
| refactor/TASK-MOD-P0-architecture-baseline | 5f78d18703f2 | 是 | 0 / 0 |
| refactor/TASK-MOD-P3-feature-cycles | 70a66bae91c5 | 是 | 0 / 0 |
| test/TASK-IMAGE-RETRY-004-current-attempt | e30c80ae01e6 | 否 | 5 / 5 |

### 阶段3：222项台账与第二阶段/六支柱

- 全222逐项静态审计、1134条证据引用/770唯一文件可读并散列；validateLedger/validateFeatures/renderLedger一致性通过。121 DONE、77 PARTIAL、16 TODO、3 BLOCKED、2 IN_PROGRESS、3 OBSOLETE（开放98）；本轮保留全部ID和机器status。文件存在不证明验收通过，历史DONE按其原scope保留；18个DONE依赖开放父任务不批量降级。完整222行JSONL/TSV、冻结原账本及报告在ledger-audit/。
- 更正Gateway流/DPAPI受控契约、独立Expo/RN手机源码、Comfy H3和宽图后继有界验收、旧P2/Ardot/旧工作树/额度日期等陈旧执行路由；两项OBSOLETE的展示“已完成”改为“未完成”。没有按旧FAIL重新开发，历史失败原件和功能真实度不改。
- 六支柱权威定义为记忆、网关、扩展、Agent、画布、分镜/工作流；主要生产公共入口和调用链已存在，187定向单测通过、Schema只读同步比较通过。B1–B4实现存在，B5抽查消费共享组件；原指定控件全集/A2与A3独立编号映射未被spec保存，标UNKNOWN而非发明。详见phase2-pillars-audit/audit-report.md。
- 历史step2 verify-4完整通过，verify-5后续2失败/9flaky/9未跑；“完整verify未跑”已过期，但也不能用旧通过覆盖后续失败或当前源码。旧Desktop/外部模型/用户验收分别保留。
- 新Scheduler、DelegationPipeline与externalBridge仅有helper/离线契约或测试构造，无完整生产调用链；外部桥无真实IO却返回成功的既存原型风险单列，不能当六支柱生产完成。活动雷达三个未入222权威ID仅是协调元数据，不以其旧DONE升级产品状态。

### 阶段4：门禁根因与当前修复

- Hosted列6文件格式失败；本地另5文件仅换行需要归一化，全部11文件逐一等于基准源码按现有Prettier配置的输出（format-proof.json），没有改测试断言/门禁/基线。原始转译字节检查因TypeScript保留引号格式而不等，该尝试未作为行为一致证据。
- schema同步catch把所有读取失败视为缺文件。新增权限拒绝回归在旧实现真实RED（Missing expected rejection），收紧为仅ENOENT创建，权限错误写入前传播；GREEN2/2。health由1 blocking/2 allowed到0 blocking/2 allowed；版本补记2.1.66候选后0 hardcoded/0 changelog warning；均未改检查或上调基线。
- verify-local-01在5文件格式处失败，保留。verify-local-02生产浏览器959 pass/1 fail/1 skip，唯一手机首页对话用例首试和retry均在初读未完成时点“对话”；error-context明确存储尚未就绪。App.tsx handleNewBlankProject的saved/saving保护有效，测试缺少初读前置。只增加创作输入框已显示且creation-storage-notice归零的真实条件，保留全部对话/收起/空白内容断言；零重试定向1/1通过。没有固定sleep、重试点击或削弱旧数据保护。
- 最新完整verify-local-03、当前Desktop、Mobile组合Web及最终SHA独审/Hosted仍在续验；后续结果追加，不把退出码advisory或SKIP写成真实验收。

### 阶段5：04/05设计与数据边界

- [当前UI来源及最小修复前置](../2026-11-05-figma-local-sync/verification.md)已追加当前04/05、47:184/47:185、47:926、106:5650/770:97841上下文、截图、变量和读取边界。旧399:27506不可读，修正容器锚点后只到FIGMA_READY。
- 网络页复用既有details样式，三块回到无底/无描边/无额外内边距，保留所有解释、代理地址与Companion真实功能。新测试旧版RED（缺使用说明），当前390/1099/1920均零重试GREEN。手机复用Card quiet、Action segment与Content settings，当前9角色颜色经既有source JSON→generated编译；48高/R8及选中/未选语义有RED→GREEN与Mobile typecheck/5定向通过。其他颜色角色、字体、全页/六态/严格像素/真机不由局部修复代填。
- 原127真实页面只读查看确认迁移失败读取保护仍在，未点击重新读取/下载，未清空、覆盖或降低Agent/Google旧会话保护。高级手机源设计hidden与现有真实业务入口冲突，保留入口并记录CONFLICT，不根据截图删除功能。

### 审查与下一步

初始CI/治理增量独立dirty预检Standards/Spec新增发现0、定向12/12；它仅覆盖其冻结manifest，不覆盖后来UI或整个PR83约3087文件。最终base/head独立复核、当前CI、Native、UI/用户验收分别记，不冒充GitHub作者approval。下一最高优先级是当前完整Verify、Desktop来源和Native运行、Mobile组合Web，之后精确SHA审查并推送审查分支核验Hosted；用户未授权合并、删除或发布。

## 2026-11-07 续验

- 本地与远端起点仍4990025b/9b1038a7，唯一审查工作树，全部本轮改动尚未提交/推送。重新回读当前Figma47:926和手机浅/深变量，目标值仍与前置证据一致。
- verify-local-03在新增网络CSS的Tier1泄漏处失败；改为7个Tier3纯var别名后tokens为0 regression/0 strict，未上调基线。verify-local-04在designMarkdown旧整文件快照hash处失败，actual4bfcaf3e/expected869c4a1a。源diff精确为7别名及来源注释，Figma47:926前置成立；只更新冻结hash/comment，保留完整hash/尺寸/对比度断言，designMarkdown40/40通过。两次失败原日志保留，不改成历史成功。
- UI独立复核发现P2按下态前景未消费pressed、P3内部gap12偏离源8。原控件新增实际回归RED（a0a0a0非dbdbdb），改为Pressable children回调同态计算前景，segment专用gap8和单行；5项定向GREEN，默认非segment兼容范围保留。Mobile最终typecheck与435项单测通过；Expo/Metro组合Web真实编译通过。
- Mobile组合Web当前44/44，零重试、零跳过：包含320/390浅深主题一行、48高/R8、按下前景/松开保持选择及既有草稿/原件/语音/视频/错误保护。报告test-results/mobile-web/f4b77154-0325-4223-9c5d-6b7b498fa6e6/mobile-web-results.json；两主题截图已目视复核。真实手机/新Native包、字体与全页像素没有因此写成通过。
- cargo fmt初次失败仅creation_validation.rs、project_package_failure_tests.rs、project_package_snapshot.rs三文件换行；声明范围后仅格式化这三份，fmt复验通过。cargo test --no-default-features --locked：318+25+19+26+41=429通过、1既有忽略、0失败。client:check通过；7条dead_code警告保留。
- `verify-local-05-20261107` 已完成：单元 2762 总计 / 2742 pass / 20 skip / 0 fail；随包 Agent 207 总计 / 205 pass / 2 skip / 0 fail；生产浏览器 964 总计 / 963 pass / 1 skip / 0 fail；设计预览 9/9；开发插件 PASS。像素比较仍是 1 skip，不能记为像素通过。完整日志保留于 `output/mainline-governance-20261106/verify-local-05-20261107.log`。
- 快速收口：`rules-check-20261107.log` 为 52 IDs / 0 violations；`tokens-check-20261107-final.log` 为 0 regression / 0 strict issues（仍有 2 项 baseline reductions advisory）；post-native typecheck、lint、unit、format 均 exit 0。lint 首次发现的是生成台账视图过期，运行 `npm run governance:write` 后治理为 222 tasks / 0 violations；没有改测试断言或放宽基线。
- 当前 Desktop 官方来源重建：`npm run client:build -- --no-bundle` exit 0，源码构建前后指纹一致，EXE `src-tauri/target/release/kk-studio.exe` SHA-256 为 `476FFF2B880094FF11774017DD954D57791183747657555655B662D893A2CE82`；警告仅为既有 Rust dead-code advisory。证据：`desktop-build-20261107.log`、`source-fingerprint-before/after-desktop-20261107.txt`、`desktop-exe-sha256-20261107.txt`。
- 当前 Native taskhost：首次失败是旧测试寻找已删除的 `API Key（官方）` 按钮，保留 receipt；将测试定位器对齐现行 `官方直连 API` tab 与 `图像生成` 能力 tab 后，`native-taskhost-20261107-final2.log` 通过 11/11，receipt 为 `test-results/desktop/taskhost-lifecycle/1794020560952-a08d5604-fc49-4a11-bebf-5cff5999d3df/receipt.json`。这是隔离数据根和合成 Provider，不是真实计费 Provider 或用户数据验收。
- 本轮仍未完成：正式 SHA 独立审查、Hosted 回读/PR 合流、安装器/已安装版本、真实 Provider、Native 全窗口/真机和全页六态/像素验收。用户未授权合并、删除、推送或发布，工作树与旧失败原件保持。
