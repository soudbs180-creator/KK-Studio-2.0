# Mobile 适配（FEAT-028）

- 状态：PLANNED
- 领域：future
- 最近更新：2026-09-28
- 关联任务：T12

## 用户可见入口

- 无原生 Mobile 应用；现有 390px 等窄屏布局是响应式 Web。

## 代码位置

- 响应式样式：`src/styles/responsive.css`、各组件窄屏态
- 原生壳：无

## 测试与证据

- 浏览器窄屏回归：`tests/browser/frame-accuracy.spec.ts`（只证明 Web 响应式，不证明原生 Mobile）

## 当前能力

- Web 在窄屏下可用（SPEC_BASELINE 明确：窄屏布局不等于原生 Mobile）。

## 差距与后端化

- 用户已确定 Desktop → Web → Mobile 的交付顺序。Mobile 对齐 Web 的核心能力，但可按手机交互与资源限制明确裁剪；目标为登录后使用且个人数据在设备本地持久化。
- T12：独立 Mobile 运行形态（原生壳 / PWA 等）、能力子集、登录/本地存储与真机验收仍未定稿和实现。`2.1.1` 只是规划版本，窄屏 Web 不等于已发布 Mobile 应用。

## 变更记录

- 2026-09-21：创建卡片，状态 PLANNED。
- 2026-09-28：补充三端顺序、登录与设备本地存储目标，状态仍 PLANNED。
