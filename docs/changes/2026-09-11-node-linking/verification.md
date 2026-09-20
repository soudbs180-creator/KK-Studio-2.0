# 验证记录

## 运行链路

- 开发：`http://127.0.0.1:1421/`，Vite development，`src/main.tsx → App.tsx → Canvas → CanvasNodeLayer`。
- 生产：`http://127.0.0.1:1423/`，Vite preview，由当前 `dist` 提供资源；同一链路分别执行浏览器检查。

## 结果

- `node --test tests/unit/*.test.ts`：20/20 通过；图片连线锚点更新为最新 Figma 的 `400×400` 正文几何。
- `node scripts/check-ui-standards.mjs`：88 个文件、0 项违规；`CanvasNodeLayer` 已拆出 `CanvasNodeItem`，参考图缩略图复用 `UiIcon`。
- 目标文件 Prettier 检查通过；`node node_modules/vite/bin/vite.js build` 通过。
- `node node_modules/@playwright/test/cli.js test --workers=1`：101/101 通过。
- 开发与生产浏览器脚本均确认：`pending=4`、`ready=4`、生成结果 composer=1、提示词保持；目标卡片高亮时未打开菜单，释放后连线数增加；空白释放打开新增菜单；上传卡片 `referenceOnly=true` 且 composer 数量为0；参考图计数为 `4/4`，第5张连接显示上限提示。

## 证据

- `docs/evidence/node-linking-pending.png`
- `docs/evidence/node-linking-ready.png`
- `docs/evidence/node-linking-direct-target.png`

## 限制

本轮仍是本地 Prototype：演示素材来自 `public/fixtures/demo`，模型能力表是 provider 元数据接入前的前端补充，不代表真实 API 上限或生成成功状态。
