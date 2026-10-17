# Verification：正式 Web2.1.38 生产收据

- Task ID：TASK-WEB-RELEASE-20261017；日期：2026-10-18，Asia/Shanghai。
- 结论：生产技术交付及用户实体手机UI验收PASS；最终文档head门禁另记。
- 交付包角色：current；分支：`docs/TASK-WEB-RELEASE-20261017-production-receipt`。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Review](review.md) / [Release](release.md)。

## 来源与main质量

| 身份                 | 实际值                                                          |
| -------------------- | --------------------------------------------------------------- |
| PR66 base            | `503dedbeda39f133c7f77f88ab66825d156f81cf`                      |
| 已审查PR66 head      | `690d864b12fe22a6abe516c4e7dda301156c1712`                      |
| 正常squash后发布main | `f730f1dc32fb2e568dda6d4a52c58b05802d6b6b`                      |
| 两完整tree           | `53dd0eac369b3fc3cc31364217048c521da956c5`，Git对象实际回读相等 |
| 版本                 | Desktop源码2.1.37 / Web2.1.38 / Mobile源码2.1.3                 |
| 本包最终DOC_HEAD     | 以本收据PR的当前HEAD及外部审查回执为准，与生产来源分别识别      |

PR66 quality39049774613五项、guards39049774360两个context通过；690d独审见[review](review.md)。main quality39052635456 attempt1于`2026-10-17T17:49:14Z`完成success，五job均成功；main guards39052635453亦success。

| main验证            | 实际结果                                               |
| ------------------- | ------------------------------------------------------ |
| Node                | 1853PASS / 19SKIP / 0FAIL，共1872                      |
| Agent               | 199PASS / 2SKIP / 0FAIL                                |
| 根产品浏览器        | 827passed，19.4分钟                                    |
| DESIGN              | 41单元、8浏览器通过                                    |
| Rust                | bin213PASS / 1ignored；integration41PASS               |
| 隔离Native TaskHost | 11检查通过，不是新安装器验收                           |
| Mobile              | 323PASS / 0SKIP / 0FAIL；Hosted本地预览9项通过，14.7秒 |

工程外`stage/pr66-main-tree-proof.json`、`hosted-pr66-{mobile-linux,verify}-690d864b.json`、`hosted-main-f730-{final,verify,mobile}.json`保存来源与结果。较早Mobile摘要“production still37”仅为其当时状态。旧本地两插件flaky与另4/4严格目标复验保留于[前一包](../2026-10-17-web-release-receipt/verification.md)，不追改旧结果。

## 正式发布与产物

正式`v2.1.38` / Release415969948非draft/非prerelease，来源f730。`managed-web-release` run39055538017 / job117462622818成功，真实Linux组合构建由受限账户部署。证据：`stage/formal38-auto-deploy.json`、`formal38-published.log`。

| 校验项              | SHA256 / 结果                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Linux archive       | `aadf8e217147be7cdbc2a27c939dcab25b10fa479ebbd4a5ca528dda46b30f6e`                                               |
| 当前manifest        | `8ba352804364b3bf2130bb6cb6dc0cfbc371131327327832c7387fae8c0b8a1b`                                               |
| 文件数              | 当前179，其中Mobile23；previous155                                                                               |
| Desktop HTML        | `738cf7d57c25add9190a042a50017e1bbc3dccc2cf4a118726ba48d891a632bc`                                               |
| Mobile HTML         | `0ff5d2610e3b544a5b053ba9abda030defe9650e1777fb22be2c146e70f4635d`                                               |
| Mobile entry JS     | `entry-6d47c3e50d95de85dbabbfaef37d99e5.js` / `de5cdb01d1d127d48879cb4c4dd0e29160eb5dd7eb3e9c2663b7b646e72a7786` |
| previous37 manifest | `cfb89f6fb6c24ec850531fa7c3db5364799acc832c0b596848713dcaa38e6a7b`                                               |

`production38-server-manifest.json`与`final38-{verified,cleanup}.json`证明服务器文件系统current179/previous155全部文件按manifest逐hash校验。HTTPS逐hash仅覆盖两HTML、直接JS/CSS、selector和build-info入口资源集，不是全部179文件的HTTP请求。Mobile链为`/mobile/` → `_layout.tsx` → workspace index → `ChatScreen`。

撤钥后于`2026-10-17T18:03:03.608Z`再验7个公开入口，全部HTTP200、no-cache、gzip且SHA精确匹配manifest；证据`stage/production38-public-https-after-cleanup.json`。这7项包括Desktop/Mobile HTML、Desktop JS/CSS、selector、Mobile JS和build-info，不扩大为全179项HTTP验证。

## 生产独立手机九项与用户验收

