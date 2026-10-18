# Verification：12ai 手机端生成与原件保存

- Task ID：TASK-MOBILE-12AI-001；IN PROGRESS；2026-10-18；交付包角色 current。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md)。
- Base：`c248d8178ec1754315559a9e476ac909bb494287`；产品代码 head：`c81311be3cde3a9f1a3d83a2c2eac504d6d12996`，tree `7e40842913bc8b81f5bedffa871c2827c7550745`；后续文档 head 另作独审补核。

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
- 连接页说明补充 12ai 指定视频模型能力后，Mobile type/lint/371 测试与根 lint、Web/组合重建及入口 9/9 全部再次 exit 0。最终本地 Mobile bundle `entry-3d5f09c48de900161a9afdf15eea10ae.js`：1,645,042 bytes，SHA256 `c0c5c3d2797e0cb30e95bcda777623277179ef808edd726acf396ccd3b500bfd`。当前线上仍 v2.1.38/f730f1dc，尚未部署本候选。
- 新视频 UI 在该组合 bundle 实际浏览器检查：390×844 模型表/固定参数/保存提示、390×480 搜索选择，及任务 GET 恢复按钮可见、横向宽度 390 无溢出。模拟原件 HTTP403 后 0/1 unknown 与原 Provider ID 保留，点击恢复只发 GET 同一 ID，刷新仍显示回执及禁止安全重试。证据 `video-ui/` 的 DOM、几何与四张截图；所有 HTTPS Fetch/XHR 都在浏览器拦截返回合成响应，只有模拟 POST1，真实视频请求/费用均为0，不冒充上游成功。
- 本轮日志和独审收据均在工程外 `D:/kk-studio/.analysis/kkai-12ai-mobile-fix-20261018`；来源及退出码由执行记录保留。前次验收失败证据不覆盖。

## 尚待验证与授权边界

当前最终 head 的独审补核、Hosted、正式发布、唯一 previous 回读，以及单张真实图片自动归档/刷新散列恢复尚待完成。用户已明确选择“先实测图片和文本，视频不额外消耗额度”；视频只报告协议、本地 UI 与保存恢复验证，不声明真实上游生成、计费、播放或实体设备已验收。
