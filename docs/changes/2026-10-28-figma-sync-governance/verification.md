# Verification：Figma-first 同步治理与 03 页视觉审计

> **最新定向修复**：用户已授权处理风险与不匹配；R8状态与18个内壳绑定的实际修改/回读见[修复记录](risk-fix.md)。本文此前只读结论保留历史时点；其他问题与前次布局回归不自动关闭。

> **最新校正（2026-10-28）**：用户已允许修改Figma、本地代码不动，随后指出一排被改成两排及其他回归。当前停止继续Figma写入，只读整理差异；尚未回滚或验收。以[校正清单](correction-review.md)为本轮最新状态，下文只读阶段结论保留历史时点，不是当前写入事实。

- Task ID：TASK-FIGMA-PAGES-20261025
- 记录状态：FINAL（本轮文档与03首审；全量03审计仍IN_PROGRESS）
- 执行时间与时区：2026-10-28，Asia/Shanghai（客户端时间）
- Intent / Spec / Plan / AC：本目录 `intent.md`、`spec.md`、`plan.md`
- cwd / branch：`D:/kk-studio/.worktrees/TASK-FIGMA-PAGES-20261025-selection` / `fix/TASK-FIGMA-PAGES-20261025-selection`
- 被验证 base SHA / head SHA：`c2a0228a57be66b982d889c6710faa32cde49b7c`；首次持久化收据在创建本包文档后，见 `baseline.json` 的phase与capturedAt，不称为事前全树快照。
- dirty 状态及 patch/文件指纹：已有 dirty 工作树；本任务只新增本目录文档，既有改动不归入本任务。
- 交付包角色：`current`

## 实际命令和结果

| 命令/检查                      | 时间       | 退出码       | PASS/FAIL/NOT RUN/N/A        | 证据路径                                                                                                       | 范围与限制                                                                     |
| ------------------------------ | ---------- | ------------ | ---------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `git status --short --branch`  | 2026-10-28 | 0            | PASS                         | `baseline.json`                                                                                                | 仅记录已有 dirty 状态                                                          |
| Figma 03 页只读读取            | 2026-10-28 | 返回成功     | PASS（读取）/PARTIAL（审计） | `page-structure.json`、4包component-properties、截图和定向检查                                                 | 当前192定义全量属性读取不等于全量视觉验收                                      |
| Figma01基准与变量只读读取      | 2026-10-28 | 返回成功     | PASS（读取）                 | `01-reference.json`、`typography-and-modes.json`、`targeted-visual-checks.json`                                | 01仅读取03本轮所需章节，不是01全页审计                                         |
| Figma page级get_variable_defs  | 2026-10-28 | isError=true | FAIL                         | 本轮工具返回提示“nothing selected”                                                                             | 已用只读变量API取得集合及定向值；不虚构重新OAuth                               |
| 4次use_figma返回超限           | 2026-10-28 | isError=true | FAIL后分包恢复               | `component-properties.json`、`component-properties-0-64.json`、`references-and-typography.json`及工具debugUUID | 48KB限制；首个175437字节超限仅工具记录；后续成功包独立保存，失败原件不改为通过 |
| 产品 typecheck/lint/test/build | 2026-10-28 | NOT RUN      | N/A                          | —                                                                                                              | 本轮不改产品代码                                                               |

## 验收覆盖

| AC   | 平台/状态    | 预期                                   | 观察结果                                                                                                                | 证据                                                                 | PASS/FAIL/NOT VERIFIED       |
| ---- | ------------ | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------- |
| AC-1 | 文档         | 设计文档和计划存在                     | 已创建本目录文档                                                                                                        | `intent.md`, `spec.md`, `plan.md`                                    | PASS                         |
| AC-2 | Figma/代码   | 不发生本任务设计/源码写入              | 只读脚本返回mutatedNodeIds=[]；记录期间tracked产品diff及50个已dirty文件指纹不变；会话/页面导航/外部证据写入不算设计修改 | `*.read-only.js`、`baseline.json`、`integrity-and-preservation.json` | PASS（本任务/基线范围）      |
| AC-3 | Figma 03     | 组件、变体、实例和问题清单可追踪       | 207定义边界、192当前属性/1253变体、实例聚合与重点视觉；5条发现已记录                                                    | [audit-03](audit-03.md)、外部JSON与截图                              | PARTIAL，逐族/逐态视觉未完   |
| AC-4 | 本地映射     | 每项包含来源和候选本地位置             | 15族候选，props与完整分母尚未确认                                                                                       | `local-candidate-map.json`                                           | PARTIAL / CANDIDATE_ONLY     |
| AC-5 | 契约         | 五页职责、共用母件/变体、名称/查找明确 | 已写入spec/plan并注册到UI_INDEX；现行设计的逐族查找路径尚未验完                                                         | [spec](spec.md)、[plan](plan.md)                                     | PASS（文档）/PARTIAL（设计） |
| AC-6 | 后续全部平台 | UI和本地规范100%逐项落地               | 已定义六类分母及证据条件；未执行本地同步                                                                                | spec的100%验收契约                                                   | NOT VERIFIED（实施）         |

## UI / 运行态证据

- Figma 当前 URL/node/读取结果：文件 `ZiadpErDoFweCjG3uHjkM3`，页面 `91:3`，现行主容器 `2929:49915`、归档 `2929:49916`；session `9d875dc6-2433-4239-a997-fa7ee51915f3`。当前访问成功，不沿用上轮未核实的OAuth阻塞判断。
- 视口、主题和状态：以 Figma 节点实际可读配置为准；未读取项保持 UNKNOWN。
- DOM、computed style、产品截图：本轮不启动产品，不产生运行态证据。

