# Verification：Web2.1.40生产收据

- Task ID：TASK-MOBILE-COMPOSER-001；交付包角色：current；2026-10-18；任务IN_PROGRESS / NOT_VERIFIED（实体Android接受待补）。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Review](review.md) / [Release](release.md)。产品source `b457d3a05759ca7a2f6a8c4bb62a8ba8aea908ea`；本docs PR初始base同source，branch `docs/TASK-MOBILE-COMPOSER-001-production-receipt`。PR75创建时main并发推进，正常merge集成base `87c9cfbe0f19555f9998d6b7051760f22f26f67f`，不把docs HEAD当生产来源。

13:12Z并发[PR73](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/73)已将三平台源码推进2.1.41；其150文件及新增Canvas任务完整保留，不属于本docs PR产品改动。下述40发布与验收为12:49至13:10Z真实观察，发布来源内Desktop38/Web40/Mobile5与当前源码三端41分别记录，不据源码候选推断服务器升级。集成仅生成TASK_LEDGER发生冲突，保留双方JSON后重新生成；新base其他153task和36非028feature保持。本PR当前HEAD需重新独审/Hosted，原b457→98ec审查只批准旧断面。

## 源码、独审与Hosted

- [PR72](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/72)正常squash；已审head `791e4483a4fb3c3689e323678cf09cbcde3c1be5`与产品main完整tree同为 `bbcab2a0d5e4a0fe4241b3d3f32d01e6b69b5334`，`git diff --quiet`通过。独立上下文全63文件审查PASS，57/57新定向测试；2P1/4P2闭合。实际平台审批要求0、审批数0，未伪造人工approval。
- 产品本地完整verify、Mobile433、最终窄屏40/40、旧v39完整snapshot/backup兼容与预算详见[原验证](../2026-10-18-mobile-composer/verification.md)，原失败与flaky保留。最终已提交main Hosted Mobile独立artifact复核40/40首试/retry0/无flaky/skip，ZIP SHA `77650b47fa35c6d2c1efca51e51130e76f0e073ccd74b03f68701849fe4493b6`；metadata没有clean字段，不能补造。
- [main quality39124025635](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/39124025635)完整attempt2五项成功；guards39124025636双平台成功，新health39127523980日志health.ok=true/reasons空。14checks逐ID分为8当前PASS/6历史，无未解释失败或pending。main收据SHA `d8c92e16b4152a75ae27aa5d3943f349a71442f2d5f247a39d830964340f5844`。
- attempt1 verify117665285234在managed-web fixture的外层15秒spawnSync python3 ETIMEDOUT失败；原日志SHA `b502cdd0672e716162cff9776767dfebe3d849a6d34780f99d4b7686c6861b6d`保留。仅一次完整workflow rerun，源码/timeout/有效断言均未改；准确根因UNKNOWN，不能称已知flaky。旧health失败及暂停API403保留，后续health成功不证明变量/incident已恢复；零jobs auto-merge异常另列UNKNOWN，不计green。

## 正式发布、实际资源与缓存

