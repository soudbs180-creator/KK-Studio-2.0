# Verification：手机结果、完整输入与后台截图勘误

- Task ID：TASK-MOBILE-COMPOSER-001；IN_PROGRESS / NOT_VERIFIED；2026-10-18；交付包角色：current。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Review](review.md)。base `97ef182b10c076c81611dea24e0b1c07c127dd49`，branch `fix/TASK-MOBILE-COMPOSER-001-focus`。当前按追加范围继续整合，最终冻结head、正式独审、Hosted与上线结论仍PENDING。

## 当前追加范围与最终门禁

当前目标已扩为默认任务/历史结果优先、详情结果→提示词→更多详情、聊天视频预览、六入口初始可见、手机与Desktop共享直接圆形发送、本机上传/Skill应用，以及官方12ai指定模型参考图片。首轮焦点修复和下方历史通过不能证明这些新增范围已经验收。当前候选Desktop2.1.38/Web2.1.40/Mobile2.1.5，PR72未合并、未发布；生产39/唯一previous38仅为此前库存观察。

尺寸采用运行时提交选项，未发送尺寸刷新回自适应，提交捕获既有 `task.imageSize`。早先向draft增加imageSize的方案因旧版strict reader失败已弃用，原失败日志 `v39-validator-probe.log` 保留，不伪装通过。当前草稿/shared contract/storage backend/namespace/backup不加字段、不迁移；ADR-025继续适用。

工程外证据根 `D:/kk-studio/.analysis/kkai-mobile-background-20261018`：

