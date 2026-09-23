# Review：TASK-UI-008 输入框契约

- 时间：2026-09-23 00:48 +08:00。
- Reviewer：独立 Codex 子代理 `input_contract_review`；与实现上下文分离，以任务规范、外部 dirty 基线、实际增量和运行探针审查。未修改产品代码。
- Base / head SHA：均为 `cf344ddcdf039c6e62aeb9c65106e2a2339c0bb4`；分支 `fix/TASK-UI-008-inputs`，worktree `C:/Users/Administrator/.codex/worktrees/ui-input-contract/KK-Studio-2.0`。
- 这是未提交候选的独立预检，不能替代绑定未来提交的正式最终 review。
- 基线：`C:/Users/Administrator/AppData/Local/Temp/kk-input-baseline-h5yuo2cg/source`；范围以相邻 `task-manifest.json` 和规范化行尾后的逐文件 diff 为准。旧 `model-parameters.png` 是测试输出噪声，排除，实施者将恢复基线字节。
- 规则与需求：当前 AGENTS / AI_RULES / SDLC / REVIEW / BRANCH-POLICY / DESIGN-SYSTEM 1.3，以及本目录 [intent](intent.md)、[spec](spec.md)、[plan](plan.md)。

## 范围与证据

静态审查覆盖 `ComposerTextarea`、首页/对话 JSX、Agent 克隆及草稿边界、`composer.css`、删除的旧首页/对话/响应式/型号规则和新增回归。确认普通字段与画布世界坐标没有直接消费新几何；附件清空后无额外占位；共享 textarea 没有增加 Enter 提交、IME 键盘拦截或第二个草稿来源；禁用/提交/失败/Agent 隔离业务仍由已有组件拥有。菜单与短屏动态内容发现下列具体问题。

独立运行使用新的无持久化 Edge headless context，URL `http://127.0.0.1:1423/`，由实施者启动当前 worktree production preview；未启动、停止或复用其他进程及用户浏览器配置。入口为 `index.html → /assets/index-Dhhl5Npm.js → App → StartPage / ConversationPanel → ComposerTextarea`，最终 CSS `/assets/index-CqEbuOen.css`。仅通过设置 UI 配置 `variants.example` 合成模型目录和 `fixture-key`，网络模型目录由 Playwright route 返回，未发送生成任务或读取用户凭据。

此次构建 SHA-256：JS `879eca6ef2c835327cdbd1ae7473f1e162573eed107b6c2ec01ec079f2eed141`；CSS `e510b0c7991bae4ea764f2078b7808cb3f85ee41521edb678adfe9d3d6d248e6`。关键被审源码 SHA-256：`composer.css=a79f032ab9e4f1679cdf72262ce95d3ccad0bbd2f794c259bd0fa831bf57759d`；`catalog-pages.css=0f9f344ef84e17d7fd99db37ddb23aaa1cd5488266923265cb62911a4885601a`；`responsive-content.css=0c78fda9fb8b52911e4be031174691b4898ad5226f9e02112e20ce6fc07da61a`；`ComposerTextarea.tsx=ecf43201ec7ed350e446b08f748be093d273a21bc181da80ba8c468228919fa7`。

探针命令：从本 worktree 执行 `node %TEMP%/kk-input-review-probe.cjs`，两次运行退出码 0，记录 DOM/命中而非用“运行成功”表示产品断言通过。完整量测见 [初次独立探针](evidence/review-probe-initial.json)。独立覆盖 390×844 首页菜单，以及 1440×900 / 1440×600 / 1440×480 / 1440×390 / 390×480 / 844×390 / 360×640 的多行、4 附件、型号参数组合。未执行 Tauri、真实软键盘、真实 Provider 或用户最终视觉验收；此前 UI-007 的全绿不算本轮证据。

## Findings

