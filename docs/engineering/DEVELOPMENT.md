# 开发与验证

```powershell
cd D:\kk-studio-next
npm install
npm run dev             # 浏览器 UI
npm run client:dev      # Tauri 客户端
```

提交前按顺序执行 `npm run typecheck`、`npm run test`、`npm run ui:check`、`npm run format:check`、`npm run build` 和 `npm run client:check`。完整交付执行 `npm run verify`，其中 `test:ui` 需要可用的 Playwright 浏览器。

验证记录必须写明命令、实际结果、浏览器视口和截图路径。单元测试证明逻辑，浏览器测试证明行为，截图和 Figma 同状态对比证明视觉一致；任何缺失都标记为 Prototype。
