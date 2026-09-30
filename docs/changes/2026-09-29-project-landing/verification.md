# 项目落地验证（2026-09-30）

## 身份与范围

- Base：`origin/main@1e95a13d3490a39b35ce39e9df0ab55a09dc13f7`。候选：`codex/TASK-PROJECT-001-landing-integration`，root `D:/kk-studio/KK-Studio-2.0`。
- 版本：Desktop **2.1.2** / Web **2.1.3** / Mobile 规划 **2.1.1**。保留存储 key/identifier，没有升级数据身份。
- 本地证据绑定当前 source/bundle 与 executable hash；最终 review/head、托管 check、merge/tree 与产物收据以本集成 PR 的最终记录为准。更改 head 必须补审，不能替换旧 review 的 SHA。
- [全量审计](audit.md)、[未完成项](remaining.md)、[技术裁定](plan.md)。没有用 fixture 证明付费 Provider、GPU、账号、Mobile 包或 VPS 生产状态。

## 独立审查返修后的当前结果

原候选 `d7ee51c` 的 CHANGES REQUIRED 报告及其旧产物/371项证据保持不变；本轮结果另存 [history-fix 产物身份](evidence/history-fix/build-identity.json)，新正式 head 由最终 PR/review 收据绑定。

| 检查 | 实际命令/范围 | 结果 |
| --- | --- | --- |
| 完整门禁 | `npm run verify` | PASS：根623/631（8平台跳过）、Agent169/171（2平台跳过）、浏览器377/377，0fail/0flaky/0skip；lint/version/typecheck/UI/format/build、治理90/0及功能34/0均通过；[日志](evidence/history-fix/verify.log)、[浏览器结果](evidence/history-fix/browser-results.json) |
| 画布返修 | history/pointer/connection-drag/canvas-actions；workers=2、retries=0 | 24/24 PASS；新增6项修复前全部失败，含90帧单次拖动、之前历史、相连删除三轮恢复/重做、取消保留redo |
| 启动新鲜度 | `node --test tests/unit/desktopRelease.test.ts` | 12/12 PASS；新增7项修复前失败；当前实际exe检查reason=current；过期重建采用含Agent的命令 |
| Desktop 重建 | `npm run client:build:agent -- --no-bundle` | PASS；重新生成Agent runtime、Web dist和嵌入前端的exe；5个Rust dead_code warning保留 |
| 真实 Desktop | project-landing/image-compare/plugin-csp/platform-version | 全部PASS；3视口/3启动、原生取消与确认/连续保存/隔离记忆、90帧撤销/取消redo/相连删除恢复、图片比较、随包插件与版本；[原生报告](evidence/history-fix/desktop/runtime.json) |
| 不变的Rust源码 | 前一候选 cargo fmt / 97项Rust / client:check | 原通过证据保留；此次只改前端历史、启动脚本和测试/文档；最终托管verify仍重新执行Rust/类型/客户端构建 |

当前exe SHA-256 **`fda10f06689d0d993fa6b3d856d808b88ee8947185abbe8d88f9bb8677fc19a7`**；Web/嵌入均为 `index-DBl3l-J0.js`（`a2f2ffda4fdfbd63b3c775ac4933051c1a07b34e68e15a4a7a1b51ace24af57c`），CSS `index-Dajq2fwF.css`（`315e74abc31a372ae27ca3733606d8f68cca91fa856847486430b2b1ebb5e557`）。Agent manifest仍为`42e20b6a8a22574b8a5f99192198d5c5575332e528b0dce8776d974c3e0ff818`，4277个生产文件逐一校验hash/size。合并后再次刷新主线产物及分享包，最终身份写入收据。

当前代表截图：[Desktop390](evidence/history-fix/desktop/home-390.png)、[Desktop1920](evidence/history-fix/desktop/home-1920.png)、[图层](evidence/history-fix/desktop/canvas-layers.png)；Web同状态位于本目录evidence/history-fix/web。再次查看移动与桌面截图，当前CSS与前候选一致，未发现遮挡/重叠；最终用户视觉偏好仍未代填。