| ID | 严重度 / Pass | 文件与行 | 复现、影响及直接证据 | 处理与状态 |
| --- | --- | --- | --- | --- |
| UI008-R1 | P2 / UI 与交互；阻断本轮输入契约验收 | `src/styles/composer.css:79-85`；`src/styles/catalog-pages.css:1031-1036` | 手机 390×844，首页第一排打开模型菜单。此次恢复 picker `position:relative`，但旧窄屏菜单仍 `top:calc(100% + 10px)`，因此定位到第一排下方。菜单 y=376..460，附件与语音按钮 y=374..418，两按钮中心 `elementFromPoint` 命中模型 menuitemradio。进一步实测 Skill 菜单覆盖语音/权限，插件菜单覆盖权限/发送；直接点击这些第二排目标会被菜单截获。见 [截图](evidence/review-r1-home-menu.png) 与 JSON `homeMenu`。 | 已向实施者报告并被接受。需以整个工具区域为避让边界定位菜单，保留 viewport 限高和内部滚动，并补第一排菜单打开后第二排目标实际命中回归。OPEN，待修复重建后独立复验。 |
| UI008-R2 | P2 / UI 与交互；阻断本轮短屏验收 | `src/styles/composer.css:356-360`；关联 `src/styles/responsive-content.css:102-104` 仅位于 max-width:1200 内 | 桌面 1440×480，API 对话填入超过4行文本，添加4个素材并选带参数的型号。新流式创作框高313px、底511；固定面板底459，发送 y=466..498。桌面仍为 `overflow-y:visible`，工作区为 `overflow:clip`，发送中心不可命中。调用 `scrollIntoViewIfNeeded` 后 panel.scrollTop 仍0、发送中心仍不可命中；1440×390同样。见 [滚动尝试后截图](evidence/review-r2-desktop-short.png) 与 JSON `heights`。390×480 / 844×390 / 360×640 可通过面板滚动恢复发送命中，因此定位为桌面短屏的缺口。 | 已向实施者报告并被接受。需让桌面短屏面板承接动态内容滚动或采用等效可达布局；补4附件+参数+多行组合下滚动后的发送/输入/关闭按钮命中检查。OPEN，待修复重建后独立复验。 |

## 门禁与结论

初次独立预检：**CHANGES REQUIRED**，2 个 P2 验收问题未关闭，无已确认 P0/P1。这个结论仅覆盖本任务增量，不评价整体 dirty 候选是否可以合并或发布。

实施者报告的新输入7项及相关回归结果只作上下文；本 reviewer 未把它们当作当前全部验收完成。实施者正在整理本轮完整 verify 的生成插件前置条件和旧几何断言，须记录原始失败及依据后重跑。self-review、完整 CI/本地 verify、Tauri 实际包、用户产品验收和任何发布授权各自独立，不由此预检代填。

## 修复复验

待实施者修复、重新 build 并提供同一候选预览后，追加当前源码/构建身份、探针结果和两个 finding 的关闭依据。保留以上初次发现及证据，不改写失败历史。

### 第二次预检：2026-09-23 00:56 +08:00

重新读取27文件任务 manifest、`useComposerMenus.ts`、全宽短屏滚动规则、新输入回归、新桌面审计脚本和旧几何测试更新。`runtime-ui.spec.ts` 保留 workspace / conversation panel / canvas toolbar 的原精确矩形，只将被 DS1.3 明确替代的固定创作框几何改为60px文本、8px间距、32px工具栏和相对内距；`interaction-state.spec.ts` 保留语音可用性和状态断言，改用32px目标、14/20输入文字。上述测试维护有明确规范依据，不构成放宽行为断言。

独立复测仍使用隔离 Edge context 的 1423 production preview。实际 `.app` 属性为 `data-runtime-entry="src/main.tsx"` / `data-runtime-mode="production"`；本轮 JS `/assets/index-9_7E4uOW.js` SHA-256 `20d545416fb588188fdef5a48aa8f0cbada288ed9e46841dd91a6b7e7f76a973`，CSS `/assets/index-CSo3kggd.css` SHA-256 `1133237277ce140800c3ca378d2bce21b335895142255af3dba46135444cdaba`。本次被审的 menu hook SHA-256 为 manifest 中 `7129058640319868b6f8811bc289361cf1e521abf93e6ebc0656e5cdbea31719`；`responsive-content.css=ce70dc56f5eebba3429a925170728eb3b49fdd444a9c38cfaaa58785e552fe24`。随后实施者开始修第三项，本条不把后来的未重建源文件哈希冒充本次构建证据。

- **UI008-R1 CLOSED**：相同390×844首页模型菜单移至 y493..577，7个工具按钮中心全部命中；第二排附件/语音/权限/发送不再被菜单遮挡。见 [补测 JSON](evidence/review-r1-r2-retest.json) 和 [修复截图](evidence/review-r1-fixed.png)。
- **UI008-R2 CLOSED**：1440×480的4附件+型号参数+长文本组合，面板为 `overflow-y:auto`，滚动后 scrollTop=97，发送底401且命中true；1440×390 scrollTop=187，发送底311且命中true。1440×600/900和390×480/844×390/360×640对应组合仍可达。见同一补测 JSON 与 [桌面短屏修复截图](evidence/review-r2-fixed.png)。
- 本轮未观察到 pageerror 或 ResizeObserver loop 报错，焦点没有在稳定布局中被 hook 主动抢走；这不证明所有动态场景已通过，下述菜单滚动回归仍需关闭。

