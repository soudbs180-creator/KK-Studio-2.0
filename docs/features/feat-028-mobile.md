# Mobile 适配（FEAT-028）

- 状态：PARTIAL
- 领域：future
- 最近更新：2026-10-18
- 关联任务：TASK-MOBILE-COMPOSER-001、TASK-MOBILE-12AI-001、TASK-WEB-RELEASE-20261017、T12、TASK-UI-CONSOLIDATE-20261014、TASK-PROTOCOL-CLI-20261014、TASK-222-ACTIONS-20261014、TASK-223-ACTIONS-20261014

## 用户可见入口

- [kkai.plus](https://kkai.plus)初次按手机UA或viewport≤767进入独立[手机Web](https://kkai.plus/mobile/)；宽屏与[显式桌面入口](https://kkai.plus/?view=desktop)保留原Desktop资料访问，使用中resize不强制跳转。
- 当前Web2.1.40 / Mobile源码2.1.5正式上线，产品main b457/Release416447150/Web部署39128852497同源；Desktop源码2.1.38。本轮不新生成，前次39真实图文保存回执和本次旧图文恢复分别记录。详见[当前生产收据](../changes/2026-10-18-mobile-composer-production-receipt/verification.md)。
- PR72已正常合并并正式发布：菜单任务/历史结果优先，详情结果→提示词→更多；六入口、模型名可点、直接圆形发送。线上实际320/390宽UI及旧资料恢复已复核，实体Android Chrome接受仍待回执；不把旧38用户回复当40验收。

## 代码位置

- 模型输入交互：`mobile/src/screens/Composer.tsx` → `ComposerInput.tsx` / `ComposerToolbar.tsx` / `ComposerPanels.tsx` → `ModelPicker.tsx` / `mobile/src/ui/Sheet.tsx`；浏览器语音 `mobile/src/ui/useSpeechInput.web.ts`
- 结果优先呈现：`mobile/src/screens/TasksScreen.tsx` / `TaskDetailScreen.tsx` / `ChatScreen.tsx` → `mobile/src/ui/TaskResults.tsx`；Desktop共享发送 `src/components/UiIcon.tsx` / `AgentActionButton.tsx` / `StartComposer.tsx` 与 `src/styles/composer.css`
- 独立入口与聊天：`mobile/src/app/_layout.tsx` → `mobile/src/app/(workspace)/index.tsx` → `mobile/src/screens/ChatScreen.tsx`
- 独立本机/真实账号上下文和数据：`mobile/src/application`、`mobile/src/storage`；纯共享契约：`packages/creation-contracts`
- 组合Web与初始分流：`deploy/build-combined-web.mjs`、`deploy/initial-web-entry.js`；Expo前缀配置：`mobile/app.config.ts`
- 原件预览及平台回调：`mobile/src/ui/MediaOriginalPreview.tsx`、`mobile/src/ui/MediaOriginalPreviewSource.web.ts`、`mobile/src/ui/OriginalPreview.tsx`
- 12ai图片/视频：`mobile/src/services/twelveAiProtocol.ts`、`providerClient.ts`、`twelveAiVideoClient.ts`、`twelveAiVideoModels.ts`、`mobile/src/application/videoWorkflow.ts`
- 共享Desktop/Web响应式路径仍在`src/styles/responsive.css`与既有组件；独立Mobile页面不放入根`src/`。
- Expo/React Native的原生目标与配置已有独立源码，本轮未构建、安装或接受新的iOS/Android原生包。

## 测试与证据

- TASK-MOBILE-COMPOSER-001产品已审791e与合并b457同tree，全63文件独审/57定向测试PASS；main quality39124025635完整attempt2五项、双平台guards及新health通过，正式Web部署39128852497成功。Hosted实际main Mobile artifact40/40首试/retry0；本地Mobile433、根verify/窄屏40/40、v39完整snapshot/backup合成兼容与预算保留[原验证](../changes/2026-10-18-mobile-composer/verification.md)，原32/8失败、根5xx flaky、main首轮managed-web15秒超时、health403和零jobs异常不抹去。当前[生产验证](../changes/2026-10-18-mobile-composer-production-receipt/verification.md)记录真实entry、线上320/390六控件44/48圆形同排、模型名picker/面板响应、任务结果优先、旧图文/unknown及current40/唯一previous39。新40普通页面停留927.716秒后刷新，图片可见且再次UI导出原件逐字节一致（不等于实体切后台），实体后台未验；以下39/38与旧文档PENDING均按历史时点保留。

- 本轮正式生产来源main `9d10af39d0b028a8ddc7f06c594c813ef25b7205` / tag `v2.1.39`；Mobile371与根本地verify、产品独审/同tree晋升、精确main Hosted、正式Web部署及生产入口9项通过，见[本轮验证](../changes/2026-10-18-mobile-12ai/verification.md)与[发布实录](../changes/2026-10-18-mobile-12ai/release.md)。旧2.1.38来源和323项历史记录如下保留，不冒充本次新图文验收。
- 图片服务/自动归档冷启动、视频服务/应用恢复/UI策略由 `servicesTwelveAiImages.test.ts`、`applicationTwelveAiImageArchive.test.ts`、`servicesTwelveAiVideo.test.ts`、`applicationVideo.test.ts`、`uiVideo.test.ts` 覆盖；视频实际本地bundle的失败/GET恢复、成功样本保存/播放/普通导出/刷新有独立证据，0真实上游视频调用。
- 正式生产来源main `f730f1dc32fb2e568dda6d4a52c58b05802d6b6b` / tag `v2.1.38`，完整收据见[最终生产验证](../changes/2026-10-18-web-mobile-production-receipt/verification.md)。
- `tests/mobile-web/entry.spec.ts`：生产origin九项首试全过、0retry/flaky/skip，覆盖UA/窄屏/横矮屏、桌面覆盖入口、抽屉、草稿恢复、可选账号往返、冷深链与缺失静态资源404；网络守卫记录九组blocked/errors均为空。用户实际手机另答“已显示独立手机 UI，正常”。
- Mobile Hosted323项测试及独立浏览器9项通过；`mobile/tests/applicationLocalMode.test.ts`覆盖无假session、本机/账号namespace、损坏存储保护和取消并发，`mobile/tests/uiOriginalPreviewLocal.test.ts`、`uiPreview.test.ts`覆盖原件及RN Web回调；不把fixture作为真实Provider回执。
- `tests/deploy/combined-web.test.mjs`覆盖首次分流、显式桌面/深链、前缀与内部路由冲突、组合导出失败保护。根`tests/browser/frame-accuracy.spec.ts`等旧窄屏测试仍只证明其共享Web范围。

## 当前能力

- 当前正式40已接默认任务/历史图片、视频或文本结果预览、可展开详情与完整输入；上传复用原件，Skill只预览/明确改草稿，语音手势启动不自动发。官方12ai指定模型参考图走原件校验/multipart编辑，通用端点/文本视频参考/遮罩仍拒绝；fixture最终40/40，线上实际旧图片/文本展示及恢复已验，新真实参考编辑/视频/语音不额外耗额度、仍未验。
- 尺寸为本次运行时选择，经提交捕获旧task.imageSize；未发刷新/切类型或模型回自适应。没有新增draft字段、schema/storage身份或backup格式，旧v39完整reader与备份合成兼容通过，沿ADR-025，不把该fixture当现网降版实测。
- 已恢复原创独立Expo/RN手机UI：以聊天创作为首页，提供胶囊输入框、触控抽屉与独立设置/资料入口；v2.1.38已取得用户实际手机UI接受，属于历史确认，40接受仍待回执；独立手机端不以根桌面窄屏代替。
- Web默认真实本机context，不伪造AuthSession或身份服务；项目/草稿与Desktop旧资料使用隔离存储，刷新恢复已验。可选账号入口可往返；Gateway/Comfy与账号请求仍要求真实账号上下文。
- Web凭据仅请求/会话内存保存；没有以明文localStorage保留密钥。本机资料不自动迁移Desktop或上传云端；前39生产的12ai同步图片base64原件与SSE真实单图/短文本已1/1保存并刷新恢复，本次40只核旧资料回读。视频持久ID/GET-only恢复仅有本地协议/UI/样本验证，不能扩大成上游真实视频能力已接受。
- 只跟随正式Release自动部署，普通提交与预发布不部署；当前current40/唯一previous39，exact2/两版validated与原39manifest/archive保持有只读库存及独立18项复核；配置/auth/服务两次观察一致，不推断DB每字节静止。canonical并发变化不纳入隔离发布，不声称其他工作树恒定。

## 差距与后端化

当前[40生产收据](../changes/2026-10-18-mobile-composer-production-receipt/verification.md)记录正式发布与线上UI/旧资料恢复，实体Android Chrome验收待回复；本任务保持IN_PROGRESS/NOT_VERIFIED。以下是[前39生产实测](../changes/2026-10-18-mobile-12ai-production-receipt/verification.md)的历史范围：用户保存Key后各一次真实gpt-4.1-mini文本与gpt-image-2图片1/1保存及刷新恢复，PNG830495B/SHA64a6af6e与Provider/两次UI导出一致，旧unknown/import保留；独立live审核通过、PR71文档门禁已完成。不新增生成，不把fixture视频、参考编辑、麦克风、Safari或新Native称为已验收。FEAT-028 PARTIAL/T12开放。

- T12保持开放（现有账本TODO不在本任务改动），FEAT-028保持PARTIAL。手机/桌面同功能是目标，当前远程Agent/MCP、新原生包、Safari专项、正式身份/云同步、真实参考编辑和实体后台仍未验；本轮不搭新伴随服务、不凭入口宣称全能力相等。
- 用户实际手机在v2.1.38确认独立UI正常；该历史确认不替代40实体Android接受、目标运行时图文生成/原件写入/重载双门，也不证明云同步或多端全能力一致。
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
