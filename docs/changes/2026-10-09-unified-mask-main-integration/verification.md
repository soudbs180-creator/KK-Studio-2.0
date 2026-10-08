# Verification：统一 Mask 主线整合

## 当前最新主线组合验收（2026-10-09）

主线 base 1d6f640ac6f3a1e7af32c38d85596527704dc54a；原已审 e7cfd28 保留，当前产品 27bdb8bda6bdd5eec041dd5e2fab28e4dd728d0a，测试定位修订后精确 head eaa0886e99965d00a5a514b301adb665b150373d。Desktop/Web2.1.11，Mobile规划2.1.1，存储身份/权限/依赖不变。27个核心App hunk逐一保留，3个UI hunk迁到主线lazy workspace/provider；图片操作沿用选中卡片上方唯一操作栏，灯箱由App承载，CSS顺序image-edit→image-selection→desktop-titlebar，未恢复卡片内按钮。

完整 npm run verify 两个当前阶段均PASS：root785/793（原8skip）、Agent172/174（原2skip）、445/445 browser、445attempts、12实际workers、0flaky/0实际retry/0skip；lint/typecheck/UI214/0/format/build/版本/功能/账本/链接通过。Rust102/fmt/clientcheck/fresh带Agent no-bundle release通过，原5项Rust dead-code及Vitechunk提示保留。第一次27b verify因1423被另一执行者占用在浏览器开始前FAIL，保留原日志，未复用服务/改端口/杀其他进程；自动审批超时未创建进程，只按工具规则重试一次，随后真正全量PASS。

原生Mask请求PNG/1图/1024、Mask外0像素、项目包4素材、重启标记/连续灯箱/清空撤销重做和临时凭据清理通过；选择操作13项、TaskHost11项、模型能力及实际标题栏拖动/最小化/最大化/双击还原/关闭退出0通过。同EXE SHA256 ad5e3428497bc69fbabc40d52ac3269fd5df5b06019407a7b9b99e121944d4c9；JS index-DcEEaxES.js（5837a30790051576bc0af9ae4dcd1c4a13e47c462103cdf6953401e95c3a4ea4），CSS index-D4acWk3o.css（06252c7cbc8773dd750901ff0b71820449fa4d0d7850d5eb6c6c1ac9a0e01b21），425当前source/test/config指纹。27b..eaa产品路径无差异，driver修复仅测试；原生前后阶段按各自真实head记录，不改绑旧日志。首次TaskHost原生原JSON位于忽略test-results，后续Playwright清掉该目录；保留原控制台PASS日志，未重构丢失JSON，改在外部路径于eaa实际重跑并保存新原始JSON/PNG/cleanup。

MASK-INTEGRATION-001：原生模型能力旧driver宽泛status定位与原图读取status并存，先实际FAIL后最小修复三处断言。现在唯一.local-generation-status/role=status和原能力文字、禁用、零请求/零任务及原件保护断言全部保留，当前原生和完整445browser复验通过；当前独立报告为正式关闭依据。原IM-001–013已审记录保留，不重新命名历史证据。

运行链 index.html→src/main.tsx→App→StartPage/按需SettingsPanel，workspace→CanvasImageActions/App ImageLightbox。route /；Desktop http://tauri.localhost/（production/src/main.tsx），实际fresh EXE --data-dir 隔离数据/profile/CDP；Web node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 1423 --strictPort（production preview）及 node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 1421 --strictPort（development）。生产Web390/1099/1920与原生首屏无隐藏Canvas/Conversation，设置按需请求1、焦点/Escape通过，JS/CSS实际HTTP响应hash等于当前dist，零pageerror/横向溢出。原生标题栏40px，Web无桌面窗口控制。

**开发插件仍FAIL / TASK-PLUGIN-DEV-001仍TODO**：严格开发验收实际出现4个/plugins/*.js public-import错误遮罩，原失败/PNG/过程日志保留。插件loader、Vite及public插件与当前main1d逐字一致，既有ledger记录main21d同类故障；本轮未修插件、不将错误计为PASS。开发三宽度截图明确先保存遮罩，Escape收起后仅验首页/按需设置/焦点/样式顺序/宽度；该局部PASS不代表development插件可用或全项目零错误。两次primary-main开发复现尝试均在页面初始化前超时，收据为NOT VERIFIED，未推断当前main运行PASS。原始QA及承认已知基线的QA分别归档。配置重试1保留；首次派生summary的configuredRetries为null（读取了不存在的per-test字段），原JSON及summary不覆盖，追加从实际config.projects[].retries得1的勘误摘要，实际445次通过/零retry不变。

独立源码预检27b与当前运行补审eaa分别保留原文，最新结论以[当前独立报告](evidence/current-eaa0886/review-runtime-eaa0886.md)为准。104上游task完整对象保留，新增两项Mask任务；001实现/本地相关验收完成，002真实Provider/几何透视/物理手机/用户视觉仍TODO；FEAT035仍PARTIAL。106项DONE62/TODO14/PARTIAL26/BLOCKED4，44项开放，不声称完整产品所有任务完成。UI012仍由原执行者在途维护，最终独立及最新主线验收前不抢合。

[浏览器原报告](evidence/current-eaa0886/browser-results-eaa0886.json) / [正确派生摘要](evidence/current-eaa0886/browser-summary-eaa0886-corrected.json) / [同产物身份](evidence/current-eaa0886/identity-eaa0886.json) / [原生Mask](evidence/current-eaa0886/runtime/native-mask/desktop-acceptance.json) / [上方操作栏](evidence/current-eaa0886/runtime/native-selection/receipt.json) / [TaskHost](evidence/current-eaa0886/runtime/native-taskhost/receipt.json) / [开发态已知失败与局部验证](evidence/current-eaa0886/runtime/web-development/receipt.json)。原始PNG/JSON逐字保存并带来源清单，32份source/runtime日志及2份文档收尾lint日志，共34份实际日志以base64/bytes/SHA无损归档；历史及失败从不改写为成功。

本地scope收尾后仅文档提交；最终head独立补审、当前Hosted verify/delivery、真实远端保护/审批、普通squash、landing whole-tree等于候选、本地main FF-only和实际post-main CI必须随后回读。此提交不预填远端成功。PR38/PR40已普通合并，PR40 parent main37806381609实际verify/deploy-linux成功，delivery按main push条件skip；收据归档。没有发布安装包、切换快捷方式、删除工作树/分支、覆盖用户数据或调用真实付费模型。TaskHost环境runtimeVersion/hostElevated以实际收据not-recorded为准，不推断High IL。macOS/Linux/Mobile/用户产品与外部服务验收保留开放任务。

## 以下为预备阶段历史记录

- Task ID：TASK-IMAGE-EDIT-001；状态 IN_PROGRESS / NOT_VERIFIED。
- base 1d6f640ac6f3a1e7af32c38d85596527704dc54a；原已审source e7cfd285366fdb12902dd9bfe809069f29393281；新组合SHA待实际提交。
- 用户授权普通受保护合并；原e7本地PASS仅对应78cea旧基线，不代填当前组合。
- 当前已有独立旧source/doc收据保留：[历史review](../2026-10-08-unified-image-mask/review.md)。
- 待实际记录：完整verify各suite/report，Rust/client/release，同一EXE/JS/CSS/source hashes，native各收据/cleanup，Web/Desktop启动命令、URL/端口/route/import chain与同状态DOM/PNG，新SHAreview与Hosted/main CI。
- 未发生真实付费Provider、物理手机或用户视觉终验；不从本地fixture推断。