| ID | 严重度 / Pass | 文件与行 | 复现、影响及证据 | 处理与状态 |
| --- | --- | --- | --- | --- |
| UI008-R3 | P2 / UI 与交互；阻断本轮短屏菜单验收 | 本轮 `src/components/useComposerMenus.ts:55` 的 `maxHeight="none"` 与 `:74` 捕获全部 scroll | 全新context，390×480，新项目默认Agent通道，打开共用模型菜单：menu高217、clientHeight215、scrollHeight400。设置scrollTop=100后立即读为100，250ms后恢复0；真实鼠标wheel(0,180)后仍为0。菜单自身scroll也触发place，测自然高度时取消限高消除了滚动范围。末尾“配置供应商与账号…”位于y426..458，菜单底282；滚动定位后延时仍hit=false，导致菜单下半部分不能稳定到达。Playwright的瞬时click trial会短暂成功，因此必须检查滚动稳定性和真实导航结果。见 [R3 JSON](evidence/review-r3-menu-scroll.json) / [截图](evidence/review-r3-menu-scroll.png)。 | 实施者已接受。建议忽略弹层自身/后代滚动的重新定位，并在外部scroll、resize或内容变更测量时保留弹层scrollTop；补短屏滚动到底部并实际打开设置的回归。OPEN，待重建补审。 |

第二次独立预检仍为 **CHANGES REQUIRED**：R1/R2已关闭，新增R3待修。旧失败证据完整保留；本次两个探针退出码0，只表示量测脚本运行完成，产品失败记录见R3。

### 最终补审：2026-09-23 01:02 +08:00

结论：**PASS（本任务源码增量与 production preview 的独立预检）**。UI008-R1 / R2 / R3 均已修复并由本 reviewer 在同一份最新构建中复验关闭；本范围无未关闭的 P0/P1/P2 或验收 blocker。Git base/head 仍为上述 `cf344dd...`，候选未提交，因此这仍是 dirty 候选预检，不冒充正式提交、全量交付、原生发布或用户产品验收。

本轮实际 URL `http://127.0.0.1:1423/`，入口 `.app[data-runtime-entry="src/main.tsx"][data-runtime-mode="production"]`；JS `/assets/index-BVxVd-ts.js` SHA-256 `754e32be48a8a119b0e4791fd15bdfdacf6a27595e865801135ad4316068005a`，CSS `/assets/index-CSo3kggd.css` SHA-256 `1133237277ce140800c3ca378d2bce21b335895142255af3dba46135444cdaba`。最终 `useComposerMenus.ts` SHA-256 `ae1dc527245bc285d70847f9c9d1878de2809bc1186175129947e3a2c7958d3f`；`responsive-content.css` 仍为 `ce70dc56f5eebba3429a925170728eb3b49fdd444a9c38cfaaa58785e552fe24`。

最终补审证据：

- **R1 CLOSED，再次确认**：390×844首页模型 / Skill / 插件 / 权限四种菜单分别打开；每种情况下所有7个工具按钮中心可命中，菜单不覆盖工具行。四个 Escape 都回到对应触发按钮。四种菜单均从首页生成选项下方 y493 展开，完整位于视口内。[量测与断言](evidence/review-final-home-menus.json)、[插件菜单截图](evidence/review-final-home-menu.png)。
- **R2 CLOSED，再次确认**：4附件＋型号参数＋长文本保持。1440×480/390面板滚动后发送可命中，scrollTop分别97/187；1440×600/900、390×480、844×390、360×640全部通过滚动后发送中心命中检查。草稿与附件沿断点变更保留。[最终组合数据](evidence/review-final-flow.json)、[桌面短屏截图](evidence/review-final-desktop-short.png)。
- **R3 CLOSED**：390×480新项目默认Agent通道的模型菜单，scrollTop=100经过250ms仍为100；末尾按钮滚动定位后 scrollTop=185、稳定命中true。窗口变为400×500时 scrollTop按新最大值收敛为165，额外等待500ms仍为165，菜单尺寸与位置稳定。随后真实点击“配置供应商与账号…”成功打开设置；重新打开模型菜单并搜索Codex，缩回390×480后搜索框保持焦点，Escape回到模型触发器。过程中无pageerror / ResizeObserver loop错误。[滚动、resize、导航、焦点数据](evidence/review-r3-retest.json)、[稳定滚动截图](evidence/review-final-menu-scrolled.png)、[实际打开设置截图](evidence/review-final-menu-settings.png)。