- `mobile-suite-final.log`的427/427为追加保护前断面；最终`expanded-mobile-suite-final.log`实际433 tests / 433 PASS / 0 FAIL / 0 SKIP，`expanded-mobile-types-final.log`与`expanded-mobile-lint-final.log`通过、lint零warning。窄屏微修后`mobile-narrow-units-final.log`再核433/433，root于本轮10:50工具收据再核typecheck/lint均exit0、lint零warning；旧MODULE_TYPELESS_PACKAGE_JSON提示保留，未为消除提示改package。
- `image-parity-transient-red.log`记录4FAIL/23PASS，随后`image-parity-transient-green.log`27/27 PASS；仅本地协议/应用fixture，不是上游真实编辑生成。
- `image-parity-v39-full-snapshot-backup.log`使用冻结 `97ef182b10c076c81611dea24e0b1c07c127dd49` 的完整旧MobileRepository及所有reader依赖读取当前合成snapshot，并preflight/restore完整backup：旧reader读取、备份还原、原件/参考字节hash及accountkeys均保持，task.imageSize1536x1024保留，draft无新增字段。snapshot SHA `f0f0db5fe909a45a00f1a2f0e137d59ac39e25f7546c05058526fc1e984cadeb`，backup SHA `2e6fcfd3f16ea355764689026eb89fd9bcc6e7220ac478b00d8798d1935b109c`；纯内存fixture/0HTTP，不是现网实际降版演练。
- 媒体局部回归另在 `D:/kk-studio/.analysis/mobile-task-results-20261018`：真实页面TSX的11个RED及定向44/44 GREEN、当时type/lint记录保留；该局部断面不替代最终组合浏览器/已提交head门禁。
- root完整verify首轮因`task-results.spec.ts`格式失败，已保留RED并修正格式；`expanded-root-verify-final.log`实际exit0：Node1852PASS/20既有SKIP、Agent199PASS/2既有SKIP，根浏览器833项为832首试PASS加1项provider-scheduling 5xx flaky，DESIGN41单测+8浏览器、development4步通过。该flaky首试在连接状态断言收到active而非degraded，原失败/trace保留，不能用retry抹掉；`scheduling-flaky-recheck.log`独立`--retries 0`复核同case为1PASS，未据此宣称根因已修复或全833首试通过。日志中的既有SSR/颜色环境及advisory提示保留。
- `composer-route-voice-red.log`为保留聊天路由离开未取消语音的1FAIL/5PASS，修复后`composer-route-voice-green.log`6/6。`composer-upload-route-red.log`与`composer-upload-route-green.log`保留上传A→B→A、换账号及当前上传的真实RED/GREEN，最终同文件10/10，旧原件保留但迟到引用不覆盖新草稿；不新增持久epoch字段。
- `expanded-mobile-browser.log`首轮run `8dbbf65d-a70f-4c5c-9bfb-3da929cb47c4`为32PASS/8FAIL：三处参数测试误用aria-selected，现统一合法aria-pressed并由实际Action反映selected；一处关闭定位限定当前dialog并等待关闭；四处媒体错误断言同时匹配路由保留的隐藏旧列表，现先核对任务详情URL、仅匹配唯一可见错误。真实状态、unknown/partial/原件损坏、hash不变及零Provider断言未弱化。第二轮`expanded-mobile-browser-final.log` run `46e09fc9-3a3e-4848-aaa9-4ef1b3e49522`为40/40，0unexpected/flaky/skip。
- 随后视觉回读发现320px发送折行，改为小于360px六控件44px圆形、gap1、活动输入区水平padding8，390px保留48px。最终`expanded-narrow-browser-final.log` run `d032d819-193d-426a-9ea8-98a6cab9b496`于2026-10-18T10:48:11.169Z起，54.786秒，40 expected / 0unexpected / 0flaky / 0skip、全局errors空，涵盖390×844、390×480、320×640、既有横屏/鼠标/键盘、语音迟到取消、上传/Skill/模型数量与尺寸、图片/视频/文本及失败恢复。各隔离fixture网络收据blocked/errors为空，不接真实Provider。metadata sourceHead仍00ac加dirty，实际本地bundle与最终提交SHA另冻结，不能把metadata写成已提交head验收。
- `expanded-ui-budget-final.json`为最终窄屏产物：`entry-2738a78e3e4672d58fe8cfe3fff4a03b.js` 1661408B、gzip9为436636B、SHA `7dc08841e199314d585b64d0ac9eeb482b0fd793f978d45622997c47ba053bd7`；97ef基线gzip432317B，增加4319B，小于16384B预算，PASS。该值不是线上下载时延或Linux产物承诺。
- `expanded-precheck-review.json` SHA `56494da945f9071b8ce33bafe9a64f29110cd58c2e31c1d7f51c11ed13e87b6e`为dirty源码预检：P1路由语音/旧上传覆盖、P2 Native取消稳定/忙时语音禁用均已闭合，范围内无P0/P1。仅PRECHECK，最终冻结已提交SHA的独立审查仍PENDING，不把本包代理或实施者自检当正式批准。

本轮保护边界：root以`GIT_OPTIONAL_LOCKS=0`只读回读canonical已为 `a55396ad396552aa75634c79b3f410eb81403e12`、clean、index SHA `caa37a1e5036f63cfed0d3afe1d52b1e73d0cc0cb4dbfdbe506df4ad27b2fa7c`，本地18:44 reflog另有main merge/6dfb/a553并发提交；remote main仍97ef，owned tree仍00ac加本任务dirty。本任务未在canonical执行写操作，不reset或reconcile这些并发提交，不能称canonical起止SHA/index不变。

| 最终检查                                          | 当前证据状态                                        | 仍需完成                                      |
| ------------------------------------------------- | --------------------------------------------------- | --------------------------------------------- |
| Mobile单测/type/lint                              | 433/433、type/lint PASS；窄屏后单测433/433          | 绑定最终冻结head及必要受影响复验              |
| 旧v39完整snapshot/backup读取与还原                | 合成fixture PASS、0HTTP                             | 不能扩写成现网降版或用户资料实测              |
| 根完整verify及最终组合构建                        | 本地exit0；833 browser含1flaky，独立零重试复核1PASS | 精确源码冻结/来源关联，保留首试失败与既有skip |
| 结果页、六入口、语音fixture、圆形共享发送浏览器   | 最终窄屏40/40、预算PASS                             | 精确提交与产物另冻工程外；不扩写成真机/生产   |
| 精确head独审、Delivery/Hosted、PR72               | PENDING                                             | 正常PR，当前未合并                            |
| 正式Release、线上旧资料/来源与唯一previous        | PENDING                                             | 当前未发布，不重复生成或增加root权限          |
| 实体安卓Chrome后台/最终产品接受、新Native、Safari | NOT VERIFIED                                        | 不由本地fixture或旧接受回复代填               |

