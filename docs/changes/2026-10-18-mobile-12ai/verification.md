# Verification：12ai 手机端生成与原件保存

- Task ID：TASK-MOBILE-12AI-001；IN PROGRESS；2026-10-18；交付包角色 current。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md)。
- Base：`c248d8178ec1754315559a9e476ac909bb494287`；原产品审查 head `c81311be3cde3a9f1a3d83a2c2eac504d6d12996`；最终候选 `b0ef662233e6ab4985d319dae6ac077f64a31cb0` 与 squash 后正式来源 `9d10af39d0b028a8ddc7f06c594c813ef25b7205` 的完整 tree 同为 `611cf648ade1d0fb98c5474ae91615f0bbaf1a23`。
- 当前：Web2.1.39 / Mobile2.1.4 已正式上线，发布与入口检查通过；本轮真实图片和短文本仍 NOT VERIFIED，等待用户在原连接补填 Key 并自行保存。任务保持 IN_PROGRESS；本分支仅记生产收据，文档最终 head 须由另一上下文独审。发布实录见 [Release](release.md)。

## 已运行

- 新 canonical 保护基线 clean、HEAD `109c6c41167dc091ef57e9e53211c3822a4fe5fc`；旧 release 工作树 clean。外部证据 `protection-before.json`。
- 根及 Mobile 锁文件依赖安装 exit 0；Mobile 未改前测试 323 PASS、0 FAIL、0 SKIP。
- 图片前次真实故障记录只作复现依据：POST200、原图 CORS、unknown0/1；本次修复尚未替代该失败结论。

## 图片实现的本地验证

- 原图返回格式/错误提示回归先出现预期 10 FAIL、5 PASS；修复后新增测试及旧 Provider 测试共 29 PASS。另补凭据读取期间连接被编辑的输入捕获回归，先 1 FAIL、15 PASS，再修复为 30 PASS。
- 最终图片阶段 Mobile 全量 339 PASS、0 FAIL、0 SKIP，typecheck 和 lint 均 exit 0。原始红绿日志分别保存在本次工程外证据目录，不覆盖旧失败。
- Node 的既有 MODULE_TYPELESS_PACKAGE_JSON 提示保留；没有为抑制提示修改 Expo 包模块模式。fixture 不代表新线上图片已验收。

## 整合候选本地验证

- 图片另补原件 HTTP401/403/404 分阶段错误回归与应用级冷启动归档回读。视频提交/轮询/保存/停止/未知受理/GET-only 恢复共 28 项新增覆盖；整合后的 Mobile `typecheck`、`lint --no-cache`、`test` 均 exit 0，371 PASS、0 FAIL、0 SKIP。
- 首次根 `verify` 在 Node 阶段 1850 PASS / 2 FAIL / 20 SKIP：隔离依赖安装跳过 postinstall 后 Agent dist 尚未生成。补齐现有 `agent:build`、`plugins:build`，原文件 3/3 PASS；没有修改产品 Agent 或断言。失败日志 `root-verify-before-video-integration.log` 保留。
- 完整重跑 `npm run verify` exit 0，日志 `root-verify-integrated.log`：根 Node 1852 PASS / 0 FAIL / 20 SKIP，Agent 199 PASS / 0 FAIL / 2 SKIP，浏览器 827 PASS，设计 Node 41 PASS、浏览器 8 PASS，插件开发链 PASS。既有环境性跳过保留，未冒充全平台覆盖。
- 组合构建 `node deploy/build-combined-web.mjs` exit 0；独立 Mobile Web 入口浏览器 9/9 PASS，0 retry/skip，覆盖 390px、矮屏、横屏、宽屏及冷深链。该测试不调用真实 Provider。
- 连接页说明补充 12ai 指定视频模型能力后，Mobile type/lint/371 测试与根 lint、Web/组合重建及入口 9/9 全部再次 exit 0。本地 Mobile bundle `entry-3d5f09c48de900161a9afdf15eea10ae.js`：1,645,042 bytes，SHA256 `c0c5c3d2797e0cb30e95bcda777623277179ef808edd726acf396ccd3b500bfd`。该阶段线上仍 v2.1.38/f730f1dc；后续正式产物另见下节，不能用此 Windows 本地 bundle 证明公网身份。
- 新视频 UI 在该组合 bundle 实际浏览器检查：390×844 模型表/固定参数/保存提示、390×480 搜索选择，及任务 GET 恢复按钮可见、横向宽度 390 无溢出。模拟原件 HTTP403 后 0/1 unknown 与原 Provider ID 保留，点击恢复只发 GET 同一 ID，刷新仍显示回执及禁止安全重试。证据 `video-ui/` 的 DOM、几何与四张截图；所有 HTTPS Fetch/XHR 都在浏览器拦截返回合成响应，只有模拟 POST1，真实视频请求/费用均为0，不冒充上游成功。
- 本轮日志和独审收据均在工程外 `D:/kk-studio/.analysis/kkai-12ai-mobile-fix-20261018`；来源及退出码由执行记录保留。前次验收失败证据不覆盖。

