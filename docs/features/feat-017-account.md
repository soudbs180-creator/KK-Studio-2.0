# 账号与登录（FEAT-017）

- 状态：PROTOTYPE
- 领域：platform
- 最近更新：2026-10-09
- 关联任务：BACKEND-PLATFORM、T10

## 用户可见入口

- 右上角账号弹窗（AccountPopup）、设置 › 连接 › 账号（“未登录 · Prototype”）。

## 代码位置

- `src/components/AccountPopup.tsx`（本地写死 UID）
- `src/components/settings/ConnectionSettings.tsx`（登录区）
- 真实认证：无（Gateway 规划了会话 token 与身份服务，未实现）

## 测试与证据

- 无真实服务测试；演示标注随设置/前端回归间接覆盖。

## 当前能力

- 仅本地演示账号展示，无登录/会话/用户体系。
- 当前口径（与派工板 `board.md` §5 一致）：账号方向是「当前本地登录 + 本地积分/用量，云端后置」，**不是隐藏账号入口**。保留「个人主页」本地页，去掉 Prototype / 假云端按钮；`accountLocal`/`creditsLocal` 默认开、`accountCloud`/`creditsCloud` 默认关。云端身份/会话/VPS 控制面统一后置到 ph3-account-cloud，不作为当前本地登录的前置。本地登录实做由 ph1-A-local-account（进行中）承接；本卡 PROTOTYPE 状态与 registry 真实度不升级，待实做交卷并补运行证据后再评估。

## 差距与后端化（本地当前 / 云端后置）

- 口径分层：当前先做本地登录 + 本地积分/用量（不依赖服务器/部署）；云端身份服务、VPS 会话/计费控制面属于 ph3-account-cloud，后置，不作为本地登录的最小链路前置。原「Wave 3 需要服务器/部署」的定位只适用于云端部分。
- 产品目标：Desktop 离线免登录可用，也可登录；Web/Mobile 需登录。账号身份与用户设备本地项目数据分开，不能把登录等同于云端保存；离线登录/会话过期的交互仍须在实现时明确。
- Desktop 当前优先支持用户自带 AI 账号登录或自己的 API Key 直接本地使用，不以 VPS 账号服务作为最小链路前置。Web 的账号、会话与用户身份控制面目标部署在 VPS；Gateway 生产化需可信 HTTPS 反向代理与身份服务（见 GENERATION-PLATFORM.md）。
- 产品化“用户自有 API 接入”仍是高优先级 TODO，当前不实现；只有 Desktop 最小生成链路与 Web VPS 身份/会话基础完成后才进入实现。
- 依赖 T10（VPS/域名/DNS）。

## 变更记录

- 2026-09-21：创建卡片，状态 PROTOTYPE。
- 2026-09-28：确认三端登录目标；当前仍为演示账号，未改变功能状态。

- 2026-10-15：TASK-KK-UNIFIED-20261015 已获用户实施授权，新增范围见 [统一规格](../changes/2026-10-15-kk-unified/spec.md)。本卡既有证据仍限原版本；新范围实现/真实验收尚未完成，不能沿用旧 PASS 关闭。

- 2026-11-09（ph1-gov-docs 口径同步）：按派工板 board.md §5，把账号口径由「原型演示壳 + 云端 VPS 后端化 / 隐藏导航」同步为「当前本地登录 + 本地积分/用量、保留本地页与导航、云端后置 ph3-account-cloud」；仅改口径文字，不改功能状态、registry 与证据。
