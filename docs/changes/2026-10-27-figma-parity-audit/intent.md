# Figma 复刻一致性审计基建（2026-10-27）

## 意图

用户提问："能百分百复刻 Figma 里的设计吗？已经设计好了，要优化到本地，我有 MCP 但不知道能不能完整百分百一致性。"

本记录登记对该问题的技术判断与落地的审计基建，**不含产品 UI 改动**。

## 关键事实核查

| 事项 | 核查结果 |
| --- | --- |
| WorkBuddy 是否已挂 Figma MCP | **否**。`~/.workbuddy/mcp.json` 原为 `{"mcpServers": {}}`，当前仅挂 GitHub |
| Figma 官方 MCP 端点可达性 | **可达**。`https://mcp.figma.com/mcp` 返回 401（0.57s），即"需授权"而非"不可达"；`api.figma.com/v1/me` 同样 401 |
| 历史 Starter 额度限制是否仍成立 | **不成立**。`design/figma-plugin/README.md` 记录的额度耗尽发生在 2026-09-06；官方现已改为远程 server 形态，Starter 可用 |
| 现有设计基建成熟度 | **高于预期**。`DESIGN.md` ↔ `tokens.css` 双向管道已闭环（383 变量）；`docs/UI_INDEX.md` 已登记 13 个规范章节 node ID；`docs/evidence/frame-accuracy-2026-09-11/` 已有帧级误差实测脚本 |
| 像素级门禁是否存在 | **不存在**。改动前全仓无 `toHaveScreenshot` / `pixelmatch`，比对结果无法进 CI 拦截 |
| 历史快照能否作现行基准 | **不能**。57 份历史快照全部指向旧文件 `0nU0A7pq6eyjwfwm1TtWkO`；现行权威文件为 `ZiadpErDoFweCjG3uHjkM3` |

## 技术判断：一致性分层

"100% 复刻"必须分层定义，否则不可验收：

| 层 | 含义 | 可达标准 | 本次落地 |
| --- | --- | --- | --- |
| L1 结构 | 图层树、组件变体、命名映射 | 确定性 100% | ✅ 组件清单对照 |
| L2 令牌 | 颜色、字阶、间距、圆角 | 确定性 100% | ✅ `DESIGN.md` ↔ CSS 变量，含别名体系分歧检测 |
| L3 几何 | 坐标、尺寸、盒模型 | 确定性 100%（≤0.5px） | ✅ Figma 节点 ↔ DOM 矩形 |
| L4 像素 | 位图逐点相等 | **不可达成** | ⚠️ 有界差异 + 容差门禁 |

### L4 不可达成的实证

用项目既有帧级取证数据实测（1920×1080，通道容差 8）：

| 状态 | 差异像素 | 差异占比 |
| --- | --- | --- |
| 展开态 | 464,616 / 2,073,600 | **22.406%** |
| 收纳态 | 349,277 / 2,073,600 | **16.844%** |

差异图显示差异呈**细密网点状**遍布画面（点阵画布背景相位差），侧栏、画布容器、
卡片、对话框等结构性元素轮廓清晰对齐。**差异来自渲染细节，不是布局错位。**

> Figma 导出为 1920×1081（多 1px 边框），本地为 1920×1080，比对前按 `allowCrop`
> 裁剪到共同区域。

结论：严格逐点像素相等的物理前提不存在。可验收定义是 **L1–L3 确定性 100% + L4
容差门禁**。

## 交付物

| 文件 | 作用 |
| --- | --- |
| `scripts/figma-audit/sources.mjs` | Figma 来源登记（file key、页面/章节 node ID）与节点扁平化 |
| `scripts/figma-audit/pull.mjs` | REST 快照拉取器：页面树、变量、样式；限流重试；令牌只从环境变量读 |
| `scripts/figma-audit/diff.mjs` | L1–L3 比对逻辑（令牌、别名体系、几何、组件） |
| `scripts/figma-audit/pixel.mjs` | L4 像素比对，复用 Playwright 内置 pngjs，**零新依赖** |
| `scripts/figma-audit/cli.mjs` | 命令入口与 Markdown 报告渲染 |
| `scripts/figma-audit/rects-from-dom.mjs` | 把既有 DOM 证据转成 L3 几何基线 |
| `tests/design-md/pixel-parity.spec.ts` | L4 浏览器像素门禁 |
| `design/preview/playwright.pixel.config.ts` | 像素门禁独立配置与证据目录 |
| `design/preview/baselines/` | 现行像素基线登记目录 |
| `docs/reference/figma-pixel-calibration/` | 历史容差标定数据（非门禁基线） |
| `tests/unit/figmaAudit.test.ts` | 19 项单元测试 |

