# Figma 差异审计工具（`scripts/figma-audit/`）

把 Figma 设计稿与本地实现做**分层、可复核**的差异审计。

## 一致性分层

| 层      | 含义                       | 可达标准              | 比对方式              |
| ------- | -------------------------- | --------------------- | --------------------- |
| L1 结构 | 图层树、组件变体、命名映射 | 确定性 100%           | 组件清单对照          |
| L2 令牌 | 颜色、字阶、间距、圆角     | 确定性 100%           | DESIGN.md ↔ CSS 变量  |
| L3 几何 | 坐标、尺寸、盒模型         | 确定性 100%（≤0.5px） | Figma 节点 ↔ DOM 矩形 |
| L4 像素 | 位图逐点相等               | **不可达成**          | 差异占比 + 容差门禁   |

**L4 严格相等不存在。** Figma 渲染器与浏览器栅格化器在字体 hinting、抗锯齿、
阴影模糊上本质不同。历史实测（2026-09-11 帧级取证）：同一界面展开态像素差异
**22.4%**，收纳态 **16.8%**，差异形态为点阵背景相位差与字形抗锯齿，结构性元素
轮廓对齐。因此 L4 采用**有界差异**判定，而非字节相等。

## 命令

```bash
# 1. 拉取 Figma 快照（需 FIGMA_TOKEN 环境变量，令牌不落盘）
npm run figma:audit:pull -- --source kk-studio-current

# 2. 列出已有快照
npm run figma:audit:list

# 3. 生成差异报告（含 L1/L2/L3；L4 需传 --actual 渲染图目录）
npm run figma:audit:diff -- --snapshot <快照路径> --actual <渲染图目录>

# 4. 像素门禁（浏览器渲染 vs Figma 原稿）
npm run test:pixel
```

## 文件职责

| 文件                 | 职责                                                               |
| -------------------- | ------------------------------------------------------------------ |
| `sources.mjs`        | Figma 来源登记（file key、页面 node ID、章节 node ID）与节点扁平化 |
| `pull.mjs`           | REST 拉取器：页面树、变量、样式；限流重试；令牌只从环境变量读取    |
| `diff.mjs`           | 四层比对逻辑（令牌、别名体系、几何、组件）                         |
| `pixel.mjs`          | 像素比对：复用 Playwright 内置 pngjs，不引入新依赖                 |
| `cli.mjs`            | 命令入口与 Markdown 报告渲染                                       |
| `rects-from-dom.mjs` | 把既有 DOM 证据转成 L3 几何基线                                    |

## 数据流

```
Figma 文件  ──pull──▶  快照 JSON          ──┐
                                            ├──diff──▶ 差异审计报告
DESIGN.md  ─────────┐                      │
tokens.css ─────────┼── 令牌比对 ─────────┤
global.css ─────────┘                      │
                                            │
DOM 证据    ──rects-from-dom──▶ 矩形基线 ───┘

Figma 原稿 PNG ──┐
本地渲染 PNG ────┴── pixel.mjs ──▶ 差异占比 + 差异图
```

## 权威来源

- Figma 文件：`ZiadpErDoFweCjG3uHjkM3`（见 `docs/UI_INDEX.md`）
- 令牌契约：`DESIGN.md` ↔ `src/styles/tokens.css`
- 别名体系：`src/styles/global.css`（转发到 `--kk-*`，不应出现字面量分歧）
- 像素基线：`design/preview/baselines/`（现行门禁基线）
- 像素标定：`docs/reference/figma-pixel-calibration/`（历史容差标定，非门禁基线）

## 约束

1. **令牌不落盘。** `FIGMA_TOKEN` 只从环境变量读取，快照输出不含任何凭据。
2. **快照可版本化。** JSON 产物进 `docs/reference/figma-snapshots/`，差异可追溯。
3. **旧文件数据不冒充现行基准。** `0nU0A7pq6eyjwfwm1TtWkO` 时代的历史快照只能用于
   标定容差，不能作为当前设计的判定依据。
4. **未登记基线 = 跳过，不是通过。** 像素门禁跳过未登记状态，避免"没有基线 =
   全部合格"的假象。
5. **像素参考图必须来自 Figma 导出。** 用本地渲染结果冒充参考图会让门禁自我循环。
