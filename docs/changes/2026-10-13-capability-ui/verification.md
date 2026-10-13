# Verification：三客户端分类与交互验收

- Task ID：`TASK-UI-CLASSIFY-20261013`
- 交付包角色：`current`
- 日期：2026-10-13

状态：FINAL / PARTIAL。本轮分类与交互在三客户端实际通过；全量浏览器仍有三个已记录的既有失败，不能宣称整产品全绿。

## 来源和保全

- 最终目标：`D:/kk-studio/KK-Studio-2.0`，primary `codex/ui-redesign-20261011`，HEAD/base `51fccfc7879cf90f7caaf3ae8e10af4d97a2aa2c`；本轮为未提交 working tree。
- 隔离实施目录：`.worktrees/capability-ui-closeout`。按文件哈希/基线 blob 前置条件同步到 canonical，未覆盖无关 dirty；canonical 是最终验收来源。
- 四份预存改动逐 SHA-256 保留：`WindowControls.tsx`、`composer.css`、`composer-voice.spec.ts`、`interaction-state.spec.ts`。暂存区前后均空。
- [持久证据](runtime-evidence.json)包含 49 份变动运行输入、43 份变动测试的文件哈希、四份保全哈希、加载资源、三端回执和完整统计。原始日志/截图保留于 `.tmp/capability/` 和 `.tmp/capability-desktop/`。

## 检查结果

| 检查                                                    | 结果                                                                                                            | 证据                                                                                                                    |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`、`typecheck`、`ui:check`、`format:check` | PASS；UI 223 文件，0 违规                                                                                       | `.tmp/capability/model-only-static.log`                                                                                 |
| `npm test`                                              | PASS：1035 total，1021 pass，14 skip，0 fail                                                                    | `.tmp/capability/identity-verification-final.log`                                                                       |
| `npm run test:agent`                                    | PASS：174 total，172 pass，2 skip，0 fail                                                                       | 同上                                                                                                                    |
| 当前 production build                                   | PASS                                                                                                            | `.tmp/capability/desktop-model-only-build.log`                                                                          |
| 全量 production 浏览器，0 retry / 8 workers             | PARTIAL：495 total，492 pass，3 fail，0 flaky                                                                   | `.tmp/capability/browser-model-only-final.json`、`browser-model-only-final.log`                                         |
| 本轮四个 capability spec                                | PASS：20 项，覆盖草稿隔离/超限、多账号明确身份、Google 配置保留与角色路由、异步取消/保存、焦点/滚动、分类与窄屏 | 完整浏览器回执                                                                                                          |
| 模型弹层及生成回归，0 retry / 6 workers                 | PASS：40/40，含菜单不出现数量/隐私项、节点数量控制、旧草稿批次请求和归档                                        | `.tmp/capability/model-only-targeted.json`、`model-only-targeted.log`                                                   |
| `npm run test:development`                              | PASS：四插件发现、渲染编辑、禁用重载恢复、拒绝不安全地址；errors=[]                                             | `.tmp/capability/development-model-only-final.log`、`.tmp/capability/development-plugins-model-only-final/receipt.json` |
| Web development 1421                                    | PASS：7 检查，实际 development/main.tsx、14px mic、320px menu、无批量/数据、三分类、账号身份及 Google 草稿/角色 | `.tmp/capability/development-1791867662091/web-ui.json` + 9 图                                                          |
| Production preview 1423                                 | PASS：7 检查，实际 production/main.tsx，bundle bytes 与当前 dist 一致，同状态功能与 UI                          | `.tmp/capability/preview-1791867668569/web-ui.json` + 9 图                                                              |
| 官方 Desktop release 构建与启动                         | PASS：2.1.14，receipt `reason=current`                                                                          | `.tmp/capability/desktop-model-only-build.log`、`src-tauri/target/release/kk-studio.build-receipt.json`                 |
| Fresh Desktop WebView2 / native IPC                     | PASS：14 检查，errors=[]；只清理本轮隔离客户端，官方新窗口保留                                                  | `.tmp/capability-desktop/1791867793484-701e56b3-4ebe-4ad3-9da9-7c61c5e91c04/desktop-ui.json` + 12 图                    |

Desktop 实际 URL 为 `http://tauri.localhost/`，production 入口为 `src/main.tsx`。已验证原生隔离 data root、连接元数据 durable 保存、角色草稿在原生保存确认后 reload 恢复，以及来源/供应商/模型键盘选择。WebView2 DPR=1.5，菜单按 CSS/DOM 实测 320px，图形 14px，不用截图的物理像素替代 CSS 尺寸。

