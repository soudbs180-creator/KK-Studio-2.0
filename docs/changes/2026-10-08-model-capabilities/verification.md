# Verification：模型能力声明

- Task ID：TASK-MODEL-001；状态：REVIEW；日期：2026-10-08（Asia/Shanghai）。
- [Intent](intent.md) · [Spec](spec.md) · [Plan](plan.md) · [Review](review.md)。
- branch：codex/TASK-MODEL-001-capabilities；base：21d121d2b884b2b7ced4a98eb0e03c590de5c3cd。
- cwd：`D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-MODEL-001-capabilities`；原 checkout clean。

## 开工结果

原生 worktree 工具在容器目录报 Not a git repository，使用已 ignore 的 .worktrees Git fallback。fetch 默认失效回环代理，临时 `git -c http.proxy= fetch origin main` 成功，main 未前移。默认沙箱启动器返回 HRESULT 0x80070020，读/验证命令经自动审核在非沙箱上下文运行；未出现审核拒绝。

`npm ci --offline --no-audit --no-fund` 退出 0，依赖由现有缓存安装；npm 提示 esbuild 安装脚本未预批准，后续构建需确认实际可用。初次 npm 未在 PATH，随后使用现有仓库 Node 24 工具；未变更系统安装。

## 实施与失败先行

隔离 worktree 的基线 lint/typecheck PASS，Node 640 项中 632 PASS、8 个既有平台 skip；没有把 skip 算通过。Node/npm 使用已有工具目录，未引入依赖。后续 production build 已确认 esbuild 可用。

| 范围 | 首次失败 | 修正后结果 |
| --- | --- | --- |
| 目录报告/保存 | `red-catalog.log`：5 fail / 1 pass，缺少 image 字段，writer 未过滤未知属性 | `green-catalog.log`：12/12 |
| 共享提交门禁 | `red-submission.log`：4 fail / 6 pass，已禁止 edit、零参考图及任务总数仍可提交 | `green-submission.log`：24/24 |
| 画布参考图 | `red-canvas.log` 先暴露 Node import 扩展错误；修正 import 后 `red-canvas-behavior.log` 复现超限可连线 | `green-canvas.log`：12/12 |
| 无显式 model 的新节点 | `red-default-node.log`：11 pass / 1 fail，未使用当前命令的账号/model | `green-default-node.log` 通过；所有参考图消费者使用同一默认选择 |
| 三态设置/约束 UI | `red-ui.log`：缺少新控件；`green-ui.log` 暴露收起状态参考图按钮未禁用 | 修正入口后继续回归，没有移除约束 |
| 单张重绘 | `red-redraw-saved-draft.log`：旧 count=8、当前限额=1 会误禁单张重绘 | 重绘传入自己的 outputCount=1；`green-ui3.log` 14/14，无 retry |
| 文本兼容 | `red-text-compat.log`：图片声明误约束同账号文本模型 | 只对图片使用 image 声明，文本保留原连接许可；`green-text-retry.log` 26/26 |

`green-ui.log` 的另两项失败是测试定位器错误：status 需限定目录 fieldset，参数菜单采用实际 title；按真实组件来源修正，不删验收。首次 native 检查所有业务断言通过后，隐藏数量按钮的 computed-style 读取失败；改为实际可见 body 字号记录，`desktop-acceptance-run2.log` 通过。App 新增 native 图片复查时同步保留显式重试选项，与 Web 原有规则一致。

首轮 `verify.log`：Node 645/653（8 skip）、Agent 172/174（2 skip）通过；UI check 因 CanvasNodeLayer 317 行失败。将既有参考图集合映射按职责移入 `canvasReferences.ts`，不改变图边语义，UI check 191/0。`verify2.log` 在已有 1423 listener 处拒绝启动，未停止未知来源进程。`verify3.log` 使用 1425 后 377 pass / 4 fail；检查确认图片比较断言和本机服务允许 origin 固定 1423，属于运行配置不兼容，未放宽测试/CORS。1423 listener 自行退出后，在原配置执行 `verify4.log`；结果待回读。

## 开发模式既有失败

任务分支开发模式的四项 capability 浏览器测试均被 Vite 的 `/plugins/{html,markdown,sticky-note,svg}.js` public-import 错误遮罩阻挡。原主线 main@21d121d 用原实现和依赖在 1421 复现同样错误，见 `baseline-dev.log` 与 `.tmp/model-capabilities/baseline-dev.json`；主线源码/索引仍 clean。