保留RED/初修/完整GREEN日志，真实Desktop初次扩展测试使用的固定右键坐标碰到已平移的节点，因此测试改为在实际DOM寻找空白命中点；未放宽菜单/数据断言。delivery初检19项结构违规已经补录文件和绑定导入包，提交后必须真实重跑；正式独立复审、精确head托管verify/delivery及main推广仍是合并门禁。

## 第一候选验证（d7ee51c，保留历史）

| 检查 | 实际命令 | 结果 |
| --- | --- | --- |
| Web 全门禁 | `npm run verify` | PASS：根616/624（8平台跳过）、Agent169/171（2平台跳过）、浏览器371/371（0fail/0flaky/0skip）；治理90/0、功能34/0、类型/lint/UI/format/production build全部通过。完整日志见 evidence/verify.log 与 browser-results.json |
| 新增原生缺陷回归 | 构建后运行 desktop-data-stability/sidebar-real-projects/memory-settings/mcp-settings，`--retries=0` | 32/32 PASS；先复现第二次原生保存失败，再复现旧确认 API，最后 GREEN |
| Rust | `cargo fmt --check`；`cargo test --no-default-features --locked` | fmt PASS；97/97 PASS，含关闭/隔离/损坏迁移/备份/锁边界 |
| Desktop 类型/编译 | `npm run client:check` | PASS；当前日志见 evidence/client-check.log |
| Agent 生产打包 | `npm run client:build:agent -- --no-bundle` | PASS；当前 Agent dist + Node 24.19 + 生产依赖 manifest |
| 当前 Desktop 构建 | `npm run tauri build -- --no-bundle --config src-tauri/tauri.agent.conf.json` | PASS；5 个 Rust dead_code warning，未屏蔽；没有生成安装器/签名包 |
| 当前 Desktop 运行 | `node tests/desktop/project-landing.mjs` | PASS：3 个视口、3 次启动、真实原生确认的取消/同意、连续保存/项目恢复/删除、记忆私有读写/重启/取消删除、共享文件不变、画布历史/吸附/图层 |
| Desktop 原有能力 | `node tests/desktop/{image-compare,plugin-csp,platform-version}.mjs` | 全部 PASS；同一 executable；比较键盘/关闭、随包插件 SVG 增加/停用/恢复、2.1.2 显示 |

Windows 根测试与 Agent 的 POSIX 专属跳过分别为 8 和 2；沿用平台边界，没有新增 skip 或关闭有效检查。浏览器最终要求 failed=0、flaky=0、skipped=0。

## 实际加载链

| 平台 | 命令 / URL | 加载模式 / 入口 |
| --- | --- | --- |
| Web | Playwright webServer：`node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 1423 --strictPort`；`http://127.0.0.1:1423/` | `data-runtime-mode=production`，`data-runtime-entry=src/main.tsx`，当前 dist；`reuseExistingServer=false` |
| Desktop | 当前 `src-tauri/target/release/kk-studio.exe --data-dir <新隔离根>`，独立 WebView profile/CDP 9345；`http://tauri.localhost/` | Tauri release + embedded frontendDist，当前 JavaScript/CSS，同一 exe SHA |

1421 已由其它进程占用，没有终止该进程或把 development 自动切到其它端口。1423 是仓库既有 production-preview 回归端口，不复用旧服务器。

源码链：`index.html → src/main.tsx → App.tsx`；首页 `StartPage → StartComposer/StartModelPicker`，会话 `ConversationPanel → ConversationComposer/ConversationMessages`，工作区 `Canvas → CanvasOverlays/useCanvasHistory/useCanvasPreferences/CanvasLayersPanel`，设置 `SettingsPanel → MemorySettingsSection/McpSettings/ConnectionSettings`，侧栏 `Sidebar → SidebarProjectGroups → SidebarProjectSections → SidebarProjectEntry`。

样式链：main.tsx 的 tokens/global/ui-tokens → App.tsx 统一导入的页面 CSS → 模块最终规则；当前加载身份、DOM/几何和运行报告分别记录于本轮 evidence。不能将组件代码 diff 代替浏览器生效证据。

## 第一候选产物身份（d7ee51c，保留历史）

