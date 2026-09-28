# Spec：对比命中区子像素修复

- Task ID：TASK-COMPARE-002
- 状态：IMPLEMENTED
- 基线：`origin/main@7bc7c67`；[前次交互规范](../2026-09-27-canvas-image-compare/spec.md)

## 行为与边界

390px Web 界面中，图片卡入口、选择 chip、打开按钮及对比弹窗按钮使用既有布局，CSS `min-height` 提升到 45px。浏览器仍按屏幕 `boundingBox.height >= 44` 验收；按钮文案、点击、滑块键盘和触摸、错误重试与素材选择逻辑不变。Desktop 消费相同的构建 CSS。

不改 schema、API、凭据、素材原件或任务状态。CSS 余量不影响宽屏规则。回滚为仅撤回这组窄屏 CSS 值；如果主线仍失败，保留失败证据并继续定位实际测量来源。

## 验收映射

| Intent AC | 证据 |
| --- | --- |
| AC-1 | `tests/browser/image-compare.spec.ts` 原 390px 测试在 production preview 通过 |
| AC-2 | 完整 `npm run verify` 和隔离 Tauri release GUI 通过 |
| AC-3 | 当前 PR `verify`/`delivery` 与合并后 push run 成功 |

原生 Mobile、真实 Provider、VPS 和用户最终视觉验收不从本修复推断。