本轮不修改插件实现、不关闭 HMR overlay、不把失败算 PASS。独立问题登记为 TASK-PLUGIN-DEV-001。另用 overlay 已提供的 Escape 操作退出已记录遮罩后，实际新设置页保存了 true/false/zero/数量，`development-capability.log` 退出 0；这仅证明当前能力表单/存储在 development 生效，插件加载仍 PRE-EXISTING FAILURE。

## UI 来源与运行链

来源为 UI_INDEX 指定 Figma 四页 `505:13071/13430/13731/14180`、现行 detail 设置模板与 tokens.css。复用 provider 表单、quality-btn、计数菜单与 ReferenceStrip；没有增加局部 CSS 或修改 Figma。新三态/禁用提示是工程补充，本轮同状态 runtime 证据不冒充新 Figma 画稿验收。

入口 `index.html → src/main.tsx → App.tsx`；设置链为 `SettingsPanel → SettingsSections → ConnectionSettings → ModelProviderSettings → ProviderModelCatalog → ImageModelCapabilityFields`，画布链为 `Canvas → CanvasNodeLayer → CanvasNodeItem → CanvasNodeContent → ImageCreationNode/DemoResultNode → CreationComposer → CreationParameterControl → ImageModelParameters`。

| 模式 | 启动与 URL | 实际入口/证据 |
| --- | --- | --- |
| Development | `node node_modules/vite/bin/vite.js --port 1421 --strictPort`；`http://127.0.0.1:1421/` | data-runtime-mode=development；`/src/main.tsx`；`.tmp/model-capabilities/development-runtime.json` 与 development-settings.png；14px 控件；已记录 plugin 失败 |
| Web production preview | `npm run verify` 内 test:ui build + strict preview；`http://127.0.0.1:1423/` | 三档 390/1099/1920 capability 截图和 runtime JSON；data-runtime-mode=production，styles/JS 从实际 DOM 读取 |
| Tauri release | `npm run client:build -- --no-bundle` 后 `node tests/desktop/model-capabilities.mjs`；`http://tauri.localhost/` | 最后源码 fresh EXE + 隔离 --data-dir/WebView profile；声明恢复、数量/参考图限额、原图归档、重绘禁用、tasks=0、page errors=[]，全部 PASS |

Desktop/Web 源码版本 2.1.4/2.1.5；Mobile 规划版本仍 2.1.1。`client:check` 已退出 0，有五项既有 Rust dead-code warning。正式安装包、真实 provider、原生 Mobile、合并/发布尚未验收。

## 全量与交付

`npm run verify` 原配置最终运行 [verify4.log](evidence/logs/verify4.log) 退出 0：Node 645/653（8 个既有 skip）、Agent 172/174（2 个既有 skip）、Edge browser 381/381；lint/typecheck/UI191/0/format/build 与治理/功能/Markdown 检查全部通过，无最终 browser flaky。没有为通过而修改图片比较或本机服务测试。

最后源码 [Tauri build](evidence/logs/desktop-build-final.log) 和 [隔离运行](evidence/logs/desktop-acceptance-final.log) 退出 0，EXE SHA256 `6577c1831c9a1f691a71ee3e68da32bc59084f922534d498ac644a5ee1effb22`；实际加载 `/assets/index-Bvt1L0MZ.js`、`/assets/index-Dajq2fwF.css`，JS 字节与当前 dist 相符。完整 [native runtime](evidence/desktop-acceptance.json)、[Web runtime 1920](evidence/capabilities-runtime-1920.json)、[browser summary](evidence/browser-summary.json) 和 [源码指纹](evidence/source-fingerprint.json) 绑定这次 dirty 实现；随后提交未改产品源码。独立上下文 review 待绑定提交 SHA。

截图：[Web 390](evidence/capabilities-settings-390.png)、[1099](evidence/capabilities-settings-1099.png)、[1920](evidence/capabilities-settings-1920.png)、[native 设置](evidence/settings-native.png)、[native 参数](evidence/parameters-native.png)、[native 重绘禁用](evidence/redraw-disabled-native.png)。[development runtime](evidence/development-runtime.json) 与 [main 开发失败](evidence/baseline-dev.json) 分开保留，不把遮罩后局部通过变为开发插件通过。

正式证据放本包 evidence；完整运行日志和浏览器 JSON 记录退出结果/原平台 skips。全量命令使用 Node 24.21.0/npm 12.1.1；独立诊断/原生验收脚本使用现有 Node 24.19.0，浏览器为本机 Edge/WebView2。既有 large-chunk 与 Rust dead-code warning 未屏蔽。

## 真实性边界

本轮以本地目录和受控 HTTP fixture 验证声明/校验；不触发真实付费生图。真实 provider 的正确能力、服务验收、mask/outpaint 执行、Mobile、合并/发布和用户最终产品验收尚未发生。
