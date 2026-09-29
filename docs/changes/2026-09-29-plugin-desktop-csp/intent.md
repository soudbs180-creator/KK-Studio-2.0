# Intent：修复桌面画布插件的 CSP 加载路径

- Task ID：PLUGIN-DESKTOP-001
- 状态：READY
- 日期与提出者：2026-09-29，当前用户“继续完成未完成的项目”
- 请求来源：继续收口未完成项目；按 Desktop > Web > Mobile 优先级处理主线账本中的桌面插件阻断。
- 用户授权范围与依据：用户已授权继续完成未完成项目；本轮只处理已登记的桌面插件加载缺口，不扩大到真实远程服务。
- 关联账本、spec、plan：`docs/governance/task-ledger.json`、本目录 `spec.md`、`plan.md`

## 用户原意

继续完成未完成项目，优先把客户端可用性补齐。

## AI 工程转译

当前随包画布插件先被读取为源码，再经 `blob:` URL 动态导入。Tauri 严格脚本 CSP 没有允许 `blob:`，因此桌面端插件发现后不能真正加载。让随包 `/plugins/*.js` 通过同源模块 URL 直接导入，保持严格 CSP；远程插件仍只允许 HTTPS、禁止自动重定向和不可信旧缓存，并明确其桌面能力边界。

## 目标与非目标

- 预期结果：fresh Tauri release 能发现、启用、渲染并停用随包插件。
- 包含范围：插件加载器的同源模块路径、单元回归、Tauri CSP/桌面运行验收、功能与任务文档。
- 明确不包含：远程插件变成桌面可用、连接器目录重做、真实 Provider/账号/云服务接入。
- 受影响平台/模块：Desktop；`src/features/plugins`、`src-tauri/tauri.conf.json`、桌面验收脚本与治理文档。

## 验收条件

| ID | 用户可观察结果 | 技术证据/检查 | 适用平台 |
| --- | --- | --- | --- |
| AC-1 | 随包插件在桌面画布添加菜单中出现并可创建节点 | Tauri release DOM、模块请求/加载证据；无 `blob:` 脚本导入 | Desktop |
| AC-2 | 停用插件后节点菜单和已渲染插件消失，重新启用可恢复 | fresh Tauri 实际启停交互，无 page error | Desktop |
| AC-3 | 严格 CSP 未为脚本全局增加 `blob:`；远程地址规则仍拒绝 HTTP、凭据、片段和重定向 | 配置断言、插件单测、远程边界单测 | Desktop/Web |

## 假设、风险和决策

- FACT：`pluginLoader.ts` 默认用 `Blob` + `URL.createObjectURL`；`tauri.conf.json` 的 `script-src` 只有 `'self' 'wasm-unsafe-eval'`；随包清单使用 `/plugins/*.js`。
- INFERENCE：同源 ESM 直接导入能在 Tauri `tauri.localhost` 下满足现有 CSP；fresh runtime 负责最终确认。
- UNKNOWN：当前用户设备上的 VPS 和生产部署状态不影响本地修复，仍按 T10/T11 账本保持 UNKNOWN/BLOCKED。
- AI 自主决定：同源 URL 走直接动态 `import()`，远程源码继续使用现有源码求值路径；不放宽 CSP，也不把远程插件隐式升级为 Desktop 能力。
- 必须由用户决定的产品语义/范围事项：无；桌面插件范围已在账本中定义。
- 不在本次范围的问题与账本 ID：TASK-LOCAL-SERVICE-001、T10/T11、Mobile、真实 Provider。
