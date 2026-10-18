# Verification：独立手机 Web

- Task ID：TASK-WEB-RELEASE-20261017；[Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Review](review.md) / [Release](release.md)。
- 状态：本地实现与有界复核 PASS，正式提交/Hosted/生产与撤钥待执行，任务仍 IN_PROGRESS/PARTIAL。用户拒绝旧2.1.37桌面响应式为手机版，不把旧40项当独立Mobile接受。

## 源码与实际入口

来源58df6791（Mobile产品267f04f2），只恢复282份 mobile/contracts 原始源码，未带入旧Desktop2.1.13。工程外 `mobile-source-restoration.json` 保存各原始文件hash；身份协议loopback测试依赖仅恢复至tests/support，不部署旧JSON身份服务。Web2.1.38、Mobile源码2.1.3、Desktop2.1.37；工具同步Mobile package/lock/Expo版本，不改依赖或原存储身份。

实际运行命令为 `npm run build`、`node deploy/build-combined-web.mjs`、`node node_modules/@playwright/test/cli.js test --config tests/mobile-web/playwright.config.ts`；production静态预览独占 `http://127.0.0.1:1423`，不复用已有server。手机根入口按UA或宽度进入 `/mobile/`，链路为 `mobile/src/app/_layout.tsx` → `(workspace)/index.tsx` → `ChatScreen.tsx`；宽屏继续Desktop App。只初始文档分流，不监听resize换应用；`/?view=desktop`可访问原Desktop资料。

## 实跑结果

- Mobile最终323/323测试，0失败/跳过；production/tests TypeScript、Expo lint通过。新增真实local context、存储损坏不覆盖、namespace隔离、本机BYOK归档与切账号/异步门禁测试；实际图片组件callback四回归验证local比例/错误显示与stale账号拒绝。
- 独立手机浏览器最终9/9首试PASS，retry/flaky/skip均0。证据 `test-results/mobile-web/a6203525-1934-443f-9cde-a36a2198a308`，metadata仍为base503+dirty，本阶段不冒充最终提交。390×844、390×480、窄DesktopUA、手机844×390、1920桌面、显式桌面出口、抽屉44px无遮挡、项目/素材/设置、真实TextInput草稿刷新、可选登录返回、设置冷启动深链及missing资源404均通过；九个新隔离context外网/API/POST/WebSocket和未捕获异常均0。
- 根完整 `npm run verify` exit0：Node1852PASS/19平台或既有SKIP，Agent199PASS/2SKIP，产品Edge825首试PASS+2flaky最终PASS，共827；DESIGN41单元+8浏览器、development四步以及lint/type/UI/format/build通过。2flaky均旧插件恢复1099/1920首次等待iframe或HTML菜单超时，未改其源码/断言/timeout；原失败完整保留，四项同文件严格retry0/worker1目标复验首试4/4通过。
- 之后新增Mobile健康检查与Linux回滚回归，根Node重新实跑1852PASS/20SKIP/0FAIL；单独实际Linux部署套件14/14 PASS/0SKIP，验证stale Mobile HTML/JS拒绝、current/previous双指针恢复、完整候选保留供同包重试、Desktop-only旧版回滚兼容。组合构建/入口8项回归通过。

## 失败与修复记录

- Expo57的stripBaseUrl无段边界，短 `/m` 会把 `/materials` 截成 `/aterials`；CLI去掉末尾slash，不能靠末尾slash修复。改用不与内部route前缀冲突的 `/mobile` 并加真实route自动guard，无依赖升级/补丁。冷启动guard在starting时不挂Stack，避免settings深链被登录anchor覆盖；原两浏览器RED保留。
- 独立安全审查复现取消等vault时切本机仍出网，以及reconcile等待load时覆盖取消controller的交错；最小登记/传递AbortSignal与二次同步占用检查后，两条真实adapter反例GREEN，原RED不删除。OriginalPreview两local回调缺口已由实际组件RED/GREEN关闭。
- 初次根Node/Agent构建缺本隔离树vendor运行依赖；按现有agent:install/build准备后通过，没有改产品隐藏失败。Linux首个GREEN准备缺workflow fixture，第二次错把既有候选保留行为断言为删除；修正夹具/契约后真实14/14，前失败保留。
- 生产复用harness仅允许显式 `KK_MOBILE_WEB_ORIGIN=https://kkai.plus`，不启本地server；导航DCL+原UI断言。404仍严格404并禁止两端SPA脚本，允许Nginx正常HTML错误页，未放宽为fake200。

## 服务器准备与未验证边界

Nginx `/mobile/` SPA与两类静态上一版回退已prepare/apply，nginx-t/graceful reload及旧37 HTML/JS/CSS逐hashHTTPS健康通过；配置SHA `cde19ee25fb9950dc5f81a1d8b603abbe9c423c18fffd519beff57043f52f9c0`，唯一原配置备份hash4ebce46e保持。新Mobile缺失时返回404，无内部重定向环。API693、PostgreSQL673、Nginx主PID666不变。发布器新增MobileHTML/JS逐hash健康，尚待root原子更新后正式Release上线验证。

未验证实体手机Safari、Native新APK/iOS、正式身份服务及真实Provider生成。Mobile与Desktop Web分别保存，不自动迁移；原Desktop资料入口保留。最终CI/源码SHA/完整线上清单、current/唯一previous及临时钥撤销待正式执行后补回执，不预填用户验收。