## 当前结论

### 用户补充：整理Figma本身的错误

2026-10-28继续使用同一Figma session只读核对，回执为 `followup-errors.json`。当前192定义/127组件集口径未变；同集重复变体属性组合为0，空名/常见默认占位名初筛为0；12个六项标题缺游标、激活底板idle绑定及44宽辅助宿主仍存在。这里只做结构/定向回读，未新增全量视觉、命名语义或播放器通过结论。

已在audit-03加入Figma错误总表和01—05覆盖状态：2项已确认错误、1项用户设计调整、1项规范冲突、1项依赖待核验。没有将5项都说成缺陷，也没有把未审页面标成无错误。原最终文档哈希只对应上一版；本次文档补充另保存后续哈希收据。

- 实现：设计文档与执行计划建立；03首轮结构/重点视觉审计完成，全部03逐族审计继续PARTIAL。
- 验证：PARTIAL / NOT VERIFIED。
- 产品能力：未改变。
- 未验证事项：完整逐族/逐态视觉、公开属性实际接线、全部引用传播、命名查找、播放器、04/05、本地UI/原生/真实服务同步；不自动解除本轮只读限制。

## 只读与证据范围

- `use_figma` 是可读写API，本轮传入脚本只执行get/find/属性读取与页面导航；没有create/remove/resize/setProperties/变量/样式/原型修改。最初两次大输出失败和首次有界摘要在工具记录中，后续各读取脚本保存为外部 `*.read-only.js`。
- 产品保护基线在首次文档创建后持久化，不能证明其前所有外部进程没有改过Figma/代码；本任务没有产品写入调用，最终比对仅证明记录期间对应tracked产品diff/指纹未变。
- Figma截图11张、用户反馈图1张；不保存短期下载URL或凭据。图像与JSON完整性、SHA清单由最终检查生成。
- 当前Figma读取窗口不是不可变发布版本；其他人继续编辑时，后续必须按快照重新核验。

## 独立review

独立上下文 `sync_doc_review` 已复核文档缺口并对002/003/004视觉证据作独立检查，范围和结论见[review](review.md)。这不是用户视觉接受、独立账号approval或完整原型测试。

## 最终文档与保护检查（2026-10-28）

| 检查                | 实际结果                                               | 证据和范围                                                                                           |
| ------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| governance:check    | PASS，165任务0违规                                     | 复用原任务；其他164条记录内容不变                                                                    |
| markdown:check      | PASS，132活动文件0链接违规                             | 项目默认检查不自动遍历changes；额外对本包6份文档调用同一链接检查器，0违规                            |
| index:check         | PASS，26 ADR文件0违规                                  | 本轮未增加ADR或第二套规范入口                                                                        |
| snapshot:check      | PASS，3现行文档0违规                                   | 不把2026-10-27产品基线记录改成新产品验证                                                             |
| 本包Prettier        | PASS，6份文档                                          | 只格式化本轮新增文档                                                                                 |
| tracked文档diff空白 | 首次FAIL，PROGRESS末尾多余空行；仅修本轮新增空行后PASS | 原失败保存在doc-checks-initial.json，未隐藏                                                          |
| 证据assert自检      | PASS                                                   | 192唯一当前定义、1253变体、207总定义/15归档、58页签/12特定缺陷、214图标槽0尺寸异常与15族候选文件存在 |
| PNG/JSON            | PASS（结构）                                           | 12张PNG签名/IEND与SHA；20个当时已有JSON可解析。不是逐像素或完整解码验收                              |
| 产品与任务保护      | PASS（记录期间）                                       | tracked产品diff不变、50个dirty文件哈希不变，其他164条任务不变                                        |

首轮命令原件见 `doc-checks-initial.json`；最后结果见 `doc-checks-final.json`、`final-integrity-and-preservation.json`；最终文档绑定见 `final-document-sha256.json`。这些收据只证明本轮文档/证据与保护检查，不证明产品门禁或100%落地完成。

## 手机专项最终验证（2026-10-28）

此段覆盖前阶段“两排尚未恢复”状态；历史收据保持原样。按最新用户契约已修改Figma 01/03/05并同步本地派生规范，本地产品代码未改。来源、母件ID、阈值及后续映射见[手机专项](mobile-chat-layout.md)。

- 320/390/768聊天展示、窄素材图标单排、宽素材文字单排回读与最终截图通过。模型80×44，上传/发送44；素材面板最小288，宽屏实际下限404/内380；400回执溢出1像素，不算通过。
- 四种手机参考输入绑定真实组合，72高横滚并裁剪；五槽392在334容器保留横滚。320文字重叠、参考属性开启但空实例的两项发现均已修复并复核。
- 05活动画布文案、相关命名Frame、指向隐藏目标的非CHANGE_TO动作均0。此检查只覆盖指定名称/内容与有效可见层级，不等于对每项真实业务行为的证明。
- 独立上下文 `master_coverage_review` 复核最终截图和收据，结论：本轮手机Figma范围无剩余阻断问题。没有用作者自检替代独审。
- `mobile-chat-layout/checks.json`：PASS；6个单排行样本、两宽档最小宽度、4处参考组合、字体和编辑结构、3张最终PNG签名/哈希；50个dirty产品文件哈希及tracked产品diff不变，其他164条任务不变，本包Markdown链接0违规。
- `governance:check`、`markdown:check`、`index:check`、`snapshot:check` 均通过；对应收据 `mobile-chat-layout/doc-checks.json`。本阶段不改产品代码，未运行产品构建/单测或本地UI。

未验证原型播放器点击/横滚、键盘与动态内容、所有主题/全文件状态、本地产品及真实生成；整体任务PARTIAL，不能称100%落地完成。