Desktop EXE SHA-256：`b826ed68c120d651fd2d1427501024df974751748b2e45f01df84f82d0163130`；release input SHA-256：`d0712f45132d1299d93c797928d0f8390899dcdb5908de3ffbe7369d3cd9e6c0`。实际加载 `assets/index-J-mn98-v.js`，SHA-256 `4e85ce08eb0e86536b314c0ba9f8a40fda56f4c79a719ded8d787a709b4e7f2e`，与 preview/dist 一致。

随包 Agent：win32/x64、Node v24.20.0、Agent 0.6.0；manifest 4269 文件，missing=0、mismatch=0。native `available=true`，真实启动后 `running=true/healthy=true`，停止后 `running=false`。未借此声称账号对话、外部 Provider 生成或自动协作已验收。

## 修复后复验与边界

- 按用户补充移除模型弹层的“批量/数据”，同时移除其生成设置区域；仅选择来源、供应商和型号。未改变旧草稿的数量/隐私值，图片/视频节点生成数量仍有效。40 项定向测试及全量 495 项、三端 7/7/14 项均在这次修改后重建复验；最终回执取代此前包的结案依据，旧日志保留。
- 修复实际焦点竞态、两个定位器重置内部滚动、Agent/API/首页草稿串写，以及换模型沿用旧能力声明；对应有效回归保留并通过。
- 最终独立复核发现 CUI-R1/P1 同地址账号重开误用凭据、CUI-R3/P1 Google 角色写入 API 草稿，以及 CUI-R2/P2 Google 配置切换丢未保存内容，全部修复并重建三端。Profile 版本 1 增加可选非敏感 connectionId；旧多账号不明确时先选择账号，保存/测试/清除和能力声明共用身份门禁，保留原 opaque ref。三端实际重新验收账号 B、Google 草稿和来源隔离通过。
- 更新旧入口、场景页签和过宽 API Key locator，不删故障覆盖。Vite 排除 `.worktrees` 监视后，canonical 开发态四插件流程产生正式 PASS receipt。
- 首次完整 verify 在旧入口失败期间停止；随后逐阶段复核。首次无重试全量 483/490，再次为 487/490；最终补五项有效回归后为 492/495。两项一次性的动画/图片副本失败在完整复验中通过，原始失败证据保留。完整 verify 因三个既有 UI 失败仍不能标为 PASS。
- Desktop 前两次探针的 DPI 测量与原生保存确认等待修正仅在临时测试脚本中；最终仍断言真实 CSS 尺寸、原生 snapshot 和 reload，不改产品成功状态。

仍失败的三项与前次 [review-remediation 记录](../2026-10-13-review-remediation/verification.md)相同，对应源与测试本轮未改：

1. `ui-governance-visual.spec.ts:3`：标准按钮圆角实际 999px，规则期望 8px。
2. `ui-motion.spec.ts:47`：视频生成按钮被会话面板遮挡。
3. `ui-motion.spec.ts:83`：任务面板实际 360×420，旧断言为 196×240。

自动按角色分派不同模型和 OAuth 授权未接入，UI 保持明确说明/禁用。未推送、合并、签名、安装或发布；用户最终验收尚未取得。