以下为首轮焦点修复、后台取证和前任务收尾的原时点证据，保留真实数字与失败，不覆盖上述当前门禁。

## 已观察与修复前基线

- root已在实际本地浏览器复现：空text输入focus后有模型按钮，点击导致toolbar消失且未显示“连接与模型”。本地红测run `e9da5f53-fe9a-44b6-a645-4dc206e0afe4` 实际4项FAIL，均为模型面板未出现；origin1423、metadata sourceHead97ef但测试dirty，不把此元数据当修复已提交SHA，也不称实体安卓。
- 既有 `mobile/tests/uiComposerDraft.test.ts` 基线5项PASS由root回传；旧测试直接调用选择回调，未覆盖真实focus→blur→click。
- 只读源码probe执行真实Composer的focus/blur回调：空text工具栏false→true→false、picker仍false；image/video始终true。工程外 `model-picker-source-probe.json` SHA `95c90b5733944e946deda37137f97da88bc607b3e8593071a9f45023477184a7`，只证明状态分支，不替代真实触摸。

## 后台截图勘误与长停留实录

工程外目录 `kkai-mobile-background-20261018` 保留新旧文件和原始收据，旧handoff note/receipt及源码审计不覆写：

- 被判黑的两张旧handoff JPEG、旧live-final-result及新initial-tab3/tab8五文件都是18423B、430×637，完整文件SHA同为 `dbb53e07703bab1b6d87108c8ed2e6c044bd9562d11614cb611b0ecd45481572`；全解码RGB SHA `7c0a85fa979ca3fa02444745e21841ee857fc32d87ae6d69a01cffa3d8ba9c43`，逐像素差0，白区(215,120)=254/254/254、蓝球(215,280)=75/181/239。因此“保存文件全黑”是错误判断，应改为预览/视觉判断与磁盘原图不一致，工具内部原因UNKNOWN。
- 独立文件取证JSON SHA `4da7daea041ca4755f35a2185c41c3437b09857dae44c5ac8847a865454cdf0c`；RN Web锁定0.21.4的透明辅助img也属正常，真正可见图层是背景div，不能因img opacity0修CSS。
- `long-dwell-receipt.json` 记录2026-10-18T09:07:45.243Z至09:22:53.310Z，908.067秒（15分8秒）同素材停留后刷新；包含只读探测和一次2秒冻结模拟，不是连续实体手机后台。前后正常UI导出830495B，SHA均 `64a6af6eb696b0dd87362e814df773ca85c940b715aed254564df34571c4aa13`，同asset保留；任务、正文、旧unknown和设置另有DOM回读。
- `network-background-sanitized.json` 的截断标记为true：仅对实际捕获记录统计，不声称整个时段完整零请求。诊断期间不点击生成，Provider阻断观察与GET/POST捕获范围另按root最终收据核实。
- `observed-lifecycle-2s.json` 中真实读取visibility仍visible且events空；CDP frozen/active不冒充真实hidden→visible事件。`debug-cleanup.json`记录恢复active、关闭生命周期采集/网络并撤销临时Provider阻断；Page.disable桥接不支持，限制保留。

## 首轮焦点修复的历史验证与门禁

