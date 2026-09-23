# Verification：Design System校正与公共UI对齐

- Task：TASK-DS-001；相关UI-001、UI-004。
- 时间：2026-09-22，Asia/Shanghai；记录范围是本次未提交候选。
- Intent/spec/plan：[intent](intent.md)、[spec](spec.md)、[plan](plan.md)。设计勘误见[audit](audit.md)。
- 唯一工程：`D:/kk-studio/KK-Studio-2.0`；隔离验证：`C:/Users/Administrator/.codex/worktrees/design-system-alignment/KK-Studio-2.0`，branch `fix/TASK-DS-001-alignment`。
- Base/head均为`cf344ddcdf039c6e62aeb9c65106e2a2339c0bb4`，但包含明确复制的未提交候选。Git tree不能代表此次产品源码；以`evidence/source-manifest.json`的文件与bundle SHA-256为准。
- 使用Windows、Node24.20.0、npm11.19.0、Playwright1.63.0、Edge153.0.4234.48及仓库锁定依赖。只对当前命令PATH添加`D:/tools/node-v24.20.0-win-x64`；未改系统PATH。worktree的node_modules/vendor/public/plugins指向现有本地依赖，不修改依赖版本。

## 命令与真实结果

| 命令 / 阶段 | 结果 | 范围 / 证据 |
| --- | --- | --- |
| 初始候选typecheck、eslint | PASS | 在实施前确认当前dirty候选可编译；不把此结果作为新版验收 |
| 颜色契约与v1设置测试 | RED → GREEN | 先出现对比度/缺accent失败；最终30/30；读取实际CSS，不使用脱离产品的颜色拷贝 |
| 首次完整verify | 环境FAIL | worktree遗漏ignored vendor/canvas-proxy依赖；补本地junction后复验，没有关闭或放宽测试 |
| 最终颜色/组件修复后的`npm run verify` | PASS，exit0 | 307 Node、219 Playwright、0失败/0flaky；lint/typecheck/format/build、UI137/0、49任务/28功能门禁0违规。`evidence/verify-full.log`、`browser-results.json` |
| 独立颜色消费者补审 | PASS，exit0 | 192个computed状态；详见review.md |
| 导航图标加载检查（修复前） | FAIL，exit1 | 缺失plugins.svg，img naturalWidth=0；`evidence/icon-red.log` |
| 图标/恢复说明修复后build与13项回归 | PASS，exit0，13/13 | 双主题8色、键盘/重载/回焦/窄屏、资产/插件真实消费者；只清除拖动检查产生的文字选择后截图 |
| 原工程回传后的验证 | PASS，exit0，309单测/13定向浏览器 | lint/typecheck/format/UI137/0/49任务/28功能门禁、309 Node、build及13项浏览器全部通过；`evidence/verify-root.log` |

完整verify覆盖当前Agent/插件/文本候选的既有测试，但本任务不将这些测试解释为真实Provider或已启动外部服务。正常构建保留Zod注释及大chunk提示，不修改无关依赖或调高阈值隐藏提示。

## UI运行链路