## 验证记录

| 检查 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过，零报错 |
| `npm run lint`（新文件） | 通过，零 error 零 warning |
| `npm run health:check` | **0 blocking**（2 项预存允许项） |
| `npm test` | 2338 项，2298 通过，**20 fail 与改动前基线完全一致**（已用 `git stash` 对比确认零新增失败），新增 19 项全过 |
| `npm run markdown:check` / `index:check` / `governance:check` / `features:check` | 全部 0 violations |

### 检出能力双向验证

审计器不是"跑通即算数"，全部注入已知漂移并反向验证：

| 注入 | 检出结果 | 撤销后 |
| --- | --- | --- |
| `--kk-accent` 由 `#21a673` 改为 `#635bff` | 1 项 L2 error，delta 140 | 恢复 0 findings |
| `.canvas-toolbar` 高度 +3px | 1 项 L3 error，delta 3 | 恢复 0 findings |
| `--bg-accent` 字面量与契约分歧 | 1 项 L2 error | 转发态恢复 0 findings |

### 像素比对器行为验证

| 场景 | 期望 | 实测 |
| --- | --- | --- |
| 完全相同 | 0 | 0 |
| 通道差 5（容差 8 内） | 0 | 0 |
| 通道差 155（超容差） | 单像素 | 1/16 = 0.0625 |
| 尺寸不一致 | 拒绝比较 | `comparable: false` |
| 1px 边框差异 + `allowCrop` | 对齐后比较 | `aligned: true`，差异 0 |

## 自查中修正的自身问题

1. **异步 CLI 返回 Promise**：`runPull` 是 async 但 CLI 直接返回，导致 `exit code` 收到 Promise 对象 → 改为 `await`。
2. **CSS 作用域误用**：`parseCssScopes` 返回数组而非 `{base,light}`，实际入口是 `cssContexts`。
3. **别名比对逻辑失真**：初版直接剥离 `var(--x)`，误把"转发到契约变量"当成字面量分歧 → 改为区分 forwarded / literal。
4. **历史基线误用为门禁基线**：历史 Figma 导出是**应用界面**，而像素门禁渲染的是**设计预览页**，两者不是同一画面；接入 `verify` 会必然失败 → 移至 `docs/reference/figma-pixel-calibration/` 作容差标定，门禁基线目录保持为空并按"跳过而非通过"处理。
5. **合成 node ID 污染**：自测时生成的 `figma-rects.json` 含虚构 node ID（`90:1`），会污染真实审计 → 删除，改为由 `rects-from-dom.mjs` 从真实快照派生。
6. **代码健康棘轮**：CC 超标 2 处（`renderReport` 31、`flattenNode` 22）与空 catch 1 处 → 拆分函数、显式判断跳过原因。
7. **误删文件末尾换行**：`design/preview/playwright.config.ts` 被无意义改动 → `git checkout` 还原。

## 已知限制

1. **Figma MCP 未激活**：配置已写入 `~/.workbuddy/mcp.json`，但需用户在连接器管理页点「信任」并完成 OAuth。当前 REST 通道同样可作为替代（需 `FIGMA_TOKEN`）。
2. **像素基线为空**：现行 `design/preview/baselines/` 尚无登记状态，门禁按"跳过"处理。需先从现行文件 `ZiadpErDoFweCjG3uHjkM3` 导出参考图。
3. **L3 几何基线待生成**：`docs/reference/figma-rects.json` 需在真实快照到位后由 `rects-from-dom.mjs` 派生。
4. **L1 结构层覆盖有限**：当前仅比对组件名与变体键，未做完整图层树映射。

## 下一步

1. 用户在连接器管理页点「信任」并完成 Figma OAuth → 验证 `get_design_context` / `get_variable_defs` / `get_screenshot` / `get_metadata` 四个工具可用。
2. 以现行 file key `ZiadpErDoFweCjG3uHjkM3` 执行首次快照拉取，产出真实快照。
3. 由真实快照派生 `figma-rects.json`，跑通 L3 几何层首次真实审计。
4. 从现行文件导出参考图，登记进 `design/preview/baselines/`，启用 L4 门禁。
5. 按用户选择的范围产出**首份真实差异审计报告**。