## 独审、主线质量与正式发布

- c813 源审报告保持冻结；b0ef 七文件补审通过，本地新增视频模型/unknown/GET 恢复与短屏 UI 门禁关闭，receipt `final-review/supplement-b0ef6622.json` SHA256 `bb34d991bd74095cd7d4ae5ae4abb28100f75bf4c9550ca0eeeaa6302bbcd212`。PR70 正常 squash 后，独立 Git 对象复核 parent=c248、完整 tree 与 b0ef 一致，receipt `final-review/source-promotion-9d10.json` SHA256 `6b746c21ed2814764036c29e39c3181db910c18acc0fd7656aa052c1735fb0dd`；不改写旧审查 head。
- PR70 精确 b0ef Hosted 质量与 guards 通过。正式 main9d10 的 quality [39104785098](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/39104785098) attempt1 五项、guards [39104785090](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/39104785090) attempt1 双平台均 success；分页至末页、首尾 main/attempt 复读稳定。`main-gate-receipt.json` SHA256 `6c1985446dada63054b8c74dd4febeefb5cb45077961f2fb3dba4860a0725d9d`。
- 正式 tag `v2.1.39` 指向9d10，非draft/非prerelease的 [Release416299447](https://github.com/soudbs180-creator/KK-Studio-2.0/releases/tag/v2.1.39) 于07:19:51Z发布；release-event [managed-web-release39107253299](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/39107253299) attempt1 / deploy117615692266全部success，07:21:09Z实际activated。`web-release-gate-receipt.json` SHA256 `34031cc45b56e7b7b222eed99b1d42410ed55155ac6d59653ade633ea8d7ddc5`；执行摘录 `web-release-activation-log.json` 保留 archive SHA `792ac477958c42f71c58457e53aa060ca59fa475721f402c0797e800edb1bafd`。
- 公网 build-info、`/mobile/` 和实际 CI 导出的 `entry-140201476199fedafe0abc0ba5b1dfb9.js` 均 HTTP200/gzip/no-cache；build-info为Web2.1.39/source9d10，公网JS为1,638,695 bytes、SHA256 `cf341da42fd899433c99a4de1089097dbe74d18fa6b2099a9acc2fbb957d9d36`，与本地3d5不同。`production-after.json` SHA256 `814b4d45ad23506877465310997e3be7227e119681c3c0a609aba88f9522d268`；CI实际导出日志另保存在 `web-release-mobile-bundle-log.json`，SHA256 `924a6e7fb2240622f1868be35fc6338a2248118435a07e17ab7a1fe5fa133f31`。首次identity大文件读取超时保留，后续gzip回读通过，不改写前次失败。
- 生产origin `https://kkai.plus` 独立入口浏览器9项通过，0失败/跳过/flaky，sourceHead9d10；未调用Provider。`production-mobile-web-receipt.json` SHA256 `6c5ab9b2e1b3bf971d6d868c7f0849773f01fa1ff0422b9478e6a87d2efddb49`。用户原浏览器也读回同140201入口与Mobile2.1.4，旧1项目/1原件/快照28仍可见；这不是本轮真实生成复验。
- tag push触发的旧Windows installer run39107203456因tag v2.1.39不等于Desktop2.1.37而在版本门禁失败，发生于正式Release之前；见 `legacy-tag-run-boundary.json`。本次Web部署成功与该原生失败分开，不声称新Desktop安装器或Native包完成。

## 视频成功 fixture 与真实能力边界

本地Sora合成回执与MDN示例MP4完成1/1自动归档、blob播放至ended、普通导出和刷新恢复。输入及前后两份导出均1,128,375 bytes，SHA256 `0cd83d944a6ca7822b4a8306cecc60a36e859b041f6702c6a1ad9ead78924451`；刷新仅1个localhost Document GET、0 Provider请求/0 POST。`video-success-fixture/success-receipt.json` SHA256 `f817e55d4791a987bbfcfa4f8915fdef7c64c318b8b56bec96b28e621944364f`，独立补证 `final-review/video-success-fixture-review.json` SHA256 `bc587a06ae660cf1ccff54ce14bd126fc9d3f5e63bbc536a9f4dd0bafe80d11b`。仅本地保存/播放链PASS，未实际调用12ai视频；不把样本5.055秒/960×540当成模型真实4秒/720p产出。

## 回滚与保护终核

- 实际root控制台只读库存前为current38/previous37，发布后为current39/previous38，直属受管目录精确两份，两版validated、observationStable/checksPassed=true。current179文件/23Mobile，manifest SHA `9ca0fcbd5f89ad185f9810b5d63082306419c6f69f2ce699653a474685f22c71`；previous38的179文件及manifest `8ba352804364b3bf2130bb6cb6dc0cfbc371131327327832c7387fae8c0b8a1b`与pre不变。旧37已不在直属清单，保留唯一回滚38；未执行实际生产降版演练。
- nginx/原配置备份/auth字节SHA与临时tag0、API/Nginx/PostgreSQL active/running及PID693/666/673的前后观察一致，不推断持续运行或业务数据库每字节不变。证据来自原截图及独立人工字段转录，非直接stdout或reviewer重新读取全部服务器文件；`server-inventory-after-review.json` SHA256 `1ef6a2c8297883174f0b2ad5a7c74ff04173b829c6df3973e058519a9ffdb8ce`。初次粘贴截断的Python SyntaxError保留，随后有效只读执行另有证据，未新增SSH授权。
- canonical初始clean109c6c41/index e01ff8e9，07:30Z终核已为本地main `0a49ed1db42d95e0d9c24f6f468a3c6159b2f873`、index `7dc72867ca479beabba6597eddf95024af23f6e823e1d0e483be0790ad80e2ed`及4条dirty；`protection-after.json` 的matchesBefore/checksPassed=false如实保留，不能声称主仓完全未变。
- `protection-concurrent-local-state.json` 两次只读head/index/未暂存diff/4文件hash稳定、staged diff为空。路径为 `src/App.tsx`、`src/features/creation/nativeTaskExecution.ts`、`useImageCommandSubmission.ts`、`useTaskExecution.ts`；本轮未回滚、覆盖、暂存或纳入这些改动。reflog记录13:28 reset/merge、13:44 fixp0及14:26 event-bus commit，不能单凭reflog归因操作者。正式来源始终为隔离树9d10，不是该canonical状态。
- 旧release工作树仍 `0cb2fc090fb3d16e2846cf8a67c0cb8e0dd64242`、clean、index `ab7757bba4c5f05f5e8d384d86c388c08f13cd8ba981b2b7818c6b53439e87e6`与初始完全相同。并发核对收据SHA256 `fea7a61712382215232efcf90690aa226c6efa715aa8302effa04ea42c49c95d`。

## 尚待验证与授权边界

已关闭产品source独审、main Hosted、正式Web发布及唯一previous回读；本轮真实单张图片自动归档/普通导出/刷新同ID同hash和新版本短文本完整SSE/保存/刷新仍NOT VERIFIED。reload按既有设计清除了内存Key，当前仅打开原连接编辑页并请用户填Key且自行保存，尚未收到回复；未再发真实生成请求，不以旧文本成功或视频fixture代替新验收。Task保持IN_PROGRESS/NOT_VERIFIED，FEAT-028仍PARTIAL、T12开放。

收据文档的最终head独立审查、Hosted/Delivery另按后续PR记录；本次记录实施者曾做旧产品独审，不将其旧结论或当前自检充当新文档独审，也不以已发布产品source的CI替代该文档head门禁。用户产品接受只记录真实发生的回复；新原生包、Safari、真实上游视频/计费与云同步等仍未验。
