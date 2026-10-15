# Verification：首页默认Codex与模型选择分流

- Task ID：TASK-CODEX-HOME-20261015；记录状态：REVIEW；整体验收：NOT_VERIFIED；本地分项结果见下，完整npm verify未PASS。
- 日期/时区：2026-10-15，Asia/Shanghai；[intent](intent.md)、[spec](spec.md)、[plan](plan.md)、[review](review.md)。
- cwd/branch：`D:/kk-studio/.worktrees/branch-consolidation-20261011` / `fix/TASK-CODEX-HOME-20261015`。
- Base/开工HEAD：`cbda65e4389fc807769a8faf7654892415992589`，tree `9f3cfd20ac83da043f6d64c2ce35187ef3360a4d`；当前产品dirty，版本源Desktop/Web2.1.33、Mobile2.1.1；最终head与运行态待root冻结。下文candidate1/2的实际2.1.32回执不移用到2.1.33。
- 交付包角色：`current`；本轮旧模型/API取证、旧main或前置真实账号结果不代填新首页验收。

## 前置闭环：TASK-UI-FULL-20261015（历史范围）

旧任务在其原范围已实际完成。source `0ac9e29e36b00d406ea4977bc3a895bb73954f13`通过独立精确review，PR59正常squash到main `cbda65e4389fc807769a8faf7654892415992589`，parent `694a00607f6f63de1b8c43d0ebb117adf5d34f67`，tree `9f3cfd20ac83da043f6d64c2ce35187ef3360a4d`。

PR quality `38667229872`、main quality `38670857295`各自原始证据审计通过：761 unique/single-result/首试PASS、实际retry0，Native11、development4，源码9hash与Native10 bundle身份对应；main Guards `38670857398`、main-health `38673059923`由root实际确认通过。继承的非必需auto-invalid失败与旧flaky/失败继续保留，不概括历史CI全部绿色。

工程外回执位于 `D:/kk-studio/.analysis/ui-full-20261015/`：`integration-review-0ac9e29e.json`（SHA256 `3e581c5abb3a4019d21d40d890894a0cfbc6f2939122e2dedb2f7a68637c12b9`）、`hosted-pr-audit-0ac9e29e.json`（`e8ce375c67950e9f23e4e1c532f3c3dcbd26fbf7d77ce24357ea2ee2cb17a9ae`）、`hosted-main-audit-cbda65e4.json`（`0f313b55f7e18156fa5bf736b8bb2f8dd48780c7d3771ba3686f57435afa353d`）。

实际本机2.1.31官方重建/普通入口/default数据profile通过，EXE SHA256 `f23198e10ae35735ec4e03c442260f7eeac66bb5908df22a228a1f0f5dd32915`；4602受保护源码文件、254项dirty/index与原项目保全。见 `D:/kk-studio/.analysis/local-main-activation-20261015/activation-closeout.json` 与 `activation-review.json`（SHA256 `8c3fae1bd5bf40401d332351ad8a4dbabfc90970d41fabb259848558b6cfb4aa`）。最终普通实例只做身份绑定，DOM来自先前同EXE/default-profile的诊断实例。

其后同main的实际Codex账号文本/单张1254PNG/归档重开已审计，见 `D:/kk-studio/.analysis/codex-channel-restore-20261015/codex-channel-review.json`（SHA256 `74775a7e13d13354168bf0b872d4f744e27b0cf1e0ed06cf48e2759b8162824f`）。这只证明旧Agent入口能力；图片型号未报告、API配置未找回与新首页未修复仍各自有边界。旧任务ledger原verification逐字保存在verificationHistory；DONE只指其验收范围，不升级整项目或外部Provider真实程度。

## 本轮命令、失败与结果

