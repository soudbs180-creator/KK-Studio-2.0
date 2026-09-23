# Mobile 适配（FEAT-028）

- 状态：PLANNED
- 领域：future
- 最近更新：2026-09-21
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

- T12：运行形态（原生壳 / PWA / 响应式 Web）待产品决定，之后才有平台能力与验收。

## 变更记录

- 2026-09-21：创建卡片，状态 PLANNED。