静态复核确认滚动监听忽略弹层自身及后代，外部scroll仍调用重定位；测自然高度前保存scrollTop，结束后恢复，ResizeObserver及window监听均在effect清理时释放。新增短屏回归在scroll事件后的双requestAnimationFrame检查滚动保留，并实际点击底部入口，有效覆盖本次回归，而非只测瞬时矩形。另发现的新原生审计脚本 `selectOption("agent")` 已按真实枚举修为 `selectOption("codex")`（当前第249行）；该脚本只完成静态复核，原生执行结果由实施者另行留证。

本 reviewer 运行的复现/补审脚本均退出0，最终命中断言及真实导航通过；实施者报告18项输入/模型/菜单回归通过，完整verify/Tauri仍由其当前候选验证记录承担。此PASS不扩大到真实软键盘、真实Provider/账号服务、尚未执行的Tauri运行或用户最终视觉接受。后续产品源码/构建变化时需判断影响并重新绑定复验，不直接沿用本条哈希。

### 宽首页最终有限复核：2026-09-23 01:07 +08:00

实施者按“宽首页一排、窄对话两排”的规范，补充768–1200仅首页工具栏的flex规则，保留44px触屏目标；这项变更不包含在上条旧CSS的PASS内。本 reviewer 已在新构建完成单独有限补审，结论仍为 **PASS（当前源码增量及Web production preview独立预检）**，没有新finding；R1/R2/R3维持CLOSED。

当前实载资产经浏览器fetch与本地dist字节SHA-256比较，全部相同：

- JS `/assets/index-DLeRvWsG.js`：`754e32be48a8a119b0e4791fd15bdfdacf6a27595e865801135ad4316068005a`，与R3关闭时JS字节相同，虽然产物名改变。
- CSS `/assets/index-CCZfPOS7.css`：`196db94dfd36b94d8f6d3aa319b0a5f72fc7309b7763383c9dd85bfad0cb2ef0`。
- 当前 `composer.css`：`5819fc856d6febdcdd4983da307fb0c4a3083f13a6ba2dbbfc8329ed8f63cd64`；menu hook仍为 `ae1dc527245bc285d70847f9c9d1878de2809bc1186175129947e3a2c7958d3f`，短屏响应样式仍为 `ce70dc56f5eebba3429a925170728eb3b49fdd444a9c38cfaaa58785e552fe24`。

运行链路仍为 `http://127.0.0.1:1423/` 的production、`src/main.tsx`入口。独立隔离Edge context在900px高度下逐档测量：

| 宽度 | 首页工具栏 | 对话工具栏 | 每个按钮目标高度 |
| --- | --- | --- | --- |
| 767 | 96px，两排 | 96px，两排 | 44px |
| 768 | 44px，一排 | 96px，两排 | 44px |
| 834 | 44px，一排 | 96px，两排 | 44px |
| 1200 | 44px，一排 | 96px，两排 | 44px |
| 1201 | 32px，一排 | 32px，一排 | 32px |

10个首页/对话组合各7个按钮的中心命中与目标高度断言均通过；每个组合分别打开模型、Skill、插件菜单，30次菜单检查均无工具按钮被覆盖、菜单在视口内，Escape正确回焦。首页和Agent对话各自的草稿在五档往返过程中保持原值；无pageerror。源代码微调仅匹配 `.start-composer`，配合同态运行量测确认手机首页及窄对话仍保持两排。

可复现命令为从本worktree执行 `node %TEMP%/kk-input-tablet-final.cjs`，退出码0。完整结果：[有限补审JSON](evidence/review-tablet-final.json)；同态截图：[834首页](evidence/review-tablet-home-834.png)、[834对话](evidence/review-tablet-chat-834.png)。已查看首页截图核对行内图形、标签、生成选项和边界。实施者报告当前完整 `npm run verify` 的295项browser通过；本段不将该报告冒充reviewer独立重跑全套。

本次有限补审完成，探针browser/context均在finally中关闭，全部进程已退出，可停止专用1423预览。未修改产品代码；后续Tauri及用户视觉接受仍按各自验收记录推进。