协调者在发布source f730 checkout执行以下命令，origin精确`https://kkai.plus`，不启动本地1423：

```powershell
$env:KK_MOBILE_WEB_ORIGIN = 'https://kkai.plus'
try {
  node node_modules/@playwright/test/cli.js test --config tests/mobile-web/playwright.config.ts
} finally {
  Remove-Item Env:KK_MOBILE_WEB_ORIGIN
}
```

- 开始`2026-10-17T17:52:49.218Z`，53.8秒，9/9首试通过；retry/skip/flaky/unexpected全0。
- Report：`test-results/mobile-web/bcb34136-8048-40e8-8da0-4565be46fe75/mobile-web-results.json`，SHA256 `98dc964c02d5bd594a46c4b78f8f29d1b2b5545a91d0539bad1ef3a7bd9a2f48`；本包作者再次计算一致。
- metadata绑定生产origin/f730；九份network-and-runtime附件均`blocked:[]`、`errors:[]`，已解码核对。
- 覆盖390×844、390×480矮屏、桌面UA窄屏、手机UA844×390横屏、1920桌面与显式桌面；抽屉项目/素材/设置触控与裁切、草稿重载、可选账号往返、冷启动深链和真实404全部通过。
- 该report artifacts中的竖屏`phone-creation.png`与矮屏`phone-drawer.png`由协调者及本包作者查看，独立“你想创造什么？”、底部composer与完整抽屉可见。
- 用户随后在异步问题中直接回复：“已显示独立手机 UI，正常”。实体手机浏览器UI实际验收通过，证据`stage/user-phone-acceptance38.json`；具体浏览器/引擎未知，不推导Safari专项。

`stage/production38-mobile-proof.json`保留汇总；原UI/触控/溢出/持久化/网络/异常断言、0重试和timeout不变，DOMContentLoaded后仍等待真实UI，不用networkidle掩盖问题。

## 回滚、服务与清理

已审阅finish helper默认验证及`--cleanup`成功，证据`stage/final38-verified.json`、`final38-cleanup.json`。current为`releases/v2.1.38`，previous为`releases/v2.1.37`，恰好两受管目录、一个回滚版本，旧4a已GC。37全部155文件hash通过；未实际切回生产37，回滚机制由隔离Linux回归证明，固定控制台命令见[release](release.md)。

API693、PostgreSQL673、Nginx666主PID保持且均active/running。Nginx配置SHA256 `cde19ee25fb9950dc5f81a1d8b603abbe9c423c18fffd519beff57043f52f9c0`；原配置备份`4ebce46ed56c0dbb1cbd1ea7a3fc88dc908238c39e560c186dd1920d135d9658`保留。发布/清理只作用受管静态版本、隔离测试和本次凭据，没有执行业务数据迁移。

临时root key计数0，原authorized_keys原字节恢复，SHA256 `2cce758797a8511f3ae4e6c006d4cf9f5beb8022c5a57fe6c752cdd560a5e51d`；隔离测试UUID和原授权临时备份已删除。仅用该临时身份、禁agent/密码回退的连接返回255 / Permission denied(publickey)。两个固定本机私钥`deploy_ed25519`、`automation_ed25519`删除，正式Actions受限凭据未改，公开证据保留。

`stage/root-temporary-ssh-denied.json`、`local-private-key-removal.json`保存时间与核对。初始动态批量删除被自动策略拒绝且无执行，随后两个固定LiteralPath分别删除成功，清理已完成。

## 结论与剩余范围

AC-1至AC-4生产技术检查PASS，用户实体手机UI验收PASS。root已逐对象对照f730：其他149账本、36功能及全部runtimeEvidence一致，原149对象的Python规范SHA仍为6471490cfab1823c0ee646353e24304c191fcbac01e8e379625686d161aae542；PROJECT_STATE历史区未改。证据为工程外`stage/root-final-docs-semantic-preservation.json`。本任务有界DONE/PASS后，150任务中86DONE、1IN_PROGRESS、48PARTIAL、12TODO、3BLOCKED，开放64；FEAT-028仍PARTIAL。

最终DOC_HEAD、独立review、Delivery与Hosted以本收据PR的当前HEAD、checks及外部审查回执为准，与生产来源f730分别识别；正文不预填自身未来SHA或尚未取得的门禁结果。

Windows tag workflow39055499316实际failure：Web38 tag与Desktop37不同，本轮未要求/发布新Native包；不称所有tag工作流均成功，也不称Web部署失败。旧/m、启动深链、取消交错、回调及Linux首轮失败/复验保留于历史包。

Safari未单独专项测试；实体手机真实Provider/账号完整文本图片原件链、新APK/iOS、正式身份和云同步未验收。FEAT-028保持PARTIAL、T12开放，本次Web上线不证明用户本地Desktop安装器已更新。
