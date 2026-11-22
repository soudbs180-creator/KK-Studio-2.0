# V1 挡项队列与搁置结果

- Task ID：TASK-WHOLE-V1-20261121
- 日期：2026-11-21
- 更新：2026-11-21（P0-7 UI 终验：去赘字/压密度/行距 + 矮屏抽查）

## 本轮已完成（治理）

- 61 条非 V1 活跃开放任务：`nextAction` 前缀「V1整包收口期搁置…」；原 P0/P1 旁路降为 P3（原优先级写在 rationale）。
- **未**批量改为 DONE/OBSOLETE（避免伪造完成）。

## P0 产品挡项

| ID | 挡项 | 状态 |
| --- | --- | --- |
| P0-1 | 日常 Desktop 启动与版本身份可记录 | **DONE（已晋升最新，2026-11-22）**：唯一入口 `C:\Users\Administrator\AppData\Local\Programs\KK Design\kk-studio.exe`（桌面「KK Design」）；ProductName **KK Design** · FileVersion **2.1.88**；SHA256 `49B68581F5ABB835EE7CDC60C82285AE5CD552DE83F691AB474E559138B40A30`；mtime 2026-11-22T21:44:12+08。烟测窗口标题「KK Design」。旧 2.1.81 已备份 quarantine；过渡仓已移出活动路径。 |
| P0-2 | 连接/Key 健康与失败原因 | **代码就绪 / 待用户走查**：`CanvasImageCommand` 禁用原因 + 设置连接测试 + `ProviderConnectionStatus` |
| P0-3 | 真实文本 + 重开 | **fixture PASS / 真实待用户**：`text-generation` + `unified-image-command` 23/23；本机无可用 Key/Agent 时不能代填计费链 |
| P0-4 | 真实图片 + 原件回写 + 重开 | **fixture PASS / 真实待用户**：同上；候选 EXE 已备 |
| P0-5 | 取消或失败态可见 | **演示路径已验**：demo-results 失败可重试 PASS；真实 Provider 取消待走查 |
| P0-6 | 演示/Prototype 不冒充 | **DONE（本轮）**：见下方改动；`demo-results` + `generation-flow` + `ui-motion` 共 15 PASS（需先 `npm run build`，preview 吃 dist） |
| P0-7 | 主路径 UI 死按钮/错态 | **浏览器设计抽查 PASS（非 Desktop 终验）**：赘字/密度/行距已收；矮屏 1280×600 关闭与主操作可见；无控件重叠挡点；`capability-model-access` 9/9。Desktop walkthrough 仍为整包完成门禁 |

## P0-6 本轮改动

- `GenerationAction.tsx`：演示按钮 `aria-label` 为「演示…」；隐藏积分图标
- `GenerationStatus`：演示 idle 常显诚实说明
- `CreationModelPicker` / `CreationComposer`：视频模型选择禁用并说明无效
- `useCanvasNodeLayerHandlers`：待定卡/失败标题带「演示」
- `TaskPanel`：占位完成卡「演示 · 已完成」
- `useLocalGeneration`：取消文案「可再次演示」
- 浏览器测试：`生成视频/音频` → `演示视频/音频`

## P0-7 浏览器走查（2026-11-21，Vite preview `http://127.0.0.1:1423/`）

已观察（非 Desktop 终验）：

- 创建项目「V1整盘走查：生成一只坐在窗台的橘猫」→ 画布「图片创作」节点 + 对话侧栏可见；标题显示已保存
- Codex 未连接时失败原因可见；连接设置 / 模型接入入口可用
- 设置·通用：桌面专属开关禁用且有说明；网页版版本显示诚实
- 设置·模型接入：Codex 连接失败态、浏览器请连本地 Agent、网页密钥仅会话、OAuth「尚未接入」等诚实文案
- 个人信息：「未登录 · 账号服务尚未接入」；退出登录禁用
- 缺陷修复：`agentConnection` 将浏览器 `Failed to fetch` 映射为中文；重建 dist 后点「连接 Codex」alert 为「无法连接 Agent 服务（网络或本机服务未就绪），请检查连接设置后重试。」
- Web 重开：刷新后项目库仍见走查项目并可打开（IndexedDB；不等于 Desktop 重开）

### P0-7 UI 终验收口（同日续）

- 去掉设置语言/主题等复读说明；通用行距 `space-6`→`space-5`（实测行间 24px）
- 去掉对话底栏「请确保不侵权…」；参考图限额改 title；高级会话禁用原因只留在按钮 title，不常驻小字
- 压缩模型接入长说明（OAuth/本机检测/工作流/密钥/权限等），诚实语义保留；`capability-model-access` 9/9 PASS
- 矮屏抽查 1280×600：设置关闭按钮与「连接 Agent」在视口内

未代填：真实文本/图片成功、Desktop EXE 用户走查与重开；390 触控宽度未本轮系统测。

## V1 仍保持活跃的账本 ID（不搁置）

TASK-WHOLE-V1-20261121、T5、T7、TASK-PROV-005、TASK-PROV-006、BACKEND-TEXT-NODE、BACKEND-CONVERSATION、EXT-PROVIDER、UI-003、UI-004、TASK-PROV-BYOK-001、TASK-AGENT-001、TASK-LAUNCH-001。

## 明确不在本轮产品修复范围

Mobile、发布资产名、Comfy 真机全链、账号/积分/云、Astra、视频真链、PERF 大图、统一大包横扩。