- Desktop executable SHA-256：`a233cbd9ac568bcab27b42e4d282e7e83681de0eea575f2fb7c367cadfb58072`。
- 当前嵌入与 preview：`assets/index-y2ZQ96lR.js`、`assets/index-Dajq2fwF.css`；完整字节 hash 见 evidence/build-identity.json。
- 默认发行与回滚依据是受审集成树和最终 main；本轮 portable 程序和 Web dist 将在 `releases/` 生成 manifest/最新指针，不携带用户数据、项目、记忆或开发依赖缓存。

## UI 回退检查

- 读取当前四页 `505:13071/13430/13731/14180` 的已落盘规范，使用 `tokens.css` 的 24/32/40 控件与16/20/24图标。旧 Design System v1.3/v2 归档，不覆盖新基线。
- 首页空态：390px 为299×170，1099/1920为652×170，六个24px动作；实际 overflow=0。侧栏70（平板72）/291固定切换，焦点/键盘、phone菜单入口均有检查。
- 对话空态、834px关闭/重开、1440px、390×480短高、四张附件与模型多版本、画布展开文本区均检查真实 hitbox。修复展开时 textarea 与底部控件重叠，并为可选附件/模型区域保留8px间距，空态170px未被改变。
- 未配置直接生成时阻断提交，保留草稿并提供模型设置入口；断线 Codex 保留连接错误与草稿。批量数量/数据模式在模型菜单可达，没有丢失既有功能。
- 同状态对照：保留历史 homepage/frame 证据，并检查本轮 home-390/home-1920；历史数据示例与当前空库的内容差别不计作视觉回退。人工技术检查未发现当前视口遮挡或重叠；用户最终美观偏好仍未记录。

代表截图：[Desktop 390](evidence/desktop/home-390.png)、[Desktop 1920](evidence/desktop/home-1920.png)、[真实项目与图层](evidence/desktop/canvas-layers.png)、[隔离记忆设置](evidence/desktop/memory-isolated.png)。Web 同状态截图在 evidence/web。

## 失败与修复记录

1. 第一轮370项：194PASS/176FAIL；第二轮247PASS/123FAIL；第三轮349PASS/21FAIL。记录保存在本机工程外，不将历史失败改写成成功。
2. 旧测试使用默认演示节点、旧“插件/Skill”分类、44px composer、12px card/过时菜单文案。按空项目契约、当前四页和实际语义入口更新 fixture/断言；增加持久 revision、关闭/重开、disabled CTA、实际模型 ID 与已提交/unknown 删除保护检查，没有删掉真实状态断言。
3. 本机伴随服务并行测试争用默认4319；各真实测试服务设置端口0，由 OS 分配，实际 HTTP/认证/备份/断线断言保留。
4. 370/370 的 Web 通过后，真实桌面发现连续保存未更新 expectedRevision，以及 Rust 插件的 async legacy window.confirm 被当作同步 boolean。新增先失败浏览器 CAS/取消/确认测试，保存成功才更新 native expectedRevision；所有项目/记忆/MCP确认使用等待现代 API，确认后重核项目与任务边界。
5. Native 审核自身初期使用错的 snapshot字段/无障碍名称，且 UI Automation 未暴露原生 MessageBox 按钮；保留失败记录，修正为 items/准确标签，并用仅匹配本测试进程与子进程的 Win32 Button 操作。实际取消不改变项目/记忆、同意后持久化及再次重启的断言全部保留。
6. Agent 安装器使用经过审阅的 vendored HTTP literal anchor，Prettier 改布局会破坏生产接线。以完整 TypeScript AST相等验证还原该文件的原格式，仅保留 HTTP 取消改动；安装器与生产打包重新通过，没有放宽安装器校验。

## 平台与剩余门禁

Web PASS，当前 Windows Tauri release 受影响路径 PASS；Mobile 原生 NOT RUN，外部 Provider/GPU、Installer/签名、VPS、真实跨应用记忆 NOT VERIFIED。完整剩余优先级见 remaining。正式最终 review/Hosted verify+delivery/主线合并是交付门禁，以托管 PR 的精确 SHA 记录为准。
