# Mobile 适配（FEAT-028）

- 状态：PARTIAL
- 领域：future
- 最近更新：2026-10-18
- 关联任务：TASK-WEB-RELEASE-20261017、T12、TASK-UI-CONSOLIDATE-20261014、TASK-PROTOCOL-CLI-20261014、TASK-222-ACTIONS-20261014、TASK-223-ACTIONS-20261014

## 用户可见入口

- 当前独立手机 Web 入口为 `/mobile/`，根网址初次按手机 UA 或宽度≤767进入；`/?view=desktop` 访问原桌面资料。
- 恢复独立 Expo Mobile 原创客户端源码；原生新版本、实体手机与生产账号尚未接受。下文2026-10-14为恢复前历史边界。

## 代码位置

- 独立入口与聊天：`mobile/src/app/_layout.tsx` → `mobile/src/app/(workspace)/index.tsx` → `mobile/src/screens/ChatScreen.tsx`
- 独立数据与本机/真实账号上下文：`mobile/src/application`、`mobile/src/storage`；纯版本契约：`packages/creation-contracts`
- 组合Web与初始分流：`deploy/build-combined-web.mjs`、`deploy/initial-web-entry.js`
- 响应式样式：`src/styles/responsive.css`、各组件窄屏态
- 手机网页画布编辑：`src/components/canvas/CanvasComposerShell.tsx`、`src/styles/canvas-composer-screen.css`；分级设置导航：`SettingsPanel.tsx`、`ModelAccessSettings.tsx`、`ProviderPresetSelector.tsx`
- 原生壳：无

## 测试与证据

- 2.1.24本地验证（TASK-223，本任务DONE/PASS；功能主状态保持）：沿用已确认手机布局、主题与独立背景偏好，短屏菜单仅验证响应式Web/WebView；Native Mobile2.1.1继续PLANNED；最终产品58b5c07f与完整验证、官方/便携回执见[本轮验证](../changes/2026-10-14-action-usability-223/verification.md)。

- 2.1.23本地按钮修复：`tests/browser/canvas-selected-zoom-menu.spec.ts`、`tests/browser/settings-control-usability.spec.ts`；结果及Web/Desktop边界见[2.1.23历史验证](../changes/2026-10-14-action-usability-222/verification.md)。

- 浏览器窄屏回归：`tests/browser/frame-accuracy.spec.ts`（只证明 Web 响应式，不证明原生 Mobile）
- 当前画布缩放/屏幕编辑器与导航规格：`tests/browser/canvas-screen-composer.spec.ts`、`settings-navigation.spec.ts`；其触摸、命中和截图只覆盖手机尺寸浏览器，当前最终结果由任务 verification 记录。

## 当前能力

- 沿用用户确认的手机新布局；主题与独立画布背景偏好保留，双主题全缩放选项包含在圆角菜单内并可触摸；只代表响应式Web/WebView，不是Native Mobile验收。

- 本轮只优化共享响应式Web/WebView：320/390px上传顶部动作与设置开关命中区、完整选项和取消导航；原生Mobile与实体手机验收仍开放。

- Web 的窄屏布局沿用共享组件；选中图片/视频/提示词节点时，编辑器在手机窗口固定到屏幕，保持同一节点草稿与提交动作，模型/参数/展开控件不随世界缩放缩小，菜单可在容器内滚动。此实现不增加真实视频生成能力。
- 设置按分类、接入方式、服务商详情逐级展示，提供明确返回和回焦；操作期间按同一 busy 状态锁定切页/关闭。以上均属于响应式 Web，不能替代原生 Mobile。

## 差距与后端化

- 用户已确定 Desktop → Web → Mobile 的交付顺序。Mobile 对齐 Web 的核心能力，但可按手机交互与资源限制明确裁剪；目标为登录后使用且个人数据在设备本地持久化。
- T12：独立 Mobile 运行形态（原生壳 / PWA 等）、能力子集、登录/本地存储与真机验收仍未定稿和实现。实现时必须使用独立顶层 `mobile/` 目录，不得与 Desktop/Web 业务代码混放；如需跨端复用，必须先抽出与平台无关、可版本化的契约或核心包。规划版本以 `config/platform-versions.json` 为准，版本数字和窄屏 Web 不代表已发布 Mobile 应用。
- Mobile 的第一个里程碑是通过同一套 UI/交互双门，并在真机或目标运行时完成一次文本生成和一次图片生成、结果回填、原始记录写入及保存重载；完成后才做核心能力对齐和性能/资源优化。

## 变更记录

- 2026-09-21：创建卡片，状态 PLANNED。
- 2026-09-28：补充三端顺序、登录与设备本地存储目标，状态仍 PLANNED。
- 2026-10-09：补充独立 `mobile/` 目录、P0 双门与文本/图片最小链路顺序；状态仍 PLANNED。

## 2026-10-14 源码候选与验收边界

本轮只涉及响应式 Web 的屏幕编辑器、分级设置导航和已有固定面板，仍共享按钮、颜色、圆角与间距语义。屏幕命中尺寸修复不证明供应商生成、保存恢复和多端全链路完成；Native Mobile 未实现，真机和安装包未验，状态保持 PLANNED。

既有收敛结果见[历史验证](../changes/2026-10-14-ui-consolidation/verification.md)。当前源码门禁、实际构建和手机网页截图由[2.1.22协议/CLI验证](../changes/2026-10-14-protocol-cli-completion/verification.md)记录；fixture 和浏览器视口不推导 Native Mobile 或真机 PASS。

## 2026-10-18 独立手机 Web 恢复

用户拒绝已上线2.1.37桌面响应式作为手机版，要求此前已做的独立Cherry参考UI。已从58df恢复mobile/contracts原始282文件（独立源码267f04f2），未带入旧Desktop2.1.13。Web候选2.1.38中 `/mobile/` 使用本机真实context，BYOK与项目持久化可用；可选账号不伪造session，Gateway/Comfy先验真实账号。手机与原Desktop Web空间隔离并提供原资料入口，不自动迁移或清空。Mobile源码版本2.1.3不等于新APK/iOS发布。

Mobile323测试、type/lint、组合导出、独立手机browser9/9已通过；精确SHA绑定、Hosted与生产接受继续记入[当前验证](../changes/2026-10-17-web-release-receipt/verification.md)。状态调整为PARTIAL，不推导实体手机、正式身份服务或真实Provider生成完成。T12及其他原任务保持原状态。