当前以REVIEW准备提交：full5浏览器和实际Native包往返分项通过，development尚未执行、精确提交独审与Hosted/main/本机更新待验。下表及后文的早期pending与失败按阶段保留，最新边界见[full5收束](#full5分项通过与完整命令未通过review)。

| 检查 | 执行者/阶段 | 结果 | 范围 |
| --- | --- | --- | --- |
| `npm run typecheck`、`npm run version:check` | root/分支创建前 | PASS | clean/main基线；不是当前dirty实现验收 |
| `npm run governance:check` | 文档owner/修改前 | exit0，139任务/0违规 | 基线 |
| `npm run features:check` | 文档owner/修改前 | exit0，37项/0违规 | 基线 |
| `npm run markdown:check` | 文档owner/修改前 | exit0，122 active/0违规 | 基线 |
| `npm run snapshot:check` | 文档owner/修改前 | exit0，3文档/0违规，container未配置 | 基线 |
| 新creation定向回归 | root、实现者 | RED：20PASS/1FAIL与15PASS/1FAIL | 新Codex选择归一化字段缺失；非预存失败 |
| 官方version:bump与`npm run version:check` | root/本任务 | PASS，Desktop/Web2.1.31→2.1.32 | Mobile2.1.1不变；不代表候选已构建 |
| P2修复前unit与Rust | root/前一dirty组合 | exit0；unit1324总/1310PASS/14skip，Rust163PASS | `unit-full-1`、`rust-1`日志/exit.json；不是四组P2修复后的最终结果 |
| UI2布局定向 | UI owner/production preview1423/Edge | 有效RED8；最新GREEN8/8首试，retry/flaky/skip/globalErrors均0 | `layout-green-3.json`与summary；只含UI2组合dist，不含后续逻辑/原生修复 |
| connect flight交接定向 | lifecycle实现者 | `lifecycle-green-2.log`，12/12通过，lint/typecheck/format/diff-check通过 | +16行源码已冻结，SHA256 `66f43b658c6c908f622a9a28fee00e1ac634852f0b6818698fbe2beaf6c9e7a8`；实现者结果，不是独立审查或Native全链路 |
| 附件/询问/root新根因定向 | 路由实现者 | 附件有效RED3FAIL、询问RED1FAIL、root unit RED1FAIL；GREEN附件4+routing7共11PASS/retry0、unit21PASS | `logic-final-receipt.json`；生产loopback fixture，非真实账号验收 |
| VV scale2定向 | UI owner | 有效RED1FAIL→layout9项首试PASS/retry0/flaky0/skip0/errors0 | `layout-visual-viewport-*`；实际VV resize，offset0；非零偏移/Native软键盘未动态覆盖 |
| 当前Rust/fmt | root | `rust-final` exit0，165/165PASS；fmt PASS | 新原生严格字段修复后范围；不等于Native/live通过 |
| fullverify1 | root | exit1，真实停止于format | `tests/browser/codex-home-routing.spec.ts`并发新改动未格式化；已修，失败日志保留，非完整PASS |
| fullverify2启动阶段 | root | 首次补录时进行中 | 历史时点；实际失败终态见下行，不从前置阶段推定通过 |
| fullverify2终态 | root | exit1；781 unique：768PASS/13FAIL、flaky0/skip0/errors0，794个结果/13次实际retry | 原始`verify-full-2-browser.json`与failures/exit/log保留；绝不称零retry或完整PASS |
| 最终label/UI定向 | UI owner | 63 unique/63 single passed，retry/flaky/skip/errors均0 | `label-layout-final-summary.json`/`label-target-3.json`；dirty scoped browser，不是最终SHA或Native包批准 |
| fullverify3终态 | root | exit1；784 unique：781PASS/3FAIL，787 results/实际retry3、flaky0/skip0/errors0 | 原始log/exit/browser/failures保留；下一轮full4待测，不假定全是过时断言 |
| Native33单QA项目包 | root | `export_project_package`真实失败：corrupt/项目快照无效 | 真实item含mediaWidth/mediaHeight，严格包白名单缺失；两个Rust文件TDD修复/重建/实际包往返待验 |
| 官方candidate2 | root | build exit0，release32.75s，Tauri production2.1.32 | `native-final-identity.json`；实际图片/保存重开尚待结果 |
| 当前精确SHA review、Hosted、PR/main与本机重建 | 后续 | NOT_VERIFIED | 不迁移旧main绿灯 |

### 本轮文档认领检查（仅治理范围）

文档owner已实际执行：`governance:write/check` exit0（140任务/0违规）、`features:write/check` exit0（37功能/0违规）、`markdown:check` exit0（122 active/0违规）、`snapshot:check` exit0（3文档/0违规，container未配置）、doc-index exit0（19 ADR/0违规）、doc-commands exit0（148 active/0违规）及文档diff whitespace检查。两份JSON仅对owned文件运行Prettier，未格式化并行源码。

已相对base ledger逐对象比对：除获授权收束的TASK-UI-FULL外，138个历史任务对象值完全相同；该任务旧verification全文逐字保存在verificationHistory。37项功能状态与其他功能对象保持，新任务仅关联FEAT-001/002/009。生成TASK_LEDGER与功能README来自脚本。上述结果只证明治理前置，不代表本轮产品、运行态或最终SHA通过。

后续更新当前task时曾临时产生JSON全量换行噪声，已按base原始对象块纠正：最终仅旧UIFULL收束块与本task新增块改变，其余138个raw JSON对象块逐字节及对象值均相同。base/current这138块按原顺序以NUL连接的SHA256均为`ca7a3ffe6612c17419f3dce0ee37e38ff0d70f065a79953ad0ae9b1a1ac0b36a`，旧verification原文仍完全相同；未全ledger格式化。

本轮新增边界补录后，治理140/0、功能37/0、Markdown122/0、snapshot3/0、索引19 ADR/0、命令174 active/0及docs diff-check均实际exit0；当前版本源已为2.1.33。该静态结果不代替fullverify3、Native或最终SHA审查。

后续另一任务登记后，文档门禁实际exit0：治理141/0、功能37/0、Markdown122/0、snapshot3/0、索引19 ADR/0、命令150 active/0及docs diff-check。本次仅改HOME任务对象，其他140个当前raw JSON对象块逐字节保持；相对base的138历史对象raw/值仍完全相同，NUL连接SHA256仍为`ca7a3ffe6612c17419f3dce0ee37e38ff0d70f065a79953ad0ae9b1a1ac0b36a`，旧UI原verification继续在history逐字保留。当前ledger为141项，83 DONE/0 IN_PROGRESS/35 PARTIAL/12 TODO/7 REVIEW/4 BLOCKED；另一TASK-CODEX-REF状态依其作者原文，本任务REVIEW/整体NOT_VERIFIED。

## 验收覆盖与运行态

### 最新冻结、失败与定向事实（最终组合未验）

新增三处根因已整合：附件异步旧callback覆盖新draft改为当前callbacks/current max整批边界；询问旧source/prompt快照仅同draft身份可确认；Codex新project初始generationStatus为undefined而API保留原pending，避免虚假TaskHost任务。有效RED分别保存在`attachment-red.log`（3失败）、`approval-red.log`（1失败）、`codex-root-state-red.log`（1失败）。`logic-final-receipt.json` SHA256 `d569baed81f3a3e7d3a57ead1e4b60bf2cf1e696deff2d646a10ee2f55041f84`登记附件4+routing7共11项/retry0、unit21项通过，只属本地生产loopback fixture。codex_home_final_review另以不占端口的内存Edge与真实FileReader独立复核附件/询问两P2关闭（dirty源码范围）；未形成精确head批准。

共享VV hook消费实际bounds并对称监听resize/scroll。`layout-visual-viewport-green-summary.json` SHA256 `1d675e495bd2cc4e6bd0498585763d6633565ceb4e878e1827d4b06db9c584a1`及原JSON（`1dffef219fb81a82caa581a15065baf5a0e79b57d6b21a56f580bff1c24e0e66`）已回读为9 unique/9 single passed、retry/flaky/skip/errors0。实际CDP scale2令VV为195×422，popup在该范围内；offset为0,0，非零offset和Native软键盘未动态验收。测试后格式化只改排版、AST等价记录见`layout-visual-viewport-final-freeze.json`，不伪装为另跑一次运行态。

`verify-full-1-exit.json`实际exit1（日志保留），停止于`format:check`的`tests/browser/codex-home-routing.spec.ts`，该并发新文件已修格式；不能称fullverify1通过。首次补录时fullverify2运行中，后续真实失败终态如下。`rust-final`实际165PASS/0FAIL、fmt由root报告PASS；不把修复前163项改写成165项，也不以Rust通过代替Native。

### Fullverify2真实失败与下一轮范围

`verify-full-2-exit.json`为exit1。原始`verify-full-2-browser.json` SHA256 `0d46572dc47c6341cef333acfbba0328b056d23bb45c3122be6ca21f4d0502e1`已递归回读：781 unique tests，768 expected/13 unexpected，flaky0/skip0/globalErrors0；794 results，13个失败各有首次及retry1的failed结果，实际retry13。完整原JSON、`verify-full-2-failures.json`与日志保留，后续通过不覆盖。

root正修旧API缺省语义的测试前置，以及4张同字节图片在Codex路径去重后只剩1张的旧布局fixture；改用不同PNG以保留多图行为断言。另已确认真实UI缺陷：默认Codex标准文字自然宽约88px，却在phone/1099/desktop被裁为5/61/79px；UI owner重开该label布局修复，不能放宽断言或用缩短文案掩盖。既有layout9定向只证明其脚本覆盖，不是标准名称完整显示的证明。等待fullverify3和最终组合，不将13个失败一概说成无产品影响的夹具问题。

### 最新63项定向与fullverify3失败（仍NOT_VERIFIED）

`label-layout-final-summary.json` SHA256 `cd32cf01f7e00ba1143a8abaaa297d77611d33e19a097dcbc0361b9a45ce7617`与`label-target-3.json`（`854c6f91fc240c802e3d4936287ec8f2e50212a0032b3673b070880ba5caa84d`）已回读为63 unique/63 single passed、实际retry0、flaky/skip/errors0。六份既有测试保留默认完整文字断言；390/1099/1920首页和聊天标准名可见宽均88=自然88px，控件32px、centerY差0。compact扩展改为有明确可访问名称的32px图标按钮，权限文字仍可读。

该定向绑定dirty production Edge/1423的JS `index-vihgOeA0.js` SHA256 `6b5dc7758e3842c850ee957bbc9ae93a70e6dbc1fd2b3f998723df1181fcb151`和CSS `index-DpKXzBlo.css`（`28ef0f496ff01c13facec2c2b254385bb2163825a5b50bec5d49803d8f7ef348`）。首次修正52PASS/3FAIL及一次1423占用DID_NOT_RUN均在summary中保留，未停他人进程；不把定向通过称为最终SHA批准。

后续`verify-full-3-exit.json`真实exit1；原始browser SHA256 `86bed1883773553c64e9aa40ad3fc9aaa3767bef87102b7ff626cbbcbb70d07d`递归为784 unique、781PASS/3FAIL、787 results/实际retry3，flaky/skip/errors0。失败为figma-governance-layout及ui-details的390/1099控件几何；旧299宽/扩展可见文字与新compact32图标契约冲突目前只是待核实原因，不能提前按无效测试关闭。UI owner仅获准诊断修这两测试，不减有效断言；full4待测。full3启动差量SHA记录于`verify-full-3-source-before.json`，不代表覆盖后续Rust改动。

### Native33真实包导出失败与两副本恢复输入

`native-package-export-failure.json` SHA256 `60ac41a768fac5e3aa98679a6cc54dd93c583ad9517347f58c68ef56b5a53ad7`记录Native2.1.33/`index-vihgOeA0.js`单QA项目实际导出返回`corrupt: 项目快照无效`。真实生成item的mediaWidth/mediaHeight不在原生严格白名单内；logic owner正在两个Rust源/测文件做TDD修复，尚未通过实际包export/preflight/import。此失败与旧多项目未归档媒体拒绝是两件事，不能互相代替；full3也不含Rust。

用户已授权两次验证窗口编辑分别恢复为两个独立副本。输入实际位于`D:/KK-Studio-recovery-20260921/codex-home-20261015/independent-project-recovery-all-input.json`，SHA256 `923de1f08450dda49fd93aee5205d27cd072ec0bdab9069ece70e97da9c4d1d0`；只读核对2个不同新ID、每份2cards，均无跨项目thread绑定，共享1asset原件SHA256 `b0a9b2a55b404f6cfcfac3f02d6848a8b32a896cb174bda78ddf4c8a8b8744b0`与metadata相同。canonical未写、原7不覆盖，实际恢复及原7保全待验；不导出用户项目正文到本记录。

另有人类任务TASK-CODEX-REF将卡片参考图差量及版本33写回本目录；本task不改其docs/ledger或代填状态。root只读确认该任务已idle，并准备按相关生成契约纳入同一最终组合，保留来源且通过严格review/fullgate。跨聊天发消息授权尚未收到，未发送消息；精确SHA与合并仍待验，整体保持IN_PROGRESS/NOT_VERIFIED。

### 后续71项、full4启动失败与Rust/TaskHost范围

两份旧布局测试按compact32图标契约纠正后，`layout-contract-target-1.json` SHA256 `e99fa66adbdf042390504c16debec5ab0f77a0723a2d7837398e0ce5f4508f5e`已递归回读为71 unique、71 single passed、实际retry0、flaky/skip/errors0；该轮未改产品。full3真实失败及其3次retry保留。

`verify-full-4-exit.json`（SHA256 `7303b10ffe2a758622ff5ea3d69fd740100b997044baa84a7fd2e586cc042680`）为exit1。前置静态门禁、Node1327PASS/14skip、Agent199PASS/2skip及build通过，browser在`http://127.0.0.1:1423 is already used`处停止，未执行case；不能拿旧raw代填此轮。root记录短时listener自然退出、未停外部进程，现full5进行中；`verify-full-4-source-before.json`保留完整hash清单，full5同源绑定待回读。

`native-media-package-receipt.json` SHA256 `56e169a54e61f7535db8381542b200a8fd5f352dfd37201dc7c6eb2ebd608f6c`记录原生媒体尺寸TDD：有效RED1FAIL；首轮包29PASS/1FAIL为Fixture同clock目录重名，test-only AtomicU64后缀修正后包30PASS；Rust167PASS/0ignored，fmt/check exit0，既有五条dead_code警告保留。两个源码hash及六份原始log hash已回读匹配；只新增两尺寸合法字段/整数约束并保留unknown拒绝。该收据没有启动Native，最终新EXE实际export/preflight/import仍待验，不能用Rust通过覆盖真实导出失败。

`taskhost-final/receipt.json` SHA256 `8de8e238187205a4e455d5ca50a2e1dcb129f4d93434e2fffe1ded63f9c204f0`为passed=false/9checks；首失败是`taskkill /PID 64156 /T /F`返回失败，root记录进程实际已退出，catch读取已关闭body又抛次级错误，原log保留。未改fixture逻辑的隔离重跑`taskhost-final-2/receipt.json`（`346ba193d0650d79e32ecc54d5f4b16cc858cb5f0804689e485cce7e7a551112`）为11checks全PASS、errors0、credentialCleanupComplete=true，执行exit0。两轮均绑定2.1.33/EXE `6353aba3faf9570d932e5f5514256af1af3c16c31bdda2cb27b4979580953c2c`，JS为vihgOeA0、Rust尺寸修复前构建；后续最终产物身份及Native包往返另验，不把重跑覆盖首失败，也不声称真实外部Provider已验收。

### Full5分项通过与完整命令未通过（REVIEW）

`verify-full-5-browser.json` SHA256 `341e3fc89a62bebc6a62f8ba280a84f2deb73ccc328382d835b5836cfb50636e`已独立递归回读：784 unique tests、784 results，每项仅一次passed、实际retry0，flaky/skip/globalErrors均0。前置Node1327PASS/14skip、Agent199PASS/2skip及lint/typecheck/format/build通过。`final-source-freeze-verified.json`（SHA256 `11f4d7e5f5cd4d87ebe04c56c073acd0a34653ee4725d521e28b2f2cad68485f`）登记845份源码/测试相对full4冻结清单无变化；文档owner亦只读逐项重算845份全部相同，未将提交后代码冒充受测代码。

完整`npm run verify`仍以exit1结束，`verify-full-5-exit.json` SHA256 `ee7c74a7d4a54f9fa4afee9f504fb334148c0bfd2e19dd9f67cd681618e5068f`及原log保留。末端`test:development`为FAIL/steps=[]，因1421已由另一人类任务长期使用而无法启动，无development case执行；未停止该进程、修改端口门禁或复用其server。浏览器首过不能把完整命令升级为PASS；当前SHA的Hosted须实际通过该末端及全部必需门禁后才可合并。

`native-package-final-pass.json` SHA256 `2d1d3dfbb4a08bf8f43adf9d26003e16312afd023df3c0ff350842c90b749310`记录实际2.1.33/JS vihgOeA0、EXE `8f633f2797de6f7e9d245f7a4e96964ba9f5d37bc53ae02cb9972437d48676c0`的单QA包export/preflight/import成功，包SHA256 `d1028c4940c8dd7050e87a40e41c0e56850d2c9085a8ba222ab4d40f26f41b60`。project与homeDraft canonical JSON逐字段无损，2items/1generated ID、1370×1148尺寸保留，源PNG与imported blob SHA256均为`2596cb1146f6211aaa348cea0389c22ea4d66764059012618ff5261d854314b7`。该EXE由另一UI任务通过官方launcher实际重建，root另查reason=current及真实IPC；此来源说明不修改该任务记录或认领其全部验收。

`native-package-restored-ui.json` SHA256 `73419266f929417336cfe2fce7a4b6f520b03726eecda85281e9249a34925a5b`记录新导入root冷开，真实图片complete/1370×1148、对话marker与Codex缺省恢复。初次export调用在成功RHS后因REPL变量未声明抛ReferenceError，包实际已创建；root检查现存包后继续preflight/import，没有重复覆盖。跨realm strict equal因原型不同为false，后续canonical JSON逐字段比较成功；工具错误原件保留，不当产品失败或隐藏先前真实导出失败。

现任务REVIEW/整体NOT_VERIFIED，最终head待提交；dirty分项收据不构成精确SHA独立批准。Hosted完整verify/Delivery、普通PR合并、main验证、实际本机更新及两独立恢复副本/原7保全另按真实收据完成，premerge不DONE，其他功能/任务状态不提升。

提交前保护收据`protected-primary-git-before-commit-corrected.json` SHA256 `7ead8b1f6cfef975aa409629aad39c7773a3da4f326b98c3dbb97b1c259acaa0`为allMatch=true：primary HEAD/branch/index、staged/unstaged diff及porcelain-v1-z状态与baseline相同；root另重算4602源码与native受保护metadata/assets均相同。初次使用-uall/non-z造成的status false比较原件保留，纠正的是比较格式，未声称发生或恢复过数据漂移。文档owner未操作应用、项目或primary。

### Candidate1真实结果与后续用户编辑

`native-image-generation.json`记录candidate1真实Codex/ChatGPT内置生成1张1370×1148 PNG、1结果节点/1生成ID与真实文本marker；源图及native blob已只读重算完全同字节，SHA256均为`fc36a3a55b53e6261dd70bb21d9c720ef43279dbaf94dc8e2810d5cea35f06f3`，1267609 bytes，图片型号未报告。其EXE `5ae8d659aedf19931ca5c47e71ebb46abf4aba8a2e2a8298a60a28e25ac140c4`只绑定candidate1；当时source card虚假pending为已知后续修复项。

用户随后在独立candidate窗口删图、编辑另一个project，不能把变化后的未保留状态当保存恢复PASS，也不能据此断言产品自动丢失。用户明确授权“保留编辑，恢复为独立副本，避免覆盖原项目”；`candidate-window-edit-recovery-plan.json` SHA256 `9d8d5150626c1eb6c488999a10396951308ebf34189cf27b99f48bc22b7f0a50`记录最终完整备份`D:/KK-Studio-recovery-20260921/codex-home-20261015/candidate-window-edits-final`，排除partial live copy。计划将变动项目恢复为新ID副本（2cards/1新asset），canonical原7项目逐对象保持，恢复状态仍pending。

工程外全项目包导出被旧项目未归档媒体拒绝，未创建成功包；只做已授权独立卡片副本恢复，不改旧项目或放宽包校验。主根仍按本轮7项目/rev2057快照保护，恢复完成及保全待root原始收据。

### Candidate2身份、真实闭环与未验范围

官方`native-build-candidate-2` exit0；`native-final-identity.json` SHA256 `80343c18608b72b763b3b25a8c539f14c7af8009fac7c2cf26599c886cedf52d`记录实际Tauri production2.1.32、`http://tauri.localhost/`，独立`native-final-data`和`native-final-profile`。JS `index-Dn8kZ7g6.js` SHA256 `6b4626d004b08b68e71dcdb37cb417a4dba689727caeb8f2f3bb585559e6cfa3`；receipt input `50402eb7f25cf320b821d7f2a4da751e304c86d35165bfd00239ee61240f0d9d`、EXE `6d7b8448c8e7c0debe7251b5ff7075e501c845f64350100d3a56beb8f7f5c1f2`。该身份不是日常主数据根已更新的证明。

`native-final-live.json`（SHA256 `a0b76c994e752adbed7d7edf627c41f659699349ecdda37ec8b697967463b8cb`）实测真实文本`KK_CODEX_HOME_FINAL_TEXT_OK`及1张内置1370×1148 PNG，SHA256 `2596cb1146f6211aaa348cea0389c22ea4d66764059012618ff5261d854314b7`、1189443 bytes，原件与native blob相同，图片型号未报告，无虚假source pending。`native-final-close.json`（`18a37bd5a05df3774bde8299ec0eb40ffd7c48dba435d60da15fec63077cf577`）记录正常保存后8项目/rev2066（隔离旧7+新验证项目），`native-final-reopen.json`（`99e9aac1455e9ae1bb4bd65f7ed7ccbb7b6f2d0b5cd8665cab5f52216fe56c7d`）证明1图片、同asset/thread及文本恢复，sourcePending为null。

原7项目的已有字段逐项相同，但live中的`original7Unchanged:false`不能忽略：close收据明确一个旧empty project仅新增空`reviewComments`与`stagePlans`，无卡片/任务变化；因此不声称7个整对象byteexact。真实canonical根仍7/rev2057原始数据未变。

独立副本恢复仍未写canonical。`independent-project-recovery-plan.json`（SHA256 `62f0506533e329ab1effbf506b34f02000576a75171f1e6fe289f2c9337edb3b`）经既有normalize/encoder校验，计划1个新ID项目、2cards、1asset（SHA256 `b0a9b2a55b404f6cfcfac3f02d6848a8b32a896cb174bda78ddf4c8a8b8744b0`），移除跨项目thread绑定，不覆盖原项目；实际恢复和保全仍待验。

当前source仅为真实label缺陷及必要测试前置/不同PNG修复重开。candidate2功能闭环只绑定上述构建，不能改写为label修复后新SHA已验；fullverify3、最终UI/资源身份、精确SHA/Hosted/PR/main及实际日常更新继续NOT_VERIFIED。

### 前期布局与待验边界（历史记录，当前以full5收束为准）

早期dirty独审四组P2的修复已进入当前组合，最终回归及精确SHA复核仍待完成，详情见[review](review.md)。以下`unit-full-1.log`和`rust-1.log`的真实退出码均0，分别为1310PASS/14skip、163PASS；仅保留修复前历史范围，不能代替上方最新165项或最终完整结果。

旧project connect flight交接的16行修复已由实现者冻结，日志12/12通过及源码SHA已回读；本记录只登记该定向事实，CH-P2-4仍等待fresh exact-SHA独立复核与当前Native场景，不以实现者PASS代替独审。

布局回执位于`D:/kk-studio/.analysis/codex-home-20261015/`。已回读`layout-green-summary.json`（SHA256 `46f056c4a869aa0c66bae44c5c092dca1564ab16fa90e17d38f5e2fcbf9dfc17`）及`layout-green-3.json`（`ef443f7016f0f666d341d8a28da54d41a9cd9ef4d89b3d04c6d0a723701675c8`）：8 unique tests/8 single passed results、实际retry0、flaky/skip/globalErrors0。9个同排状态centerY差0，14个菜单阶段gap8px；子页同一evaluation即时检查，没有poll；resize/scroll在真实事件后检查。旧8项有效RED、前两轮green与observer诊断保留。

该回执仅绑定`build-ui-green-2.log`产出的JS `index-BiEVRqVS.js`（SHA256 `e546b6fcec8677116dc4694c1a44a43ad1eb1bbdc4a62ef6272ddbfc35e68896`）和CSS `index-DYq27HtV.css`（`fb0d4d618e875c58b2ebcb3d24e6918accf3997f05fd6bfb1607dec75da544fc`）。后续逻辑/原生契约修复不在此dist中；AC-3已有定向证据，最终组合、其他验收与整体验证仍NOT_VERIFIED。

用户本机继续工作后的最新保护快照为7项目/rev2057：`before-state.json` SHA256 `95df5c81a3b75119175b2f3f89c27c714254cf1df76ab5aa92d4954f4f6181fb`，本轮保存/恢复须对照此时点。root确认4602原source文件hash一致；先前10/11项目与rev1907/1913是历史，不能回灌用户自行删除的项目。文档owner只核对收据，不操作应用或覆盖数据。

该前期时点AC-1～AC-5的最终组合均NOT_VERIFIED；上述布局仅是AC-3的定向证据。route/import基线为 `App → StartPage → StartComposer/StartModelPicker → ModelPickerMenu`，项目聊天与画布经既有Agent/Provider；最终按真实diff补实际入口链。root记录旧dist JS `index-Db7ifhXq.js`、CSS `index-DfoqcFla.css`作为有效RED基线，不把旧bundle当修复后证据。

该前期时点待补项：运行命令/进程、1421 development/1423 production与Tauri分别身份、视口/长名称/IME/键盘、菜单computed rect与截图、错误/取消/unknown、当前账号文本/单图原件hash、正常保存重开与旧数据保全；后续分项结果见上方各阶段。文档owner未启动端口、未连接或生成。

## 结论与未验证范围

- 实现候选：REVIEW；整体验收：NOT_VERIFIED；精确SHA独立review：NOT_VERIFIED。full5前置/784浏览器首过及实际Native包往返、冷开图文已取得分项证据，完整npm verify因development端口占用仍exit1。
- 用户授权：实现、真实最小链路、PR集成及本机重建已有明确请求；尚未发生的新SHA验收不提前标完成。
- 功能registry原37项状态保持；其他供应商、安装发布、Native Mobile等不在本轮能力声明范围。
- 新head形成后补精确审查；任何失败/重试/夹具问题均保留原始证据，不能用后续通过覆盖。
- 待补当前SHA的Hosted完整verify（含真实development执行）/Delivery、普通PR与main、实际日常入口重建，以及两独立恢复副本的canonical写入/原7保全；不等待或停止另一任务的本地1421进程来伪造本轮通过。
- 本任务包括普通PR/main与实际本机更新；合并前即使本地验收通过也只能进入REVIEW并写明外部阶段待验，不能提前DONE或宣称本机已更新。全部实际收据后再按既有规则完成文档closeout。