root后续实际执行 `npm run verify` exit0，工程外日志 `composer-root-verify.log`：Node1852PASS/20既有SKIP、Agent199PASS/2既有SKIP、根浏览器827PASS首试、DESIGN41单测与8浏览器、development4步均通过。Mobile371/type/lint和独立手机13项见下；完整验证期间未调用真实Provider。最终补充新项目重挂载的紧凑状态断言后仅重跑受影响手机浏览器套件，结果另冻外部 `composer-mobile-web-final.log`。完整验证后的组合构建再次exit0，实际Windows入口仍为 `entry-43c9dff2cf2d770fa8b08f253d6af2ee.js`；公网/Linux入口须按发布时实际回读，不能沿用该文件名。

最终精确已提交head的独立审查、Hosted、正式Release和生产收据另冻工程外，并以PR/Release实际状态为准；本段不提前宣称这些后续门禁成功，不为自引用head反复改写旧结果。

| 检查                                 | 本包建立时真实状态                             | 放行要求                                      |
| ------------------------------------ | ---------------------------------------------- | --------------------------------------------- |
| 空text真实浏览器复现                 | FAIL已观察                                     | 保留red，修复后四配置均通过                   |
| Mobile定向/完整、type/lint           | root回传371/371与type/lint通过，最终head待冻结 | 保留实际命令/exit，不移用旧head               |
| 组合build及触摸/鼠标/Enter、相邻控件 | 本地完整13/13首试，0skip/flaky/errors          | 新bundle/route/同状态DOM截图，草稿恢复、无API |
| 当前已提交SHA独审/Delivery/Hosted    | NOT VERIFIED                                   | 独立上下文/精确head，不能自审代填             |
| Web40/Mobile5正式上线及单回滚        | NOT VERIFIED                                   | 正式Release、源/产物回读和库存核对            |
| 用户实体安卓后台/模型修复接受        | NOT VERIFIED                                   | 用户实际操作；不由浏览器仿真替代              |

修复后本地完整browser run `60ac86e2-1fc8-46a0-b188-8775c2963e64` 的原JSON已核对：2026-10-18T09:37:49.337Z起，13 expected / 0 unexpected、skipped、flaky，errors空，origin `http://127.0.0.1:1423`，metadata97ef+dirty。实际生成入口 `entry-43c9dff2cf2d770fa8b08f253d6af2ee.js`，本地preview证据不当生产bundle。CUA另有 `composer-after-fix-390x844.jpg` 及DOM，首次 `composer-after-fix.jpg` 是1280宽截图，不冒充手机尺寸。

工程外后台独审 `final-background-audit.json` SHA `0c2b6143e7aa98bb03ce7f5133338861a150ee2ebda60f6f871883a0da7db721`，真实overallVerdict为 `PARTIAL_ACCEPTANCE_TRUE_ANDROID_BACKGROUND_UNVERIFIED`；明确原文件正常及长停留恢复范围，不能扩写成实体安卓后台PASS。

没有新增收费调用授权；本次目标网络为零Provider/零生成，不能继承上一轮单图/文本收费测试当成本轮调用。Safari、原生包、系统杀进程/PWA、真实视频仍未验，FEAT-028 PARTIAL/T12开放。canonical保护按本轮起止只读收据核对，不声称并发工作全程静止。

## 前任务有界收尾

旧TASK-MOBILE-12AI-001的实际文档head d3cb已有quality39110739016五项与guards39110739014两项成功；PR71在2026-10-18T08:51:25Z正常squash至97ef。工程外 `production-docs-hosted-gate-receipt.json` SHA `00089d996ca358c93cf62fd1aa585a0206dc191df4c17e352227a2052f0d8d70`、`production-docs-pr-merged.json` SHA `d8364221e8d79c03802e1b44218c680f9e9f3430d8c2896dd5e0c5c1b1806460` 已核对，只将该任务按PR70/71图文发布/收据范围DONE/PASS解除占用。auto-merge39110735168零jobs失败原因UNKNOWN独列，不概括全部工作流绿色，也不代填本次真机后台/新缺陷验收。
