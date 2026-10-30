# Verification

- Task ID：TASK-FIGMA-CONTROLS-20261025；状态：PARTIAL。设计与本地修复已实现，合并/原生验收尚未完成。
- cwd：D:/kk-studio/KK-Studio-2.0；HEAD：1fbac26b33bdabaad682ad398f5292360eb9c66a5 + dirty；本次范围见 [spec](spec.md)。
- 开工前 npm test：2310项，2287 pass / 3 fail / 20 skip。失败：Agent owner readiness、indexedChatMigration future-version错误语义、snapshotWriteProtection身份保护错误语义。原始日志：工作区 output/logs/report-reconciliation-20261025-125120/npm-test.log。
- 开工前 typecheck、lint通过；lint仍有1项Rust硬编码版本警告及2项allowed健康条目，健康/footguns处于advisory。
- Figma 亮色按下、亮暗反色标签、主按钮透明度及禁用实例已回读；尺寸目录新增真实32/40px母版实例，图标标注已修正。
- 本地浏览器、构建与最终门禁结果以下方追加记录为准；不能据Figma修复声称全部页面或Desktop已验收。

## Figma 六项修复回执（2026-10-25）

| 项目 | 实际修改与回读 |
| --- | --- |
| 亮色按下态 | `745:77921` 等普通按钮文字改绑 on-surface；亮色实例 `1199:21705` 对比度13.093:1，文字与填色opacity均1。 |
| 反色标签 | `551:9777` 改绑 on-button-primary；暗/亮实例 `1196:20564` / `1199:21811` 分别14.905 / 13.692:1。 |
| 主按钮默认前景 | 32/40/48/44默认变体的文字及fill不透明度恢复100%；暗/亮实例 `1196:20258` / `1199:21692` 分别14.905 / 13.692:1。同步 `596:144026` 和母版说明，去除旧80%规则。 |
| 边界与禁用 | 中性默认与禁用按钮/图标底板绑定outline-variant弱边界；禁用前景不再二次透明，暗/亮文字对比度6.496 / 5.178:1。 |
| 尺寸目录 | 亮暗操作按钮与输入目录均新增真实母版32/40实例；新增行 `2041:86287` / `2041:86300` / `2041:86313` / `2041:86326`。亮色新增实例显式Light模式，避免继承暗色源。 |
| 文案与行高 | `597:67225` / `597:67243` 改为16/20px；小地图源标签12/16及12条账户说明14/20修复后，03小字号短行高扫描0命中。 |

Figma session：`f3598ce6-fa23-4651-b11a-c75c697faad8`。最终亮暗目录 `1199:21677` / `1196:20206` 截图已目视核验。没有另建组件源或重编原有ID。报告的旧失败数字与建议色不直接作为现行规范。

## 本地验证

| 检查 | 结果与证据 |
| --- | --- |
| 修复前浏览器RED | 32px按钮实际16px字，新增断言失败；输入遗漏再现16px字，补齐后修复。原件位于test-results/design-md的独立run，不覆盖。 |
| 设计预览 | 9 pass / 0 fail / 0 flaky / 0 skip；run `7cd8a6b4-a72c-403d-a82c-72befc1b2016`。包含亮暗禁用对比度、实际32/40px高度、12/16与16/24字阶、兼容按钮命中与title、390/1099/1920无溢出。 |
| 产品页面与画布导航 | 17 pass / 0 fail / 0 flaky / 0 skip；run `b3be9c74-4cc3-466a-8c24-8d13391b3deb`。命令为Playwright指定design-system-pages与canvas-navigation两文件，`--retries=0`。 |
| 定向单测 | 46 pass / 0 fail；uiGovernanceTokens、designMarkdown、uiIcon。新tokens仅4项值变化经独立源审查后更新approvedHash，保留所有语义/对比度断言。 |
| build / design:build | 均exit0；产品构建仍有既有大chunk warning，未调整阈值。 |
| ui:check / format:check | 均exit0；UI 279文件0违规，design检查0错误/25 orphan-token warnings。 |
| 完整npm run verify | exit1：lint/typecheck通过，全量npm test为2310项，2288 pass / 2 fail / 20 skip。停于下述既有存储失败，后续Agent/全量产品UI/design/development阶段未进入。 |

最终失败为indexedChatMigration的future-version错误语义及snapshotWriteProtection的身份保护错误语义，开工前均已失败。本轮未修改其源码或断言。开工前另有Agent readiness失败，本轮最终通过；原因未确认，不以重跑掩盖原失败。

运行日志：工作区 `output/figma-controls-20261025/` 的 verify-final.log、format-final.log、ui-check.log、build-final.log、design-build-final.log、targeted-unit-final.log。设计和产品JSON/PNG保留在上述独立test-results run，另将副本归档到本轮output证据目录。

## 身份与验收边界

共享Desktop/Web源码版本2.1.43→2.1.44，Mobile2.1.42保持。固定URL `http://127.0.0.1:1423/`，真实Edge，production preview；设计预览入口design/preview/main.tsx，仅消费共享控件，不读写产品存储。产品入口index.html→src/main.tsx→App.tsx→Catalog页面/Canvas；实际生产JS/CSS与相关源码hash记录于output的source-manifest.json，不能只用HEAD代表dirty候选。

本轮未更改图标静态资源或增加依赖。截图已目视核验预览亮色和产品390px扩展页面；原型内容不作为真实供应商证据。Tauri当前release构建/启动、全页面Figma逐像素验收、生产部署与发布未验证。全仓门禁未通过，保留PARTIAL，不合并整棵dirty树、不清理任何工作树。

## 用户截图追加修复：Logo与调用标签对齐

用户指出“展示边界 / 含展开空间”中的Logo应左对齐，“组件/文本/调用标签”未居中。本次仅修改Figma，不改变本地产品代码或版本。

- 三个展开侧栏母版的头部 `1092:18031` / `1092:18113` / `1092:18182` 由绝对布局改为水平Auto Layout；品牌占剩余空间，搜索及收起按钮保留32px槽位。品牌x从44归零，头部仍260×36，两操作按钮垂直居中且最右边界260，无溢出。展示实例 `1198:20509` 回读一致，截图确认Logo在内容左边缘。
- 调用标签源 `1126:13931` 六个变体的显示文字取消y=-4偏移，按标签内框居中，保留透明测量文本和省略机制；已移除态保持隐藏。14个03页标签实例回读中心偏差均0，母版截图确认文字与关闭按钮垂直居中。
- 04/05按原组件名查找未得到匹配实例，不能据此宣称两页已完成对应验收；本次验收限定03母版与上述展示实例。