- [Release416447150 / v2.1.40](https://github.com/soudbs180-creator/KK-Studio-2.0/releases/tag/v2.1.40)已发布，draft=false/prerelease=false、精确tag/source；Desktop源码2.1.38 / Web2.1.40 / Mobile源码2.1.5，不等于新Native或本机Desktop安装器交付。
- [Web部署39128852497](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/39128852497)为release事件，attempt1/job117679655206全部成功，12:49:42Z结束；实际日志Verified quality39124025635/source b457、validated与activated v2.1.40。完整部署收据SHA `ee415ce6d0b68c51bc08a4d3ed882fffcdd8c97373f6ab89e03bb6e644486abc`。
- [公开build-info](https://kkai.plus/build-info.json)200：releaseId v2.1.40/source完整b457/webVersion2.1.40。实际[Mobile入口](https://kkai.plus/mobile/)引用 `entry-cbc0e227036e53be7546e79a394a14be.js`，与CI真实导出一致；公开JS1655061B、SHA `c93983371f3f437b633cf7428a3d08c07aed3fe57441a18738cd1eb7234edf0f`。不能套用Windows本地2738bundle。
- 带39旧ETag/Last-Modified的条件GET返回200及新entry；ETag从6ad47364-4cc变6ad4c062-4cc，no-cache，Last-Modified12:49:38Z，HTML1228B/SHA `6849d935247cc5928618e03a9bcbe1a6bdc84cc01c988c50a6ccbb4f9b720119`。未改缓存配置。
- Windows tag-push installer39128546552因tag40与Desktop38不符而失败，独立保留；不能声称全部工作流绿色或把它当作Web部署失败。Web工作流没有archive Actions artifact或CI manifestSHA输出，不虚构下载比较。

## 线上手机交互与原资料

- runtime为https生产Mobile Expo Web。普通根入口在实际390×844进入独立/mobile/；实际DOM/entry已核。页面链 `_layout.tsx` → `(workspace)/index.tsx` → `ChatScreen.tsx` → Composer各子件；菜单任务经`TasksScreen.tsx`/`TaskDetailScreen.tsx`→`TaskResults.tsx`。
- 六个控件390宽均48×48/radius24，320宽均44×44/radius22、同y、完整落在视口内。点击模型名gpt-image-2实际打开连接模型面板；上传/参数/扩展均实际打开对应面板，未点击发现模型、真实麦克风或发送。扩展库为空时显示实际空态，未伪造可用Skill。实际网络记录和DOM/完整截图见工程外production40-*。
- 菜单任务真实列表先呈现已有图片/文本结果；图片详情为图片→提示词→更多，更多可展开/收起；旧unknown任务仍待核对0/1，不自动重试。旧文本`f5dae4e6-0309-40fb-98dc-e68b5f4cd69f`刷新后仍为`KK39_TEXT_OK_20261018_B0EF`。
- 旧图asset-64a6af6eb696b0dd87362e81普通UI导出830495B，SHA `64a6af6eb696b0dd87362e814df773ca85c940b715aed254564df34571c4aa13`，与39原件一致；40加载entry已确认，普通页面停留927.716秒（12:53:24.151Z至13:08:51.867Z）后刷新，实际430×637页面顶部图片可见，再次UI导出逐字节一致；不是实体Android切后台。新增真实Provider生成0；语音/参考编辑/视频仅沿原测试边界，未新耗额度。
- 手机视口最初browser override未作用于目标tab，实际为430×637，证据已按430命名；随后显式逐tab metrics及DOM确认320/390。Cua原生截图受面板裁切，完整图使用tab fullPage screenshot；不将工具预览裁切当产品黑屏。真实Android前后台仍待用户回执。

本轮`production40-network-sanitized.json`记录主验收39事件和素材刷新8事件，两段truncated=false、Provider请求0/POST0，不含headers/postData/Key/响应正文；不把未捕获的素材初始载入范围冒充全程网络。`production40-debug-cleanup.json`记录两标签页临时URL拦截、Network域、逐tab设备尺寸及browser viewport override均清理成功；实际麦克风和生成均未调用。`production40-asset-dwell-restored.json`、after-dwell-visible完整图与DOM绑定同一旧asset/entry/830495B/SHA；普通停留不能替代真机后台。

## 一个回滚版本与保护

- root通过已登录VNC执行冻结只读脚本，12:52:31.444938Z原图346126B/SHA `7bf10206305d03798f5974e4102d6ee5ab61aecf68ba424d68d0040020c9570e`；独立人工选字段转录18项逐项PASS，不冒充机器stdout。
- current40/source b457，179files/23Mobile/7034592B，manifestSHA `dd1762b9777c5d3720e42cb252f05945a5894b64941056be1cdd85cea9eb6c77`，archiveSHA `1d0110c27076b12743923f23079ce84802970f3bdf9fcfb2648db70cb7cb170e`精确等于部署日志。
- previous39/source `9d10af39d0b028a8ddc7f06c594c813ef25b7205`，179files/23Mobile/7014908B，manifest `9ca0fcbd5f89ad185f9810b5d63082306419c6f69f2ce699653a474685f22c71`与archive `792ac477958c42f71c58457e53aa060ca59fa475721f402c0797e800edb1bafd`和上线前current39逐字段一致。受管目录仅39/40，onlyCurrentAndPrevious=true，未执行生产降版。
- controller、Nginx、原配置备份、root授权文件SHA/3行原字节与基线一致；旧临时tag不存在。API/Nginx/PostgreSQL均active/running，PID693/666/673与基线相同，只证明两次观察一致，不证明连续未重启或数据库每字节静止。未新建SSH权限、未操作用户DB。
- canonical仅只读：早先并发已到a553…/clean、index caa37…；13:07Z再读已到`b8f4fbe7161675e9c805e78ed97ffed97efdb55d`/clean，index SHA `8a4cf7248fde16e823f09a8d037673b102eba71e0c3170a1cc8e774ffe88d0c5`，local main ahead105/behind1。并发变化保留，不能宣称起止不变或已同步该本地主线。本任务未在那里写文件、暂存、reset/clean/reconcile；本docs工作隔离且产品source固定。

## 证据入口与剩余项

工程外证据根`D:/kk-studio/.analysis/kkai-mobile-background-20261018`：expanded-final-review.json、composer-hosted-gate-receipt.json、composer-main-attempt1-failure-receipt.json、composer-main-gate-receipt.json、hosted-main-mobile-attempt2-review.json、composer-web-release-deployment-receipt.json、public-identity-after40.json、cache-after40.json、after40-inventory-review.json/md及production40-*。库存转录JSON SHA `66cdd160ca23c68a596e55f65ce26bdfdb8617f626b431c540107528658ae59f`。旧黑截图JPEG完整字节/像素一致、旧39停留908.067秒、截断network及hidden未证保持[原边界](../2026-10-18-mobile-composer/verification.md)。

当前docs HEAD的本地检查、提交后Delivery/独立审查/Hosted与正常PR收据另冻，不用产品791e批准代填、不为自引用SHA循环改文档。Android Chrome用户接受、真实麦克风、新参考生成/视频、Safari/Native、远程Agent/MCP未验；FEAT-028 PARTIAL/T12开放。

合入并发基线前，本docs断面lint/typecheck/format均exit0，governance153/features37/Markdown129/index25ADR/snapshot3/doccommands160无违规；版本一致性通过并保留当时CHANGELOG落后Desktop38的一项warning。87c9正常merge后重新运行lint/typecheck/format均exit0，governance154/features37及相关文档门禁通过；version:consistency仍exit0，保留新基线chat_migration_tests.rs:5的旧版2.1.36兼容writer夹具路径warning与CHANGELOG落后41 warning，未修改并发源码或历史Changelog。13:17:49Z公开build-info复读仍是v2.1.40/b457。集成提交后正式Delivery/新独审/Hosted另冻收据。

新基线lint退出0不代表没有health问题：health:check相对b457扫描101文件，输出22项blocking级度量，但87c9既有ENFORCEMENT为advisory，故退出0；其配置在本PR完全未改。静态度量按继承基线风险记录，本docs不调整阈值/模式或修并发产品源，独立审查另核所有非docs条目与87c9一致。
