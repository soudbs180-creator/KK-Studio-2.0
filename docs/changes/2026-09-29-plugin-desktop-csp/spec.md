# Spec：修复桌面画布插件的 CSP 加载路径

- Task ID：PLUGIN-DESKTOP-001
- 状态：READY
- 日期：2026-09-29
- Intent / 账本：本目录 `intent.md` / `docs/governance/task-ledger.json`
- 当前规范与实现基线：`src/features/plugins/pluginLoader.ts`、`src/features/plugins/pluginRuntime.ts`、`src-tauri/tauri.conf.json`、FEAT-013
- Source of truth：随包 `public/plugins/index.json` 及插件 bundle；CSP 以 Tauri 配置为准。

## 用户行为与入口

- 启动 Desktop 后，插件加载器读取 `/plugins/index.json`，激活已启用的随包插件；画布“添加资源 → 插件”显示其节点。
- 关闭/停用插件后，节点注册和样式清理；重新启用恢复同一插件。
- 加载失败保留已有 store 记录并记录错误，不伪造成功；远程地址继续在安装前校验 HTTPS、无凭据/片段且禁止自动重定向。
- 直接同源导入使用缓存戳；单元测试通过 `moduleImporter` 注入模块，远程源码测试继续使用 `importModule` 注入。

## 架构、数据与权限

- `pluginLoader` 新增同源 URL 模块求值分支。只有路径位于 `/plugins/` 且与当前页面同源时才直导入；其它来源走既有源码求值路径。
- 随包记录仍保存 URL/source/enabled/local 字段，schema 不变；不写入凭据，不新增网络权限。
- `tauri.conf.json` 保持 `script-src 'self' 'wasm-unsafe-eval'`，不加入 `blob:`。
- 远程插件以应用权限执行的现有风险提示与 HTTPS 边界保持不变；本次不承诺远程 Desktop 支持。

## 平台能力

| 能力 | Desktop | Web | Mobile | 降级/禁用理由 |
| --- | --- | --- | --- | --- |
| 随包插件加载 | 真实同源 ESM | 真实同源 ESM | 不适用 | Mobile 当前无原生包 |
| 远程插件安装 | 仍受现有边界，桌面不新增承诺 | 现有 HTTPS 源码路径 | 不适用 | 不把远程代码加入 Desktop CSP |

## 生命周期与恢复

- 初始化：清单发现与 store rehydrate；失败不清空已有记录。
- 正常使用：启用插件登记节点、样式和 setup 清理函数；停用执行清理。
- 升级：同源导入 URL 使用缓存戳；store 结构向后兼容。
- 损坏/写失败：沿用现有 `pluginStore` 错误路径；不执行不安全旧缓存。
- 回滚：恢复任务分支/上一主线提交即可，CSP 无迁移。

## 验收映射

| Intent AC | 预期状态/结果 | 检查/运行环境 | 证据要求 |
| --- | --- | --- | --- |
| AC-1 | Tauri release 直接加载 `/plugins/*.js` 并显示 HTML/SVG 节点 | fresh Windows Tauri + CDP | DOM、页面错误、模块 URL |
| AC-2 | 启停插件改变添加菜单/节点注册 | 同一 fresh Tauri 数据根目录 | 启停前后 DOM 与截图/JSON |
| AC-3 | CSP 不放宽，远程安全测试全过 | Node unit + config static check | 命令退出码与配置断言 |

## 风险和决策

- 可自主解决：模块 URL 解析与测试注入；不改变公共 store/schema。
- 待用户决定：无。
- 外部依赖：Windows WebView2/Tauri release 可运行；VPS 状态与本修复无依赖。
- 明确未承诺：真实远程插件在 Desktop 的执行；仍归入 FEAT-013 的后续差距。
