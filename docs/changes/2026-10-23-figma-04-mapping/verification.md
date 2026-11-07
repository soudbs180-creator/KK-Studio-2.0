# Verification：2026-10-23 Figma 规则与 04 首批检查

## 已核验

- 当前五页：01 `91:2`、02 `91:4`、03 `91:3`、04 `2:47`、05 `91:11`。旧本地六页入口已在 UI_INDEX 更正。
- 01 新规则节点 `1510:41557`，1440×690；使用现有语义颜色绑定并包含三张共用/桌面/手机示例卡，最终截图已检查。
- 04 抽查场景：`9:818`、`9:3`、`21:3`、`14:471`、`47:5172`、`406:25038`、`406:49159`；共 445 个 INSTANCE 均可找到 mainComponent。仅证明引用有效，不证明视觉、尺寸或交互全部正确。
- 81 份底部胶囊工具栏的 162 个端点：添加资源 `489:2405 → 1164:16197`，帮助 `47:5465 → 1164:16172`。逐个回读通过，实例 ID、图标母版、图标尺寸/坐标与按钮尺寸/坐标无变化；悬浮/按下目标均为圆形变体。代表深色工具栏 `655:209004` 和浅色整页 `21:2434` 已截图。
- 原始修改前/写入回执/回读核验分别保存在工作区容器 `output/figma-04-20261023/endpoints-before.json`、`endpoints-write.json`、`endpoints-verified.json`。
- 额外抽查深浅主题四个端点的实际底板圆角均为1000，不只是名称变化。对应四个悬浮/按下母版各只有一个可见填充底板，无描边；按下底板内缩4px。截图留存为同目录 `mapping-contract.png`、`toolbar-dark.png`、`workbench-light.png`；恢复索引为 `state.json`。

## 未完成与待核验

- 04 仍有散装旧工具栏：页面框架 244/294×50 与 03 新组合 236×36 并存，不能直接宣称已统一；需连同菜单打开、选择、帮助状态迁移组合后再验收。
- 04 高度覆盖计数：32→24 为622；48→44 为327；32→20 为164；40→32 为180；其余 40→64 为4、32→28 为16、40→28 为6、40→88/32→36/32→40/48→64 各1、32→26/40→24 各2。含嵌套实例，属于待核查覆盖，不全都已确认错误。
- 代表颜色覆盖：`655:141087`/`655:141088` 使用默认描边母版 `489:2639`，但实例增加 `surface-container-high` 填充并把文字改为 on-surface；浅色 `655:144807` 可见底色/文字不一致。尚未按业务状态修复，不能批量重置全部覆盖。
- 本地失效 Figma 锚点在当前文件中找不到：对话 `407:29265/29267/29315/29310`；画布导航 `100:16335/16337/16334`；画布右键 `172:367/368/370/373/376/380/382/384`；任务浮层 `396:938`、`398:25710/25592/25690/25593`。保留为历史引用，逐项按业务语义重配；运行时画布 item.id 不受影响。
- 05 未逐页优化；本地组件/CSS 未同步；未运行本地 UI、原型点击全流程或全量产品门禁。Figma 状态目标回读不等于实际用户点击链验收。
- Figma 连接中途暂时消失，插件查询曾返回 DISABLED_BY_ADMIN；随后工具恢复且已成功回读和写入。当前不是持续连接阻塞。

## 本地规则检查

- `git diff --check`（本轮文件）退出0。
- `node scripts/check-markdown.mjs`：131 active files，0 violations；只检查文件目标，不验证外部链接或历史快照。
- `node scripts/check-doc-index.mjs`：26 ADR files，0 violations。
- `node scripts/check-governance.mjs --write`：162 tasks，0 violations；生成任务账本视图，保留整体 PARTIAL。
- `node D:/kk-studio/output/scripts/check-figma-04-mapping-20261023.mjs D:/kk-studio/KK-Studio-2.0 D:/kk-studio/output/figma-04-20261023`：2 个稳定语义记录、162 个回读实例对应一致，编号/实例无重复，当前源码中存在指定 class 与 aria-label，全部保持设计待修。
- 产品源码未改；本地运行/全量产品测试未执行，不能作为已同步或运行通过证据。

## 2026-10-24 手机页面同步与双视口验收（追加记录）

本节追加记录本次本地同步，不改写上面的 2026-10-23 历史结论。当前 Figma 文件仍为
[`ZiadpErDoFweCjG3uHjkM3`](https://www.figma.com/design/ZiadpErDoFweCjG3uHjkM3/)，实时回读的目标节点为：
手机首页 `69:1279`、手机项目库 `69:1414`、手机顶栏 `655:288877` / `655:288891`、首页输入实例 `719:11857`、项目库操作区 `655:288913` 及两张卡片 `655:300042` / `655:300050`。Figma 已经是 390×56 顶栏、340×132 首页输入、171×78 两列操作卡（间距 16）的目标状态，因此本次 Figma 写入为“无需修改”，随后才同步本地。

本地最小同步为：移动主题变量保留 56px 顶栏；手机首页 composer 固定到 132px 并隐藏不属于当前 Figma 132px 实例的用量状态条；手机项目库操作区改为两列 171px 卡片、16px 间距；品牌区行距和底部间距调整到 Figma 的 132px 组合高度。修改文件为 `src/styles/responsive.css`、`src/styles/responsive-content.css`、`src/styles/composer.css`、`src/styles/catalog-pages.css`，未改组件数据或交互逻辑。

运行链路和证据：开发页 `http://127.0.0.1:1421/`（Vite development，`src/main.tsx` → `src/App.tsx`，当前 route `/`）；构建预览 `http://127.0.0.1:1423/`（Vite preview，`data-runtime-mode=production`、`data-runtime-entry=src/main.tsx`，加载 `dist/assets/index-BmAYQ3b_.js` / `index-BMXy4dCF.css`）。390×844 实测顶栏 56px、首页输入 340.6667×132px（x=24.6667、y=216.6667），项目库两卡 x=16/203、171×78；1440×1000 实测顶栏 40px、首页输入 652×170px，项目库两卡 616×78。原始 DOM/computed 记录保存在 [`output/mobile-ui-20261024/receipt.json`](../../../output/mobile-ui-20261024/receipt.json)。

本次 `npm run typecheck`、`npm run build`、`npm run lint`、`npm run ui:check` 和 `git diff --check` 通过；`npm test` 并行首轮出现一次 `desktopAgentRuntime.test.ts` readiness 超时，未改动源码的串行重跑为 2260 passed、20 skipped、0 failed，故保留首轮失败并以重跑结果作为当前门禁结果。lint 的既有版本漂移、code-health/footguns advisory 和 ui:check 的 25 个 orphan-token warning 未由本次改动引入或清除。