- 启动由Playwright webServer管理：`node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 1423 --strictPort`；`reuseExistingServer:false`。先运行`npm run build`，不复用其他服务、不自动换端口。
- URL固定`http://127.0.0.1:1423/`；Vite production preview。路由由应用内view/modal状态决定，打开设置不会新增URL pathname。
- `src/main.tsx → App.tsx → SettingsPanel → GeneralSettings / SettingsSections → ConnectionSettings → ModelProviderSettings / PluginManagerSettings`。
- 资产链：`App.tsx → AssetPanel → AssetActions`。创建/导入保持原callbacks；浏览器原有创建主体、搜索和回焦用例继续执行。
- `.app`真实属性为`data-runtime-entry="src/main.tsx"`、`data-runtime-mode="production"`。`data-design-surface="desktop"`是1920布局标记，**不代表运行于Tauri**。
- 全量运行加载`index-CFFVa1jz.js`；图标补修后的候选加载`index-gsaqd29y.js`。颜色包`index-BSaygjnP.css` SHA-256 `120312afa0c769dfeb39c5272d3b347994a7bffcdc4fff64e379a970fcc9329c`保持一致。
- 根节点`data-theme`和`data-accent`由真实设置选择改变。页面保存按钮default/hover/active、必要边界、placeholder、焦点与switch滑块采用最终computed style。双主题×8色普通文字≥4.5，必要边界/焦点≥3；颜色算法不对禁用/装饰误用阈值。
- 原生选择以Alt+ArrowDown、Home/ArrowDown、Enter操作，刷新保留偏好；system主题随系统媒体偏好变化；Escape与关闭按钮回焦。390/768/1920宽度设置内容无横向溢出。完整报告保留实际滚动与原业务回归。
- 截图及DOM颜色/运行属性在`evidence/`，用户数据使用Playwright隔离browser context，不读取或改写实际用户profile/凭据。

## 设计文件

- 原PDF7页，逐页渲染检查；原文件SHA在audit.md。原稿未覆盖。
- 校正版PDF8页，271780 bytes，SHA-256 `5a48cef6e81ed38b9fe7af6f96560fb3f4433e0360b35f2f147d85a9231c5bc7`；位于工程外`D:/kk-studio/output/pdf`。全部页面渲染目视检查，无已发现的遮挡、截断或乱码；正文可以提取。PDF中明确中文回退字体与工程补充，不能当交互证据。
- 新版颜色/通用组件权威为`docs/DESIGN-SYSTEM.md`，旧Figma保留页面布局/资产角色。Ardot本次没有在线写入和变量/实例回读，不宣称在线源已更新。

## 结论与边界

本轮完成设计勘误、可审阅校正版、规范统一和公共实现的Web验证。TASK-DS-001整体保留PARTIAL，未关闭在线Ardot、Tauri新样式和用户最终视觉验收。UI-001与UI-004仍须覆盖历史专项组件和缺失页面基线，不能把全量测试通过当全页面逐像素验收。

本次未构建或启动Tauri release，未运行真实Provider/ComfyUI/GPU/账号/计费服务，未提交、推送、创建PR或部署。独立只读技术预检见[review.md](review.md)，不是正式SHA绑定PR审批。其他未完成事项见[remaining.md](remaining.md)。

## 当前工程回传记录

2026-09-22已回传到`D:/kk-studio/KK-Studio-2.0`，保持`chore/TASK-CONSOLIDATE-200`及原HEAD，未commit/push。回传先逐文件核对初始候选：只对FEAT-022做JSON按ID合并，保留其余并发功能更新；App仅插入dataset.accent，保留同期Agent不再传项目模型的修改。其他本任务源码与最终隔离候选一致。原有四个暂存删除条目保持，未添加暂存内容。

当前工程包含并发补充的2项Agent测试，因此为309 Node；本任务隔离候选的完整verify为307 Node/219 browser。回传后重新执行当前工程所有Node测试与13项受影响浏览器用例，均PASS，不把早前219项外推为并发源码的新全量运行。当前production实际加载`index-JTxmtvzP.js`，颜色CSS未变。`evidence/root-*-computed-colors.json`保存当前URL、runtime属性、script及stylesheet路径。

回传前安全快照保存在本机Temp的`kk-ds-before-integration-yoljq8im`；不把含并发候选的整包当本任务提交。源/构建指纹见`evidence/source-manifest.json`，复核时发现hash变化应针对新状态重新验收。

最终截图以`evidence/root-*.png`为准。追加8/8 Design System用例通过（`verify-root-visual.log`）；截图时快进CSS动画到最终状态，避免采到模态进入/换色中间帧，产品动画实现未修改。早期不带root前缀的隔离候选图保留当次采样含义，不替代最终稳态截图。
