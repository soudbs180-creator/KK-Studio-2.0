# Mobile 适配（FEAT-028）

- 状态：PARTIAL
- 领域：future
- 最近更新：2026-10-18
- 关联任务：TASK-MOBILE-12AI-001、TASK-WEB-RELEASE-20261017、T12、TASK-UI-CONSOLIDATE-20261014、TASK-PROTOCOL-CLI-20261014、TASK-222-ACTIONS-20261014、TASK-223-ACTIONS-20261014

## 用户可见入口

- [kkai.plus](https://kkai.plus)初次按手机UA或viewport≤767进入独立[手机Web](https://kkai.plus/mobile/)；宽屏与[显式桌面入口](https://kkai.plus/?view=desktop)保留原Desktop资料访问，使用中resize不强制跳转。
- Web2.1.38已正式上线；生产独立浏览器九项与用户实际手机UI确认均通过。设备/浏览器引擎未记录，Safari专项、新Native包与真实身份/Provider功能链不由这次UI确认代填。Mobile源码版本为2.1.3。

## 代码位置

- 独立入口与聊天：`mobile/src/app/_layout.tsx` → `mobile/src/app/(workspace)/index.tsx` → `mobile/src/screens/ChatScreen.tsx`
- 独立本机/真实账号上下文和数据：`mobile/src/application`、`mobile/src/storage`；纯共享契约：`packages/creation-contracts`
- 组合Web与初始分流：`deploy/build-combined-web.mjs`、`deploy/initial-web-entry.js`；Expo前缀配置：`mobile/app.config.ts`
- 原件预览及平台回调：`mobile/src/ui/MediaOriginalPreview.tsx`、`mobile/src/ui/MediaOriginalPreviewSource.web.ts`、`mobile/src/ui/OriginalPreview.tsx`
- 共享Desktop/Web响应式路径仍在`src/styles/responsive.css`与既有组件；独立Mobile页面不放入根`src/`。
- Expo/React Native的原生目标与配置已有独立源码，本轮未构建、安装或接受新的iOS/Android原生包。

## 测试与证据

- 正式生产来源main `f730f1dc32fb2e568dda6d4a52c58b05802d6b6b` / tag `v2.1.38`，完整收据见[最终生产验证](../changes/2026-10-18-web-mobile-production-receipt/verification.md)。
- `tests/mobile-web/entry.spec.ts`：生产origin九项首试全过、0retry/flaky/skip，覆盖UA/窄屏/横矮屏、桌面覆盖入口、抽屉、草稿恢复、可选账号往返、冷深链与缺失静态资源404；网络守卫记录九组blocked/errors均为空。用户实际手机另答“已显示独立手机 UI，正常”。
- Mobile Hosted323项测试及独立浏览器9项通过；`mobile/tests/applicationLocalMode.test.ts`覆盖无假session、本机/账号namespace、损坏存储保护和取消并发，`mobile/tests/uiOriginalPreviewLocal.test.ts`、`uiPreview.test.ts`覆盖原件及RN Web回调；不把fixture作为真实Provider回执。
- `tests/deploy/combined-web.test.mjs`覆盖首次分流、显式桌面/深链、前缀与内部路由冲突、组合导出失败保护。根`tests/browser/frame-accuracy.spec.ts`等旧窄屏测试仍只证明其共享Web范围。

## 当前能力

- 已恢复原创独立Expo/RN手机UI：以聊天创作为首页，提供胶囊输入框、触控抽屉与独立设置/资料入口；已正式部署并取得实际手机UI接受，不再用根桌面窄屏充当独立手机端。
- Web默认真实本机context，不伪造AuthSession或身份服务；项目/草稿与Desktop旧资料使用隔离存储，刷新恢复已验。可选账号入口可往返；Gateway/Comfy与账号请求仍要求真实账号上下文。
- Web凭据仅请求/会话内存保存；没有以明文localStorage保留密钥。本机资料不自动迁移Desktop或上传云端，原件仓库及预览回调已有代码/测试，真实Provider生成、原件回填与完整重开闭环仍须单独验收。
- 只跟随正式Release自动部署，普通提交与预发布不部署；受管静态产物保留current38和唯一previous37，不触碰业务数据库或其他工作树。

## 差距与后端化

本轮 [12ai 修复](../changes/2026-10-18-mobile-12ai/verification.md) 已获用户实现与发布授权：前次真实文本生成/保存/刷新通过，图片 POST200 后原件 URL 因 CORS 未能自动归档。候选 Web2.1.39 / Mobile2.1.4 将图片改为 12ai 同步 base64 原图，并补文生视频持久任务和 GET 恢复；尚未正式发布或完成本次真实图片复验。当前文本仅支持已有单条输入/SSE，不把可选参数未传视为故障。视频真实调用、原生包和 Safari 不由本地 fixture 代填；密钥仍只在 Web 会话内存。

- T12保持开放，FEAT-028保持PARTIAL。独立源码、手机Web运行形态和本机/可选账号边界已实现，不再视为未定稿；新原生包、Safari专项、正式身份服务、真实Provider/Companion及完整手机生成链仍未验。
- 用户实际手机已确认本轮UI正常；该确认不替代目标运行时一次真实文本生成和一次图片生成、结果回填/原件写入、保存重载双门，也不证明付费、云同步或多端全能力一致。
- 沿Desktop → Web → Mobile原交付顺序继续核心能力与平台验收。跨端复用继续使用独立`mobile/`和可版本化纯契约，不把Native宿主或Mobile页面混入根Desktop/Web实现。

## 变更记录

- 2026-09-21：创建卡片，状态 PLANNED。
- 2026-09-28：补充三端顺序、登录与设备本地存储目标，状态仍 PLANNED。
- 2026-10-09：补充独立 `mobile/` 目录、P0 双门与文本/图片最小链路顺序；状态仍 PLANNED。

## 2026-10-14 源码候选与验收边界

本轮只涉及响应式 Web 的屏幕编辑器、分级设置导航和已有固定面板，仍共享按钮、颜色、圆角与间距语义。屏幕命中尺寸修复不证明供应商生成、保存恢复和多端全链路完成；Native Mobile 未实现，真机和安装包未验，状态保持 PLANNED。

既有收敛结果见[历史验证](../changes/2026-10-14-ui-consolidation/verification.md)。当前源码门禁、实际构建和手机网页截图由[2.1.22协议/CLI验证](../changes/2026-10-14-protocol-cli-completion/verification.md)记录；fixture 和浏览器视口不推导 Native Mobile 或真机 PASS。

## 2026-10-18 独立手机 Web 正式生产收据

用户拒绝2.1.37桌面响应式后，从58df恢复282份mobile/contracts原创源码，未带入旧Desktop2.1.13。本轮main f730 / 正式Release v2.1.38已将独立 `/mobile/` UI、本机context与可选账号边界交付到kkai.plus；生产九项及用户实际手机UI确认通过。Mobile源码2.1.3不等于新APK/iOS发布。

179个current与155个previous文件完整哈希验证、7个入口HTTPS逐哈希核对、单回滚版本及临时授权/私钥清理均有[生产收据](../changes/2026-10-18-web-mobile-production-receipt/verification.md)。上述2026-10-14段为原时点原文，不覆盖当前独立手机Web事实。T12与Mobile整体PARTIAL边界保持；最终文档head的独立审查、Hosted及Delivery另按文档PR执行。
