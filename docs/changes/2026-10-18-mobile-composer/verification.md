# Verification：模型入口与后台截图勘误

- Task ID：TASK-MOBILE-COMPOSER-001；IN_PROGRESS / NOT_VERIFIED；2026-10-18；交付包角色：current。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Review](review.md)。base `97ef182b10c076c81611dea24e0b1c07c127dd49`，branch `fix/TASK-MOBILE-COMPOSER-001-focus`。本包建立时有root拥有的测试dirty，尚无已提交修复head，不能出正式独审/上线结论。

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

## 本次修复与发布门禁

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
