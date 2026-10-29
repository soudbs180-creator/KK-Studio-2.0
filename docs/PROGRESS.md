# 当前进度

## 2026-10-28 P1能力声明与三个Port（PARTIAL）

契约包1.0.0→1.1.0，新增Zod业务能力声明与Task/Asset/Provider纯类型，旧供应商Manifest与任务/资产函数保留。13契约测试通过，根2338 pass/0 fail/20 skip、Mobile373 pass/0 fail；根/包/Mobile类型、lint/格式和build通过，Web产物160文件hash不变。独立安装按原包配置和无URL/process/window运行探针通过；更严格的依赖声明全检仍有Zod URL类型错误，原失败保留。未接运行/改UI/合main，P1-G、其他Port、P0整合和独审仍开放；见[验证](changes/2026-10-28-capability-contract/verification.md)。

## 2026-10-28 HUD宽度与保存生命周期（PARTIAL）

移除折叠侧栏两处旧宽度覆盖，修复1920下HUD容器缩成0并误隐藏状态的问题。Desktop/Web源码46→47，Mobile43不变；当前build保存6项（含390/1099/1920归档与同宽度reload）通过。30项邻接27 pass/3既有fail，调度/任务命中继续全过；HUD旧取消裁切另入账，完整verify/独审/原生/main未完成。详见[追加验证](changes/2026-10-28-provider-browser-contract/verification.md)。


## 2026-10-28 调度冷却与任务面板点击修复（PARTIAL）

修复任务关闭伪元素覆盖面板，以及429等健康状态等待项目保存才生效的两个时序。当前Figma01/03只读核对支持自身命中范围，无需改设计；Desktop/Web源码2.1.45→46，Mobile43不变。完整调度15项及390/1920面板点击2项首试全过，真实IDB阻塞/保存冲突保护保留；typecheck/lint/format/ui检查通过，单元2325 pass/0 fail/20 skip。窄屏保存进度仍失败，原生/独审/完整verify及main未完成；见[本卡验证](changes/2026-10-28-provider-browser-contract/verification.md)。

## 2026-10-28 ORG-5 历史日志首包外置（PARTIAL）

模型能力历史包62份日志已从隔离任务树外置，毛量1357699字节；源/Git/容器副本与全新目录恢复均逐份sha256匹配。32个历史链接转清单，结论及原目的地可追溯，PNG/JSON/E1保留；历史断链86→86无新增。B11基线640→578，仅收缩；新增只读SHA校验器，详见[验证](changes/2026-10-28-evidence-pilot/verification.md)。这是首包候选，ORG-6推广、完整verify、独审及main整合仍未完成，主工程未改。

## 2026-10-28 ORG-2 目录与证据防回弹（PARTIAL）

治理入口已在任务树候选接入根白名单、禁入类型、图片200KiB、测试/文档落位及ASCII命名检查；640条存量规则命中按路径与图片大小只减不增。9项故障注入（含独立Git仓库）通过；typecheck/lint/format通过，全量单元2322 pass/0 fail/20 skip。没有迁出或删除历史证据，实际瘦身仍0；独审、完整verify及main合流仍未完成。见[验证](changes/2026-10-28-repo-layout-guard/verification.md)。

## 2026-10-28 API入口与附件连接夹具（PARTIAL）

29个浏览器测试文件同步59处官方直连tab及首页图片能力分类；附件用例经现行UI连接独立本地Agent。最终附件/保存8项7通过1失败，另2项调度失败：窄屏进度隐藏、任务失败标记隐藏、未绑定提示缺失均保留。产品代码未改，不能据此声称完整verify或主线已更新。见[本次验证](changes/2026-10-28-api-browser-navigation/verification.md)；四份原文的整体范围继续按[总清单](changes/2026-10-28-modularity-p0/four-document-coverage.md)追踪。

## 2026-10-28 浏览器门禁入口修复（局部通过）

18个测试文件同步当前设置分类与CanvasReference完整字段，保留原业务断言，产品源码未改。定向29项与开发插件4步通过，快速门禁2313 pass/0 fail/20 skip；完整verify及main整合仍未完成。见[验证](changes/2026-10-28-browser-gate/verification.md)。

## 2026-10-28 独立格式门禁收尾（IN_PROGRESS）

按用户授权修复18个历史格式文件，逐个确认转译后JavaScript语法树相同；完整verify及实际合流门禁仍待执行。见[本卡验证](changes/2026-10-28-modularity-format/verification.md)。

## 2026-10-26 Figma 按钮与弹窗检查点（PARTIAL）

先按01补规则，再修02绘图、03共享母版和04/05设计实例。214按钮、58页签/342按钮、8项目库、18素材库通过本轮自审；87顶部行实际44，窄画布保留同语义图标入口。124处实际修改/恢复通过，113跳转及15取消配置通过；音频仍仅草稿、发送禁用。9张当前PNG校验通过。窄屏素材库完整触控、全场景播放器、独审及本地迁移未完成；未改源码/版本或部署。见[本轮验证](changes/2026-10-25-figma-04-05-rework/verification.md)。

## 2026-10-25 Figma 04/05源继承与场景整理（PARTIAL）

用户复核发现重复工具栏本体、覆盖锁图标与项目库双边框，撤回整体完成判断。原100处验证又遗漏03样例和嵌套引用；现工具栏6母版＋03的24处＋04/05的94处共124处完成间距修改/恢复及最终回读，修正自动宽度、左对齐弹窗、18处示例边界和44px圆形反色按钮六态内嵌底板。98条原型跳转及15个取消层配置保留；项目库改为真实03实例。当前143＋111场景包含16个新增交互样例，其他组合、完整触控/业务路径和本轮独审仍待核查；本地产品未迁移。旧结构扫描保留原时点含义。见[当前验证](changes/2026-10-25-figma-04-05-rework/verification.md)。

## 2026-10-28 模块化P0（任务树候选）

完成外部规范复核，纠正R1计数、R3遗漏、R4长环、R7/R8范围与治理调用链问题；新增dependency-cruiser与集合棘轮的候选实现，保留原门禁，产品源码不动。初始缺少Agent编译产物的两项失败在准备独占运行时后消除；开工单测2299通过、0失败、20跳过。最终门禁、独审和整合另见[验证](changes/2026-10-28-modularity-p0/verification.md)，不据此提升任何功能成熟度。

## 2026-10-25 Figma 基础控件可读性修复（本地候选）

按用户指定优先修复报告六类问题，先修改并回读 Figma 共享母版，再同步本地控件字号、亮色反色前景和禁用边界。设计预览真实Edge9项、产品页面/画布导航17项首试通过；共享Desktop/Web源码版本2.1.44，Mobile不变。全仓单测开工前已有失败；原生运行、完整合并和发布未验。见[本次验证](changes/2026-10-25-figma-control-readability/verification.md)。

## 2026-10-24 画布轻量性能优化第一批（IN_PROGRESS）

用户授权开始实施性能调研结论。已保全当前 dirty/index，复用本 checkout；基线单元2275通过/0失败/20跳过、typecheck与lint通过。正在按测试先行削减历史预览、项目协调、保存规范化与连线派生的重复工作；保留预览journal、撤销和生成语义，不新增依赖。当前 Figma 已只读核对，无需设计修改；未声称全量视觉同步或帧率收益。见[本批计划](changes/2026-10-24-canvas-performance/plan.md)与[验证](changes/2026-10-24-canvas-performance/verification.md)。

## 2026-10-24 Figma UI 治理与画布编组本地切片（PARTIAL）

按当前 Figma `ZiadpErDoFweCjG3uHjkM3` 的 01–05 页面完成代表性母版修正和回读；本地接入 `CanvasGroup` 持久字段、信息/堆叠收纳、名称/边框色/解组、选区整理、视频首尾帧与音频参考类型、灯箱最多 6 张居中缩略图和任务搜索。`typecheck`、`npm test`（2261/0/20）、lint、ui:check、build 通过。完整 `verify` 被既有格式漂移阻断；全量 Playwright 有环境超时，04/05 同状态验收与 Code Connect 权限仍开放。详见 [本轮变更记录](changes/2026-10-24-figma-ui-governance/verification.md)。

## 2026-10-24 按当前 Figma 同步手机项目库、首页输入区与顶栏（本地 PASS）

实时回读当前 Figma `ZiadpErDoFweCjG3uHjkM3` 的手机首页 `69:1279` 与项目库 `69:1414`：目标为 390×56 顶栏、340×132 首页输入、171×78 两列项目操作卡。Figma 目标已存在，本轮不重复写入 Figma，按节点证据同步本地 `responsive.css`、`responsive-content.css`、`composer.css`、`catalog-pages.css`。开发 1421 与构建预览 1423 均实测通过：390×844 顶栏 56px、首页输入 340.6667×132px、项目库两卡 x=16/203 且 171×78；1440×1000 顶栏 40px、首页输入 652×170px、项目库两卡 616×78。`typecheck`、build、lint、ui:check 与串行重跑的 `npm test`（2260 passed / 20 skipped / 0 failed）通过；首轮并行测试的 readiness 超时已保留并在验证记录中区分。详见[追加验证](changes/2026-10-23-figma-04-mapping/verification.md#2026-10-24-手机页面同步与双视口验收追加记录)；运行回执位于工作区容器 `D:/kk-studio/output/mobile-ui-20261024/receipt.json`。

## 2026-10-21 Figma 设计先行与派生规范

新增 UI 先完成 Figma 设计再修改本地的强制规则，本地仍须读设计规范。当前设计源更新为用户提供的新文件 `ZiadpErDoFweCjG3uHjkM3` / `91:2`，按七章规范、共享 Text Styles 和几何/图标变量更新文档目标及来源映射。旧 CSS 与生成 YAML 保留当前实现身份，未执行产品 UI 迁移；检查、独审与主线整合边界见[验证](changes/2026-10-21-figma-first-rules/verification.md)。

## 2026-10-18 手机输入模型焦点修复（IN_PROGRESS / NOT_VERIFIED）

TASK-MOBILE-COMPOSER-001承接用户安卓Chrome模型名点击无响应：本地真实浏览器与四配置红测已确认空text失焦卸载工具栏。最小interacting锁存候选已使本地完整手机Web13/13首试通过；Mobile371/type/lint由root回传，精确已提交head独审、Hosted和Web2.1.40/Mobile2.1.5正式发布尚待完成。旧图文TASK仅按PR70/71实际门禁和合并收据有界DONE/PASS，不将Safari/Native/实体手机后台或真实视频结案。见[本次验证](changes/2026-10-18-mobile-composer/verification.md)。

原“后台截图文件全黑”误判已由五JPEG完整字节/像素一致纠正；15分8秒同页停留后刷新原件散列保持，网络有截断且真实hidden事件未证，实体安卓后台仍未验。本轮不新增Provider/生成请求，现网39/唯一38与本轮40候选分开，目标上线后只保留一个previous。以下12ai段落为前任务原时点记录，当前结案以本次新增说明和实际PR71收据为准。

## 2026-10-18 Issue68 原生设置保存同步（已完成结项）

Issue68专项有界结项：PR69已普通受保护squash合入main c248d8178ec1754315559a9e476ac909bb494287，合后quality39083468213五项及guards39083468190成功，verify浏览器827/Native11通过，Issue68 closed/completed。taskkill清理异常另列 TASK-NATIVE-TEARDOWN-20261018（TODO，原因UNKNOWN），既有auto-merge解析失败保留。仅本专项结项，不代表总客户端交付；没有发布/部署/版本变化。见[结项验证](changes/2026-10-18-issue-68-main-closeout/verification.md)。

## 2026-10-18 Issue68 原生设置保存同步（专项候选）

从远端 main6b933f4f 创建隔离分支，仅在 Native 测试保存后等待准确成功提示、关闭后确认 dialog 隐藏；既有延迟保存回归补齐关闭和模型菜单路径。真实 native 回执 gate 证明配置/凭据已提交但 UI 待回执时关闭、Escape、遮罩保持保护，释放后13检查通过，正式生命周期11检查通过；CI精确吞点击机制仍为推断。无产品源码、版本或生产改动。完整验证、独审/PR进度见[专项验证](changes/2026-10-18-issue-68-settings-save/verification.md)，交现有main协调者，不merge或发布。

## 2026-10-18 独立手机 Web 正式交付（有界 DONE/PASS）

正式Release `v2.1.38` 已从main `f730f1dc32fb2e568dda6d4a52c58b05802d6b6b` 自动发布：Web2.1.38、独立Mobile源码2.1.3、Desktop源码2.1.37。根网址初次按手机UA/窄屏进入 `/mobile/`，`/?view=desktop` 保留旧资料入口，使用中resize不强制导航。生产Edge9/9首试、0retry/flaky/skip及9组空blocked/errors记录通过；用户实际手机回复“已显示独立手机 UI，正常”。

main Hosted五项与guards、正式部署均success；179个current文件（含23Mobile）及155个previous文件完整核验，撤钥后7个入口资源HTTPS逐哈希匹配。current38/previous37恰好两个受管目录，只有一个回滚版本；旧4a受管版本已回收，原配置单备份保留。API/PG/Nginx保持active且MainPID693/673/666一致。临时root授权实际计数0、原授权逐字节恢复，新临时身份SSH被拒绝；指定隔离测试目录和本机两私钥已清理，受限GitHub自动发布凭据保留。

仅本任务DONE；150任务为86DONE/1IN_PROGRESS/48PARTIAL/12TODO/3BLOCKED、开放64，其他149对象不变。FEAT-028仍PARTIAL、T12开放；Safari专项、原生新包、真实身份与Provider文本/图片/原件闭环继续验收。原main只读观察为69条dirty/staged0，不把并发变化纳入发布或声称所有原文件永久不变。本次产品、Hosted、生产、用户确认与数据保护范围见[最终生产收据](changes/2026-10-18-web-mobile-production-receipt/verification.md)；最终文档head的独立审查与Hosted由文档PR另记。

## 以下为此前阶段历史记录（原文保留）

## 2026-10-18 独立手机 UI 修正（IN_PROGRESS）

2.1.37 已由 PR65/main `503dedbe` 的 exact-main quality 与正式 Release 自动上线，完整155文件与静态旧版保留已核对；旧四尺寸40项只验证桌面响应式。用户明确拒绝该布局作为手机版，要求原独立 Cherry 参考手机 UI，因此本轮不结案。已恢复58df中的282份 mobile/contracts 原创源码，新增真实 Web 本机 context、可选账号、初次 viewport/手机UA `/mobile/` 分流和组合发布；Web2.1.38、Mobile候选2.1.3、Desktop2.1.37。Mobile323/323测试、type/lint与组合构建已通过，独立手机browser9/9首试、Linux发布/回滚14/14及有界独立复核通过；精确SHA绑定/Hosted及新正式上线仍在执行。数据库、业务服务、原Desktop资料和其他dirty保持；临时root key已安全延期，正确手机UI验收后撤销。详见[当前交付包](changes/2026-10-17-web-release-receipt/verification.md)。

## 2026-10-17 Web发布与正式Release自动同步（IN_PROGRESS）

用户授权将kkai.plus更新到客户端验收基线，随后明确选择本次一起修手机菜单并重新验收2.1.37，仅在正式Release自动更新、保留一个回滚版本。固定bbc8/产品469原154文件与旧验收dist逐哈希一致，原dirty不纳入；新产品改动限手机菜单定位与版本元数据。VPS旧4a06ea8原122文件保留，受限普通账号/配置备份/no-cache及资源回退已准备，API/PostgreSQL保持；新候选托管、生产手机与正式Release仍在验收。账本150项、原149对象保持，旧Native收据只证明2.1.36。详见[发布验证](changes/2026-10-17-web-release/verification.md)。下节审计的未推送/未发布结论保留其历史时点含义。
## 2026-10-17 审计安全修复与治理同步（有界本地A–D DONE/PASS）

最终产品source `4699458de1c3437309b7cdc3f019454104c81fce`、tree `a1905e2aa6e11a24b4c62d829dc82a8f0d566972`，Desktop/Web2.1.36，Mobile2.1.1规划。冻结前后CLEAN的完整`npm run verify` exit0：Node1846=1832PASS/14既有SKIP、Agent201=199PASS/2既有SKIP、产品Edge823/823首试零fail/retry/flaky/skip、DESIGN41单元+8浏览器、development四步，lint/type/UI/format/build通过，警告/advisory保留。469精确增量独审PASS；此前FSR01–06按原SHA关闭。Native五源自436后未变，Rust bin213PASS/1既有硬件ignored+integration41/check/fmt仍按该源身份解释。

官方EXE b6299445/input a53dee81、隔离Native六检查（含focus、同repo/新epoch/草稿、loaded字节/版本与cleanup0）、默认两个真实lnk正常关闭重开均PASS。默认9项目raw snapshot/identity/shared memory保持，原只读banner遮挡菜单真实FAIL已由条件sidebar popover层级修复并以桌面/短手机普通点击及新Native复验关闭；旧d356完整/隔离PASS、dailyFAIL、75的12browser失败、8026中止和两次旧helper selector失败全部保留。日常恢复成功只代表可信启动和只读保护成立，旧聊天资料仍READ_ONLY；完整迁移/protocol7继续开放。

A保全517368文件版本/56336959878 B/6 bundles/两个dirty恢复，原主仓main8c/63dirty/index/staged0保持；D纠正26失效分配并保留全历史、v2 hook本机核对及远端规则实际差异。本轮新审计任务DONE/PASS，149项合计85DONE/48PARTIAL/12TODO/3BLOCKED/1IN_PROGRESS、64开放；原148任务对象及37功能成熟度/runtimeEvidence保持不变。26容器条目/4worktrees均deletable=false，没有文件删除/移动。未push/merge/改远端或发布；真实Provider/ComfyUI/GPU、完整多聊天/垃圾箱/12AI恢复、VPS/账号、Mobile、签名和用户验收不由本轮代填。最终文档HEAD review/Delivery以提交后收据为准，详见[本轮验证](changes/2026-10-17-audit-repair/verification.md)。

以下各日期段为历史阶段证据，其中“当前/进行中”按其时点理解，不能覆盖本轮入口。

## 2026-10-16 安装安全复验与真实UI回读（进行中）

独审捕获的硬链接原件损坏/续传空间误拒均已实际RED→GREEN；修复19路径预检通过，fresh integration41/41、Node21/21及原件SHA保全探针通过，真实ZIP/模型推理仍未验。冻结573输入构建成功，新bundle相关25/25及动画/原frame邻域10/10首试通过，36状态审计无document溢出；手机聊天实际settled在viewport内。截图动画中间态与旧seed失败已按真实状态修正，未改frame坐标/容差；顶部实际命中24px，纠正先前32px推断。Native模型能力DTO丢失已修，正常多聊天/Agent又补两项scope隔离，需再重建后验。账号后台正用真SQLite/OPAQUE/OIDC/JWE实现独立控制面，尚未接Desktop/真实邮件；全局DESIGN、执行模型参数、媒体、共仓库及同步继续推进，详见[验证](changes/2026-10-15-kk-unified/verification.md)。

## 2026-10-16 安装接线与账号兼容预检（进行中）

本地安装Native薄命令已接线，完整校验后再探测硬件，bin编译检查通过；共享设置hook四类竞态经真实反例修复，16项及独立复审通过。独立安装适配器19路径冻结并送审，作者34项integration/32项bin/21项Node通过，尚无真实下载/模型执行。正常多聊天仍在共享核心收口，待其冻结后统一重建UI；旧bundle审计发现1920顶部菜单命中高15px并已源码修正，仍待新bundle验证。账号成熟库已在隔离目录验证实际密码协议、封装、PAR/PKCE及Edge Worker/CSP兼容，产品账号与设备解锁尚未实现。用户确认固定用户信息位置、内容目录可调及Web设备指纹/PIN不支持时仅会话密钥，已并入spec/ADR019；总任务继续IN_PROGRESS，详见[验证](changes/2026-10-15-kk-unified/verification.md)。

## 2026-10-16 统一 UI 回归修复与核心迁移（进行中）

8e17九文件修复及精确独审通过，相关九组87/87首试、0retry/flaky/skip；垃圾箱入口归入既有菜单，侧栏五锚点恢复误差0，未改Figma坐标或0.1容差。Node1508PASS/14既有skip、静态/build通过；原55a0完整verify的804/811与exit1仍保留，尚未新跑完整verify或Native。正常多聊天ADR022和本地安装ADR023契约已接受并独审，现按共享核心与独立适配器划分开始实现；未称迁移或安装可用。模型B/C、媒体、全局DESIGN逐页验收、共仓库、账号及手动加密备份继续推进，前台焦点与真实服务验收仍开放。详见[验证](changes/2026-10-15-kk-unified/verification.md)。

## 2026-10-16 统一交互与原生基线（进行中）

设置f32/0ad及四渠道模型阶段A28c/f472精确复审已通过，旧预设跨scope与过滤后置顶丢失等反例保留并关闭。Native55a0实际重建2.1.35，重复启动同PID/仓库/快照、退出重开草稿及清理通过；Win32前台焦点仍未通过，整轮PARTIAL，不抢前台强行过测。组合verify中Node1508/Agent199通过（14/2既有skip），Browser804/811、7失败，全部原配置重试仍失败；DESIGN/development尾段未执行。原设置与项目菜单期望正在逐项核对，整体继续IN_PROGRESS。后续正常多聊天新格式/作用域迁移与本地包安装适配已完成只读调用链及实施计划，尚未写新阶段产品；全局DESIGN、模型B/C、媒体、账号、共仓库和手动加密同步仍在原范围，详见[统一验证](changes/2026-10-15-kk-unified/verification.md)。

## 2026-10-15 统一修复与重构实施

用户已批准完整方案，实施从 origin/main d95e4c44 / Desktop-Web2.1.34 开始；隔离分支 codex/TASK-KK-UNIFIED-20261015，候选2.1.35。项目分组/软删除、依赖guard、加载草稿80f6、格式保护6c639、硬件d3e均已精确独审；12AI独立适配器73PASS，生产接线待。DESIGN e5e/0770已独审，正式41Node及8预览首试通过，完整产品UI收敛仍待；本地包7e06/aecb容量指引19项及精确独审通过，无安装或生成。Native权威06ac/df9已独审，204Rust/1既有ignore；设置f32/0ad分类、保存保护与响应式及独审通过。模型28c阶段A四渠道/精确型号已提交，独审发现旧置顶丢失/禁用原因缺失，待集中修复；B/C、Agent、动态参数仍开放。0ad冻结组合Node1508PASS/14skip/0fail，原超时失败保留；实际Native新产物验收中。多聊天、媒体、窗口、完整共仓库、账号、云备份及托管CI继续按原计划实施，不能以基础模块替代全功能完成。完整范围与各次失败见 [实施计划](changes/2026-10-15-kk-unified/plan.md)、[验证](changes/2026-10-15-kk-unified/verification.md)。

## 2026-10-15 HOME当前本机验收通过（IN_PROGRESS）

冻结a85完整verify：Node1343/14skip、Agent199/2skip、Edge785首试、development4步，独立6198hash匹配。官方Windows候选2.1.34 EXEf8cbfd5d/source a85，原Native38/3次launch与Rust167通过，实际正常关闭重开恢复、暂停/重连/服务重启及未知归属保护成立。原f10两FAIL与旧产物保留，HOME-NATIVE-01结果补审/正式PR/Hosted/main继续；main/daily仍2.1.33，不代填付费Provider或用户验收。见[验证](changes/2026-10-15-home-recovery-integration/verification.md)。

## 2026-10-15 HOME原生冷重开阻断（IN_PROGRESS）

f10实际Windows隔离客户端首次启动/连接/保存/reload通过，正常关闭后reopen两次FAIL；错误唯一对应READY前32行预算耗尽。定位到Codex诊断经Winston占用私有stdout，按入口保存握手writer、普通输出转stderr最小修复，保留全部Rust守卫。真实stdio98行RED→3项GREEN；新冻结全量/重建/原Native断言与精确独审待续。原失败、旧候选、daily/用户资料均保留。见[验证](changes/2026-10-15-home-recovery-integration/verification.md)。

## 2026-10-15 HOME完整本机验证及安全main承接（IN_PROGRESS）

PR62已按最终独审/双轮Hosted全部通过正常合main492，fetch核tree与f9c相同。HOME源码fc76完整verify exit0：Node1342/14skip、Agent199/2skip、Edge785首试、development5步；906旧文件与备份1812hash保持，1333产物另存，独审SOURCE/LOCAL_VERIFY PASS。仅挑独有fc76为c180且tree相同。Native准备中root编排错误清空共享生成依赖，已按主仓原锁恢复244包，三hash与daily EXE保持；原字节/短时影响UNKNOWN，另挂事故任务并独审。当前候选2.1.34尚未更新daily，继续代理/隔离Tauri与新环境验收。见[HOME验证](changes/2026-10-15-home-recovery-integration/verification.md)和[事故](changes/2026-10-15-dependency-repair/verification.md)。

## 2026-10-15 HOME恢复三P2（IN_PROGRESS / NOT_VERIFIED）

root在PR62已推送冻结head上串行临时堆叠HOME任务；三P2已实际RED，编辑重试/所有权清理/来源恢复最小修复后连接46项和HOME8项首试通过。补实际RED关闭重复原图读取及旧连接usage尾部跨线程风险；首轮环境、夹具和数量失败保留。受控读取观察证明默认数量覆盖已有设置，另挂TASK-HOME-LOAD-DRAFT-20261015 TODO。双端候选2.1.34，尚未完整冻结verify/新Tauri/精确独审或main/客户端验收。见[验证](changes/2026-10-15-home-recovery-integration/verification.md)。

## 2026-10-15 测试安全本机验证（REVIEW / PARTIAL）

TASK-EXPLORER-GDI-20261015与TASK-VERIFY-EVIDENCE-20261015合为一个测试安全PR。冻结源码9aa12e92完整verify exit0：Node1334/14既有skip、Agent199/2既有skip、Edge784首试0flaky、development5步。Windows真实argv保留15+1、真实PNG成功/主动失败、100页7次0TabProxy均通过；454旧文件及备份908哈希一致，879本轮产物另存。47文件独立审查PASS_LOCAL_TEST_SAFETY_SCOPE，SHOT-01/DOC-01关闭。首轮环境遗漏11FAIL及同SHA复测保留。下一步文档冻结、正式PR/Hosted/main及合后验证；daily和产品2.1.33未更新，真实Provider/用户验收另行完成。见[验证](changes/2026-10-15-explorer-gdi-integration/verification.md)。

## 以下为此前阶段记录

## 2026-10-15 GDI保护统一承接（IN_PROGRESS）

沿用TASK-EXPLORER-GDI-20261015，由root串行承接af8独有7个测试文件。输出保护6374已补独审两项，正式复验中；治理PR61已在当前Hosted成功/独立merge-scope后正常合main3a992597，四独有安全提交从该main重绑且tree相同。真实Windows参数/候选PNG探针通过；版本/产品源码/daily不变，f727首轮完整Browser773PASS/11FAIL，缺随包插件构建；只补既定依赖/构建后11项同源码首试全过，441产物与旧三项hash保留。SHOT-01补强及测试入口先构建插件后，准备新冻结全量验证，仍非完整PASS。见[计划](changes/2026-10-15-explorer-gdi-integration/plan.md)。

## 2026-10-15 测试证据输出保护（IN_PROGRESS）

用户要求继续实施。TASK-VERIFY-EVIDENCE-20261015由root在原隔离树串行承接，治理PR61冻结；按真实无浏览器fixture先RED，再实现独立产物目录与旧路径拒绝。已实现每轮独占目录/旧路径拒绝；真实合成Playwright正常与失败运行均保留旧字节，定向7/7、完整Node1332通过/14既有skip，lint/typecheck/format通过。独审提出固定截图/worker分散两项并已RED/GREEN修正；补充Node1333通过/14skip，17文件48处只迁移截图路径。没有新产品能力进入客户端，完整verify与正式复验待续，旧回执缺失不改写。见[计划](changes/2026-10-15-test-evidence-isolation/plan.md)。

## 2026-10-15 新正式执行首轮（IN_PROGRESS / PARTIAL）

最终补证：af8当前完整verify已exit0（1327/199/784首试、development4步）。同时确认默认测试输出清理移除了旧开发态回执/截图，未找到可校验副本；原browser已备份，旧.tmp/压力/交接原件保留。已登记TASK-VERIFY-EVIDENCE-20261015，后续先建立隔离输出/完整备份保护；见[事件与限制](changes/2026-10-15-unified-execution/incident.md)。

TASK-GOV-006已实际核验交接提示词/zip指定hash及完整23文件包；原141任务不变。只读补核12目标至游标末尾、6接口受限，原主控/全局枚举仍UNKNOWN。新Windows GDI真实argv及100页保护验证通过，7采样自有代理均0；未运行未保护批次，未改九项目/日常客户端。已普通推送治理分支并建草稿PR61；当前CI待完成，不称合入main或产品全部完成。新证据见[首轮验证](changes/2026-10-15-unified-execution/verification.md)；下面交接段落保留原时点。

## 2026-10-15 统一安全交接与需求归并（IN_PROGRESS / PARTIAL）

TASK-GOV-006：8个原活动主会话各一次安全暂停，重连后8主+4此前活动子会话均支持工具回读idle并交接无写入。原task-ledger仅新增接管条目及192稳定ID来源矩阵，原141条对象不变；51差额是待核对的台账覆盖差异，不能解释为丢失功能。114登记worktree原对象/dirty/冲突及所有失败保留，复用已完成clean治理目录建新文档分支，旧branch保留，没有新增或清理worktree。

当前远端main235e7f798c38b022d578f8fa41eaea1b9281fd6d已包含PR60，Desktop/Web2.1.33；本轮没有新产品功能进入客户端，没有推送/PR/main合并或客户端替换。HOME九项目和勘误以PROJECT_STATE当前区为准。旧版本/验证段落均保留各自历史时点，不作为当前恢复基线。

独立审查与补审PASS，治理/链接/快照/格式检查通过；全历史仍有19耗尽/2部分/6接口受限/5未读及更深cursor、原主控UNKNOWN/列表分页限制，已留只读补核队列。最新用户要求本轮整理完成后交原主控确认，再另建正式执行会话；这里不实现产品或新派实现任务。见[唯一接管提示词](changes/2026-10-15-unified-handoff/takeover-context.md)、[归并/合入顺序](changes/2026-10-15-unified-handoff/resume-order.md)、[验证](changes/2026-10-15-unified-handoff/verification.md)与[审查](changes/2026-10-15-unified-handoff/review.md)。

## 以下为此前迭代原始时点（保留原文，不能覆盖上述当前交接）

## 2026-10-15 Codex 卡片连线参考图（功能/live PASS；交付 PARTIAL）

TASK-CODEX-REF-20261015：功能/live PASS，交付PARTIAL：Desktop/Web2.1.33；参考原件42452f4d...经一次真实Codex内置imagegen生成PNG6531e6ac...并归档，1result/1result边/1reference边，外部图片请求0；重载、正常关闭/重建/重启、原桌面快捷方式重开PASS，原件hash不变且重启turn0。最终EXE6353aba3.../inputee1e43be...、reason=current、bundlevihgOeA0。Node1327PASS/14skip、Agent199PASS/2skip、定向45/dirty预检50及browser13/邻域39分别PASS；完整browser784为771PASS13FAIL/0flaky/skip，13项已由任务前源码逐项同断言重现为PRE-EXISTING FAILURE，但fullverify仍FAIL、development未运行。最终SHA正式review/Hosted/PR未完成。 FEAT-002保持PARTIAL，其他作者与HOME任务保留，不升级全项目REAL。见[验证](changes/2026-10-15-codex-card-reference/verification.md)与[审查](changes/2026-10-15-codex-card-reference/review.md)。

## 2026-10-15 首页默认Codex与来源/输入修复（REVIEW / 整体NOT_VERIFIED）

用户明确使用Codex/ChatGPT账号，授权首页默认Codex图片及各入口来源/输入/菜单修复，base/main cbda，候选Desktop/Web2.1.33、Mobile2.1.1规划。full5前置Node1327/14skip、Agent199/2skip与静态/build通过，784浏览器单结果首过/retry0/flaky0/skip0/errors0，845源码/测试与full4冻结相同。但npm verify最终exit1：development因另一任务占用1421而未执行/steps=[]，未杀进程或复用server，Hosted当前SHA必须实际补齐。Rust167/包30及新EXE8f633...实际export/preflight/import、冷开1370×1148图文与Codex缺省恢复通过；TaskHost首次9checks失败与旧EXE重跑11PASS分别保留。现REVIEW，最终精确独审/Hosted/PR/main/实际本机更新和两独立副本恢复仍待验，所有阶段失败原件保持。

candidate1真实文本与内置图源blob同fc36a3a...仅证明该时点；之后用户在独立窗口删图/编辑，不能当persist PASS。用户最新授权两次窗口编辑各恢复一个新ID副本（已核对2项目/各2cards/1共享asset），原7项目/rev2057与4602source保全，canonical未写、恢复待验；candidate2原7已有字段保持但一旧empty项目补两个空数组，不能写整对象byteexact。整项目包因旧未归档媒体被拒绝且无成功包。另一人类任务写回参考图及版本33，root准备明确来源纳入最终组合review/fullgate，本task不改其docs/ledger或代填DONE；跨聊天发消息授权未收到且未发送消息。当前事实见[本轮intent](changes/2026-10-15-codex-home/intent.md)与[验证](changes/2026-10-15-codex-home/verification.md)。

前置UI任务已通过source0ac精确审查、PR59/main cbda与实际2.1.31日常激活，在其原范围DONE/PASS；761浏览器首试、Native/开发回执与本机身份分别已审计，旧失败和旧NOT_VERIFIED原文保留，不升级其他Provider/整项目。详情见[前置闭环](changes/2026-10-15-codex-home/verification.md#前置闭环task-ui-full-20261015历史范围)。下文均为此前阶段原文。

## 2026-10-15 2.1.31本地验收冻结（REVIEW / 整体NOT_VERIFIED）

共享scope恢复仅改为layout同步，修复可编辑后旧草稿抢占真实选区的可达路径；单回归有效RED→本文件8项/邻域6项首试GREEN。完整verify9为Node1304/14平台skip、Agent199/2skip、Edge761首试/0retry、UI242/0与development四步骤；fresh官方Native10保留原87并新增双宽18项，105项/13图及TaskHost current6无注入11项分别通过，owned进程退出与端口释放已实查。

eb5 push759首过/1flaky严格NON_PASS与旧PR760首过分别保留，完整指纹、因果边界和Native4默认profile偏好例外集中于[最新验证](changes/2026-10-15-ui-full/verification.md#2131-当前本地验收)。当前eb5加版本31/最小差量尚未形成最终head；精确独立审查、新Hosted/Delivery、普通PR59合并及main/post-main待验。原138任务/其他功能/primary文件与index/历史保持，Mobile2.1.1规划不变。

## 此前阶段记录（原文保留，最新状态以上方为准）

## 2026-10-15 2.1.30本地验收冻结（REVIEW / 整体NOT_VERIFIED）

完整verify8通过：Node1304/14平台skip、Agent199/2skip、Edge760全部首试/0retry、UI242/0及development四步骤；fresh官方Native9 87项/13图、TaskHost current5无注入11项/秘密清理PASS，自有进程退出与端口释放已实查。最小12行CSS在侧栏展开稳定前隐藏项目控件，真实300ms/32ms点击、折叠重开及4新case/定向21项通过；旧Hosted因果限制与Native8单位夹具失败见[最新验证](changes/2026-10-15-ui-full/verification.md#2130-当前本地验收)。

当前d50加版本30/最小差量尚未形成最终head；独立精确审查、Hosted/Delivery、普通PR59合并与main/post-main待验。原138任务/功能状态与primary文件/index保持；Native4默认profile自动连接暂停、原值NOT_RECORDED为明确偏好例外，详证集中最新验证，不能概括所有偏好未触碰。Mobile2.1.1规划不变。

## 此前阶段记录（原文保留，最新状态以上方为准）

## 2026-10-15 2.1.29本地验收冻结（REVIEW / 整体NOT_VERIFIED）

完整verify7通过：Node1304/14平台skip、Agent199/2skip、Edge756全部首试/0retry、UI242/0及development四步骤；fresh Native7 78项/12图和TaskHost current4无注入11项分别通过，input/EXE同字节current。三CLI卡片9有效RED→9GREEN已补漏，历史同式guard安全结论勘误与actual3 UNKNOWN边界集中于[最新验证](changes/2026-10-15-ui-full/verification.md#2129-当前本地验收)。

当前94e基线加版本29/最小差量尚未形成最终head；独立精确审查、Hosted/Delivery、普通PR59合并及main/post-main待验，main694未合并。原138任务/功能状态、primary/index和历史原件保持，Mobile2.1.1仍规划。

## 此前进度与原始收据（保留原范围）

## 2026-10-15 2.1.28最终本地验收（REVIEW / 本地PASS，整体NOT_VERIFIED）

TASK-UI-FULL-20261015基于2d4be5fca4c2167d4bc0d500634645624f311505加最小字段同步修复、版本2.1.28与测试/docs，完整verify-6 exit0：Node1318=1304 PASS/14既有platform skip、Agent201=199 PASS/2skip，production Browser747/747首试PASS/0实际retry/flaky/skip，lint/typecheck/UI242/0/format/build/development四步骤PASS。文档owner独立遍历747 result records确认0实际retry；health42及footguns2为advisory，原警告保持。

官方2.1.28重建34.34s，fresh Native5 56 PASS/0errors/10图，root实查独立WebView profile并目视空态/重开/更新三图；新版TaskHost11 PASS/0error/credentialCleanupComplete=true，五自有app退出。verify-6后release仍current，input28c2f285与EXE638b5df5同Native5完整哈希相同。Native2/3/4版本硬编码/CDP早连/default profile前提失败保留，只有Native5是fresh完整验收；2d PR quality38647660224 Browser746 PASS/1 settings flaky且Native旧菜单8 checks后FAIL，非Hosted全绿。sidebar原缺trace根因UNKNOWN，本地不复现不称已修复。

当前本地组合PASS；最终提交SHA独立source/integration review、新Hosted/PR59普通合并及main/post-main仍待验，main fetch仍694、PR59未合并。原138任务/功能状态、primary资料与历史失败保持，Mobile2.1.1规划。[最终验证](changes/2026-10-15-ui-full/verification.md)。

## 2026-10-15 设置草稿竞态与Native夹具续修（首轮文档冻结时，保留原范围）

TASK-UI-FULL-20261015当前基于2d4be5fca4c2167d4bc0d500634645624f311505追加最小ProviderModelCatalog字段同步useEffect→useLayoutEffect，保留dirty/账号隔离/保存校验；Desktop/Web2.1.27→2.1.28已版本脚本递增并build，Mobile2.1.1仍规划。Hosted54 push38645320833 Repository verify exit0含Browser746 PASS/1 sidebar flaky，Native旧模型菜单定位FAIL；2d push38647654947 Browser746 PASS/1 FAIL且retry FAIL，B型号收到A草稿。冻结旧产品真实select B→A RED2为3/3 FAIL；修复后settings七case×六次42 PASS/0retry/flaky/skip。原race-red-1运行中测试源曾修改，仅作单case诊断；sidebar首试目标文件夹缺失但原缺trace，根因UNKNOWN。

Native TaskHost夹具对齐当前模型接入/官方API表单、精确模型菜单及既有快照CAS四结果草稿，真实旧release2.1.27为11 PASS、exit0、0error、credentialCleanupComplete=true，五自有进程退出与端口释放。此收据不能代填2.1.28；新版本完整verify、fresh Native/资源身份、最终SHA独立review及新Hosted/PR/main/post-main待验。main694 / PR59未合并，原138任务和功能状态保持。[当前验证](changes/2026-10-15-ui-full/verification.md)。

## 2026-10-15 全页面新UI与主线保全（此前2.1.27阶段，保留原范围）

- TASK-UI-FULL-20261015 当前source241f3050124ad7773ced0b47a55629373177205e，Desktop/Web2.1.27；Mobile2.1.1规划不变。用户新增空card仅upload/内容才toolbar、状态互斥与真实功能链按新矩阵验收，旧79/50 GREEN只保留原范围。
- main694经真实checkpoint0f506ae1→任务分支merge1653966f承接，tree一致；104实际冲突、25自动差量逐项核验、21外移历史blob保全。main独有历史文档补回，当前任务承接15包，原任务branch/status保持；Delivery704 paths/0 violations。origin/main仍694，未远端落地。
- 首轮完整verify：Node1295PASS/14skip、Agent199PASS/2skip、Browser740PASS/5FAIL/0flaky，lint/typecheck/UI242/0/format/build及单独Rust163/clientcheck通过；Browser失败使完整verify未通过，development未运行。正式source/integration review三P2均CHANGES_REQUIRED。
- 241已修text纯prompt分类、坏audio媒体可用性和rightpan，并修首页16:9与旧screen/LG夹具；green-review-fixes-1真实14/14 PASS、0retry。首次五失败与text/audio等有效RED全部保留；当前官方隔离Native56checks/0errors与资源字节身份、owned正常关闭PASS，source241/integration241复审PASS关闭三P2；完整verify-3已exit0：Node1295/14skip、Agent199/2skip、Browser747/747首试、UI242/0及development PASS；verify-2音频selector夹具一失败与修正后严格播放2PASS保留。最终doc/test-only提交head复审及Hosted/PR/main/post-main仍待实际回执，任务转REVIEW、不提前DONE。primary254条dirty/index、109登记worktree与原件保留。[本轮验证](changes/2026-10-15-ui-full/verification.md) / [覆盖](changes/2026-10-15-ui-full/coverage.md)。

- Hosted更正：ready [PR59](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/59)精确f090独立aggregate review PASS；Gitguards push/PR及governance/delivery/deploy-linux PASS，[quality38641803780](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/38641803780) verify在产品测试前因默认扫描未入库外部snapshot FAIL。main694未合并。root仅修scripts/tests可移植性、显式外部范围仍fail-closed；有效RED2FAIL/3PASS与定向23PASS保留，完整无外部env的verify-4/新SHA Hosted待验，整体REVIEW/NOT_VERIFIED；产品/Rust/Native2.1.27源与字节未变。

- 可移植性修复最终本地PASS：verify-5无KK_CONTAINER_ROOT exit0，snapshot3/0、Node1301/14skip、Agent199/2skip、Browser747（2.9m）、development四步；显式容器snapshot4/0亦PASS。Native仍current且input/EXE字节不变，版本2.1.27不变；CLI24与offline AI-evals仅有限dirty预检。verify-4 lint失败/继承JSON NOT-RUN和f090 Hosted失败保留，最终修复提交head/独立exact-SHA复审/新Hosted/PR59/main待验，整体REVIEW/NOT_VERIFIED。

- 最新Hosted边界：c498独立exact aggregate review PASS，quality38643592443 snapshot3/0；Node1315=1294PASS/8FAIL/13skip，8条Windows发布fixture short-path被既有canonical/no-link guard拒绝，Browser/Rust未运行。只修测试fixture realpath、安全脚本/回滚断言保持；修复证明与同8.3短TEMP/TMP完整Node与静态检查待验，旧verify-5仅本地范围。PR59未合并/main694，REVIEW/NOT_VERIFIED。

- 最新短TEMP本地PASS：真实8.3 fixture11项RED3PASS/8FAIL→GREEN11PASS/0skip，只有测试fixture await realpath 4+/1-，产品安全脚本无变更。首轮完整Node1299PASS/2FAIL/14skip及canary1失败来自自建TEMP过深的git路径前置条件；较浅actual8.3根下canary7PASS/3Linux skip、run2 Node1301PASS/14skip和lint/typecheck/format全部PASS。不是完整verify-6；Browser747/Native56/Rust163沿用未变产品范围，最终head/新Hosted/PR59/main待验，REVIEW/NOT_VERIFIED。

- 最新54a2独立aggregate PASS/Delivery706/0，但quality38645328109 Node1301PASS/1FAIL/13skip，仅首次gateway ready超时；POST/Provider/恢复/Browser/Rust未运行，未输出child日志故alive/crash UNKNOWN，时长差不定slow CI。单测试握手84+/14-实证preload7s RED→双冷启动4GREEN/focused21PASS，保留20s及恢复断言；实际8.3 Node1318=1304PASS/14skip与静态全PASS，非完整verify-6。产品未变，Browser747/Native56/Rust163沿用；新head/独立review/新Hosted/PR59/main及旧54 push38645320833结果待验，REVIEW/NOT_VERIFIED。

## 2026-10-15 最新 UI 设置修复（本地DONE/PASS）

TASK-SETTINGS-LATEST-20261015从正确最新UI c1fae190承接，Desktop/Web2.1.25保留1280/240/192、默认绿色与手机分级导航。设置长名称、提示避让、主动清空确认、能力/连接/分类草稿、型号trim与连接操作范围已修；原新版async owner锁、协议/CLI及配置身份保留。完整verify退出0：Node1278/14既有skip，Agent199/2既有skip，Edge629首试0flaky/0skip，UI242/0，development5步骤。当前Web和实际官方Tauri几何与bundle一致；EXEc9c3b4e/input2a09db54，Native20功能+11视觉+1中断阶段+5无秘密metadata通过，owned凭据/fixture清理完成。默认Desktop入口已切到最新工作区并实际启动；primary旧代码/并发dirty/index保留，只追加来源指针。独立c1→054源/测试审查PASS，无finding；本次所有失败与首轮Native旧fixture纠正留证。入口gzip增量0，无新依赖；Mobile/外部Provider/Hosted/签名与用户视觉接受另验。

[当前验证](changes/2026-10-15-settings-latest-ui/verification.md)和[独立审查](changes/2026-10-15-settings-latest-ui/review.md)。以下旧版本保留原义；primary51fcc+428a错误UI基线不作最新证据。

## 2026-10-15 2.1.24按钮续修本机交付

Desktop/Web2.1.24产品源码58b5c07f34718769e10b76c89d510615bea2fefc，TASK-223本地授权范围DONE/PASS。完整九步verify退出0：Node1273pass/14既有skip，Agent199pass/2既有skip，Edge608全部首试/0flaky/0skip，UI242/0，development5步骤PASS；Rust163与fmt通过。最终源码核心/UI独立审查PASS，官方CLI20项、便携CLI20项，实际Tauri官方46项、同字节便携46项通过。新依赖0，入口gzip增加1221B<16384；生产运行时4280文件/519481278B。用户确认手机布局、主题/独立背景、存储identifier/路径、原件与primary dirty/index保留；旧135任务及37功能状态逐项不变。Native Mobile2.1.1仍PLANNED；Hosted、真人CLI账号/付费Provider、签名安装器、日常资料、实体手机与用户视觉验收分别开放。

[当前验证](changes/2026-10-14-action-usability-223/verification.md)与[独立审查](changes/2026-10-14-action-usability-223/review.md)分别绑定已测产品源码。最终纯文档/输出以工程外current-release为准。

### 本轮初始候选（以下保留当时PARTIAL含义）

- TASK-223-ACTIONS-20261014从6b5a2012继续：CLI显式协议/认证、合法多行TOML与受管键、配置发布失败保全、Claude损坏env和模型JSON检查进入源码候选；TOML边界为保守词法识别，恢复副本不等于跨文件崩溃事务。
- 设置busy按操作所有者保持，记忆和本机服务检测增加迟到结果守卫；画布取消/删除/撤销、生成参数、快捷键、背景入口与短屏菜单沿现有链路修复。手机沿用已确认的新布局，原数据身份、主题与独立背景偏好保留；窄屏仍是响应式Web/WebView。
- Desktop/Web源码递增2.1.24，Mobile2.1.1规划不变；账本136项，本任务PARTIAL。当前源码冻结SHA、完整verify、官方Agent/Native重建、独立review和最终output均待回执，2.1.23历史证据保留。[本轮验证](changes/2026-10-14-action-usability-223/verification.md)。

## 2026-10-14 2.1.23按钮可用性本机交付

Desktop/Web2.1.23产品b4fa7b0e已补CLI配置/失败回执、记忆与插件保存/迟到防护、MCP停止等待及回执、备份确认、画布顶部上传删除/撤销和筛选。手机沿用已确认的新布局，补菜单层级、避让与内容边界；主题及背景偏好保留。九步verify通过（浏览器574首试），实际官方Tauri与同字节便携各35项通过，新依赖0、入口gzip增加1244B。原资料/primary dirty/index和历史失败保留；最终文档/产物身份及外部未验范围统一见[验证](changes/2026-10-14-action-usability-222/verification.md)。

## 2026-10-14 2.1.22协议/CLI本机交付

Desktop/Web2.1.22产品da6141e6完整verify通过：551浏览器首试、Node1214pass/14既有skip、Agent172pass/2既有skip、UI241/0、development5步骤PASS；Rust163与原生源一致性确认，独立源码审查PASS。官方Agent构建、真实Tauri22项和同字节便携目录23项通过，5协议文本均保存/重载/GET检测/NativeTaskHost一次POST/结果恢复，无重复；4取消/超时场景实际socket关闭且目录字节保持。手机为响应式WebView/Web，非Native Mobile。新依赖0，入口gzip增加3247B<16384；4278生产白名单519462029B，其中8个缺失的当前平台Codex必要文件407521436B已恢复，不把旧残包当同功能体积基线。原资料身份、primary dirty/index和历史失败保留。最终ZIP/源码/Web/恢复与哈希由工程外current-release收据绑定；Hosted、真人CLI安装/登录、付费Provider、签名安装器、日常资料和人工视觉验收继续各自开放。[本轮验证](changes/2026-10-14-protocol-cli-completion/verification.md)。

## 2026-10-14 UI源码候选与当前验收（PARTIAL）

最新Desktop/Web2.1.21产品提交7a463742已通过完整verify：545production场景全部首试通过、Node1142pass/14既有skip、Agent172pass/2skip、UI236/0、开发5步骤PASS。官方Agent桌面构建与真实Tauri9项检查通过，原生保存/重载、视频坐标/原件、面板层级和随包桥绝对命令均有独立数据目录回执；0e与7a两段源码独立审查通过，早期失败保留。主入口gzip增加9625B，低于16384预算；新依赖0。最终分享包与恢复增量按工程外哈希收据绑定；这些本地检查不代表未接协议、日常用户资料、安装器、Hosted和Native Mobile已验收。

### 此前阶段记录（7a463742完整验收前，保留历史）

默认绿、中性动作/胶囊/上传方角/弱焦点、独立固定大小喜欢/标签面板、收藏兼容、分类搜索、分组设置/预设、CLI子页及使用/存储概览已接入。2.1.18中间候选532browser零flaky、开发及预算通过，复审修正后533含1分组flaky，原件均保留。主目录随后推进2.1.20，凭据恢复/Agent展示/画布同步及51限定路径已逐项承接，当前Desktop/Web2.1.21组合验证中；随包Gemini桥和绝对路径命令已修正。0e5087e6的完整verify通过（544browser零flaky），实际桌面确认视频坐标和原件保存后，发现图片工具栏遮挡面板关闭按钮；共享层级修正先browser RED再8场景零重试GREEN，当前修正组合仍待完整复验和新桌面回执。最终SHA审查及发布分别收口。Native Mobile2.1.1仍规划，窄屏为响应式Web。[本轮验证](changes/2026-10-14-ui-consolidation/verification.md)、[兼容决定](architecture/adr/ADR-017-unified-ui-and-collection-compatibility.md)。

## 2026-10-14 历史冻结阶段（保留原时点与收据）

全分支/worktree/dirty来源已盘点并保存恢复refs、hash与校验bundle，原文件/index/资料保持。当前日常2.1.17源码冻结196be1de，候选version/typecheck/build和1082单测通过（14既有skip）；这是本机冻结，不是所有候选集成或正式发布。用户新增绿色/输入描边/按钮规则、固定大小拖动面板、8类协议/CLI、二三栏设置、多端和体积治理已写入[规格](changes/2026-10-14-ui-consolidation/spec.md)与[计划](changes/2026-10-14-ui-consolidation/plan.md)。新产品UI未实现、最新main组合与完整平台验收继续开放。

补充：最终Node1085通过/14skip、Agent172通过/2skip；515生产浏览器514首试通过/1flaky，相关场景5次zero retry通过，根因仍UNKNOWN。开发字体403已最小修复，694e3d18提交实测5步骤PASS/父目录403保护；原失败未覆盖。冻结提交df737905及已校验Web/恢复包已输出，后续在途源继续保留而不冒充已整合。

## 2026-10-13 日常 APP 重开验收补充（进行中）

TASK-AGENT-RECOVERY-20261013 按用户新要求复验原数据/profile，已证正常close0/reopen自动同thread及主动断开重开保持暂停、原API metadata未变。日常当前连接关闭前无已保存密钥，实钥保留保持NOT VERIFIED。发现聊天“已连接”染危险色及按钮与设置不一致，已按授权最小修复并新增RED/GREEN；共享Desktop/Web2.1.17最终门禁和日常复验进行中。原2.1.16验收仅按历史范围回读。[验收记录](changes/2026-10-13-agent-recovery/verification.md)。

## 2026-10-13 Agent 自动恢复与凭据安全保存

- TASK-AGENT-RECOVERY-20261013 产品与本地运行验收通过：项目先保存线程归属，桌面打开自动恢复同线程；主动断开/停止持久暂停，设置普通连接入口统一，高级操作折叠。
- 普通与 Google API 共用原生事务边界，跨窗口CAS/共享锁与严格读取避免误报或覆盖；系统凭据库保存秘密，读取错误可重试，输入与项目不回填明文。
- 完整verify出口0（浏览器514/514零flaky、Node1076pass/14既有skip、Agent172pass/2既有skip），Rust126/126、development PASS；canonical官方2.1.16 Agent38/38及凭据6/6正常重开通过，桌面快捷方式已更新。
- 原dirty UI、index、用户数据与凭据保留；生产源6f8ff257、测试补充1cf93cb4已有独立审查。本任务 DONE/PASS，最终文档独立补审通过；Hosted/真实Provider/签名发布/人工验收不冒称完成。详见[验证](changes/2026-10-13-agent-recovery/verification.md) / [审查](changes/2026-10-13-agent-recovery/review.md)。

## 2026-10-13 审查 P1/P2 修复与运行时边界拆分

- `TASK-REVIEW-REMEDIATION-001` 已完成定向修复：生命周期门禁、日志脱敏、插件同步/异步失败隔离和交付模板规则均有回归证据；治理、运行时、版本一致性改动分别落在独立提交 `057a5d84`、`44195097`、`f0a6b0c4`，格式和 lint 修复随后单独提交。
- `snapshot:check` 为 4/0，`governance:check` 为 124/0；定向 `docIndex`、`runtimeLogger`、`pluginLoader` 测试 43/43 通过。完整 `npm run verify` 的前置阶段和生产构建通过，但 Playwright 475 项有 5 项既有 UI 失败；`test:development` 在 Vite 启动阶段未产生 receipt，任务保持 `REVIEW/PARTIAL`。
- 工作树保留未纳入本任务的并发改动 `src/components/WindowControls.tsx`、`src/styles/composer.css`、`tests/browser/composer-voice.spec.ts`、`tests/browser/interaction-state.spec.ts`；未推送、合并、发布，也未改变其他 worktree。Hosted、Provider、Tauri、签名、安装和用户验收继续保持未验证。

## 2026-10-12 规则生命周期与治理入口收敛

按用户确认继续 TASK-GOV-003：同一任务使用稳定 `taskId`，同一治理文档使用稳定 `docId`；更新时刷新 `updated`/`updatedAt`，旧入口用 `supersededBy` 退出 current 路由。`TASK_STATUS` 已刷新为 123 条账本快照（75 `DONE` / 31 `PARTIAL` / 11 `TODO` / 4 `BLOCKED` / 2 `REVIEW`，47 项开放），`AI_HANDOFF` 已收敛为当前恢复入口，`PROJECT_STATE` 补齐生命周期元数据；`snapshot:check` 现在检查身份、来源、更新时间、替代关系和重复 current。B3-3、B4、B5 未执行。

## 2026-10-12 P1 审计收口与当前证据边界

- 当前事实已刷新：primary `codex/ui-redesign-20261011@ac5e6a4a` 在本轮开始时 clean，当前包含本轮 5 个 tracked 文件改动和 1 个新证据目录；本地 `origin/main` ref `1f6cbd37`；实时台账 123 条（76 DONE / 30 PARTIAL / 11 TODO / 4 BLOCKED / 2 REVIEW）；94 个 worktree。旧 `PROJECT_STATE` 快照不再作为当前事实。
- 修复 `scripts/governance/branch-audit.mjs` 的 Prettier 门禁失败；逻辑未改。当前 unit/deploy 现场重跑为 1004 项、990 pass、0 fail、14 skip。
- PR #53 已合并至 `1f6cbd37`，Windows/Ubuntu hook、verify、deploy-linux 为 Hosted SUCCESS，delivery 为 SKIPPED；merged-SHA 独立 review receipt、原始 artifact、签名、安装和用户验收仍未补齐。
- `TASK-WINDOWS-ENTRY-RECOVERY-003`、`TASK-AGENT-010`、`TASK-TASKSTATE-002`、`TASK-AI-GATEWAY-001` 和 `TASK-IMAGE-EDIT-VERIFY-002` 保持未完成/未验证边界；本轮未推送、合并、触发 CI、读取凭据或调用真实 Provider。
- 证据包：`docs/changes/2026-10-12-p1-audit-closeout/`。

## 2026-10-13 TASK-ENG-001 PR #56 主线承接（REVIEW / NOT_VERIFIED）

- 基于 `origin/main@bcf55851d296c753d9610e86f1e32bf8db333a41` 重建承接提交；候选精确 HEAD 以本 checkout 的 `git rev-parse HEAD` 与对应 delivery 日志为准；PR #56 原 HEAD、主线历史和 `TASK-ENG-001` 独立交付包均保留。
- 已解决 `package.json`、`docs/engineering/DEVELOPMENT.md`、`docs/governance/task-ledger.json`、`docs/governance/TASK_LEDGER.md` 四处冲突；主线版本/治理命令保留，代码健康与 Windows footgun 检查追加，账本从主线 124 条记录加上当前 schema 的 `TASK-ENG-001`。
- 修复 `**/` glob 的零层/多层目录匹配并补回归测试；补齐所有当前 workflow action 的 commit SHA 固定（含 `dtolnay/rust-toolchain` 与 stable 输入）；最终复审修复工作区的本地 lint、typecheck、1019 项 Node 测试（1005 pass、14 skipped、0 fail）、版本、治理、文档和 footgun 检查均已通过。基线缺少治理配置时工具按 fail-closed 回退 blocking，未声称 advisory。
- `9c849aa2ac640a3db4a05335a537247fbe1b2a4d` 的 Hosted quality/git-guards 全部成功；用户随后授权合并。最终独立复审仍发现 Rust action 输入、门禁映射、开关串读、重复模式豁免及清单 revision 五项阻断，因此继续在原 PR 修复并等待新 HEAD 的独立复审与 Hosted CI；本记录不表示 PR #56 已合并 main 或已发布。

## 2026-10-12 PR #55 历史快照集成修复（REVIEW）

- `TASK-GOV-005` 已登记为一次性历史快照修复任务：保留 PR #55 的 128 提交/424 文件逐项证据，不把跨任务历史成果伪装成新的单任务交付。
- 历史交付包仅在包内明确写入 `legacy-incomplete.md` 时获得有限豁免；同一变更中的新修复包仍必须具备五件套并绑定当前台账任务。
- Windows `desktopRelease` 的链接判定改为直接读取 `lstat().isSymbolicLink()`，避免 hosted runner 的 8.3/realpath 等价路径误报普通 `node_modules`；真实 symlink/junction 仍拒绝。
- 本节在本地定向测试、独立 exact-SHA review 和 Hosted `verify`/`delivery` 回执完成前保持 `REVIEW/NOT_VERIFIED`；不代表 PR #55 已合并、客户端已发布或 Hermes 已集成。

## 2026-10-12 分支收敛 P0-P1：规则门禁入主线 + 100 分支全量分类

- P0 完成：`c8807d3e` 提交规则收敛（31 文件）经 `77d42c7b` 同步基线后合入 main `8915b6ae`；TASK-GOV-003 登记 DONE；`pnpm-lock.yaml` 移出 output/；merge-ui-main 工作区在途的 CSS 清理与 test 基建保全至 `wip/ui-governance-css-cleanup-20261012`（未登记，待处置）。
- P1 完成：100 个未合并分支逐项只读核验，分类表 `docs/changes/2026-10-12-branch-consolidation/branch-classification.md`——**已完成 27 · 完成一半 68 · 未完成 4 · 无法判定 1**；测量工具 `scripts/governance/branch-audit.mjs` 可复现。
- 关键判定：10 个 PR 已集成分支登记禁合并（台账已加注释）；2 组同树孪生分支；1 个无共同祖先历史备份；58 个分支无远端副本。
- 门禁：governance 122 tasks 0 violations；lint/typecheck/delivery:check 全绿；npm test 8 失败为已记录的 symlink 环境性既有失败（PRE-EXISTING）。
- 下一步：P2 家族收敛 ×11 → B2/B3/B4 合并 → B5 UI-012 两步收敛（已授权）；合并停在本地 main 不推远端。

## 2026-10-12 分支收敛启动：规则门禁提交与 B1+B2 绑定

- `TASK-GOV-003`（B1+B2 规则体系收敛）登记为 DONE/PASS：UI_INDEX 覆盖补齐、ADR 编号去重归并至唯一目录、3 个文档门禁中 2 个接入 lint；交付包 `2026-10-11-rules-restructure` 五件套随本次提交进入版本控制。
- 移出仓库根被 ignore 的 `pnpm-lock.yaml`（governance 门禁阻断项，归档至 output/）。
- 启动 100 个未合并分支全量核验与收敛合并：分类表格与处置计划见 `docs/changes/2026-10-12-branch-consolidation/`；合并停在本地 main，不推远端。
- 本轮门禁：governance 121 tasks 0 violations。

## 2026-10-12 P0-P1 UI 收口（当前候选）

- 撤回上一条首页整体重做候选：移除全局 `competitor-ui.css` 及其营销式首页、Agent 空态和画布整体尺寸覆盖，恢复 Figma/工作台基线。
- 保留统一“扩展”入口；Skill、插件/MCP、智能体继续在同一菜单内管理。MCP 未移除。
- 图片卡片仅保留局部修正：卡片名称左上、上传按钮居中、喜欢状态保留在卡片头部；修正视频卡 370×224 布局契约、参考图删除按钮命中区和生成数量面板遮挡提示词的问题。
- 设置页保留真实行为：未接入水印能力显示禁用原因，MCP/插件删除与卸载要求确认，设置图标按 20px 统一。
- 首页 P0 局部收口：模型入口保留工作台结构但改为可读的“选模型”，扩展菜单选中态与动作项圆角对齐 token；桌面端扩展菜单向上展开且不遮挡发现区，窄屏按可用空间展开并保持输入区可关闭；修正模型未配置时重复状态提示与工具栏分组溢出。
- 首页 P1 局部收口：发现区筛选无结果时显示真实空态并可返回精选，tabs 补齐 panel 关联与方向键切换，灵感卡片增加 hover/focus 层级；扩展/模型/模式弹层按首页表单边界碰撞定位，避免覆盖提示词和窄屏发现区。未改工作台外壳或扩展入口职责。
- P1 窄屏复核：修正后置 CSS 规则覆盖导致的模型入口截断，≤1200px 恢复可读的“模型”紧凑标签；分类 chips 保持现有横向滚动规则。目录页、输入契约、弹层、响应式屏幕控件回归通过。
- P2 首页滚动后菜单定位：修正桌面首页滚动导致模型、扩展、模式弹层被压成 0px 的碰撞分支；补充滚动后菜单可见与可操作回归。
- P2 窄屏工具栏边界：≤1200px 将首页动作行收缩到 composer 内容盒，手机端隐藏不必要的分隔线，保证 360/390/768px 的操作命中区不越过卡片边界。
- P2 分类 chips 可发现性：实测 390px 首页存在 207px 横向溢出，补充基于真实滚动位置的左右渐隐提示和可访问名称；滚到末端后右提示自动收起，桌面端无溢出时不显示。
- P2 灵感卡片媒体比例：修正 390px 下缩略图被拉成近竖图的问题，统一使用源素材对应的 16:9 媒体框；补充 390/768/1280px 比例回归。
- P2 窄屏发现区可达性：补充滚动到底部后最后一张灵感卡片仍完整落在首页滚动容器内的回归，避免后续底部导航或断点调整造成遮挡。
- P2 演示卡片素材复核：当前 Figma 治理页只规定稳定媒体比例、标题/元信息/操作槽，未指定首页三张独立封面；仓库也无对应素材，保留现有本地 demo 映射，不以占位图或伪造裁剪替代，并将素材缺口留待有明确来源时处理。
- 本地验证：前端/MCP/红框 27/27，画布导航/连接/拖动/状态/数量 33/33；TypeScript、定向 ESLint、Prettier、Vite build 和 canvasGraph 单测通过。当前仍未宣称 Hosted、正式发布或用户最终验收。

## 2026-10-11 MiniMax 对照的首页、画布与会话助手重做（本地候选）

> 已于 2026-10-12 撤回，保留本节作为历史候选记录。

- 以用户提供的 MiniMax Design 桌面客户端截图为参照，将首页主入口收敛为“描述灵感 → 选择模型 → 生成并精修”的连续流程；画布图片节点拆出媒体面板、卡片上方名称/爱心/空卡片上传动作和独立输入 dock；会话助手空态改为 Agent 任务入口与建议动作。
- 图片媒体面板使用 400px 基准宽度并按上传图片原始比例计算可见高度，输入 dock 保持 520px 宽度；空图片卡片的上传入口悬在卡片外上方，已有图片只保留卡片操作；任务弹层统一为 380×420 的可读尺寸；删除按钮默认中性，仅 hover/focus/选中时显示危险色；输入框取消输入时的发光外圈。
- Tauri release 已用当前 `dist` 重建并通过隔离数据目录逐项截图：首页、空图片卡片、上传图片画布、任务列表、会话助手、首页/画布模型菜单。证据位于 `test-results/desktop/competitor-ui/`；Agent 未连接和模型未配置是该隔离环境的真实状态，未冒充 Provider 能力完成。
- 当前仍是本地候选，未做 Hosted、真实 Provider、正式发布或用户最终验收；定向 canvasGraph/imageParameters/model capability 单测 26/26，TypeScript、UI 标准、Prettier、Vite build 和 Tauri no-bundle build 通过。

## 2026-10-11 收口增量：来源契约、模型禁用态与媒体尺寸回载

- `TASK-VERIFY-ORIGIN-003` 已按来源契约升级为 `DONE/PASS`：生产浏览器固定 `127.0.0.1:1423`、端口契约和六组来源/fixture 规格已通过，exact-SHA 独立审查收据已绑定；Hosted delivery、发布与用户验收仍由其他任务负责。
- 新增 `tests/browser/model-picker.spec.ts` 的视频/音频模型禁用态验收：真实设置页创建供应商、刷新目录、键盘阅读禁用原因、Enter 不提交、Escape 关闭并恢复焦点，1/1 通过。
- 新增 `tests/browser/media-dimensions.spec.ts`：上传图片写入原始尺寸，刷新后重新打开项目并验证布局比例保持，1/1 通过；该证据只收口本地 Web 回载，Desktop/真实 Provider 仍保持开放。
- `TASK-AI-GATEWAY-001` 已由误标 `TODO` 勘正为 `PARTIAL`，保留本地实现与回归证据；真实 Ark/Codex 凭据、DPAPI、token 级上游流和 Desktop 运行态未验，不能升级 `DONE`。`TASK-TASKSTATE-002` 已补齐有界报价回执 schema、身份/冲突/快照测试，仍缺真实 Provider 回执；当前账本 120 项：75 DONE、29 PARTIAL、11 TODO、4 BLOCKED、1 REVIEW，45 项开放。
- 本轮门禁：governance 120/0、features 36/0、markdown 115/0、project goals/version consistency/platform versions 全通过；TypeScript、ESLint、UI standards、Prettier、生产构建及新增浏览器规格通过。实时 Git 快照为本地 `main@6bc45cad`、`origin/main@7736c99b`（PR #51 merge），实时 worktree 为 87 个、dirty path 为 102；工作树仍有并发改动，未推送。

## 2026-10-11 最小任务集收口：文档历史与 TaskState 001/002

- `TASK-DOCS-HISTORY-001` 已同步到权威账本并按 `dc53317b` exact-SHA 独立收据标为 `DONE/PASS`：文档历史审计修复 29 条可追踪链接，保留 8 条 `NOT_VERIFIED` 原始日志；`TASK-TASKSTATE-001`、`TASK-TASKSTATE-002` 仍为 `PARTIAL`，已补齐有界成本回执、来源/币种、任务与幂等身份绑定、重复/冲突和快照回读边界。
- 本轮证据已保存到 `docs/changes/2026-10-11-taskstate-docs-closeout/`：定向测试 30/30、全量 Node 966（957 通过、9 跳过、0 失败）、Tauri `project_package` 22/22、TypeScript、ESLint、生产构建、治理、Markdown、features、project goals、格式与文档历史审计均通过；文档历史 exact-SHA 正式审查已绑定 `dc53317b` 并为 `PASS WITH FOLLOW-UPS`，真实 Provider 回执、平台运行态与用户验收仍未验证。
- 当前账本 120 项：75 `DONE`、29 `PARTIAL`、11 `TODO`、4 `BLOCKED`、1 `REVIEW`，45 项开放。Mobile、VPS、Astra、MCP 暂不扩展；下一步只处理剩余 P1 的真实 Provider/Hosted/平台证据，避免范围蔓延。

## 2026-10-10 开发协作流程落地

- 已延续 `TASK-DOCS-STRUCT-001`，状态为 `DONE`；新增统一流程入口，覆盖任务领取、需求/验收确认、状态流转、开发笔记、成果说明、边界验证、根因闭环和竞品观察节奏。
- 最小扩展 `intent/plan/verification/review/incident` 模板，并在文档入口和 SDLC 中建立链接；产品源码、运行数据和并发中的 Tauri 改动未触碰。
- JSON、diff check、Markdown、features、project goals、governance 和 delivery equivalent 已通过；独立 review 已在 exact HEAD `8933692e` 得到 PASS/ACCEPTABLE，R-1/R-2/R-3 修正后复跑通过且无 P0–P2。重新生成的 `pnpm-lock.yaml` 已按 SHA 隔离到 `.verification/governance/`，默认包管理器仍为 npm。`TASK_LEDGER.md` 已用同一 `renderLedger` 实现重建。

## 2026-10-10 输入焦点与次级选中态收敛

根据用户对首页/对话输入框紫色外圈过强的反馈，新增主题中性的弱焦点 token（深色浅灰白、浅色中性灰，1px/1px），并将 Composer、搜索、设置、对话和阶段表单的输入焦点统一到该层级；按钮和关键操作继续使用醒目 focus token。Provider 连接项、任务评论区选择、插件节点选中及连接目标叠加态改为更轻的中性边界，保留关键连接状态的文字和颜色语义。浏览器回归补充 Composer 的 1px 与 token 绑定断言，设计系统和目录页检查覆盖搜索/设置状态。当前分支验证：输入契约 9/9、目录/设置页面 10/10、设计系统基础 6/8（另有 2 个插件卸载 fixture 超时），Node 单测 929/939 通过、8 跳过、2 个既有 desktopAgentRuntime 失败；typecheck、UI 标准、lint、governance、features、markdown、格式和 diff check 通过。Desktop/Web 生产包与用户最终视觉验收未在本轮宣称完成。

## 2026-10-10 画布点状/网状背景缩放插值修正

背景格距改为在 50%~400% 之间线性插值，不再按 2 的幂次粗化。原实现 `24 * scale * 2 ** ceil(log2(12 / pitch))` 在 49%→50% 之间把格距从 23.52px 突降到 12.00px（近 2 倍跳变），且透明度存在 `Math.max(0.2, …)` 下限，导致任何缩放下背景都不会真正隐藏。现改为：格距 12px→96px、点径 1px→8px、网格线宽 0.5px→1.5px 随缩放同步线性变化，透明度在 50% 为 0、100%（默认工作缩放）即达完全不透明并保持到 400%；低于 50% 时各项钳制在最小值且保持透明。`background-repeat: repeat` 显式声明，配合单一 pitch 变量保证任意格距下均完整平铺、无缝隙无重叠。新增 `tests/unit/canvasViewport.test.ts`（7 项）锁定上下界、连续性、单调性、点径小于格距与非有限输入契约。门禁：typecheck exit 0、lint 与 governance/features/markdown 全 0 violations、format:check 通过、单测 926 通过 / 8 跳过 / 0 失败，单 worker 浏览器回归 455/455 PASS。多分辨率浏览器交互已覆盖 390/768/1280/1440/1920，未验证 Desktop WebView2。

## 2026-10-10 浏览器并发失败原因与隔离复核（TASK-VERIFY-CONCURRENCY-002，PARTIAL）

该任务已由 PR #46 合并到 `origin/main@2b6c0ba`，合并后 run `37983272823` 的 verify、deploy-linux、upload-artifact 均成功；当前 workers 1/2/4/8/12 在固定 1423、retries=0 下均为 447/447。历史 source105 的 9 个首轮 flaky 原件继续保留，根因仍 UNKNOWN，不能把并发复现通过写成根因已修复。详见 [并发收口验证](changes/2026-10-10-verify-concurrency-002-closeout/verification.md)。

## 2026-10-10 当前主线剩余回归验证（TASK-AGENT-001，PARTIAL）

基于当前主线 `edda6157` 的隔离工作树修复并验证四类本地回归：Codex 画布来源项进入内置生图时不再被通用 API 模型门禁误拦；设置供应商下拉框与输入框共享控件几何和窄屏命中区；Google 图片归档、插件空态及开发态设置入口断言对齐当前产品语义。完整 `npm run verify` 退出码 0：Node 911（903 通过、8 跳过）、Agent 172/174（2 跳过）、UI 215/0、生产浏览器 455/455、Vite development 插件 receipt PASS。改动保存在 `codex/remaining-verification-20261010`，证据见[交付包](changes/2026-10-10-remaining-verification/verification.md)。真实 Provider/GPU、Hosted Windows 原因、Tauri release、Mobile 和用户产品验收仍未发生，`TASK-AGENT-001` 保持 PARTIAL，其他剩余 TODO/BLOCKED 任务不因本地回归自动关闭。

## 2026-10-10 多平台模型能力闭环增量（TASK-AI-GATEWAY-001）

在既有网关与 Codex Agent 链路上完成可插拔能力闭环：新增 `chat` operation 和独立文本结果，Ark 官方通道调用 `/chat/completions`；generation-server 增加安全 `/v1/models`，`stream:true` 返回单次 buffered SSE；图片模型选择器优先显示完整已验证模型 ID，Codex 图片事件沿归档、画布结果和 asset provenance 传递 `effectiveModel`，上游缺失时显示“图片模型未报告”。复用现有 credentialRef、Registry/Scheduler、ProviderConnection 和 UI Design System，不引入 headless、第二队列或第二套账号状态源。验证：gateway/Agent/model 定向回归 69 项全绿，Agent 模型选择定向回归 26 项全绿；当前主工作区全量回归为 911 项 903 通过、0 失败、8 跳过，前端冒烟 16/16，连接拖拽 7/7。真实 Ark/Codex 联调需要用户凭据，保持 NOT VERIFIED。

## 2026-10-10 豆包（火山方舟）BYOK 官方通道 P1

在现有 OpenAI 兼容 BYOK 链路上新增「豆包（火山方舟）」预置，选择预置会一次性填入名称与 `https://ark.cn-beijing.volces.com/api/v3`；修正 `doubao-*` 文本模型与 `doubao-seedream-*` 图片模型的能力判定，并保留网关通道置灰和真实上游未验证边界。补充模型预置单测、设置页浏览器冒烟和官方通道交付包。当前回归为 897 项（889 通过、0 失败、8 跳过），相关网关与画布回归通过；真实方舟 Key、Web/Desktop 真实联调和 DPAPI 仍待外部条件。

## 2026-10-09 AI 协作规则文档结构收敛（TASK-DOCS-STRUCT-001）

文档层变更，未改动 `src/**` 与 `scripts/**`。新增 `docs/engineering/CODING-STANDARDS.md`（门禁映射、依赖方向、文件规模边界、命名、错误处理）与 `docs/engineering/TESTING.md`（测试分层、Playwright 运行契约、覆盖要求、证据保存）；`docs/README.md` 升级为索引含五层权威优先级、冲突裁决细则与本地记忆四层模型；`BRANCH-POLICY.md` 补提交信息规范、worktree 落点、自动合并现状、回滚触发条件四节；`UI_RULES.md` 加 3.4 Token 化纪律；`AGENTS.md` 与 `AI_RULES.md` 明确边界。未新建 `ui-guidelines.md`、`git-workflow.md`、`UI-TOKEN-GOVERNANCE.md`，避免第二来源。

自检修正一处事实错误：`BRANCH-POLICY.md` 原文称已新增 `scripts/governance/auto-merge.mjs`，核对 `ls scripts/governance/` 确认该脚本不存在于仓库，已改为按实际记录「尚未落地」并说明阻塞原因（固定 1421/1423 端口串行验证）。10 个超限文件（含 `src/App.tsx` 3152 行）登记为技术债，未加门禁——加门禁会立即阻塞所有 PR，属需授权的结构性变更。门禁：markdown:check 104 files 0 violations，lint exit 0，governance 115 tasks 0 violations。工作区既有 3 个 `src/styles/*.css` 改动与未跟踪 `docs/decisions/` 属画布 token 化遗留，未纳入本次提交。缺独立上下文 AI review，合并条件未满足。当前 115 项任务。[本轮验证](changes/2026-10-09-docs-structure/verification.md)

## 2026-10-09 失败任务 source105 本地复验

主线仍6a97f456，实际post-main37845923441失败；PR43新source105诊断已独立PASS，完整verify出口0但9flaky原件保留，默认production1423补充447/447零重试通过。误用1431十失败和历史report误读的勘误均保留。入口原Hosted原因UNKNOWN，Recovery003、并发002和来源契约003继续TODO。当前114项{"DONE":68,"TODO":16,"PARTIAL":26,"BLOCKED":4}、46开放；原109任务/全部功能保留。最终docs/当前Hosted/普通合并和新main仍待实际回执，不预填成功。UI012原owner本轮已收尾36eb8f6、当前独立复核；UI014继续原失败；ProviderPR44当前CI。原用户数据、快捷方式、历史分支不改。[当前验收](changes/2026-10-09-windows-entry-diagnostics/verification.md) / [完整任务状态](changes/2026-10-09-image-retry-verification/status.md)。下方仅各阶段历史记录。

## 2026-10-09 统一Mask最新主线组合本地验收完成

用户授权普通合并已检查分支。PR38/40已正常合并，当前base main1d6f640及其实际post-main37806381609成功；Mask产品27b/driver-eaa承接该主线，完整445browser零retry、102Rust和fresh Agent原生Mask外0/重启/undo/凭据保护、上方操作栏/TaskHost/模型/标题栏/首屏及生产Web3宽度通过，当前独立复审。Desktop/Web2.1.11、Mobile规划2.1.1；104上游对象完整保留，106项DONE62/TODO14/PARTIAL26/BLOCKED4，44项开放。TASK-PLUGIN-DEV-001开发遮罩依然FAIL/TODO，源码与main相同；开发其余UI只在留证后Escape收起遮罩作局部检查，primary-main开发两次超时为NOT VERIFIED。真实效果/手机/用户验收仍VERIFY-002，FEAT035仍PARTIAL。最终docs独立/最新Hosted、普通合并、完整landing tree/主线FF与post-mainCI另外实际回读，不预填成功。UI012仍原执行者在途。恢复入口[本轮验证](changes/2026-10-09-unified-mask-main-integration/verification.md) / [任务状态报告](changes/2026-10-09-unified-mask-main-integration/status.md)。保留所有历史/工作树/快捷方式及用户数据，不宣称既有启动入口已换包或已发布。

## 2026-10-09 统一 Mask 承接最新主线（进行中）

用户已授权合并完成检查的分支。Mask e7cfd28在旧78cea基线独立PASS；当前承接main1d6f640（图片操作栏、静默启动、单排标题栏）。三个产品冲突逐项保留双方行为，Desktop/Web将从当前主线自动递增。当前组合尚未验证，不用历史PASS代填；新源码审查、完整两端检查和Hosted/main CI均须实际完成。FEAT-035保持PARTIAL、真实效果/真机/用户验收任务保持TODO。下方保留各旧SHA的历史事实。

## 2026-10-08 单排标题栏最新主线组合验收完成

PR38 已普通合入main2cb73d，source a550f31与landing完整tree相同，当前Hosted成功；PR38 合并后 main37797150560 verify/deploy-linux SUCCESS，delivery 按 main push 条件 skipped；实际收据已归档。 TASK-UI-013产品86e712f承接该主线，7条故障先RED后GREEN，001/002当前独立CLOSED，完整431browser（431attempts零flaky/retry）、97Rust、fresh带Agent titlebar/UI13/T511/模型/首屏及Web两态3宽度全部PASS。Desktop2.1.10/Web2.1.10/Mobile规划2.1.1；104项DONE61/TODO13/PARTIAL26/BLOCKED4，103上游对象完整保留。最终doc head补审/当前Hosted、普通PR40合并与main CI另按实际回读，不能用旧门禁代替。当前恢复入口[最新验收](changes/2026-10-08-single-row-titlebar/verification.md)及[PR40](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/40)。UI012/蒙版仍原执行者维护；保留历史、工作树、快捷方式引用和用户数据，不推断既有快捷方式已切到最终稳定包。

## 2026-10-08 标题栏承接静默启动主线

PR38 source a550f31 经独立审查与最新 Hosted37792689982/37792680207 全部SUCCESS，普通squash落地main2cb73d，完整tree相同；合并后main37797150560仍在运行。TASK-UI-013保留静默启动/首页按需加载、图片上方动作和T5生命周期；预检发现001乱序状态及002异步监听清理，真实组件7条先RED后GREEN，独立关闭和完整新组合验收待完成。当前账本104项（DONE60/TODO13/PARTIAL26/BLOCKED4/REVIEW1），UI012/蒙版原在途执行者保留。以下两侧记录按各自时间保留；不能将旧证据或中途GREEN当最终合并通过。

## 2026-10-08 启动分支最新主线组合验收完成

TASK-LAUNCH-001 精确产品5ecf77b/basef922完整428browser（428attempts零flaky/实际retry）、97Rust、fresh带Agent native UI13+TaskHost11+模型/首屏、三宽度Web全部PASS；独立task_audit_reviewer复审PASS，main102项账本和核心TaskHost/工作台行为完整保留。Desktop2.1.9/Web2.1.10/Mobile规划2.1.1；权威103项DONE60/TODO13/PARTIAL26/BLOCKED4。任务声明scope完成；最终doc head补审、当前Hosted、普通PR38合并和主线CI以实际交付回读，不能用旧提交替代新门禁。历史两侧段落保留其当时时间含义，当前恢复入口为[最新验收](changes/2026-10-08-startup-experience/verification.md)与[PR38](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/38)。UI012/蒙版在途仍由原执行者负责；未推断现有快捷方式已换成最终稳定产物，不归档其引用的树。

## 2026-10-08 已验收启动分支承接主线

用户本轮明确授权“合并已经完成检查的分支”。在原登记 TASK-LAUNCH-001 clean worktree 上串行承接 main@f922cf8e3e3318c5b01a922eaed424b11ccb2d0a；原作者已结束，root 负责本次组合与交付。保留图片卡片上方选择动作、T5 unknown/归档/重试门禁及静默启动/Unicode快捷方式/首屏按需加载。历史两侧记录逐段保留；版本承接最新主线后自动调配。组合完整验证、新 Web/Tauri、原生启动与 UI/TaskHost/模型能力回归、精确独立审查及当前 Hosted 仍待实际执行，本任务暂 REVIEW。UI012与蒙版仍由原执行者在途维护，不纳入本次合并。用户现有程序不被强制停止，快捷方式树保留。

## 2026-10-08 图片操作栏与T5组合验收完成

TASK-UI-011 产品7d27265/base78cea37完整423browser（零flaky/零实际retry）、97Rust、fresh UI13+TaskHost11+同EXE模型能力PASS；精确独立补审PASS关闭R1/R2，当前PR39 Hosted37776187321及push37776180456全部必需检查SUCCESS。图片单击仅选择，上方显示唯一标准32px动作栏；顶部/390pxHUD/重选与真实非空工作台规则均核验。任务DONE；随后仅补文档与证据，最终文档head独立/Hosted及普通合并/落地tree/主线CI另绑，不能让旧提交门禁替代新提交。

T5 PR37已合入main78cea37，source042完整tree相同；合并后main37773335548 verify/deploy-linux SUCCESS。当前本分支权威102项：DONE59/TODO13/PARTIAL26/BLOCKED4。源码Desktop2.1.8/Web2.1.9/Mobile规划2.1.1；静默启动/单排标题栏/UI012/蒙版由原执行者继续维护并分别验收，不能从本轮源码构建推断用户现有快捷方式已换包。PROV005/006、媒体/编排执行、报价回执、工具/开发插件及外部/移动/安装/最终视觉验收仍开放。

当前恢复入口：[本轮验证](changes/2026-10-08-image-selection-actions/verification.md)、[状态报告](changes/2026-10-08-image-selection-actions/status.md)、机器账本与实际PR39/main。以下各轮段落保留为当时历史，当前事实以上述精确证据及后续交付回执为准。

## 2026-10-08 T5落地与图片操作栏组合候选

PR #37 已按授权普通squash合入 main@78cea37af9359fd2d9f58f2854525516deee8a06；source04260ad精确独立PASS关闭ENV004，Hosted37770000879/37769995909全部SUCCESS、真实原生11组和策略清理通过，source/landing完整tree一致。T5 DONE，PROV005/006 TODO；合并后main CI另绑。

TASK-UI-011 在原bcc8d34上承接新main，保留T5 retryableOutputIndices及UI共享32px按钮，账本102项（DONE58/TODO13/PARTIAL26/BLOCKED4/REVIEW1）。候选自动递增Desktop2.1.8/Web2.1.9/Mobile规划2.1.1；新的组合完整verify/fresh native、精确补审/Hosted尚待实际完成，不复用旧提交CI。静默启动、单排标题栏、UI012和统一蒙版为其他执行者在途分支，分别保留验收与归属。

以下为合并前各轮历史记录；旧待验收描述不替代上述已发生的合并结果。

## 2026-10-08 图片选择动作与新页面规则返修

PR #36 已 squash 合入 main@1af0357b088df79dc51e9b309ef310a500722cf8，合并后 Hosted37756981271 verify/deploy-linux PASS。TASK-UI-011 承接该主线：单击参考/结果图片仅选择，唯一动作栏在卡片上方；保持预览/重绘/对比/收藏/删除、精确模型与原件门禁。顶部拖动和 Escape 后同图重选的三宽度恢复、非空队列/输出/评论共享32px动作已返修。最新24cfca1完整verify723root/172Agent（原skip8/2）、422浏览器无flaky/无实际retry、fresh Native13组及模型能力PASS；976db独立技术补审PASS、R1/R2 CLOSED；最终文档head/Hosted仍待满足，任务REVIEW。源码Desktop2.1.7/Web2.1.8/Mobile规划2.1.1；本分支账本100项：DONE57/TODO11/PARTIAL27/BLOCKED4/REVIEW1。T5独立21ac补审PASS但Hosted空Registry属性失败、native未启动；26边界返修后新head/CI待满足，未合入；不能将本机或旧source结果当当前Hosted成功。

下面 Model“未合并”等段落保留为当时历史，当前状态以本段与本轮 verification 为准。

先读取[本轮验收](changes/2026-10-08-image-selection-actions/verification.md)、review、task-ledger 和实际 origin/main；并发 TASK-LAUNCH-001、TASK-UI-012、TASK-IMAGE-EDIT-001 由各自执行者维护，未验收内容不能抢合或覆盖。

## 2026-10-08 统一 Mask 继续审查返修

TASK-IMAGE-EDIT-001 本地实现 DONE：源码 head64c8b9d 于23:38:25+08独立PASS，IM-010–013全部CLOSED，未发现新增P1/P2。修正跨端schema、缺失快照恢复、可撤销清空及区域意见重复；旧恢复全文结构歧义先RED后GREEN。完整verify775root/172Agent/423browser零retry/flaky、Rust102、fresh Tauri/原生11组通过，Mask外0、凭据保护/清理通过；reviewer另跑93定向和四个完整PNG保护探针，71源码/22工件匹配。收尾仅文档，最终文档head另补审；历史失败/平台中止/superseded保留。Desktop2.1.9/Web2.1.10/Mobile规划2.1.1；FEAT-035 PARTIAL、VERIFY-002 TODO，真实Provider/真机/用户视觉未验。见[验证](changes/2026-10-08-unified-image-mask/verification.md)和[审查](changes/2026-10-08-unified-image-mask/review.md)，未推送/合入main/发布。下方保留历史范围。

## 2026-10-08 统一 Mask 本地实现完成

TASK-IMAGE-EDIT-001 本地实现 DONE：三个工具共用原像素 Mask、坐标/合并/裁剪/发送/融合，灯箱与连续编辑接入既有归档及任务链。承接 main@78cea37 后，完整 verify root741/749、Agent172/174（原skip8/2）、browser420/420零重试/零flaky，Rust100、fresh Tauri 编辑验收与主线原生11组通过；实际 Web/Desktop bundle 相同。2026-10-08 20:55:05+08 的源码 head dbc88bb 独立 PASS，IM-001–009 CLOSED；reviewer 自行补跑61单测及实际 Tauri，Mask外0改动、凭据冲突保护/最终清理通过。Desktop2.1.8/Web2.1.9，保留本地任务分支，未推送/合入main/发布。收尾仅更新文档，最终文档提交另补审。FEAT-035仍PARTIAL，真实Provider效果、任意语义几何漂移、物理手机与用户视觉归TASK-IMAGE-EDIT-VERIFY-002。见[验证](changes/2026-10-08-unified-image-mask/verification.md)和[审查](changes/2026-10-08-unified-image-mask/review.md)。以下记录保留当时事实。

## 2026-10-08 统一 Mask 承接主线后的候选

TASK-IMAGE-EDIT-001 在独立任务分支承接 main@78cea37（PR #37），保留原生取消和归档修复。组合完整 verify exit 0：739 root / 172 Agent（原 skip 8/2）、420 browser 零重试、Rust 100；fresh Tauri 的 Mask、项目包、删除再生/重启和主线生命周期 11 组通过。Web/Desktop 实际生产 bundle hash 一致。源码 Desktop 2.1.8 / Web 2.1.9；正式已提交 head 的独立复验待完成，未推送本任务、合入 main 或发布。FEAT-035 仍 PARTIAL，真实 Provider/手机/视觉边界归 TASK-IMAGE-EDIT-VERIFY-002。见[组合验证](changes/2026-10-08-unified-image-mask/verification.md)。以下首轮及主线记录保留为各自当时事实。

## 2026-10-08 统一图片编辑蒙版本地候选

框选、画笔、色块产生原像素Mask，共用扩边/合并/裁剪、能力校验、Web/native模型请求、Mask内融合；保存/导出/恢复与连续编辑保持原件不可变。完整verify739root/172Agent/419browser（原skip8/2、0flaky）、Rust100、fresh Tauri两次Mask请求/包恢复/删除再生/重启通过，Web/Desktop实际bundle同hash。候选Desktop2.1.7/Web2.1.8；正式独立head复验待补，未推送/合并/发布。FEAT-035仍PARTIAL，真实Provider/语义几何偏移/真机/用户视觉归TASK-IMAGE-EDIT-VERIFY-002。[验证](changes/2026-10-08-unified-image-mask/verification.md)。

## 2026-10-08 Hosted 空 Registry 属性返修

T5当前本机/源码验收完成、REVIEW。21ac独立补审PASS、ENV003 CLOSED；其Hosted37765011214完整Web/Rust/release/Runtime通过，实际CI包装器在新建空key的Properties.Name严格模式失败，native尚未启动。修正mock空属性集合并复现真实RED；四处逐项枚举后26/26边界回归PASS，产品/harness与d521 native十一组hash不变。新head独立关闭ENV004、Hosted与主线整合仍待满足，未假填High IL。UI976db独立PASS关闭两P2、422browser/fresh Native13组通过，当前Hosted待创建。main仍1af/PR36合并后CI通过；其他执行者任务保留。

## 2026-10-08 当前合并与托管返修恢复点

PR #34/#35 已合并且合并后 CI PASS。PR #36 精确源 12f5f6ab18fec932e787a729e78994544e822708 已 squash 合入 main@1af0357b088df79dc51e9b309ef310a500722cf8，合并后 hosted run 37756981271 verify/deploy-linux PASS。本 T5 分支正在承接该最新主线，保留模型账号隔离、编辑能力和参考图去重门禁；源码 Desktop2.1.7/Web2.1.8/Mobile规划2.1.1。

T5 本机产品验收十一组与精确源码 8399 补审 PASS，但其 Hosted native 在 Runtime154.0.4258.62 下 CDP 启动失败，尚不能合并。新 CI 包装器记录实际权限，仅在托管临时 runner 准备并清理应用专属策略；19 项内存边界检查 PASS，实际 Hosted 原因与当前组合验证仍待取得。[最新验证](changes/2026-10-08-taskhost-native-lifecycle/verification.md)和[逐项盘点](changes/2026-10-08-taskhost-native-lifecycle/status.md)是当前恢复入口。TASK-PROV-005/006、外部 Provider/GPU/Comfy/VPS/Mobile/安装/视觉验收仍开放；UI 图片选择工具栏在单独任务分支进行，本树不覆盖。以下两侧迭代记录均保留为各自当时事实，历史‘尚未合并’不代表 PR #36 当前状态。

## 2026-10-08 合并审计分支与原生生命周期收尾

- PR #34 已从精确 head cddacaf squash 合入 main@5b0eb6a，tree 一致，合并后 hosted CI PASS；根 main clean fast-forward，历史分支/工作树保留。
- PR #35 阶段工作台已合入 main@5dd6e6dd，合并后 verify/deploy-linux PASS，T5 已通过 fa9da162 承接；保留唯一 Plan 入口及共享编排器。
- T5 修复图片 HTTP/响应体/结果下载取消等待和可选元数据 null 归档失败；独立审查两项 P2（凭据冲突日志、unknown 矩阵重试门禁）已返修。最新 fresh native 十一组 PASS，包含实际凭据冲突保留/脱敏、取消/恢复/原件/文本容量和无误导重试 UI。
- 独立 npm ci；最终返修完整 verify exit 0：root 708/716、Agent 172/174（原 skip 8/2）、browser 401/401 无 flaky；主线组合 Rust 97/fmt/check、新 native release 十一组通过。新增 `client:taskhost:test` 接入 Windows CI。源码 Desktop 2.1.6 / Web 2.1.7，Mobile 规划 2.1.1。
- T5 当前 REVIEW，最终精确 head 审查、PR/Hosted 与主线推广以新收据为准。[验证](changes/2026-10-08-taskhost-native-lifecycle/verification.md)与[盘点/优先级](changes/2026-10-08-taskhost-native-lifecycle/status.md)保存当前事实。
- 新增 P1 TASK-PROV-005（供应商非秘密配置的异常退出 durable 恢复）及 TASK-PROV-006（既有 native image 连接/容量/health 统一）；未实现仍为 TODO。所有 Provider/GPU、ComfyUI、VPS/Mobile 和安装/视觉终验不因本机 fixture 升级。

## 2026-10-08 桌面与网页启动体验

6fe7ccb Unicode独立补审PASS后，Hosted暴露临时目录8.3别名的测试误断言；fixture创建前用原生realpath，全部严格产品断言保留，产品源码未再改。本次native3/3及完整verify726Node/172Agent/413browser零flaky PASS；最终精确SHA收据为`startup-review-canonical-temp-20261008.md`，当前Hosted按新HEAD回读，旧失败与审查留档。

PR#38首轮7a1c3358的Hosted verify发现LAUNCH-R4：WSH快捷方式接口不能处理系统ACP无法表示的路径字符。本地增强中文+emoji路径复现RED，改为Unicode Shell Link后真实lnk/重复安装native3/3 GREEN，完整verify726Node/172Agent/413browser再次PASS；实际桌面宽接口重装成功，前端/native产物哈希不变。旧CI失败保留；新HEAD独立补审及Hosted结果分别绑定，见本轮验证追加段。

TASK-LAUNCH-001 本地AC完成：桌面/canonical快捷方式使用内嵌Logo GUI入口，实际最新release免编译窗口304ms，冷重建与正常启动均GUI退出0/无新增可见控制台；窗口Logo与原icon逐像素一致。Web首屏延后隐藏工作区并按需加载页面，历史/焦点/错误恢复保留。推送前融合最新main@1af0357b的模型能力，最终候选Desktop2.1.7/Web2.1.8/Mobile2.1.1；完整verify726/734Node（8原skip）、172/174Agent（2原skip）、413/413browser零flaky，clientcheck/newTauri与原生能力回归PASS。最新main首屏JS995,957→806,571（减19.0%）、CSS完全一致；受控5次cold中位数1656→1405ms，非线上保证。独立694a237/f74548d审查PASS、R1/R2/R3关闭，最终组合精确SHA收据见[本轮验证](changes/2026-10-08-startup-experience/verification.md)。本轮main/线上尚未推广；实际快捷方式引用本任务树，须保留至稳定产物推广。

## 2026-10-08 单排标题栏主线集成准备

用户明确授权合并已检查分支，TASK-UI-013原535 clean且原作者已结束，由root单一写入承接main f922。保留UI011图片上方动作及T5生命周期，App CSS按统一末端顺序合并。当前为预备组合REVIEW；启动PR38落地后再承接最新main并做最终当前source/fresh native/独立review/Hosted和普通合并，不把旧535的验收冒充新组合。历史双方段落保留其时间含义；UI012/蒙版仍由原在途执行者维护。

## 2026-10-08 图片操作栏与T5组合验收完成

TASK-UI-011 产品7d27265/base78cea37完整423browser（零flaky/零实际retry）、97Rust、fresh UI13+TaskHost11+同EXE模型能力PASS；精确独立补审PASS关闭R1/R2，当前PR39 Hosted37776187321及push37776180456全部必需检查SUCCESS。图片单击仅选择，上方显示唯一标准32px动作栏；顶部/390pxHUD/重选与真实非空工作台规则均核验。任务DONE；随后仅补文档与证据，最终文档head独立/Hosted及普通合并/落地tree/主线CI另绑，不能让旧提交门禁替代新提交。

T5 PR37已合入main78cea37，source042完整tree相同；合并后main37773335548 verify/deploy-linux SUCCESS。当前本分支权威102项：DONE59/TODO13/PARTIAL26/BLOCKED4。源码Desktop2.1.8/Web2.1.9/Mobile规划2.1.1；静默启动/单排标题栏/UI012/蒙版由原执行者继续维护并分别验收，不能从本轮源码构建推断用户现有快捷方式已换包。PROV005/006、媒体/编排执行、报价回执、工具/开发插件及外部/移动/安装/最终视觉验收仍开放。

当前恢复入口：[本轮验证](changes/2026-10-08-image-selection-actions/verification.md)、[状态报告](changes/2026-10-08-image-selection-actions/status.md)、机器账本与实际PR39/main。以下各轮段落保留为当时历史，当前事实以上述精确证据及后续交付回执为准。

## 2026-10-08 T5落地与图片操作栏组合候选

PR #37 已按授权普通squash合入 main@78cea37af9359fd2d9f58f2854525516deee8a06；source04260ad精确独立PASS关闭ENV004，Hosted37770000879/37769995909全部SUCCESS、真实原生11组和策略清理通过，source/landing完整tree一致。T5 DONE，PROV005/006 TODO；合并后main CI另绑。

TASK-UI-011 在原bcc8d34上承接新main，保留T5 retryableOutputIndices及UI共享32px按钮，账本102项（DONE58/TODO13/PARTIAL26/BLOCKED4/REVIEW1）。候选自动递增Desktop2.1.8/Web2.1.9/Mobile规划2.1.1；新的组合完整verify/fresh native、精确补审/Hosted尚待实际完成，不复用旧提交CI。静默启动、单排标题栏、UI012和统一蒙版为其他执行者在途分支，分别保留验收与归属。

以下为合并前各轮历史记录；旧待验收描述不替代上述已发生的合并结果。

## 2026-10-08 图片选择动作与新页面规则返修

PR #36 已 squash 合入 main@1af0357b088df79dc51e9b309ef310a500722cf8，合并后 Hosted37756981271 verify/deploy-linux PASS。TASK-UI-011 承接该主线：单击参考/结果图片仅选择，唯一动作栏在卡片上方；保持预览/重绘/对比/收藏/删除、精确模型与原件门禁。顶部拖动和 Escape 后同图重选的三宽度恢复、非空队列/输出/评论共享32px动作已返修。最新24cfca1完整verify723root/172Agent（原skip8/2）、422浏览器无flaky/无实际retry、fresh Native13组及模型能力PASS；976db独立技术补审PASS、R1/R2 CLOSED；最终文档head/Hosted仍待满足，任务REVIEW。源码Desktop2.1.7/Web2.1.8/Mobile规划2.1.1；本分支账本100项：DONE57/TODO11/PARTIAL27/BLOCKED4/REVIEW1。T5独立21ac补审PASS但Hosted空Registry属性失败、native未启动；26边界返修后新head/CI待满足，未合入；不能将本机或旧source结果当当前Hosted成功。

下面 Model“未合并”等段落保留为当时历史，当前状态以本段与本轮 verification 为准。

先读取[本轮验收](changes/2026-10-08-image-selection-actions/verification.md)、review、task-ledger 和实际 origin/main；并发 TASK-LAUNCH-001、TASK-UI-012、TASK-IMAGE-EDIT-001 由各自执行者维护，未验收内容不能抢合或覆盖。

## 2026-10-08 Hosted 空 Registry 属性返修

T5当前本机/源码验收完成、REVIEW。21ac独立补审PASS、ENV003 CLOSED；其Hosted37765011214完整Web/Rust/release/Runtime通过，实际CI包装器在新建空key的Properties.Name严格模式失败，native尚未启动。修正mock空属性集合并复现真实RED；四处逐项枚举后26/26边界回归PASS，产品/harness与d521 native十一组hash不变。新head独立关闭ENV004、Hosted与主线整合仍待满足，未假填High IL。UI976db独立PASS关闭两P2、422browser/fresh Native13组通过，当前Hosted待创建。main仍1af/PR36合并后CI通过；其他执行者任务保留。

## 2026-10-08 当前合并与托管返修恢复点

PR #34/#35 已合并且合并后 CI PASS。PR #36 精确源 12f5f6ab18fec932e787a729e78994544e822708 已 squash 合入 main@1af0357b088df79dc51e9b309ef310a500722cf8，合并后 hosted run 37756981271 verify/deploy-linux PASS。本 T5 分支正在承接该最新主线，保留模型账号隔离、编辑能力和参考图去重门禁；源码 Desktop2.1.7/Web2.1.8/Mobile规划2.1.1。

T5 本机产品验收十一组与精确源码 8399 补审 PASS，但其 Hosted native 在 Runtime154.0.4258.62 下 CDP 启动失败，尚不能合并。新 CI 包装器记录实际权限，仅在托管临时 runner 准备并清理应用专属策略；19 项内存边界检查 PASS，实际 Hosted 原因与当前组合验证仍待取得。[最新验证](changes/2026-10-08-taskhost-native-lifecycle/verification.md)和[逐项盘点](changes/2026-10-08-taskhost-native-lifecycle/status.md)是当前恢复入口。TASK-PROV-005/006、外部 Provider/GPU/Comfy/VPS/Mobile/安装/视觉验收仍开放；UI 图片选择工具栏在单独任务分支进行，本树不覆盖。以下两侧迭代记录均保留为各自当时事实，历史‘尚未合并’不代表 PR #36 当前状态。

## 2026-10-08 合并审计分支与原生生命周期收尾

- PR #34 已从精确 head cddacaf squash 合入 main@5b0eb6a，tree 一致，合并后 hosted CI PASS；根 main clean fast-forward，历史分支/工作树保留。
- PR #35 阶段工作台已合入 main@5dd6e6dd，合并后 verify/deploy-linux PASS，T5 已通过 fa9da162 承接；保留唯一 Plan 入口及共享编排器。
- T5 修复图片 HTTP/响应体/结果下载取消等待和可选元数据 null 归档失败；独立审查两项 P2（凭据冲突日志、unknown 矩阵重试门禁）已返修。最新 fresh native 十一组 PASS，包含实际凭据冲突保留/脱敏、取消/恢复/原件/文本容量和无误导重试 UI。
- 独立 npm ci；最终返修完整 verify exit 0：root 708/716、Agent 172/174（原 skip 8/2）、browser 401/401 无 flaky；主线组合 Rust 97/fmt/check、新 native release 十一组通过。新增 `client:taskhost:test` 接入 Windows CI。源码 Desktop 2.1.6 / Web 2.1.7，Mobile 规划 2.1.1。
- T5 当前 REVIEW，最终精确 head 审查、PR/Hosted 与主线推广以新收据为准。[验证](changes/2026-10-08-taskhost-native-lifecycle/verification.md)与[盘点/优先级](changes/2026-10-08-taskhost-native-lifecycle/status.md)保存当前事实。
- 新增 P1 TASK-PROV-005（供应商非秘密配置的异常退出 durable 恢复）及 TASK-PROV-006（既有 native image 连接/容量/health 统一）；未实现仍为 TODO。所有 Provider/GPU、ComfyUI、VPS/Mobile 和安装/视觉终验不因本机 fixture 升级。

## 2026-10-08 桌面单排标题栏候选

TASK-UI-013 已将桌面应用名、菜单与原生窗口控制合并为一排40px。完整 verify（723root/172Agent/411browser，原skip8/2、零失败/零flaky）、client:check、fresh Tauri 单排/真实拖动/最大化还原/最小化关闭及 Web 三档 development 验证通过；初始化错误不再影响设置入口，既有3项回归未放宽。Desktop2.1.7，Web2.1.7/Mobile规划2.1.1保持；FEAT-023仍部分实现。分支 `fix/TASK-UI-013-single-row-titlebar`，base main@1af0357b；原main未修改，独立只读6c37fb5a审查通过（2026-10-08 19:40 Asia/Shanghai），最终治理文档补审另绑，未合并/安装器/正式发布。[验证](changes/2026-10-08-single-row-titlebar/verification.md) / [审查](changes/2026-10-08-single-row-titlebar/review.md)。

## 2026-10-08 模型能力声明：Hosted日志复核后的增量修正

TASK-MODEL-001 本地AC1–5 DONE。草稿无变化通知覆盖与显示字段依赖问题已修正：32定向无retry、完整verify723/731root(8原skip)、172/174Agent(2原skip)、408/408browser零flaky、UI198/0、clientcheck/fresh Tauri隔离运行PASS。2026-10-08 16:31 独立只读审查base5dd6e6dd..head71ddb625 PASS，MC-002/MC-003关闭，MC-001保持关闭；独立87/87、389源码hash和产物匹配，新指纹2ebaab3d。最终文档HEAD需补审，PR#36当前新SHA Hosted待取得；首轮2797687c的405pass+1flaky留档，唯一因果仍UNKNOWN。未合并发布，原主checkout未写入；FEAT-003仍PARTIAL，真实Provider/蒙版/扩图/Mobile及既有开发插件边界不变。下面早先PASS条目保留为当时SHA的历史记录。

## 2026-10-08 精确账号图片模型能力声明

TASK-MODEL-001 已实现精确账号/model 图片操作三态及参考图/任务数量限额，MC-001修正统一归档素材去重和重绘预校验。当前base main@5dd6e6dd的完整verify723root/172Agent/406browser通过，原skip8/2保留且0flaky，UI198/0；client:check、fresh Tauri和隔离运行通过。候选源码Desktop2.1.6/Web2.1.7，Mobile规划2.1.1；本地AC1–5完成，独立6da9920e技术补审PASS、MC-001关闭；最终文档head补审和PR/Hosted交付收据另绑，不代表已合并/发布。FEAT-003保持PARTIAL，真实Provider和蒙版/扩图执行另验；TASK-PLUGIN-DEV-001开发插件既有错误仍TODO。见[验证](changes/2026-10-08-model-capabilities/verification.md)。

## 2026-10-08 阶段工作台主线融合

用户已授权“合并主线”。原候选ca6bc52在推送前遇到主线PR #34/5b0eb6a前移；本轮在既有TASK-ORCH-002分支融合为唯一Plan入口、TaskWorkbenchStages和共享编排器，保留主线的暂停/重规划/回执/MCP改进。候选Desktop2.1.5/Web2.1.6/Mobile规划2.1.1；97tasks/34features不新增重复登记，FEAT-030仍PARTIAL。组合本地AC完成：49/49、完整verify708root/172Agent/400browser零retry（原skip8/2）、Rust97及fresh Tauri审批/重启/真实CAS/恢复草稿通过；精确SHA独立补审和Hosted门禁另验；实际集成以本轮PR merged及merge SHA为准。下方首轮未推送/main不变等描述保留为历史，不代替当前进度。

## 2026-10-08 竞品学习与阶段计划工作台

REA拆解与KK对照形成31项结论、311条定位，映射原feature/task。TASK-ORCH-002本轮本地AC DONE：既有工作台阶段查看、plan/result审批、返工、解除/重新申请、共享宿主及保存确认/恢复已验；源码41dd865独立复验PASS，3项finding关闭。完整verify根638/646、Agent172/174（原skip8/2）、browser389/389零retry；production Tauri重启/真实CAS冲突/恢复草稿及clientcheck PASS。最终文档精确SHA补审收据另记。Desktop2.1.4/Web2.1.5/Mobile2.1.1；独立分支保留，main未改、未推送合并发布；FEAT-030仍PARTIAL，真实执行/MCP/媒体未接。见[比较](changes/2026-10-08-stage-workbench/comparison.md)、[验证](changes/2026-10-08-stage-workbench/verification.md)及[审查](changes/2026-10-08-stage-workbench/review.md)。

## 2026-10-08 未完成任务继续执行与复核返修

- 当前台账共 97 项：DONE 56、PARTIAL 27、TODO 10、BLOCKED 4。
- 已完成本轮本地闭环：`TASK-ORCH-002` 阶段计划视图与 plan/result 审批；`TASK-TASKSTATE-001` 的本地成本语义清理；`TASK-CANVAS-001` 的 Agent host/App 画布交付校验。
- 新增 `TASK-TASKSTATE-002`（P1）：等待供应商可验证报价/账单回执，定义 schema、来源和回归证据。
- 本轮源码版本：Desktop 2.1.4 / Web 2.1.5 / Mobile 规划 2.1.1；新生产 bundle 与浏览器版本显示已复验，未发布或安装新客户端。
- 继续收尾：纠正共享node_modules偏离本树lock的问题，保留原链接并建立独立npm ci安装；完整verify再次通过（Node702/710、Agent172/174，其余既有skip；浏览器388/388无flaky）。带Agent的新Desktop2.1.4 release已构建并通过隔离原生版本、项目保存/重启、确认取消/接受、画布历史与记忆保护；当前锁定产物为`index-DWwNRuIh.js`，实际TaskHost生成/Provider、安装和发布仍未验收。交付将通过本任务PR，托管检查与主线推广须回读实际head，不预写成功。
- 证据：`docs/changes/2026-10-03-incomplete-tasks/`；最终业务代码提交 `dc055566457f8413c8ac7f9cc17778a9958bd5d8`。在阶段计划、未知报价和画布交付闭环上，补齐归档失败、原生提交不确定、缺失文案正文、完整归档证据与恢复错误文案清理，并按独立复核返修原生回执身份、重复/缺失/越界输出和非法类型回退边界。全量 Node 710、Canvas Agent 174、浏览器 388、Rust 97 及静态门禁以本轮最终收据为准。
- 真实环境待验收项保持原状态：Provider/GPU/ComfyUI、Mobile、VPS、第三方 MCP 与用户视觉验收。
- TASK-ORCH-003、BACKEND-MEDIA-001和BACKEND-MCP-AUTO的代码待办可先于真实凭据实施；它们仍是TODO，真实执行验收与代码建设分开排期。

## 2026-10-03 项目建设目标与验收基线

新增 [`PROJECT_GOALS.md`](governance/PROJECT_GOALS.md)，统一记录创作、Agent、能力配置和恢复四条核心用户路径，以及代码、UI、状态链路、质量和交付标准。`scripts/check-project-goals.mjs` 已接入 lint/verify；本任务只补治理和可执行门禁，不提升外部 Provider、ComfyUI、VPS、Mobile、第三方 MCP 或用户视觉验收的状态。详见[变更验证](changes/2026-10-03-project-goals-baseline/verification.md)。

同轮 UI 门禁发现 `McpSettings.tsx` 超过 300 行，已拆为 `McpServerForm` 与 `McpServerList`，保留父组件的异步状态 owner；修复后 UI 标准检查为 194 文件/0 违规，详见[组件边界验证](changes/2026-10-03-ui-component-boundary/verification.md)。

## 2026-10-01 KK Codex 原生生图回传/归档验收

TASK-AGENT-008 本机AC-1–3 DONE：Base64事件/并发归档两组RED→GREEN，保护保留；新生产Tauri真实生图1,768,873bytes、自动归档/续聊/重连/重启hash一致、节点/标记唯一，verify632root/172Agent/377browser和Rust97/fmt/clientcheck PASS，原平台skip保留。Desktop2.1.3/Web2.1.4；实现head3c63f1e独立审查PASS，P3文档修正已完成，PR #33最终文档head补审/CI/推广以实际收据为准，不提前写合并。57/16→809/768，附加恒752，上轮长文是root验收说明。豆包区域限制登录与CLI自动回画布仍开放，详见[验证](changes/2026-10-01-agent-image-transport/verification.md)。

## 2026-09-30 Desktop NSIS 与隔离恢复验收

TASK-DESKTOP-INSTALLER-001 在本机AC1–4范围DONE：currentUser Windows x64 安装器含完整Agent与WebView2 offlineInstaller，版本/数据身份保持现行。含空格隔离路径四次安装各4279文件、Tauri启动/Agent、项目保存/重装/损坏修复/卸载再装保留全部通过；损坏setup与已有注册/portable进程拒绝保护覆盖，独立审查关闭五项finding。设置几何改为同帧采样，原限制和可见性断言保留，无retry160/160；完整verify根631/639、Agent169/171（其余原平台skip）、browser377/377无flaky，Rust97/97及clientcheck通过。原生证据独立保存并真实重跑。最终文档head补审、托管PR/CI与推广以实际PR/交付收据为准，详见[本轮验证](changes/2026-09-30-desktop-installer/verification.md)。T7/FEAT-026仍PARTIAL：干净系统、无WebView2首装、真实断网、低版本回滚、签名/正式发布与真实服务未验收；原portable交付保留。

## 2026-09-30 项目落地集成版本

已收敛两组竞品本地能力与 UI/Google/记忆/CodeBuddy/Provider 候选，保留 main 的图片比较、本机服务、插件与版本契约。修复真实项目连续原生保存、异步确认、输入区重叠、未配置反馈、项目删除保护与隔离记忆。当前 Web 2.1.3、Desktop 2.1.2；Mobile 2.1.1 为规划版本。源码集成、同状态生产 UI 与桌面重启证据见 [验证](changes/2026-09-29-project-landing/verification.md)、[全量审计](changes/2026-09-29-project-landing/audit.md) 和 [未完成项](changes/2026-09-29-project-landing/remaining.md)。主线推广结果以该集成 PR 的精确 HEAD 审查/检查/merged 记录为准。

本轮独立审查后追加修复：相连节点删除的撤销循环、90帧拖动的历史粒度与Escape取消；24项定向画布回归和最新Tauri真实窗口复验通过。返修 head 9656011 独立复审已关闭 R1/R2，完整 browser 377/377、根 623/631、Agent 169/171 通过，其余为原平台 skip；PR #17/#18 来源记录已勘误。启动脚本新增Agent/平台/Tauri配置的新鲜度输入并使用含Agent的重建命令，七项先失败后通过。两个本地候选任务据已验证范围收口 DONE，未验收功能状态不提升。旧候选证据保留，新结果使用本轮 evidence/history-fix；文档新 HEAD 补审、托管门禁及主线推广以集成PR收据为准。

初次 Hosted verify 发现两项 Windows TEMP 短路径测试预期错误：规范化路径安全实现保留，工程外 junction 重现同两项失败后改正为真实文件路径预期，8/8 及完整 Agent169/171 通过。下一提交须再独立补审并通过 Hosted 门禁，详见本轮 verification；没有把初次 CI 失败改成成功。

## 以下为历史迭代记录

历史记录中的分支、端口、尺寸、版本及待验收描述仅代表当时状态；当前事实以上述入口为准。

## 2026-09-29 Kaworkai 无限画布研究与本地增强（TASK-CANVAS-KAWORKAI-001，PARTIAL）

## 2026-09-24 Claude Code settings.json 落盘（TASK-PROV-004，REVIEW，待推送）

接续 003，把 Provider 渲染产物落进 Claude Code：agent 侧新增 `claude-provider-config.ts`——`~/.claude/settings.json` 保守 JSON 合并（只写受管键 `env.ANTHROPIC_BASE_URL` 与顶层 `model`，permissions/hooks/其余 env 逐字段保留、幂等、非法 JSON 不覆盖、baseUrl 内嵌 userinfo 拒绝）、原子写盘 0600、密钥永不落盘（认证走宿主 env 注入 → claude.ts 子进程继承）；`providers apply-claude <json> [--config-dir <dir>] [--dry-run]` CLI。

验证：test:agent 150/150（测试抓出并修复 2 处 Windows UTF-8 BOM 缺口：CLI 读配置、既有 settings.json 入口；另隔离单测目录避免与真实验证目录冲突）；真实 CLAUDE_CONFIG_DIR 验证通过——dry-run/apply、slug 剥离（`deepseek-v4-pro[1M]`→`deepseek-v4-pro`）、用户设置保留、真实文件幂等（哈希一致）；根门禁全绿（typecheck / lint 64-0、30-0、82-0 / 394 单测 / ui 159-0 / format）。HTTP 端点与宿主 env 注入仍依赖 TASK-AGENT-006 合入后接线（remaining）；Claude Code 真实消费对拍待装有该 CLI 的机器。详见 [验证](changes/2026-09-24-claude-landing/verification.md) 与 [遗留清单](changes/2026-09-24-claude-landing/remaining.md)。

## 2026-09-24 Codex Provider 配置注入与 catalog 落盘（TASK-PROV-003，REVIEW，待推送）

完成参考页只读审计与实现映射，未触发生成、上传、购买或积分消耗。KK 本地画布已接入会话快照历史、Ctrl/Cmd 撤销重做、动态右键菜单、持久化 16px 网格吸附和轻量图层搜索/定位面板，保持现有工具条与导航外框。11 项定向 Node 单测、TypeScript、Vite build、新增 2 项 Playwright 通过；既有空白新项目 fixture 使部分依赖默认节点的旧画布回归仍未通过，详见 `docs/changes/2026-09-29-kaworkai-canvas/verification.md`。

## 2026-09-29 首页与对话输入区（TASK-UI-HOME-002，PARTIAL）

按已重新授权的 Figma `483:695`/`483:753`/`407:29265`/`399:27506`/`404:28667`/`410:67357` 收口首页、对话、设置、侧栏和画布：移除首页“提示词库”快捷按钮，文件/应用菜单入口保留；首页空态为 652×170/299×170，文本区为 400×64/271×64；设置分类移到底部横向滑块，桌面/平板侧栏默认 70px 收起，展开为 291px 并推动工作区，开关图标为左小右大且展开态填充左侧小框，画布工具条固定 244×50，移动顶栏保留左侧用户和右侧搜索/设置/项目。typecheck/build、input-contract 9、composer-menu 7、frame 3、settings 3、sidebar 9、应用菜单 1 通过；canvas 图片 fixture 仍缺少 image-preview/连接卡片，已记录为后续核查项。详见 `docs/changes/2026-09-29-home-composer-fidelity/`。

## 2026-09-28 画布会话分栏与固定侧栏（TASK-UI-CANVAS-001，DONE/PASS with follow-ups）

按浏览器评论修复平板 workspace：960–1200px 打开会话时保留右侧 400px rail，画布导航和底部工具随可用区域左移；顶部控制与收起侧栏开关统一 44px 高度。侧栏展开移除 ResizeHandle，按 Workspace Figma 帧固定 291px 并推动工作区向右，收起保持 72px；低于 960px 继续使用覆盖式会话。侧栏开关使用左小右大的图标，展开态填充左侧小框。`typecheck`、`build`、定向 Playwright 和截图证据需在本轮改动后重跑。详见 `docs/changes/2026-09-28-canvas-chat-layout/`。

## 2026-09-29 项目落地与分支收敛（TASK-PROJECT-001，IN_PROGRESS）

已保存当前 UI/画布候选并开始吸收最新 `origin/main`。合并后的 image compare、本机伴随服务和平台版本能力以主线实现为准；首页/对话/设置/画布将在当前源码 bundle 上重新验收，未验证或外部受限项保持 PARTIAL/BLOCKED。

## 2026-09-29 Web 本机伴随服务与浏览器数据迁移（TASK-LOCAL-SERVICE-001）

在 `feat/TASK-LOCAL-SERVICE-001-companion` 独立 worktree 完成本机 loopback 服务和 Web 适配：服务默认绑定 `127.0.0.1:4319`，一次性配对码换取 HttpOnly session cookie；快照使用 revision CAS、临时文件和 `.bak` 恢复，素材使用内容寻址记录/原件、MIME/大小/完整 SHA-256 校验。设置 → 储存提供连接检查、断开、旧 IndexedDB 只读预检/确认导入、备份和最近备份恢复；服务启用后 `storage.ts` 与 `assetRepository.ts` 服务优先，离线/认证/冲突不静默回退。旧 IndexedDB 成功或失败均保留。

验证：`tests/unit/localService*.test.ts`、`tests/unit/assetStorage.test.ts`，真实临时服务迁移浏览器验收（1/1），连接/备份/断线验收（2/2），`tests/local-service/http-integration.mjs`，`tests/local-service/production-smoke.mjs` 均通过；类型检查、UI 标准、Prettier、Vite production build 通过。Web bundle smoke 未发现 `node:fs`、`node:http`、`node:crypto`、配对码或服务数据根常量。功能卡 FEAT-037 与本任务保持 PARTIAL：账号登录、服务安装/更新、Mobile、VPS 生产写入仍未验证。

## 2026-09-29 Desktop 随包插件 CSP 收口（PLUGIN-DESKTOP-001）

修复插件加载器的桌面路径：随包 `/plugins/*.js` 现在通过同源 ESM URL 直接导入，不再依赖被 Tauri 严格 `script-src 'self'` 拒绝的 `blob:`；远程插件仍保持 HTTPS、无凭据/片段和禁止自动重定向。12 项插件单测、TypeScript、Web build、Tauri client build 通过；fresh Tauri release 在隔离数据目录实际完成插件发现、SVG 节点添加/渲染、停用、恢复，资源记录为 `http://tauri.localhost/plugins/*.js?t=...`，页面错误为空，证据见[本轮验证](changes/2026-09-29-plugin-desktop-csp/verification.md)；独立只读 review 已 PASS、无 P0–P3 findings，PR #28 的 Hosted verify/delivery/deploy-linux 与 push verify 均成功，已 squash 合入 main@e27e209。连接器目录统一入口、远程 Desktop 插件和真实服务仍保持后续任务。

## 2026-09-28 VPS 搬迁准备（T10-PREP）

在独立 `codex/T10-PREP-vps-migration` 分支为静态包增加整包 SHA-256、已校验离机包恢复输入和指定版本回滚；激活/回滚共用发布锁，详见[搬迁与恢复操作单](../deploy/MIGRATION.md)。PR #23 精确 head `abe1e99` 经独立复审、delivery、deploy-linux、verify 后 squash 合入 `main@45fdc14`；PR #25/#26 的文档收口已合入 `main@be46ad6`，合并后主线 `verify`/`deploy-linux` 也通过。旧 VPS SSH 认证失败，用户浏览器控制页接口超时，不能据历史审计说 2.0 已上传；T10-PREP 保持 PARTIAL、T10 BLOCKED。现有 Web 数据仍在浏览器 IndexedDB，用户新目标为本机伴随服务，尚未实现。

## 2026-09-28 三端独立版本与本地数据目标

TASK-VERSION-001 在独立分支建立 `config/platform-versions.json`：Desktop、Web 与尚未发布的 Mobile 规划版本均从 `2.1.1` 起，桌面包、Web 包和运行态分别取对应版本；`version:bump`/`version:check` 用于任务作者自动选择受影响平台并校验一致性。精确 head `9d55857` 已经独立复审、PR/主线 Hosted 门禁通过并 squash 合入 `main@799efc5`，合并树一致。账号和存储仍按现状运行：Desktop 可本地使用，Web 数据仍在 IndexedDB，登录仅演示；后续目标为 Web 安装本机伴随服务、Web/Mobile 登录和设备本地数据，见[版本规则](engineering/VERSIONING.md)与[ADR-008](architecture/adr/ADR-008-platform-versions-and-local-first.md)。不能把源码版本当作已发布产品。

## 2026-09-28 对比操作合并后回归修复

PR #21 的 `bcda41a` 经复审与 Hosted 门禁合入 `main@7bc7c67`。合并后 push CI `36369533105` 发现 390px 对比按钮实测 `43.999992px < 44px`；TASK-COMPARE-002 保留断言并给窄屏控件 1px 余量。[PR #22](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/22) 当前 head `a6629ab` 的 Hosted verify/delivery 与独立复审通过，squash 合入 `main@065bcbf`，树相同；合并后主线 verify 通过。用户最终产品视觉验收与正式发布未发生。

## 2026-09-28 画布图片对比独立复审与草稿 PR

TASK-COMPARE-001 的源码 `f8d5165` 已经独立只读上下文复审 PASS，预审发现的 390px 命中区、触摸证据与功能卡状态问题均关闭。草稿 [PR #21](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/21) 已建立，首个 head 的 Hosted `delivery` 通过；本次文档补录后的最终 head `verify` 与复审、用户产品验收和主线集成仍待完成。Web 完整 `verify` 为 302/302 浏览器，Tauri release GUI 在隔离数据目录重验通过，详见[本轮验证](changes/2026-09-27-canvas-image-compare/verification.md)。FEAT-036 保持 PARTIAL。

## 2026-09-27 画布图片对比候选（TASK-COMPARE-001）

独立 worktree `codex/TASK-COMPARE-001-canvas-compare` 已实现图片卡片加入/移除对比、2–4 张并排与两张滑块、同步缩放滚动及错误重试。`npm run verify` 通过（302 条浏览器）；Tauri `client:check`、`client:build` 和隔离数据目录的 release GUI 对比操作均通过。1440/1220/390px Web 与桌面截图、运行元数据见[本轮验证](changes/2026-09-27-canvas-image-compare/verification.md)。独立最终审查、PR Hosted 检查、用户产品验收与主线集成待完成；FEAT-036 保持 PARTIAL。

## 2026-09-27 UI #19 模型菜单补查

独立只读补查发现首页在没有图片连接时仍显示可选的静态 `kk-image-2`，选择后没有连接 ID，与本轮“只列真实 BYOK 图片模型”规范冲突。已先用浏览器用例复现，再移除未绑定的菜单行；空配置显示配置入口，已保存的两个图片连接仍可键盘选择并保留连接身份。修复后 456 项 Node、320 项 Edge 浏览器及类型、UI、ESLint、治理/功能/Markdown、构建检查通过；最新提交的独立复审、Hosted 检查、fresh Desktop 和用户产品验收仍待完成。主线和正式入口未因此更新。

## 2026-09-27 UI #19 与最新主线同步候选

远端 `main@a89792ad` 已顺序合入 PR #14/#15/#16；#19 的独立工作树以普通 merge 承接该提交。六处冲突均为进度、功能登记与任务账本，按任务 ID 保留双方记录，治理检查为 72 项/0 违规，功能检查为 32 项/0 违规。运行 UI 保持已验证的 291px 侧栏与 40px 顶栏；未接线的 `tokens.css/json` 仍有 200px/56px 冲突，不能把它算作统一 token 已完成。两项浏览器偶发失败经复现定位为侧栏宽度动画中的断言和图片请求到达 Provider 前的取消，测试改为等待对应真实状态，定向重复 32/32 无重试通过。完整门禁、当前 head 的独立复审与 Hosted CI 仍需以最终提交核对；PR #20 及根工程未提交 UI 工作继续独立保留。

## 2026-09-25 真实项目侧栏整合（TASK-PROJECT-SIDEBAR-001，进行中）

在独立 `feat/TASK-UI-009-ui010-integration` 工作树，以 UI-010 已验证候选为基线承接旧 UI-009 的项目文件夹设计，同时让侧栏与搜索读取同一份真实 `CreationSnapshot`。空项目库不再显示固定演示行；创建、打开、改名和确认删除接入 App 项目操作；拖放、文件夹与置顶明确为会话态。原 UI-009 工作树未改动，1423 的 UI-010 预览保持原样。完整 `npm run verify` 已通过 370 Node、337 Edge browser；390/768/1440/1920 响应式核对无整页溢出，1424 production preview 与隔离数据的 fresh Tauri release 加载同一 JS/CSS，原生新建→改名→刷新→打开真实项目通过。独立复核和 PR 待完成；持久文件夹仍是开放验收项。证据与边界见 [本轮验证](changes/2026-09-25-sidebar-real-projects/verification.md)。

## 2026-09-24 现行 UI 与真实操作回归（TASK-UI-010，进行中）

在独立 `fix/TASK-UI-010-ui-regression` worktree 中承接新 `UI_INDEX / UI_RULES / UI_ARCHETYPES / DESIGN_TOKENS`，核对 Figma 四节点和六条浏览器批注，修复首页创作输入、搜索底部选线、持久对话、画布 HUD、设置与窄屏入口。资产管理按 A1 画廊修复 6px 文件名、22px 筛选和旧网格；提示词库按 A2+A4 调整卡片与空态。独立 reviewer 对[草稿 PR #19](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/19) 初审未发现 P0/P1，提出五项 P2；修复提交 `3db7b69` 已推送，复审确认五项均关闭、无新增 P0/P1/P2，代码审查 PASS。1440/390 共 42 个页面状态已重新截图；完整 `npm run verify` 通过 370 Node、319 browser，Web production preview 与隔离数据的 fresh Tauri release 加载同一 JS/CSS，页面错误 0。新建项目与项目库保持真实空态。侧栏静态演示项目另列 `TASK-PROJECT-SIDEBAR-001`；新增 token 导出与已验证 291/40 外壳及颜色仍冲突，在线 Ardot 未回读，用户当前 1421/旧桌面入口整合尚未完成。WorkBuddy/豆包真实接管、共享记忆与模型调度不由 UI 验收升级。证据见 [本轮 verification](changes/2026-09-24-ui-regression/verification.md) 和 [架构核对](changes/2026-09-24-ui-regression/architecture-audit.md)。

## 2026-09-27 Provider #17 承接主线候选

PR #16 已合入 `main@a89792ad`。TASK-PROV-003 的原堆叠分支仍保留供追溯；当前从主线新建 `feat/TASK-PROV-003-provider-wiring-main`，只承接此任务的 Agent 配置落盘与 CLI 代码。Codex 已要求 Responses 协议、根级模型与 catalog 配置；原堆叠实现仍使用旧 `chat` 默认值，当前正在修正并补当前主线回归。新 PR、Hosted 检查和独立复审均以新候选精确 head 为准，真实 Codex 会话消费仍未验收。

## 2026-09-27 Provider #16 源码独立补审通过

PR #16 修复后源码 `1f81322` 独立只读补审 PASS，先前中文 id 渲染、同名 seed 碰撞和功能卡状态问题均关闭；本地完整 `verify` 为 456 Node、300 浏览器，delivery 22 文件/0 违规。补录审查结论后的最终 head 托管检查尚未完成，真实 Codex/Claude 消费与 UI 接线保持后续任务。

## 2026-09-27 Provider #16 复审整改候选

独立 reviewer 对 PR #16 的 `39369c9` 给出 CHANGES REQUIRED：合法中文连接 id 的三目标渲染被静默跳过，同名不同地址 ASCII seed 撞 id，功能卡任务状态滞后。任务分支已按失败先行测试修复，Node 24 本地完整 `verify` 为 456 Node、300 浏览器、治理 70/0、功能 32/0、Markdown 85/0。修复后精确 head 的独立补审与 Hosted 检查待完成，真实配置消费仍属后续接线。

## 2026-09-27 PR #16 最新主线本地验证完成

PR #14 与 #15 已合入 `main@2683d852`，该提交的 Hosted 主线工作流 [36245503714](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/36245503714) 成功。PR #16 已与此主线合并并解决功能编号冲突：编排保留 FEAT-030，Provider Connectivity 改为 FEAT-032；本地完整 `verify` 为 454 Node、300 浏览器、治理 70/0、功能 32/0、Markdown 85/0。新 head 独立复审与 Hosted `verify`/`delivery` 仍待完成，真实第三方配置消费未验收。

## 2026-09-26 Provider Connectivity 审查整改与主线同步

PR #16 原 head 的独立审查提出 4 项 P1、2 项 P2。任务分支已按失败先行测试修复：Shell 引号、MCP 凭据过滤、Codex Responses TOML 结构、中文供应商默认 ID、Provider 键冲突、catalog 文件名边界。与 main 合并时发现 FEAT-030 已用于编排，故本功能改为 FEAT-032 并保留双方账本。完整主线验证、新 head 独立复审和 Hosted CI 仍待完成；真实 Provider/Claude 消费未验收。

## 2026-09-24 多供应商接入与多目标配置（TASK-PROV-002，REVIEW，待推送）

按用户“接入足够多的”诉求，参考 CodexPlusPlus（AGPL，仅借鉴设计）与 cc-switch（MIT）落地 4 个纯逻辑模块：统一 Provider 多目标渲染（Codex `config.toml` / Claude `settings.json` / OpenAI 兼容 env）、便携配置导入导出 v1（密钥不落文件，credentialRef 不透明引用透传）、`model[1M]` 后缀解析与 cc-switch 兼容 model_catalog 生成、MCP stdio 配置契约与命令白名单（浏览器 streamable_http 不变）。功能卡 FEAT-032（PARTIAL）与账本 TASK-PROV-002 已登记。

本地门禁全绿：typecheck、lint（eslint 0 / governance 62 任务 0 / features 30 功能 0 / markdown 82 文件 0）、394/394 单测（含新增 24）、ui:check 159 文件 0、format:check。浏览器 test:ui 与独立上下文 review 待推送后 CI/后续完成；渲染产物真实消费、catalog 指针落盘、MCP stdio 接线、导入导出 UI、聚合供应商与协议转换登记为 remaining 后续任务。详见 [验证](changes/2026-09-24-provider-connectivity/verification.md) 与 [遗留清单](changes/2026-09-24-provider-connectivity/remaining.md)。主 checkout 的 TASK-AGENT-006 未提交工作不受影响。

## 2026-09-26 编排领域层已并入主线，MCP 上限修复仍在审查

PR #14 已经在远端 main@f626438 squash 合入，合并树与受审 PR 源码树一致；阶段 UI、真实生成与 Desktop GUI 仍未收口。PR #15 已在其任务分支合入当前主线并解决治理文档冲突；MCP 第 51 项写入边界修复仍待新提交的独立复审和 Hosted CI，不能提前写成主线能力。

## 2026-09-26 编排候选技术门禁结果

PR #14 源码 `9ddfcb5` 已通过独立只读复审（未发现未关闭 P1/P2）及 [Hosted run 36218263291](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/36218263291) 的 `verify`/`delivery`；本地 422 Node、82 Rust、300 浏览器和交付结构检查也通过。当前补录审查证据的文档提交需再核对精确 head；用户产品验收、Desktop GUI/正式安装包及真实 Provider 未完成，PR 仍未合并。PR #15 四处治理文档冲突待 #14 集成后顺序处理。详见[验证记录](changes/2026-09-23-agent-orchestration/verification.md)。

## 2026-09-26 返工提示词重新审批候选

PR #14 的 `abb2bb8` 独立复审确认结果返工可执行，又发现改动已批准提示词后沿用旧批准状态的 P1，以及原提示词覆盖使同 ID 重放失败的 P2，结论 CHANGES REQUIRED。任务分支已将返工提示词独立保存为 `reworkPrompt`，改变有效提示词时整阶段与下游重新排队并返回计划审批；Web/Rust 包往返已加回归。本地 422 Node、82 Rust、300 浏览器及静态/构建检查通过，新 head 独立复审/Hosted CI 待完成。见[验证记录](changes/2026-09-23-agent-orchestration/verification.md)。

## 2026-09-26 结果拒绝返工闭环候选

独立复审对 PR #14 的 `5fff9de` 确认先前五项阻断已关闭，又发现结果审批拒绝后成功工作项无法修改的既有 P1，结论 CHANGES REQUIRED。任务分支已补宿主指定返工项及新 prompt 的路径，传递下游依赖和旧素材引用一并失效；失败先行测试现通过，本地 422 Node、82 Rust、300 浏览器及静态/构建检查通过。交付门禁、新 head 独立复审和 Hosted CI 待完成，PR #14 仍不可合并。见[验证记录](changes/2026-09-23-agent-orchestration/verification.md)。

## 2026-09-26 编排审批、依赖与并发边界修复

独立复审对 PR #14 的 `36a3419` 提出计划审批可绕过、未运行工作项可标完成、阶段工具 ABA、依赖图未执行四项 P1，以及项目包跨项目计划一项 P2，结论 CHANGES REQUIRED。任务分支已补审批标记、成功/依赖门禁、阶段及宿主审批预期 revision、跨端计划归属与图校验；本地 420 Node、82 Rust、300 浏览器及静态/构建检查通过。新 head 的 Hosted CI、独立复审与用户产品验收仍待完成，PR #14 不可合并；PR #15 的四处治理文档冲突待 #14 之后顺序处理。详见[验证记录](changes/2026-09-23-agent-orchestration/verification.md)。

## 2026-09-26 编排候选身份唯一性补查

PR #14 的旧 head `c7abc45` 已通过 Hosted `verify`/`delivery`；后续自查又发现重复阶段索引和项目内重复计划 ID 可使按身份更新误触多个对象。任务分支已用失败先行测试补 TS/Rust 校验，Web 项目包拒绝有损导出；本地 412 Node、82 Rust、300 浏览器及静态/构建检查通过。新 head 的 Hosted CI 和独立复审待完成，PR 仍不可合并；PR #15 的四处文档冲突继续按顺序处理。见[验证记录](changes/2026-09-23-agent-orchestration/verification.md)。

## 2026-09-24 编排计划重复工作项 ID 边界

PR #14 的 `67ff18fb` 独立复审确认旧计划覆写与项目包漏同步两项 P1 已关闭，但发现重复工作项 ID 可让单项更新误改已成功项。候选已在 TS 与 Rust 项目包中拒绝计划内重复 ID；失败先行和 409 Node / 81 Rust / 300 浏览器本地回归见[验证记录](changes/2026-09-23-agent-orchestration/verification.md)。新 head 独立复审与 Hosted CI 仍待完成；当前 PR 不可合并。

## 2026-09-24 Agent 编排独立审查阻断修复

独立审查在 PR #14 旧 head 发现：公开写入口可用旧计划覆盖已审批进度；Desktop 项目包拒绝 normalize 后新增的 `stagePlans` 字段，Web/Rust 包还遗漏计划工作项唯一引用的素材。当前候选已加入预期 revision 工作项更新、删除公开覆写入口、同步项目包 schema 与素材收集；407 Node、80 Rust 与 300 浏览器测试及类型/Lint/构建/治理通过。修复后新 head 的 Hosted CI、独立复审和 Desktop GUI 尚未验收，PR #14 仍不可合并；详细证据见 [验证记录](changes/2026-09-23-agent-orchestration/verification.md)。

## 2026-09-24 Agent 阶段审批边界

`TASK-ORCH-001` 候选新增失败先行测试，确认 Agent 的计划状态工具原可直接批准计划/结果并解除阻断。工具现只允许从执行中发起审批或阻断；宿主审批与重试入口保留决策权。当前代码重跑 405 Node、300 浏览器回归及类型/Lint/格式/构建/治理门禁均通过；最终独立复审、Desktop 与真实 Provider 未验收，候选继续保持 PARTIAL。

## 2026-09-24 编排计划持久化边界修正

独立预检在 `TASK-ORCH-001` 候选发现两项问题：同 id 计划重放会清空已完成阶段与素材引用；不完整的 `plan_patch_stage` 输入会先报成功、重载时再丢失。现已改为同定义重放保留进度、不同定义拒绝覆盖，并在写入前校验输入与存储 schema。定向测试先失败后通过，完整本地检查与未完成的独立复审状态见 `docs/changes/2026-09-23-agent-orchestration/verification.md`、`review.md`。领域能力仍为 PARTIAL，不代表 UI、真实 Provider 或发布验收。

## 2026-09-23 编排候选重试边界补充

竞品规划复核发现 `TASK-ORCH-001` 候选中的新任务态辅助函数与现有恢复门禁冲突：原函数对 `unknown`/已提交任务禁止普通重试，新函数却允许并选入 `unknown` 输出。现已复用原有 `taskRecovery.canRetryTask`，失败子项仅选确定失败的输出；先失败后通过的定向测试 12/12、全量 Node 单测 399/399、TypeScript 检查通过。候选仍为 PARTIAL，UI/真实 Provider 与 Desktop 运行验收未因此完成；细节见 `docs/changes/2026-09-23-agent-orchestration/verification.md` 的补充勘误。

## 2026-09-23 波次A 竞品对齐：Agent 编排与画布交付契约（分支已推送）

- 按《KK-Studio-竞品对齐-项目规划》波次 A 落地领域层：对标竞品 MiniMax Design media-agent 的 Stage 状态机、canvas 交付契约与统一任务态。
- 新增 `src/domain/stagePlan.ts`（doing/plan_review/blocked/result_review/done 五态 + CAS 乐观锁 + 非法迁移拦截 + 审批门推导 + 失败项 requeue + normalize 白名单 + zod）、`src/features/creation/taskState.ts`（9 态统一任务态契约/可重试/失败输出子集/成本估算）、`src/features/agent/orchestrator.ts`（编排器物化/审批决策/阻断/失败重试 + plan 工具面四工具，MCP 注册归 BACKEND-MCP-AUTO）。
- 修改 `src/features/creation/model.ts`（CreationProject.stagePlans 可选字段，兼容旧快照）、`src/features/agent/agentCanvas.ts`（交付契约：无 node_id/未注册资产即拦截 + 当轮产物收集/摘要）、`src/features/agent/agentHost.ts`（可选注入 orchestrator）。
- 验证：`npm run verify` 全绿——lint（eslint 0 + governance 66 任务 0 违规 + features 31 功能 0 违规 + markdown 83 文件 0 违规）、typecheck、399 Node 单测（新增 40 项）、ui:check（159 文件 0 违规）、format:check、300 浏览器测试；delivery:check 待本文件更新后复核。
- 治理：功能卡 feat-030/031（PARTIAL）、registry +2、账本 +5（TASK-ORCH-001 IN_PROGRESS 唯一活动任务，TASK-ORCH-002/003 TODO，TASK-CANVAS-001/TASK-TASKSTATE-001 PARTIAL）、交付包五件套 `docs/changes/2026-09-23-agent-orchestration/`。
- 分支 `feat/TASK-ORCH-001-agent-orchestration-closure` @ `D:/kk-studio/.worktrees/TASK-ORCH-001` 已推送 origin（commit 1863ea8，base origin/main @ 9f04bfc）。能力按 PARTIAL 标注，不冒充 REAL。
- 后续：TaskWorkbench 阶段计划视图与审批交互（TASK-ORCH-002）、编排器驱动真实生成（TASK-ORCH-003）、plan 工具 MCP 注册（BACKEND-MCP-AUTO）、媒体真实链路（BACKEND-MEDIA-001）。

## 2026-09-24 竞品对标后的 MCP 配置一致性

`TASK-MINIMAX-001` 分支修复手动 MCP 服务器列表第 51 项可写、重启后整表被判损坏的问题：写入前使用与读取相同的 50 项上限，同 id 更新仍可进行。补齐新工作树的 Agent/插件构建前置后，371 Node 与 300 Web 浏览器回归、类型/Lint/格式/构建/治理检查通过；初次环境失败及恢复见 [本轮验证](changes/2026-09-24-mcp-registry-limit/verification.md)。对照当前 MCP 官方协议说明又发现客户端仅固定 2025-11-25，2026-07-28 modern 协商缺口已列 `TASK-MCP-PROTO-001`。历史 MiniMax UI 审计仅保持原时点含义；真实第三方服务器、Tauri release 和付费能力未在本轮验收。

## 2026-09-23 Google 对话、生图与账号登录候选（TASK-AGENT-004/005，PARTIAL）

Google API Key 通道已接入官方 Interactions：连续文字对话、图片结果归档画布、刷新后会话恢复；另接入用户自行启动的本地 Gemini CLI 桥，支持 Google 账号登录后的文字对话和会话续接。CLI 模式不提供图片生成，图片需使用 API Key 通道。设置页已修复密钥输入和两种登录方式切换，桥限定本机地址/可信 Origin、传入 CLI 的参数边界与取消后子进程回收；结果不确定时阻止自动重试。

Web 生产预览与 fixture 浏览器流程、单元测试、Windows Rust `client:check` 已有本地证据；最终全量验证与交付状态见 [004 验证](changes/2026-09-23-google-interactions/verification.md)和 [005 验证](changes/2026-09-23-google-cli-login/verification.md)。本机没有 Google API Key 或已安装/登录的 Gemini CLI，因此未作真实 Google 请求，也未验证本轮 Tauri 桌面运行或获得最终独立补审。上述两任务保持 IN_PROGRESS/PARTIAL，不将 fixture 图片当作真实出图。

## 2026-09-24 CodeBuddy CLI 受控委派

- Codex 主 Agent 现在有 `codebuddy_consult` MCP 短文本工具；本地设置可保存 CLI 绝对路径并执行真实连通测试。子进程固定禁用工具/会话持久化，限制文本、输出、时长与并发，不继承 KK Token/Provider Key。
- 此机已登录 CodeBuddy CLI、真实 MCP、随包 MCP、新 Tauri UI 保存/测试及 KK 内 Codex 实际工具调用与可见回复均通过。完整 verify 为 416 Node、310 browser；Agent 135 通过/2 Windows 跳过，新 MSI/NSIS 在最终修补后重新构建。第一次桌面测试 120 秒超时，最终新包复测约 145 秒成功，其中工具本身约 8 秒；高效自动路由仍待做。WorkBuddy 原生 OAuth、豆包/千问及素材站未接入；FEAT-009 仍 PARTIAL，证据与路线见 [验证](changes/2026-09-24-codebuddy-delegation/verification.md)、[剩余顺序](changes/2026-09-24-codebuddy-delegation/remaining.md)。

## 2026-09-24 记忆候选复核与修补

- 独立代码评审指出并发覆盖、提炼误收旧/未完成回复、损坏文件重复读取及旧 Web 数据未迁移；现已增加 Desktop 写锁和版本比较、Web IndexedDB 原子比较、冲突重试、按本次 `clientMessageId` 和完成阶段提炼、稳定错误回调、旧候选数据库迁移。Desktop 与 Web 没有共同写锁，Web 授权共享目录现只读，私有 IndexedDB 仍可写且可切回。
- Desktop 重置改为先复制备份、再原子写入；写入失败时原文件仍可读。完整 `npm run verify` 通过（415 Node、309 browser），Rust 91/91；真实 FSA、Desktop release 与模型引用仍待验收。旧验证数字见下方历史记录。
- FEAT-020 保持 PARTIAL，原先"Codex/豆包/WorkBuddy 已共享"和"绝不上云"表述已纠正：当前仅 KK Studio 的 Codex 对话使用记忆；完整文件不云同步，选中的片段会用于当前模型请求。
- 修补了 Web IndexedDB 仓库冲突、损坏记录清空、Desktop 首写缺目录与备份失败后继续重置、模型回复自动入库等问题；真实系统目录授权和跨应用联调仍未验证。
- 本轮 `npm run verify` 通过（408 Node、308 browser），Rust 88/88；Web 1920/390 截图与未完成项见 `docs/changes/2026-09-24-local-memory/verification.md` 的新增勘误。

## 2026-09-24 本地长期记忆接入对话（TASK-MEMORY-001 + 002，历史候选）

- FEAT-020 由 PROTOTYPE 升级为 PARTIAL：真实用户级本地长期记忆落地，**本机共享**（`~/.kk-memory/memory.json`，Tauri 命令 + Web File System Access 授权，旧隔离文件一次性种子迁移）。
- 能力：本地规则自动采集（用户/assistant 偏好、习惯、约束）→ 词法检索注入 `[长期记忆]` 块（发送前，执行器零修改）；设置 › 连接 › 记忆 真实 UI（开关、共享状态、授权目录、列表/删除/清空、手动 Codex 提炼、重置共享文件）。
- 跨产品打通：Codex（桌面/Web）、豆包（Doubao Work Agent）、WorkBuddy 共享同一份记忆（`docs/MEMORY-CONTRACT.md` 契约）；换账号手动清空/重置。
- 硬约束落地：仅存本地、绝不上云（不进 WebDAV 同步/localStorage/日志/导出包）；默认关闭；真实账号 id 绑定依赖 FEAT-017。
- 验证：Node 单测 404/404（记忆模块 34 例）、typecheck/lint/governance/features/ui:check/format 全过、Rust 84/84、Playwright 303+1 已知 flaky 无失败；文档在 docs/changes/2026-09-24-local-memory/。待 commit/push 与 PR。

## 2026-09-23 2.1.0 源码并线与远端规则回读

- [PR #9](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/9) 的 head `da811283` 在 hosted `verify`/`delivery` 通过后 squash 合入 `main@b45c5bc7`；旧 PR #8 的提交是 #9 候选的祖先，内容被吸收，PR #8 已关闭而未重复合并。[PR #11](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/11) 再将规则与 Markdown 审计 squash 合入 `main@9f04bfce`；两次合并的文件树均与各自受审候选相同，本地根 `main` 已快进至后者。
- 用户确认仓库公开；三套远端 ruleset 已 active，`main` 有效规则含 PR、必需检查、禁删除和非快进。#9、#11 合并后的 `main` 工作流均最终 success（#11：[35841965161](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/35841965161)）。正式 2.1.0 tag、安装包、签名和用户发布验收未完成，Desktop 插件问题仍在 PLUGIN-DESKTOP-001。
- TASK-RULES-004 从 #9 合并后的 main 仅承接原堆叠 PR #10 的四个任务提交，文件树与旧 head 一致。完整本地 verify 为 370 Node、300 browser 全通过，最终 `dfed074` 的独立 AI 复审和 hosted PR/push 检查均 PASS；#11 已合并，#10 已关联关闭而未重复合并。旧分支及其它 dirty worktree 保留；具体分支分类见[承接验证](changes/2026-09-23-rules-audit-main/verification.md)。

## 2026-09-23 规则与 Markdown 审计（原堆叠 PR 阶段快照）

在 2.1.0 候选 `da811283e55ce699e4c5425d92ad31ffba7513e3` 上核对了共同规则入口、账本、PR/CI、本地 Git 防线、现行 Markdown 链接与历史证据边界。现行文档中的设计来源、已知问题、版本交接、分支清理和交付文件数已按当前事实整理；现行 Markdown 相对文件链接加入本地 lint 检查。结构检查不能证明模型读懂规则，PR #9 的 hosted 检查仍因账号付款或 spending limit 在步骤前失败；main、tag、安装包及远端强制保护没有因此完成。具体差异、验证与独立复审见 `docs/changes/2026-09-23-rules-audit/`。

## 2026-09-23 KK Studio 2.1.0 源码分支已上传（REL-2.1.0，本地验证完成）

统一 package/npm lock、Tauri/Cargo、应用显示、插件运行时和 MCP 客户端版本为 2.1.0，新增 `VERSION` 与 `CHANGELOG.md`，并将当前已授权的功能与文档候选绑定到同一 Git 任务分支。用户数据存储 key、应用 identifier、历史 2.0.0 证据和恢复归档保持不变。安装包、代码签名、真实 Provider/ComfyUI、Hosted CI、PR 合并和正式 main tag 仍需单独门禁，不以本地源码上传代替。

独立预检发现远程 HTTP 插件可被替换并在应用权限下运行；已在加载器阻止明文/凭据/片段 URL、所有远程自动重定向（含 HTTPS→HTTP→HTTPS 中间跳转），以及旧版明文缓存重启执行，并向用户提示信任边界。独立补审在受审源码 `15f1f27` 范围内未发现未关闭 P0/P1。另确认 Desktop CSP 阻止当前插件 `blob:` 模块，登记 PLUGIN-DESKTOP-001；Web 插件验证不代表桌面可用。

验证与远端 SHA 见 `docs/changes/2026-09-23-release-2-1-0/verification.md` 和 `release.md`。

## 2026-09-23 Agent 图片与画布控制（TASK-AGENT-003，DONE/PASS，未提交）

已复用 infinite-canvas Agent 附件/localImage 与画布工具协议，接入 KK 本地原件、显式画布引用和真实控件。最多6张/单张8 MiB，导入失败阻止提交，Agent/API草稿按项目隔离；MCP支持单/多/空选择和视口移动缩放及恢复。保留 UI008 的 Design System 1.3 共享输入框。本轮未发送Agent草稿只在页面会话中保留，不承诺刷新恢复。

原工程完整verify 363 Node/299 browser全过，UI159/0、57任务/29功能0违规；26文件独立dirty预检PASS，R1–R3关闭。新Tauri release的实际JS/CSS与dist一致，真实Codex识别两张原件且发送哈希一致，随包MCP与视口重开恢复通过。58个范围内文件回写时2,277个非本轮文件保持原样；最终生成证据恢复/保留情况见本轮evidence/preservation.json。未commit/push。

旧Agent源码快照522输入重新比对，494未变、28为此前UI008或本轮有记录的差异；其中66个原生/Agent后端/打包输入零漂移。旧EXE和测试数字保留历史含义，新资源以本轮验证为准。TASK-AGENT-002、FEAT-009/012仍PARTIAL；参考图编辑、站内工具、TTS/视频、其他产品适配、通用MCP、付费Provider与正式发布继续按清单办理。当前清单与证据：docs/changes/2026-09-23-agent-attachments/remaining.md、verification.md。

## 2026-09-23 创作输入框规则与实现（TASK-UI-008，DONE/PASS，未提交）

Design System更新为1.3，先补输入结构、字体、图标与命中区、单一焦点和三档分行契约。首页/API/Agent共用ComposerTextarea与composer.css；文字自增长、附件/型号参数进入流布局，宽首页一排、手机首页和触屏对话按功能两排。修复首页发现区重叠、菜单遮住第二排按钮、短桌面发送不可达和菜单滚动回顶。

原工程完整verify为356 Node/295 browser，UI159/0、56任务/29功能0违规；独立R1–R3和断点补审PASS。带现有已校验Agent资源的新Tauri，实际JS/CSS与Web/dist一致，32组首页/对话主题检查及原生交互通过。受审任务增量已回传，测试生成旧证据恢复，无关文件与并发任务保留。验证与三档截图：docs/changes/2026-09-23-input-contract/verification.md。

真实手机/平板软键盘、用户视觉确认、在线Ardot写回以及真实Provider/其他Agent/云服务继续保留各自验收边界；本批不改变服务能力状态。原工程为当前运行来源，未commit/push。

## 2026-09-23 三档响应式与图标对齐（TASK-UI-007，DONE/PASS，未提交）

Design System更新为1.2，先纠正旧手机常驻轨道、平板窄条对话和桌面整页缩小规则。手机全宽/底部导航、平板72px轨道/400px对话、桌面291/70px轨道/470px对话已落实；图标居中、明确分行、设置与新增页面统一适配。修复短高侧栏重叠、隐藏焦点、跨断点嵌套菜单和短屏发送裁切，保留草稿与原有世界坐标。

已保留并发TASK-AGENT-002回传，只同步UI增量。最新原工程356 Node/286 browser全通过，UI157/0、55任务/29功能0违规；独立R1–R3补审PASS。带Agent资源的新Tauri实际JS/CSS匹配dist，16组合与原生交互通过。相关命令、首次失败、缓存重建和遗留配置测试污染修复均如实记录在docs/changes/2026-09-22-responsive-ui/verification.md。

手机/平板目前是浏览器适配证据，缺少移动Figma Frame、真实设备软键盘和用户视觉确认；在线Ardot回读、真实Provider/其他Agent/TaskHost/ComfyUI等继续按各自清单验收。原工程为最新运行来源，UI隔离worktree保留起始候选用于diff追溯。

## 2026-09-22 Desktop Agent 托管与旧记录复核（TASK-AGENT-002，PARTIAL）

Windows Agent 托管子项完成：设置支持随包启动/连接、健康状态、停止和退出回收；Node/Agent/Codex 不依赖全局 PATH 或开发源码。使用随机 loopback 端口、内存 Token、同数据目录单实例锁和 Windows Job Object。停止前原子关闭接单，正常停止等待旧进程退出；外部 Agent 不受影响。

当前候选验证：356 Node、270 browser、78 Rust，Agent126通过/2个POSIX权限测试在Windows跳过，lint/typecheck/format/UI/build通过。真实Tauri的8项检查与空会话7项检查通过，含真实Codex回复、随包MCP读画布、同线程重启/二次启动恢复、正常/强退回收12个自有进程。干净目录npm ci、356单测和production build通过。独立增量预检PASS，无未关闭P1/P2；不是正式PR审批。2026-09-23已回传原工程，并保留后续TASK-UI-007并发改动；组合版本复核356 Node/286 browser通过，最新原工程EXE重新完成真实8项与空会话7项Agent检查。522个源码输入复测前后无变化，2,062个已登记非本轮文件按并行更新后的复测前字节保留；详见本轮evidence/integration.json。

旧完成声明已按当前源码与产物核对：旧Agent源码清单与本轮起始树380/380相符；旧DS/UI截图和旧EXE只作为历史记录，新前端由当前Web回归与Tauri资源哈希重绑。无环境Token落盘、vendor源码被忽略导致干净交付缺失的问题已修复。未commit/push。

TASK-AGENT-002整体保持PARTIAL：Proxy托管、Google/Antigravity/豆包/WorkBuddy适配、后台网页并发、非兼容API逐家验收、音视频、Agent附件/参考编辑和通用第三方MCP仍在清单。真实付费Provider、完整TaskHost恢复与正式发布未由本轮替代。当前清单与验证：docs/changes/2026-09-22-agent-desktop/remaining.md、verification.md。

## 2026-09-22 默认 Codex 与统一模型入口（TASK-AGENT-001，PARTIAL）

KK 对话已通过本机官方 Codex app-server 使用现有 ChatGPT 登录：真实回复、画布 MCP、刷新恢复、账号模型和额度、内置生图归档均有 Web 运行证据。新增 dev:agent 启动器、分级/全部模型菜单、按 API 连接身份刷新模型与声明尺寸；主 Agent 可复用本项目图片/文本任务。代码保留 KK 自有 UI 与 vendor 隔离，未提交/推送。

完整验证、独立审查和使用方法见 docs/changes/2026-09-22-codex-default-agent/。首轮回归失败及修复一并记录；不用历史测试数字代替当前结果。Tauri 一键启停、Google/豆包/WorkBuddy 登录适配器、后台网页登录并发与非兼容协议列入 TASK-AGENT-002；真实付费 API 逐厂商和 Desktop 同态验收仍未完成。不要把可见菜单描述为这些适配器已可用。

补充验收：连续两轮真实 Codex 共享线程且刷新无重复；模型末尾分辨率/质量作为参数映射精确型号 ID；顶部支持厂商/模型/尺寸/比例与有限拼写建议。原工程完整 verify 为 351 Node、266 browser 全通过，UI153/0、29功能/54任务0违规；独立重连竞态复核 PASS。原工程已回传并重跑真实连续对话/额度，开发入口1421正在运行，未验收Tauri本轮发布。

## 2026-09-22 折叠、弹层与画布显示（TASK-UI-006，DONE/PASS，未提交）

已修复12处有复现证据的UI缺陷：项目/生成/保存状态纳入HUD统一布局；20%点阵与网格保持可见；项目分组折叠保留会话状态，隐藏菜单正确清理；添加菜单、顶部菜单、任务列表与详情遵守重复点击/Escape/回焦；Modal拖出不误关；390px打开对话入口不再裁切。

原工程完整verify通过327 Node/261 browser，0失败/0flaky/0skipped；UI144/0，lint/typecheck/format/build通过。独立23文件预检PASS；fresh Tauri release的实际JS/CSS与dist逐字节相符，16组合与原生开关/折叠/嵌套/拖出验证通过。只回传受审增量，保留其余dirty状态；测试生成的旧证据与schemas恢复到运行前字节。

完整证据见 `docs/changes/2026-09-22-ui-interactions/verification.md`。在线Ardot、缺失页面Frame、用户视觉验收以及真实Provider/CLI/GPU/MCP、TaskHost恢复、ComfyUI/TTS/平台服务与正式发布继续保持各自任务状态。本批不升级这些能力。

## 2026-09-22 新增功能 UI 接线（TASK-UI-005，DONE/PASS，未提交）

本轮按用户要求优先检查 UI 与真实功能的对应关系，核对 29 项功能。已补图片/本地 Agent 双通道、首次会话准备与 warning/错误/审批状态、画布插件管理入口、提示词库浏览与应用、文本方式实际改写输入，以及音频演示和 Web/Desktop 平台说明。

独立审查发现的真实 SSE/hello、warning、迟到审批、重连操作锁与并发会话准备问题已修正。会话准备采用独立受版本校验的接口，旧服务明确返回不支持；agent:build 安装受版本控制的局部集成，避免改动既有 threads/new 语义。最终独立复核PASS；原工程完整verify327 Node/241 browser、UI142/0通过。新Tauri实际资源校验、16组合与两次启动验证通过。TASK-UI-005已关闭；用户追加的折叠/弹窗/重叠/点阵缩放交互由下一任务继续。

UI 范围及证据见 `docs/changes/2026-09-22-ui-feature-parity/verification.md`；剩余事项继续由 `docs/changes/2026-09-22-design-system/remaining.md` 与账本管理。真实 CLI/Provider、TTS/ComfyUI/WebDAV 完整产品链、在线 Ardot 和用户视觉验收未被本批替代。

## 2026-09-22 Design System逐页迁移（TASK-DS-002，DONE/PASS，未提交）

项目库、Skills、ComfyUI目录、Skill编辑器和设置分区已按1.1共享规范迁移，补浅色侧栏SVG辨识、长分类换行与清晰选中边界。保留既有Landing/Workspace几何和业务边界。独立预检发现的两项P2已修复并复核PASS；菜单End回归改为核对并发加载后的实际末项，不再假设SVG固定最后。

原工程完整verify为309 Node/229 browser，0失败/0flaky；UI137/0、lint/typecheck/format/build通过。原工程新Tauri release实际JS/CSS字节校验、16种主题/强调色与两次启动复验通过，偏好和本地Skill记录保留。只回传本任务增量，未commit/push。

TASK-DS-001/UI-001/UI-004保持PARTIAL，在线Ardot、缺失Frame与用户视觉验收继续保留；T5任务恢复/health、T6执行、真实服务与发布未被本次UI证据关闭。详见 `docs/changes/2026-09-22-design-system-pages/verification.md` 与 `docs/changes/2026-09-22-design-system/remaining.md`。下一优先项为T5完整进程恢复与health回写。

## 2026-09-22 Design System校正（TASK-DS-001，未提交）

已按用户7页PDF完成Design System审计与v1.1校正，现行颜色/基础组件规范统一为 `docs/DESIGN-SYSTEM.md`；保留旧页面几何。公共控件、状态配对和双主题8色偏好已接入现有v1存储。完整verify307 Node/219 browser通过，独立dirty-diff预检PASS；随后修复设置插件破图并定向复验。已仅回传本任务增量到当前工程，保留并发Agent/插件业务；回传后309 Node、13项相关浏览器、lint/typecheck/format/UI/build全部通过。

TASK-DS-001、UI-001、UI-004保持PARTIAL：在线Ardot未写入，新样式Tauri运行与全页面视觉验收仍待完成。详细命令、文件指纹和当前工程回传结果见 `docs/changes/2026-09-22-design-system/verification.md`，剩余事项见同目录 `remaining.md`。未commit/push。

## 2026-09-22 文本任务与规则审计（当前，未提交）

- 唯一工程仍为 D:/kk-studio/KK-Studio-2.0，分支 chore/TASK-CONSOLIDATE-200，HEAD cf344ddcdf039c6e62aeb9c65106e2a2339c0bb4 + 未提交工作区。遵从用户要求，未 commit/push。
- TASK-RULES-003 DONE/PASS：精确卡片状态、真正开放任务、REAL非空代码/测试/入口与DONE/PASS任务、分平台运行证据、仓库内路径与异常字段门禁已修复；README/TASK_LEDGER是生成视图，功能卡可维护。现有28功能、48任务，门禁0违规。
- BACKEND-TEXT-NODE / FEAT-008 PARTIAL：Web SSE与原生TaskHost已实现；输入4,000字、输出32 KiB，完整终止才成功，未知受理不能普通重试。修复长文案保存、用户编辑被恢复覆盖、来源删除后迟到提交、原生并发占用重载泄漏及错误事件假成功。
- 完整npm verify：227 Node、210 Playwright/Edge、0失败/0flaky；lint/typecheck/format/ui129/0/build通过。Rust74/74、fmt/check、Tauri no-bundle build通过。development1421、preview1423、Tauri release各有证据，Desktop加载index-C7-jQxHk.js。独立dirty-diff预检PASS，不能当正式PR审批。
- 勘误：FEAT-003/005/009/026缺相应证据或旧能力描述不实，保持PARTIAL；旧“FEAT-003 REAL”和“多轮chat已接入前端”不能继续沿用。已登记BACKEND-CONVERSATION；视频/音频仍为演示。
- 剩余：真实付费Provider、完整T5进程退出/恢复及原生health回写、ComfyUI/MCP/平台服务、Hosted CI/正式PR/发布未以fixture代替。证据与审查见[本轮verification](changes/2026-09-21-text-and-rule-audit/verification.md)及[review](changes/2026-09-21-text-and-rule-audit/review.md)。

## 2026-09-21 功能登记体系建立与图片参数后端化样板（IMPLEMENTED，未提交）

- 任务 FEATURE-SYSTEM：新增 `docs/features/` 功能体系——28 张功能卡（`feat-001~028`，固定五段结构）、机器可读权威 `features.registry.json`、脚本生成看板 `README.md`、卡片模板 `_feature-template.md`、演示后端化四波路线 `BACKEND-ROADMAP.md`；功能状态 REAL/PARTIAL/PROTOTYPE/PLANNED 与任务状态正交。门禁 `npm run features:check`（卡片章节、代码/测试路径、账本任务、非 REAL 挂开放任务、磁盘卡片登记、看板一致性）已并入 `lint`/`verify`。AGENTS.md、AI_RULES.md、SPEC_BASELINE.md 同步新功能流程与状态口径；账本新增 8 个任务（共 46）。
- 附带修复 UI-SKILL-POPOVER-001：内置 Skill 合入后首页弹层在 ≤620px 遮挡创作提示词且一条浏览器断言仍按旧空态；已改为窄屏弹层在底栏下方展开并更新断言。
- 任务 BACKEND-IMAGE-PARAMS（FEAT-003 PROTOTYPE→REAL 样板）：图片比例/清晰度经唯一纯函数 `src/domain/imageParameters.ts` 映射为真实像素尺寸，Web（`generateImages` JSON/multipart）与 Desktop（Tauri IPC → Rust `task_host.rs` JSON/multipart）两条请求链路均条件透传 `size`，自适应不传；Rust 增加尺寸形状校验；视频参数明确标注尚未接入。
- 验证：`features:check` 28 功能 0 违规、`governance:check` 46 任务 0 违规、typecheck、lint（eslint+两门禁）、format、ui:check（129 文件 0 违规）、build 通过；Node 单测 212/212（新增图片参数 7、功能登记册 4）、Playwright/Edge 浏览器回归 200/200、Rust `--bin kk-studio` 65/65（含新增尺寸校验测试）。真实付费出图与 Tauri 实机 HTTP 仍属外部验收（EXT-PROVIDER/T5）。证据见 `docs/changes/2026-09-21-feature-system/`。全程未 commit/push。

## 2026-09-21 MiniMax Design 深度交互审计与本地能力复刻（PARTIAL）

- 只读操作了本机 MiniMax Design `current` 安装，覆盖项目库、开始创作、Skills、连接器、ComfyUI、设置、文件/窗口/帮助菜单及关键弹窗；未点击会员生成、未下载 40GB 工作流、未登录、未上传日志、未安装第三方连接器。
- 候选分支 `codex/feat/minimax-deep-replica-root` 增加本地 Skill registry/UI：搜索、分类、导入 JSON/裸 `SKILL.md`、创建/编辑、启用/禁用、卸载、应用到创作草稿；应用壳首次打开即准备内置 Skill，补充 2MiB 文件上限、4,000 字指令上限、损坏持久化告警、Escape 与焦点恢复。MiniMax 的 zip 导入契约已审计，记录为下一步有界实现。
- 增加连接器目录原型和 Blender 等目录项；详情、关闭、Escape、跳转 MCP 设置可操作，安装按钮保持 disabled 并写明 Prototype/未接入；MCP Streamable HTTP 增加分页、响应体上限、连接失败清理、组件卸载清理和损坏配置保护。
- Web 开发运行时固定 `http://127.0.0.1:1421/` 完成同状态 DOM/交互证据；Tauri release、真实云端 provider、付费生成和真实第三方连接器仍未验证，任务账本为 `TASK-MINIMAX-001=PARTIAL`。详见 `docs/changes/2026-09-21-minimax-deep-audit/`。

## 2026-09-21 安全审计风险收口（IMPLEMENTED / 1421 外部进程占用）

- `TASK-AUDIT-SEC-001-CLOSEOUT` 在 `fix/TASK-AUDIT-SEC-001-boundaries` 完成三项剩余修复：Web Locks 长生命周期连接租约与崩溃元数据重建；Gateway 初始额度 provisioning 记录、额度漂移 fail closed 和并发策略更新；TaskHost 结果 URL 同源、HTTPS/loopback、DNS/IP pinning、取消窗口和 IPv6 边界。
- 验证：178/178 Node 单测、TypeScript、lint、format、UI119/0、Rust63/63、fmt/check、production build、production preview 191/191 和隔离 Tauri WebView2 均通过；closeout 五份变更记录见 `docs/changes/2026-09-21-security-audit-closeout/`。
- 固定 development 端口 1421 被另一工作树的 Vite 进程占用，未终止并未把该进程结果归给本分支；除此之外的最终 head 证据已记录。

## 2026-09-21 安全边界与异常任务状态审计（PARTIAL）

- `TASK-AUDIT-SEC-001` 在独立 worktree `fix/TASK-AUDIT-SEC-001-boundaries` 完成一轮证据驱动审计。已修复：Provider 请求发出后取消/暂停的 unknown fencing、远程明文 HTTP API Key 外泄、Gateway 重启旧配置/ACL 静默保留、token collision 权限覆盖、TaskHost 无长度响应全量缓冲，以及 journal delete-first 丢失窗口。
- 验证：155/155 Node、TypeScript、lint、format、production build、Rust 61/61 与 fmt 通过。证据见 [security audit](changes/2026-09-21-security-audit/verification.md)。
- 仍为 PARTIAL：Web 跨窗口 localStorage 租约竞态/崩溃孤儿槽、Gateway `initialCredits` 配置陈旧，以及 TaskHost Provider 结果 URL 的 origin allowlist/DNS pinning 尚未收口；不能把本轮修复描述为完整提交并发或 SSRF 防护。

## 2026-09-21 未完成子任务汇总验收（整合候选）

- TASK-MAIN-CLOSE-002 已在独立 worktree 汇入 Figma 收口、素材元数据分页/按需预览与动画回归稳定性修复。当前候选 `bb96dadc08c12a2177481d2ae1e4dda605cc77d4` 的本地完整 `npm run verify` 为 172 Node、197 browser、UI121/0、0 failure/flaky；Rust 61/61、fmt、Tauri client build 通过。
- dev1421、preview1423、Tauri release 均用当前候选重新启动并通过同状态交互检查：四个工作台菜单切换不改变按钮矩形，Escape/外部点击关闭并恢复焦点，窄屏账号弹层关闭优先级通过。素材专项 7/7 验证 40 项元数据页、320px WebP、41 项 fixture 详情 SHA 和错误/重试边界。
- 证据：`docs/changes/2026-09-20-main-close-002/`、`docs/evidence/2026-09-21-main-close-002/`。当前候选尚未合并；TASK-MAIN-CLOSE-002 等待最新 main 合并、PR/CI 和主线回读。
- UI-004 保持 PARTIAL（Landing/部分页面缺少当前 Figma Frame）；PERF-001 保持 PARTIAL（永久缩略图、大快照和单件大图 IO/峰值未完成）。Astra 仍为迁移计划，不在本轮实施。

## 2026-09-20 Astra 迁移计划与分支规则复核

- TASK-ASTRA-001 从已验收的稳定 main 建立独立 task worktree，校正旧 checkout 初稿，复用已完成的 T3b/T4 与已集成的 T5，补齐项目包和 unknown 状态迁移验收。尚未实施 Astra 功能。
- 已检查 AGENTS、CONTRIBUTING、governance、SDLC/评审、ADR、PR 模板和 CI；不直接写 main，不推送历史任务分支，不合并原 dirty 工作区。
- 用户指定 https://github.com/soudbs180-creator/KK-Studio-2.0 为 2.0 远端；该仓库与本地历史不相干，阶段 0 文档分支 `docs/TASK-ASTRA-001-remote-manifest`（回读 `9edb528`）保留为历史审计；首次 2.0 树已通过 PR #1 合并。

## 2026-09-19 T5 原生 TaskHost 集成与未知受理保护（本地集成完成，运行态待收口）

- 创建任务会先将 `intent` 写入 Web IndexedDB 或 Desktop 快照，再进入供应商请求；提交前写入失败时不会发出 Provider 请求。请求开始后保留稳定的任务/幂等身份，重启恢复会区分尚未提交的 `interrupted` 与受理状态不明的 `unknown`。
- `unknown` 和已提交任务不进入普通重试；网络中断、刷新和浏览器关闭回归覆盖“不会盲目重复提交”，队列意图重试保留原任务身份。Rust 快照校验、Web 单元和浏览器回归已同步扩展。
- 集成 main 已合入 `87516e4`、`84cae7c`、`d894779`：Tauri 主进程内置持久 TaskHost，journal 写入 `tasks/native-host`，使用系统凭据库读取密钥，提交携带稳定 idempotency key；应用重启会把未决提交标为 `unknown`，不会自动重发；每个输出 slot 在素材归档后立即写回 journal。Desktop UI 按“持久 intent → 原生 IPC 提交 → IPC 轮询 → 原生素材归档”执行，不回退浏览器 Provider。
- 本地验证：`npm run verify`（150 unit、169 browser、UI119/0、lint/typecheck/format/build）以及 Rust 58/58、fmt/check、`npm run client:check`、`npm run client:build -- --no-bundle` 通过；T5 浏览器专项 5/5 通过。最新 bundle 为 `index-BmJ91wly.js`，Desktop release 已由该主线重新生成。
- T5 仍为 **PARTIAL**：尚未在隔离 Tauri/WebView 运行态用可控 Provider 完成提交、取消、进程重启和逐 slot 恢复的 IPC 证据，真实付费 Provider/GPU/ComfyUI 仍属外部验收；`deploy/` 只提供静态 Web Prototype 的可审阅 dry-run/原子切换脚本，不代表 VPS 已部署。

## 2026-09-18 T4 统一图片命令与连接验证

- 首页、对话、画布、结果继续编辑和上传重绘均调用同一 BYOK 图片任务命令；参考图读取归档原件，缺失时拒绝，任务和结果连线准确绑定来源节点。修复取消审批/中断恢复错卡、异步结果连线同步、结果输入框覆盖参考栏和长模型溢出。
- 已配置与已验证生成分离；保存或 models 探测不冒充图片成功，模型/地址/凭据变化撤销旧验证并保留冷却/隔离。
- 源码20e1c64通过146 unit、164 browser、UI119/0、Rust51及fmt/check/release。1421、1423和Tauri均验证三入口；全新WebView恢复3任务/3结果边/原件hash一致。bundle为index-DONtT_Pj.js；证据见docs/evidence/unified-image-command-2026-09-18。
- T4本地产品链关闭，真实付费Provider仍属EXT-PROVIDER。下一优先级T5持久TaskHost，随后T6 ComfyUI与T7 release；完整产品尚未全部完成。

## 2026-09-18 T3b 原生项目包最终验收

- 已接通 Desktop 设置→储存的导出、预检、独立目录恢复和打开副本入口；原生端完成严格 manifest/ZIP/schema/checksum/引用校验、隔离 staging、写后校验和新目标发布。Web 入口显示禁用原因。
- 新增跨语言 checksum、非法包、七个写入阶段故障注入和 UI 异步/取消回归；修复原生 JSON 字段排序导致画布打开即误保存的问题。已在源码 379b302 完成 129 unit、156 browser、UI 117/0、50 Rust、fmt/check 和 release build；全新 WebView 的完整快照/原件恢复通过，T3b Desktop Windows 单元关闭。

## 2026-09-18 T3a 原生素材及引用最终验收

- T3a 已在本地 `main@c855881` 关闭：Native Asset Repository、项目快照引用水合、原件 SHA-256 校验和读取保护均通过最终验收。隔离 Tauri release 使用独立数据根目录与三个全新 WebView profile，删除 profile 后仍可通过 IPC 恢复同一素材和快照；篡改 blob 会冻结读取并保留原件，快照文件 SHA-256 不变。
- 最终验证为 typecheck、118/118 Node、UI 116/0、format、build、9/9 定向浏览器、Rust 36/36 与 Node 24 PATH 下 release build 全部通过。运行链路为 `http://tauri.localhost/` / `src/main.tsx` / `index-CBwa_Zj7.js`；证据在 `docs/evidence/native-assets-2026-09-18/`。
- T3b `.kkproject` 导出/导入与恢复仍按最高优先级下一项推进；本条不宣称持久 TaskHost、真实 Provider、ComfyUI、Web 发布或 Mobile 已完成。

## 2026-09-18 T3b 项目包 Phase 1（历史阶段，当前结论见顶部）

- 已完成共享项目包契约的第一阶段：`projectPackage.ts` 提供确定性 JSON、manifest checksum、引用闭包、MIME/大小/完整 SHA-256 校验、secret/path traversal/重复与未引用条目拒绝；6 项专项单测、全量 124 项单测通过，源快照在拒绝路径保持不变。
- T3b 仍为 PARTIAL：共享 preflight、fail-closed native adapter 和有界 ZIP transport primitive 已完成；Tauri 隔离 staging/回读/原子发布、manifest-to-ZIP IPC、项目包 UI、真实 WebView 恢复和写入失败矩阵尚未完成。

## 2026-09-18 Provider 提交门禁（TASK-PROV-001）

- 已在独立 worktree 修复首页、对话、审批和重试路径的 Provider 提交边界：提交前同步占用连接槽位，审批后及每个实际 HTTP 分块前复核固定连接、状态、能力、容量和凭据；冷却遵守完整 `Retry-After`，401/403 隔离，5xx/网络故障不会自动换账户；无连接时仍打开供应商设置并保留草稿。
- 修复前在干净验证 worktree 复现了 3 项绕过回归；修复后 `npm run verify` 通过：117 个 Node 单元、151 个生产浏览器、UI 116/0、lint/typecheck/format/build 全部通过。证据在 `docs/changes/2026-09-17-provider-submission-gates/` 和 `docs/evidence/provider-submission-2026-09-18/`。
- 源修复已合入本地 `main@14dbe11`，主线 `npm ci`/`npm run verify`、Rust fmt/test/check、Tauri release 和隔离数据目录桌面 Provider 提交验收均通过；主线 bundle 为 `index-CBwa_Zj7.js`。远端为空，不能声称 PR、CI 或 main 保护已验收；跨进程 TaskHost 与真实 Provider 仍按账本保持未完成边界。

## 2026-09-17 工程治理与可执行门禁

- 在同一仓库的独立 TASK-GOV-001 worktree 落地治理结构；原 checkout 的 178 项既有改动及索引保持原状。29d0d9b 是限定范围的候选源码快照，尚未晋升稳定主线。
- AGENTS 保存稳定规则；治理目录复用现有规范和变更记录。task-ledger.json 是统一任务状态来源，TASK_LEDGER.md 自动生成，25 项任务覆盖历史遗留、依赖与外部条件。
- 新增 ESLint、npm-only、账本和导入边界门禁、Windows CI 与 PR 模板；修复 34 项 lint 基线错误，外部 Provider JSON 使用 unknown 与形状校验。修复底层调度在 cooldown 截止时仍无法重试的问题。
- 源提交987c908从干净worktree执行 npm ci/verify 通过：115/115 Node、139/139 Edge、UI116/0、typecheck、format、build 和 lint；Rust36/36、cargo fmt、client:check、release build通过。1421开发及隔离Tauri设置/主题刷新/Escape检查通过。详细证据见 docs/changes/2026-09-17-governance-baseline/verification.md。
- App fallback/pinned 入口绕过调度已登记 TASK-PROV-001；原生最终验收、真实外部服务、远端 PR/CI/保护和完整项目整合仍有未完成项，不以治理通过替代产品验收。

## 2026-09-16 Desktop 数据稳定性 T1/T2 与原生素材下一步

- T1/T2已落地：读取失败冻结自动保存，重新读取与未保存草稿下载独立；Desktop临时文件sync、有效备份保护、原件留存、revision CAS和跨进程锁；Web IDB事务CAS及每标签草稿。画布坐标、连线、视口、参数保存到canvas v1；新增节点UUID避免重开重复。
- 独立复核修正同项目重新读取后搜索/收藏仍用旧列表、改名可能覆盖远端新增的问题；原生canvas校验与前端对齐，缺位置/重复边/自连/越界缩放不再阻止有效备份恢复。人为构造的同revision异内容草稿进入冲突保护。
- 最新完整`npm run verify`：96/96 Node、138/138 Edge、typecheck、UI116/0、format、build通过；Rust20/20。重建release入口`index-DLNmKaeA.js`，隔离native目录与WebView profile的4次真实启动/正常关闭已验证A/B项目恢复、参数、UUID、备份恢复、双损坏原件hash不变及修复原件后重新读取。
- 详细记录：`docs/changes/2026-09-16-desktop-data-stability/verification.md`；原生证据`docs/evidence/desktop-data-stability-2026-09-16/native-acceptance.json`。范围不含突然断电、尚未提交编辑被强杀、持久TaskHost或真实Provider/ComfyUI验收。
- 当前继续T3a原生素材与项目引用：已确定设计`docs/changes/2026-09-16-native-assets/`。Desktop原件落文件仓库，Web保留IDB；不自动搬移旧IDB或历史目录。T3b完整项目包和其余MUR任务仍未完成，VPS/域名/Vercel没有变更。

## 2026-09-16 Launch Readiness Audit（审计完成，产品尚未达到 MUR）

- 按最新产品方向固定 Desktop First / Local First：Web 为明确移除 ComfyUI / Desktop Only 能力的浏览器本地版本，正式部署目标为自有 VPS；旧 Vercel 只作有限退役/回滚过渡；Mobile 保留旧移动交互经验并在 Desktop、Shared Core、Web/VPS 完成后适配。
- 完整审计与 19 项输出、Capability Map、平台 ownership、Launch Blockers、MUR、可执行依赖计划与验证边界位于 `docs/changes/2026-09-16-launch-readiness-audit/`。当前本地 HEAD 为 `609f524` 加大量未提交实现；GitHub main 固定参考 `931e205` 为旧 monorepo，VPS 部署 package 为 1.4.5；不能混作同一发布版本。
- 新增证据确认：项目不持久化节点位置/连线/视口，开发1421和production preview1423中刷新后坐标丢失；重新添加节点重复 `added-image-1`；IPC读失败故障注入后“重试保存”发出空项目快照；大data URL被normalize静默截断。真实用户项目未用于破坏性复现。**这些是本轮发现，尚未修复。**
- 主创作路径为 `App.executeTask → generateImages` 的 OpenAI-compatible 图片请求；画布卡片仍走 demo；独立 SQLite Worker/Gateway 与 ComfyUI命令/适配器尚未形成产品主流程。测试通过不等于真实Provider或ComfyUI验收。
- 本轮 `npm run verify` 通过（91/91 Node、130/130 Edge、typecheck、UI115/0、format、build），`client:check` 和 Rust6/6通过；release WebView2确认 `tauri.localhost` / production / `index-D11srnae.js`。Desktop只做启动入口取证，未宣称完成原生重启/任务恢复验收。
- VPS通过SSH完成只读审计：Debian13.1、1vCPU、约1GB内存、24GB盘，旧kk-api/PostgreSQL/Nginx在运行；外部22/80/443/3001/4174/5432可达。TLS sslip域名有效，旧payment上游502；未修改服务、数据库、防火墙、网站或DNS。提供的API Key/Hash未使用、未写文档或源码。
- 下一可验收单元：先保护读失败原件，补全项目图持久化与稳定ID，再接原生素材/项目包、统一Provider和本地持久TaskHost。后续任务及验收见本阶段 `plan.md`。

## 2026-09-16 Provenance 字段收口

- Asset Library 的详情面板现在直接展示 AI 生成标签、C2PA 和 SynthID 三项状态；状态来自已归档素材的 Provider provenance，供应商未回传时显示“未知 · 未回传”，不会把 Prototype 推断成真实检测结果。生成归档、IndexedDB 水合和本地重复导入都保留这两个可选信号字段。
- 重新启动固定 `1421` Vite 开发进程后，`tests/browser/task-workbench.spec.ts` 定向回归 `6/6` 通过；此前复用旧 Vite 进程导致的旧模块响应已清理，当前运行时与源码一致。随后重建 `1423` production 与 Tauri release，二者均加载最新 `index-D11srnae.js`，入口和尺寸基线保持不变。
- 新增同状态取证：`dev-final-asset-provenance.png`、`preview-final-asset-provenance.png`、`tauri-final-asset-provenance.png` 及 `final-browser-runtime.json` / `tauri-final-runtime.json` 中的 `assetProvenance` 文本和几何；截图滚动到 C2PA/SynthID 字段，Tauri 仍为 WebView2 `devicePixelRatio=1.5`。

## 2026-09-15 工作流整合验收收口

- Reference Slots、Batch Matrix、Task Workbench、Asset Library、Agent Cards、Comments to Tasks、Approval Gates 和 Provenance 已落到现有 React/TypeScript 画布与项目快照链路。槽位保留主体、风格、材质、构图、Mask；批量输出按单项等待/生成中/成功/失败/取消维护 `assetId`、模型、连接和 Prompt Hash；暂停、恢复、取消、离线和单项重试不丢已归档结果，也不会重复提交忙碌输出。
- 任务工作台的 Queue、Prompt、Generate、Review、Export 使用真实本地任务状态。远程传输和高成本批量在提交前人工审批；覆盖原图和外部分享入口保持禁用并解释原因。平台额度、真实账单、C2PA/SynthID 回传、公网分享和 Provider 保留策略仍是 Prototype/未接入。
- Asset Library 归档使用内容寻址 SHA-256；相同字节重导入只保留一个 `assetId`，并合并来源记录，不会用本地导入覆盖先前的 AI 生成来源。评论和区域标记写入项目 `reviewComments`，评论转任务后进入 Review Tasks 队列并保留分配/完成状态。
- 最新证据位于 `docs/evidence/workflow-matrix-2026-09-15/`：开发 `1421`、生产预览 `1423` 和 Tauri release 均记录 route、入口脚本、运行模式、DOM/几何、computed style、状态截图与真实点击；Tauri WebView2 记录 `devicePixelRatio=1.5`、`tauri.localhost/assets/index-D11srnae.js`、五个槽位及 196×240 任务面板。
- 本轮最终验证：`npm run typecheck`、`npm run ui:check`（115 文件 / 0 违规）、`npm run format:check`、`node --test tests/unit/*.test.ts`（91/91）、`npm run build`、`npm run client:check`、`npm run client:build -- --no-bundle` 和 production 浏览器回归（130/130）通过；新增工作流定向浏览器回归（1421，6/6）及 Tauri release WebView2 CDP 点击取证通过。Gateway provider 适配器同步补齐并通过对应单测。

## 2026-09-15 Reference Slots、Batch Matrix 与任务工作台（中间记录；最终验收见上方）

- 继续沿 Page 0:1 最新节点实现五类 Reference Slots（主体、风格、材质、构图、Mask）。槽位仍复用现有节点文件选择器和 Reference edge；上传卡保持 `referenceOnly` 无提示词编辑器，生成结果保持可继续编辑。槽位信息保存在画布自己的节点数据中，画布和连接只引用本地节点/assetId。
- `CreationTask` 增加有界的 per-output 状态、assetId、模型、Provider、Prompt Hash、预计成本和实际成本字段。执行时每项可处于等待、生成中、成功、失败或取消；成功归档使用 SHA-256 内容寻址，失败或取消项可在 Batch Matrix 单项重试，任务整体仍支持剩余项重试、暂停、恢复和取消。
- 新增 `TaskWorkbench`（Queue / Prompt / Generate / Review / Export）：Queue 显示任务状态和模型连接，Generate 展示多输出矩阵和单项重试，Review 展示 Planner、Prompt Compiler、Reference Analyst、Generation Worker、Asset Tagger、Reviewer、Compositor / Exporter Agent Cards 及人工审批 Gate，Export 展示评论转任务、区域标记和 Provenance。实际供应商账单、C2PA/SynthID 信号、公网分享和外部导出仍显示未接入或 Prototype，不伪造成功。
- Asset Library 详情补齐 AI 生成标签、Provider、Model、Prompt Hash、assetId、SHA-256、父版本、来源和生成时间；搜索覆盖这些非敏感元数据，来源筛选支持 AI 生成、本地导入、设计示例和本地集合。内容寻址归档保持重复素材共享同一 assetId。
- Figma 读取证据：实时 Page 0:1 元数据、`410:67353` 卡片展示和 `396:938` Runtime / Tasks；任务默认面板保留 196×240、8px 圆角、14px 内边距基线，创作输入区继续消费 590×237 设计尺寸。浏览器截图与 DOM/几何证据在 `docs/evidence/workflow-matrix-2026-09-15/`，开发页使用 `http://127.0.0.1:1421/`，生产预览使用 `http://127.0.0.1:1423/`。
- 本段为中间实现记录；最终 91/91 单元、130/130 production 浏览器和 Tauri WebView2 release 证据见上方“工作流整合验收收口”。

## 2026-09-15 Provider Worker、额度账本与 Gateway 边界

- 本阶段已完成独立 Node 24 Gateway 与持久化 Worker：真实 SQLite schema 在 `src/features/generation-server/schema.sql`，HTTP `/v1/jobs`、用户鉴权资产路由和管理员控制面均位于同一服务；启动命令 `npm run gateway -- <config.json>`。
- 删除本任务中新增但没有产品调用方的旧 IndexedDB Worker/内存额度/Gateway 客户端原型，避免两套不一致的结算与恢复实现。保留既有 UI、Provider Adapter 契约和所有无关未提交改动。当前 UI CreationTask 仍保持 Prototype 边界，不冒称正式平台账户已接入。
- SQLite 已验证 1/4/20/100 输出、规范化幂等、重启与未知提交复核、取消围栏、相同图片按槽位计数、单项重试不重复收费、隐私/权限/额度/熔断检查。Webhook 已验证签名时间窗、投递/事件去重、乱序、取消晚到和提前到达事件持久化。
- 已受理任务未知用量保留预留进入人工复核；不能因断网直接退款和重发。PNG 归档将校验 MIME、流大小、块 CRC 和完整解压数据；客户端只能获得 assetId 与自己的鉴权路由。
- 已完成真实 HTTP Adapter/Gateway/Worker 故障矩阵及全量验证：90/90 Node 单测、UI 标准 115/0、格式检查、130/130 Playwright、Vite build、cargo check 和 Tauri release 均通过。详细命令和范围见本阶段 verification.md；实际公网 Gateway、Vault、对象存储和付费账单仍由部署环境提供。

## 2026-09-15 多连接批量生成、隐私模式与素材归档基础

- 在保留现有创建流程和 Prototype 边界的前提下，增加 `ProviderConnection`、`CapabilityManifest`、连接状态与本地元数据注册表；模型供应商设置现在可以登记多个非敏感连接并点击切换。连接分为正式托管 API、用户 BYOK、本地 ComfyUI 和供应商明确支持的本地 OAuth；消费订阅登录和非官方代理会话不会进入公共调度池，凭据仍只通过既有系统密钥库读取。调度选择会跳过没有本地密钥的元数据连接，避免把请求发到不可用账户。
- 创建草稿新增 1/4/8/16/32 张批量数量选择；任务快照增加 `requestedOutputs`、`idempotencyKey`、`batchId`、`privacyMode` 和 `providerConnectionId`，旧快照缺失字段时安全回退，不把秘密写入项目快照。`local_only`、`byok_local`、`platform_backed` 的传输边界在创建入口显式呈现；平台模式和未配置 ComfyUI 工作流仍显示 Prototype/禁用原因。
- 新增统一 Provider Adapter 契约和 Gemini、OpenAI-compatible、Local ComfyUI 的适配器骨架；OpenAI-compatible 图片请求把批量数量按官方接口限制拆分为幂等分块（`dall-e-3` 每块 1，其他图片模型最多 10），可接收多个结果。每个结果都会立即下载/写入独立 IndexedDB 素材归档并转换为内容寻址预览，使用 SHA-256 前缀生成稳定本地 asset ID，并保留供应商、模型和生成时间的来源元数据，不直接把供应商临时链接写入画布。供应商返回不足或单项归档失败时任务显示部分完成和已归档数量，重试只提交剩余数量。
- 新增有界并发队列、Prompt Compiler、Agent 角色/事件/审批契约，覆盖连接健康/冷却、Retry-After 退避、批量部分成功判定和结果顺序保持；后续可由 Tauri Worker 接管持久化轮询、Webhook、额度账本和正式平台额度池。
- 验证：Node 24 下 `npm run typecheck`、34 项单元测试、`npm run ui:check`（103/0）、`npm run format:check`、`npm run build`、`npm run client:check` 均通过；批量、连接设置和既有创作流程定向回归通过，全量生产 Playwright 124/124 通过；最新源码修正后的 `npm run client:build -- --no-bundle` 已完成并刷新 `src-tauri/target/release/kk-studio.exe`。当前 CUA 浏览器桥接仍返回 `nodeRepl.fetch request failed`，因此本条只报告 Playwright 实际运行证据，未将 CUA 截图标为已验证。

## 2026-09-14 模型名称单行与语音输入开关

- 首页和工作台输入栏共用 `VoiceInputButton` 与 `useSpeechInput`：点击麦克风会请求浏览器语音识别权限，开始/停止实际的 Web Speech `SpeechRecognition` 会话；最终或临时识别结果写回当前提示词，切换项目、离开工作台、手动编辑或卸载时中止会话，迟到事件不会写入其他项目。权限拒绝、网络错误、无语音、启动失败和不支持的运行环境分别给出明确状态，不保存音频、不冒认离线识别。
- 语音状态复用 Figma `21:104319` / `410:74765` 的“声音开/声音关”资源，使用 `aria-pressed` 和 `data-voice-state` 表示状态；模型名称在首页按钮中保持单行并在最多 260px 内省略，工作台继续保留 Figma 58×22 模型槽位并避免换行。
- 同状态生产预览证据位于 `docs/evidence/voice-model-2026-09-14/landing-off.png`、`workspace-off.png` 和 `dom.json`；页面为 `http://127.0.0.1:1423/` production，入口标记为 `src/main.tsx`，route 分别为 landing/workspace。
- 验证：`verify-kk-studio.cmd`（Node 24 PATH 引导的完整闭环）通过；23 个单元、UI 标准 99/0、格式检查、生产构建和完整生产预览 Edge 回归 122/122 均通过。`npm run client:build -- --no-bundle` 重建 release，并通过 WebView2 CDP 确认 `http://tauri.localhost/`、`runtimeMode=production`、`runtimeEntry=src/main.tsx`、Web Speech API 可用且首页状态正确。`.prettierrc.json` 使用 `endOfLine: auto` 解决 Windows CRLF 与 Prettier LF 的误报。本次目标文件格式检查通过。

## 2026-09-13 创作流程竞态、权限与入口职责补齐

- 所有浏览器快照入口现在经过同一套 `normalizeCreationSnapshot`：IndexedDB、Tauri 和同步副本都会校验版本、项目引用、节点、消息、任务状态与草稿默认值，旧快照缺少 `approvalMode` 时安全回退，不会因浅层类型断言在首次渲染崩溃。
- 初始化持久化在存储水合完成前不再写入空快照，避免损坏或较新的持久化副本被初始 React 状态覆盖；早期用户编辑会在水合后按项目 ID 合并再保存。
- 首页与工作台共用附件读取 hook：PNG/JPG/WebP/GIF、单张 8MB、最多 4 张，读取中的槽位会立即占用；切换项目或卸载页面会中止 FileReader，迟到回调不能写入另一个项目，读取未完成时发送会明确等待。
- 发送在异步读取凭据后按项目 ID重新取得最新项目，只更新仍处于当前工作台的画布；任务仍固定提交时的供应商路由、模型和附件。权限模式在首页与工作台均支持“自动/询问”，询问模式在真实提交前显示确认和取消，取消会保留输入。
- 输入栏 Skill 与插件先显示当前项目的局部空态，只有用户明确选择“浏览 Skill 目录”或“管理插件连接”才离开当前创作；避免把本次选择、全局目录和连接管理混用。供应商路由凭据 ID 使用统一的 URL 规范化和双哈希，路径大小写保持有效区分。
- 增加图片模型能力判断（拒绝常见聊天、视频、音频和嵌入模型，保留显式图片模型），并补充快照兼容、凭据 URL 身份和询问/取消/入口空态浏览器回归。
- 保存队列失败时首页和工作台都显示真实的“重试保存”操作，重试使用当前内存快照，不会把失败误报为已保存。
- 本轮验证：`npm test` 23/23、`npm run typecheck`、`npm run ui:check` 98/0、生产 `npm run build`、创作流程浏览器回归 8/8（含运行中取消）。

## 2026-09-13 工作台草稿、凭据和中断任务恢复

- 工作台未发送的文字和参考附件现在属于项目的 `composerDraft`，切换项目、收起对话、刷新后仍可继续；附件变化会立即写入 IndexedDB 队列，浏览器同步恢复副本上限从 512KB 调整为 4MB，并在可用额度内覆盖常见大图。
- 任务创建时固定供应商 Base URL 和名称，重试使用原提交的 provider 路由；历史快照中没有 provider 绑定的任务不会盲目请求当前全局服务，而会显示需要重新提交。刷新发现 queued/running 任务时标记为“上次任务未完成”，由用户明确重试，避免自动重复计费或生成。
- Tauri 模型设置已接入既有 Windows Credential Manager 命令：桌面使用 `com.kkstudio.provider` 保存/读取/清除密钥，浏览器仍只保留当前会话内存；供应商元数据和项目快照不含 API Key。连接测试和创建前置校验都会从对应 Base URL 的凭据读取密钥。
- 工作台加号现在直接添加当前项目的参考图片，遵守首页相同的类型、8MB 和 4 张限制；原有 Skill、插件、模型入口和 Figma 输入框几何保持不变。附件读取、消息展示、供应商字段和连接状态已拆分组件，`ui:check` 回到 96 个文件、0 项违规。
- 验证：`npm run typecheck`、`npm test`（20/20）、`npm run ui:check`（96/0）、`cargo fmt --manifest-path src-tauri/Cargo.toml --check`、Rust 6/6、创作与运行态 7/7 定向浏览器回归和完整 Chrome 111/111 回归通过。旧测试中把未配置时的发送当作本地追加消息的两处断言已改为验证打开供应商设置并保留草稿。

## 2026-09-13 创作流程持久化与项目边界加固

- 首页草稿现在由 `CreationSnapshot.homeDraft` 持有，跨首页/项目库/设置弹窗切换仍保留；附件读取未完成时禁止提交，文件类型限制为 PNG/JPG/WebP/GIF、单文件 8MB、最多 4 张，并支持逐项删除。未配置 API Key 时不会创建必然失败的项目，而是打开模型供应商设置，提示“配置后回到首页再次提交”。
- 浏览器使用 IndexedDB 保存完整项目快照，保留小型同步恢复副本；桌面通过 Tauri `read_creation_snapshot` / `write_creation_snapshot` 写入 `%APPDATA%\\kk-studio\\projects\\creation-v2.json`，临时文件提交并拒绝递归出现的 API Key、访问令牌字段。保存失败会在首页或工作台显示错误状态，不静默宣称已保存。
- 每次任务保存提交时的附件快照和 attempt 编号；重试会建立新的任务记录，取消/切换项目后迟到的响应会被任务控制器身份检查丢弃，不会写入当前查看的项目。工作台消息删除会真正修改所属项目；收藏和喜欢按项目保存。provider 结果使用“已生成”标记，示范素材继续标为“示范素材”。项目库“新建项目”创建独立空项目并进入工作台，保留可编辑的基础图片/视频节点，不再打开一个共享固定画布。
- 证据与验证：`npm run typecheck`、`npm test`（20/20）、`npm run ui:check`（92 文件、0 违规）、`cargo test --manifest-path src-tauri/Cargo.toml --no-default-features`（6/6）、`cargo fmt --check`、生产 `npm run build`、定向创作回归（4/4）、目录/画布回归（14/14）、前端/运行态/生成回归（18/18）和完整 Chrome 152 回归（110/110）通过。`npm run client:build -- --no-bundle` 已重建 release，并通过 WebView2 CDP 只读确认 `http://tauri.localhost/`、`runtimeMode=production`、`runtimeEntry=src/main.tsx`、首页可见；尚未获得 CUA 桥接桌面交互截图，因此桌面视觉运行态仍不标为 Verified。

## 2026-09-13 首页到工作台功能闭环

- 保留现有 Figma-first UI shell，新增 `src/features/creation` 项目、任务、消息和附件数据边界。首页提交不再只切换路由，而是创建独立本地项目，保留提示词、模型和参考图片；项目快照持久化到浏览器非敏感存储。
- 首页加号读取图片并显示可删除缩略图；模型按钮选择本次创作模型，供应商设置仍负责全局连接；灵感分类真实筛选，模板将标题和描述完整写入提示词。
- 工作台对话发送为当前项目创建新任务；任务覆盖排队、运行、成功、失败、离线、取消，失败/离线/取消可重试，运行中可取消。配置 OpenAI 兼容图片 API 后调用 `images/generations` 或带参考图的 `images/edits`，仅在服务返回真实图片时创建 provider 结果节点。
- 项目库读取快照中的独立项目并重新打开对应工作台；画布为新增结果分配独立位置。API Key 仅在当前页面内存中保存，不进入 localStorage、项目快照或日志。
- 验证：`npm run typecheck`、`npm test`（20/20）、`npm run build`、`npm run ui:check`（91 文件、0 违规）、Chrome 152 全量浏览器回归（110/110）和目标文件格式检查通过；provider 响应回填用兼容接口响应格式做了端到端回归。`npm run client:check` 与 `npm run tauri build -- --no-bundle` 通过并重建 release；当前 CUA 桥接无法采集桌面交互，因此桌面运行态不标为 Verified。记录见 `docs/changes/2026-09-13-creation-flow/`。

## 2026-09-12 Tauri release 刷新与实际桌面回归

- 复核发现源码修正已经在 `http://127.0.0.1:1421/` 生效，但 `src-tauri/target/release/kk-studio.exe` 仍是 03:57 的旧包；源码最后修改时间为 18:21，启动器因此需要重新构建。执行 `node scripts/windows/desktop-release.mjs`，实际运行 `npm run tauri build --no-bundle`，并生成 18:39 的 release 包和 `dist/assets/index-Cu_Xvqx5.js` / `index-B5AfNVTm.css`。
- 在真实 Tauri WebView2（`http://tauri.localhost/`，1920×1080，production，`src/main.tsx → App.tsx`）重新验证 Landing、模型设置、MCP 设置和 Workspace。桌面截图与 DOM 证据保存在 `docs/evidence/ui-audit-2026-09-12/tauri-release-landing.png`、`tauri-release-model.png`、`tauri-release-plugin.png`、`tauri-release-workspace.png` 和 `tauri-release-ui.json`。
- 实际桌面结果：Landing 内框为 `(291,45,1619,1025)`；模型按钮打开设置弹窗并定位“模型供应商”；插件按钮打开同一设置弹窗并定位“MCP”；工作台从项目库进入后保持 `(291,45,1619,1025)`。四个状态页面错误为空，生产运行标记为 `runtimeMode=production`，不再继续加载旧 release UI。

## 2026-09-12 页面与弹窗入口审查修正

- 本地分支 `codex/figma-new-pages` 已在 `master`，两者均为 `8185992`，无待合并提交；本轮保留工作区原有未跟踪文件，不做清理或覆盖。
- 真实开发页 `http://127.0.0.1:1421/` 审查发现工作台对话面板进场动画完成前会暂时位于视口外；等待 220ms 工程补充动效后，DOM 回到 Figma 基准 `(1430,61,470,998)`，生产预览 `http://127.0.0.1:1423/` 回归同样通过，未修改既有面板动效。
- 修复首页 Skill 选项卡误直接跳转目录页的问题：选项卡现在只切换 Landing 内的 Skill 内容，“浏览 Skill ›”才进入 Skill 目录页面；设置、资产、搜索、喜欢收藏、帮助教程、快捷按键和任务列表继续分别保持弹窗/面板职责。
- 修复开始创作页“插件”按钮误复用 Skill 路由的问题：现在与工作台同名入口一致，打开设置弹窗并定位到 MCP 分类，不再把用户带到 Skill 页面。
- 对齐“模型”入口：开始创作页和工作台输入栏都打开设置弹窗的“模型供应商”分类，Skill 仍进入 Skill 页面，插件进入 MCP 分类。
- 修复 Skill 与 ComfyUI 目录页的 Prototype 状态说明覆盖副标题的问题；状态行现在位于副标题下方，当前开发页 DOM 实测间距为 10px。
- 新增 `tests/browser/catalog-pages.spec.ts` 入口职责与状态行布局回归；当前证据保存在 `docs/evidence/ui-audit-2026-09-12/landing-skill-fixed.png`、`skill-page-fixed.png`、`model-settings-fixed.png`、`plugin-settings-fixed.png`、`workspace-settled.png` 与 `browser-results.json`。
- 验证：`npm run typecheck`、`npm run ui:check`（88 文件、0 违规）、目标文件 Prettier 检查、Vite build、目录页定向回归 7/7、全量 Playwright 106/106 通过；构建保留 Zod 依赖注释位置的既有 Rollup warning。

## 2026-09-12 审查与合并前修正

- 复现并修正新增节点同事件连线绕过参考图能力限制的问题：目标卡片出现后重新校验待发布边，视频不能绕过图片参考限制，上传参考卡不能作为目标；结果边继续按生成流程保留。
- Tauri `get_config` 不再把内存中的 API Key 通过 IPC 返回；配置落盘失败时也不再先更新内存状态。SSE 字节流保留不完整 UTF-8 字节，避免中文被 `from_utf8_lossy` 替换。
- 会话列表、保存和删除遇到损坏的 JSON 现在会返回错误并保留原文件，不再用空数组回退后覆盖用户会话；新增 Rust 回归测试覆盖该保护。
- 桌面启动不再自动复制旧配置/会话；旧文件只保留为待用户明确触发的迁移来源，避免未完成 schema/checksum/确认流程的隐式导入。更新页改为明确的 Prototype/未接入状态，不伪造已下载或可重启安装。

## 2026-09-11 展开会话时地图导航保持可用

- 按用户纠偏移除桌面会话展开时隐藏导航的规则；导航在 `(1138,72,281,31.109)`，会话面板在 `(1430,61,470,998)`，边界间距为 11px。关闭会话后导航恢复到 `(1562,72,281,31.109)`；小地图弹层同样止于 x=1419，按钮中心命中 `小地图`，不进入面板区域。
- 同状态开发页截图与命中记录为 `docs/evidence/frame-accuracy-2026-09-11/after-dev-expanded-map-open.png`、`open-chat-navigation.json`；最终生产预览已重采集四种展开/收纳组合及 1600/1440/390 视口，页面无错误、图标全部加载。`comparison.html` 的 17 个控件锚点最大误差为展开 0.01525px、收纳 0.015625px。
- 最终生产定向回归 11/11、TypeScript、UI 标准检查（86 个文件、0 项违规）通过；桌面包于 20:16:02 重建并通过实际 Tauri WebView 展开/收起/小地图点击验证，日志为 `tauri-nav-fix-final6.log`、`tauri-navigation.json`。同仓库的“优化节点连接与模块尺寸”任务之后继续写入 `CanvasNodeLayer.tsx`，因此最终 `release-identity.json` 为 stale；已验证桌面快照包含本次导航修复，后续节点变化不在该快照验收范围。完整验证仍受现存图片预览/连线测试与全局格式问题影响，不报告全局通过；详情见本次 verification。

## 2026-09-11 Runtime / Tasks 按 Figma 396:938 对齐

- 重新读取实时 Figma `0nU0A7pq6eyjwfwm1TtWkO` 的 `396:938`（Runtime / Tasks）及子节点：面板 `196×240`，标题 `(14,11,169,10)`，筛选 `(14,30,170,14)`，任务卡区域 `(14,53,170,52)`；默认态展示历史任务卡和“正在生成中”卡。
- `TaskPanel` 现在按原稿渲染两张本地 Prototype 卡片，四个筛选可切换全部/执行中/未完成/失败；历史卡保留“点击查看”覆盖层，点击后打开本地任务详情，关闭与外部点击/Escape 行为继续有效。未接入真实 provider task 服务，不冒认生成或服务器结果。
- 新增 Figma 原始占位图 `public/design/figma/task-placeholder-complete.png`、`task-placeholder-running.png`，并补齐 `data-node-id` 锚点、任务语义令牌和 14px 筛选命中区，避免复用旧空态的 30px 布局。
- 同状态证据保存在 `docs/evidence/runtime-tasks-2026-09-11/`：开发页 `http://127.0.0.1:1421/` 与生产预览 `http://127.0.0.1:1423/` 均已截图并采集 DOM；生产页从 `src/main.tsx → App.tsx → Canvas → CanvasHud → TaskPanel` 渲染，三个任务筛选状态和资源加载无页面错误。
- 验证：任务面板定向 Playwright 1/1、配置入口回归 2/2、20/20 单元测试、生产构建和本轮目标文件格式检查通过；同一生产构建的全量 Playwright 为 94/101，Runtime / Tasks 用例通过，7 个既有画布连线/生成错误/旧图片尺寸断言失败。全局 `ui:check` 仍有既有 `Canvas.tsx` 333 行边界问题，完整格式检查有 9 个既有文件未格式化；本轮曾成功生成并启动包含任务面板的 release；随后源码继续被并发画布改动写入，最终重建在 `DemoResultNode.tsx` 类型错误处停止，freshness 不能标为最新。

## 2026-09-11 会话入口状态、覆盖层与右侧进场动效

- 重新读取实时 Figma `0nU0A7pq6eyjwfwm1TtWkO` 的 Workspace `404:28667`、收纳态 `410:67357` 和右侧按钮组件 `143:28077`：关闭态使用无实心右半面的 `右关闭` 图标，展开态使用带实心右半面的 `右打开` 图标。入口命中框按原稿保持 `18×18`，可见描边资产按 Figma 导出的负内边距居中为 `21.5×21.5`。
- 会话容器改为工作台内绝对定位的覆盖层，避免打开面板参与 flex 布局；会话展开时地图导航保持可用并左移到面板左侧 `(1138,72,281,31.109)`，地图触发器为 `x=1344.625`，与面板保留 11px 间距，关闭后恢复右上角 `(1562,72,281,31.109)`。底部工具栏固定在 `(719,998,294,50)`，工作台不产生横向滚动。
- 增加一次性的右向左会话进场：面板从页面右侧外缘滑到 Figma `(1430,61,470,998)`，保留 reduced-motion 关闭动画。Figma 当前 motion context 未返回会话关键帧，因此这段时序记录为工程补充，不冒充原稿动效。
- 同状态证据在 `docs/evidence/session-panel-2026-09-11/`：关闭/打开截图、DOM 几何与逐帧 x 采样。开发页 `http://127.0.0.1:1421/` 的路由链为 `src/main.tsx → App.tsx → Canvas → CanvasHud/CanvasNavigation/ConversationPanel`。
- 验证：TypeScript、UI 标准检查（86 个文件、0 项违规）和生产构建通过；展开会话、收纳切换、地图弹层相关的 `frame-accuracy`、`composer-fidelity`、`canvas-layout` 定向用例 11/11 通过。当前单元测试为 19/20（`canvasGraph` 既有锚点期望不匹配），四文件生产回归为 24/25（唯一失败是 `frontend.spec.ts` 的旧图片预览 x=470 期望收到 x=468），全量历史证据为 95/101，失败均不涉及本次导航修复。同状态 Chrome DOM/截图与小地图命中证据已保存。`node_modules/.bin/tauri build --no-bundle` 构建与实际 Tauri 导航验证通过；随后并发节点写入导致最新 worktree freshness 变为 stale，详见顶部导航修复记录。

## 2026-09-11 个人信息弹窗按 Figma 312:2436 对齐

- 重新读取实时 Figma 节点 `312:2436`，将 `AccountPopup` 调整为 `260×230`：账号信息、`116×30` 账号操作、`236×57` 积分/订阅卡、主题行和版本更新行按原稿顺序与坐标重排；补齐余额积分条、积分图标、普通用户徽标、双箭头和原稿图标资源。
- 账号身份使用原稿示例文案 `YYYKK / UID：308311652306456581`，弹层仍标注本地 `Prototype`；积分、切换/退出账号和更新状态不冒认真实服务，主题与更新入口保留实际跳转。
- `AccountPopup` 样式改由 `App.tsx` 在 `workspace.css` 与 `sidebar.css` 之后统一加载，避免旧工作台规则覆盖；新增账户弹窗颜色令牌及 Figma 导出的 `public/design/figma/account-chevron.svg`。
- 实际验证：开发页 `http://127.0.0.1:1421/` 与生产预览 `http://127.0.0.1:1423/` 均从 `src/main.tsx → App.tsx → Sidebar → AccountPopup` 渲染；生产预览同状态 DOM CSS 尺寸为弹窗 `260×230`、身份 `143×26`、操作区 `236×30`、积分卡 `236×57`、主题/更新行各 `236×22`。侧栏浏览器回归 `tests/browser/sidebar.spec.ts` 7/7 通过。
- 本轮未改动账号后端或持久化；全局 UI 标准检查仍有既有 `workspace.css` 任务卡颜色字面量告警，与本弹窗文件无关。

## 2026-09-11 logo 资源修正

- 按实时 Figma `0nU0A7pq6eyjwfwm1TtWkO` 重新导出完整裁切父节点：侧栏/通用 26px、首页 `399:27833` 63.1406px、账号 `21:119316` 30px、模型 `19:96869` 20px、积分 `21:104347` 11px、会话 `407:29275` 12px。
- 新增 `src/components/BrandLogo.tsx` 作为唯一品牌图形入口；`Sidebar`、`StartPage`、`ConversationPanel`、`AccountPopup`、`CreationComposer` 和 `GenerationAction` 均改用对应变体。移除首页、账号和小图标对 26×34.45 内部图层的 CSS 越界裁切；保留 Figma 自带 mask/clipPath 与边框。
- `public/design/figma/logo.svg`、`sidebar-logo.svg` 已同步为完整 26px 导出；新增 `logo-hero.svg`、`logo-account.svg`、`logo-model.svg`、`logo-credit.svg`、`logo-message.svg`。桌面图标从完整 Figma SVG 重新生成，修复底部圆角越界。
- 修改前/后浏览器 DOM 与截图、Figma 来源、Tauri 窗口截图保存在 `docs/evidence/logo-correction-2026-09-11/`；当前 Web `http://127.0.0.1:1421/` 为 development，生产预览 `1423`，桌面为 Tauri release。`src/main.tsx → App.tsx → StartPage/Sidebar/Canvas/ConversationPanel` 路由链已核对。
- 验证：`npm run verify` 通过（20 unit、96 browser、UI 标准 0 违规、格式通过）；`npm run tauri build -- --no-bundle` 通过；release freshness 为 current。仅本次 logo 范围标记 Verified。

## 2026-09-11 Workspace Frame 精确核对

- 按实时 Figma `0nU0A7pq6eyjwfwm1TtWkO` 的 Workspace `404:28667` 与收纳 `410:67357` 重读 shell、Sidebar、项目行和收纳动效；当前坐标以这两帧覆盖旧 `1:2` HUD 位置。
- 修正 1920×1080 固定设计面：展开内框 `(291,45,1619,1025)`、收纳内框 `(70,45,1840,1025)`、任务按钮 `(321,72,93,30)` / `(100,72,93,30)`、底栏两态均 `(719,998,294,50)`、对话 `(1430,61,470,998)`、收纳搜索/设置/账号 `(22,942,26,26)` / `(22,982,26,26)` / `(22,1022,26,26)`。背景圆角外侧改为不露黑的实体 shell，网格保持源坐标相位。
- 收纳与展开保留独立状态：面板打开时导航和小地图仍可点击，面板关闭后导航回到右上角，展开按钮拥有 32px 透明命中区；草稿保留；焦点已移动到画布卡片时不会被延迟回焦抢走。侧栏 300ms 过渡逐帧保持任务距内框左边 30px、底栏不横移，项目行在过渡中保持 263/231/263×29，不发生多行重排。
- 项目操作槽改用实时导出 20×21 容器；移除标题旁多余外链图标，未分组标题补齐前往/创建入口。项目组管理支持右键与 Shift+F10，菜单支持初始焦点、方向键、Home/End、Escape；多创作页因尚未接入而禁用并说明 Prototype。
- 新增同状态对比页、DOM/截图/录像和动效采样：`docs/evidence/frame-accuracy-2026-09-11/comparison.html`、`after-preview-dom.json`、`desktop-expanded.png`、`desktop-collapsed.png`、`collapse-interaction.webm`、`motion-samples.json`。对比页生产 DOM 锚点最大误差展开 0、收纳 0.015625px；该结论只覆盖列出的外框/控件，不代表全文件像素相等。桌面截图取自紧邻的前一份构建，最终构建后的项目菜单/过渡细节已由当前 100 项生产浏览器回归覆盖。
- 验证：最终 `npm run verify` 通过（20 unit、100 browser、UI 标准 0 违规、格式、生产构建均通过）；`npm run tauri build -- --no-bundle` 通过，release freshness `current`。Development `127.0.0.1:1421`、production preview `127.0.0.1:1423` 分开截图并报告无页面错误、图标全部加载。实际应用的初始卡片、Prototype 账号、空对话与 Figma 示例内容保持边界，不伪造服务结果。

## 2026-09-10 最新 Figma 与实际运行链路诊断

- 实际 Web 为本仓库 Vite development `http://127.0.0.1:1421/`，入口 `src/main.tsx -> App.tsx`；`/` 内通过 active 状态切换 StartPage、Canvas/ConversationPanel 和 LibraryPage，弹窗使用 CatalogPanel 等已有组件。
- 已在浏览器复现 CSS import 去重导致 conversation-panel.css 提前加载，workspace.css 覆盖 Panel 背景为 36% 透明。页面级样式改由 App.tsx 单点加载。
- 最新 Figma MCP 已读三帧及 Sidebar、Landing、Panel 子节点；修正桌面收纳 70px、Panel 426x170 输入框/22px 控件、Landing 完整加号及分隔线，保留窄屏工程补充与业务状态。
- 历史启动脚本在 EXE 存在时跳过源码新鲜度检查；现有启动器已接入 desktop-release.mjs。2026-09-09 21:53 的 release EXE 仍需重新构建，Web build 不等于 Desktop 更新。
- 验收状态：进行中。before DOM/三状态截图与本次实时 Figma 截图保存在 `docs/evidence/ui-runtime-2026-09-10/`。后续 typecheck/build/UI 回归和 after 证据必须独立记录；不得引用下方历史 93/93 作为本次结果。

更新时间：2026-09-09

## 2026-09-09 Figma 三状态实现补充

- 已按 Figma `1:2`、`338:9081`、`338:17211` 重新读取主画板、空白画布/菜单态与收起侧栏态的关键子节点。
- 修复 `开始创作` 从项目库进入错误打开为说明弹窗的路由问题；`landing` 现在会切换回开始创作页。
- 主画板 1920×1080 同状态几何已对齐：任务按钮约 `(310,67,93,30)`、展开对话区 `(1429,56,472,1003)`、底栏 `(719,998,294,50)`、导航约从 `x=1138` 开始；收起态保留 61px 轨道并补齐原稿 `x=69` 内框间隙。
- 对话外框在画布内框中使用 11px 上下内距，标题栏基线与 Figma `1:8090` 的 y=56 对齐；已重新构建并启动 `src-tauri/target/release/kk-studio.exe`，避免快捷方式继续使用旧构建。
- 新增 172:367 右键画布菜单：280×213、上传/粘贴等未接入项明确禁用，添加节点复用现有添加菜单；右键拖动画布、Escape、失焦和边界定位均有处理。
- 验证：TypeScript、Vite build、相关文件 Prettier 通过；15 个单元测试通过；画布布局/前端回归 16/17 通过。剩余一项是 1024px 视口中 HUD 右上导航与窄屏对话入口的自动碰撞断言，需要下一轮同状态截图复核。

## 2026-09-11 节点连接、参考图上限与多结果生成

- 读取最新 Figma `0nU0A7pq6eyjwfwm1TtWkO` 的 `410:67353` 与 `458:966`：图片正文按 `400×400` 落地，视频正文 `370×208`，创建卡片 `436×458`，底部输入区 `590×237`；`aspect-[441/441]` 被确认是比例值而非模块宽度。
- 加号拖动现在显示连接预览线；拖到其它卡片的可见正文时通过指针位置命中目标并高亮，释放直接连接；空白释放继续打开带父节点的新增菜单。新增节点与连接在同一 React 事件内也会保留，不再因 items 尚未重渲染而丢边。
- 连接模型区分 `reference` 与 `result`：媒体模块按当前本地模型能力限制参考图数量，超限连接显示可关闭提示；上传图转为 `referenceOnly` 卡片，选中不挂载底部输入框。生成图片作为参考时保留该结果自己的模型、提示词和完整 composer，输入状态跟随节点；参考图缩略图支持直接移除连接。
- 生成数量为 4 时先建立 4 张 `pending` 结果卡片并连接到父模块，等待 180ms 的可取消本地演示窗口后再填充结果；取消、错误和离线会将占位卡片标成可恢复状态。提示词和模型随父模块复制到每张结果。
- 同状态证据：`docs/evidence/node-linking-pending.png`、`node-linking-ready.png`、`node-linking-direct-target.png`；变更 intent/spec/plan/verification 位于 `docs/changes/2026-09-11-node-linking/`。
- 验证：开发 `127.0.0.1:1421` 与生产预览 `127.0.0.1:1423` 的浏览器脚本均确认 `pending=4`、`ready=4`、目标高亮直连、空白菜单、上传卡片无 composer、参考图 `4/4` 上限提示；20/20 单元测试、101/101 浏览器回归、UI 标准检查（88 文件、0 违规）、格式检查和 Vite build 通过。当前仍为本地 Prototype，模型上限表待真实 provider 元数据替换。

## 当前目标

只打造新的 Figma-first 工作台，唯一工程为 `D:\kk-studio-next`。旧根目录 `D:\kk-studio` 已清理；历史工程和用户数据仍保存在带日期的归档目录，等待未来显式迁移。

## 已完成

- 统一 `src/core` → `src/domain`，provider 适配器归入 `src/integrations`。
- 统一资源目录：`public/design/figma`、`public/fixtures/demo`、`design/figma-plugin`。
- 新增 `src/runtime/storage-contract.ts`，集中浏览器 key、桌面目录和凭据 service 常量。
- 新增 Tauri `storage_paths.rs`，建立 `%APPDATA%\\kk-studio` 专属数据树，并保留旧配置作为待用户明确触发的迁移来源。
- 清理根目录临时审计脚本、dist、test-results 和旧资源目录。
- 建立架构、数据分级、开发、评审、SDLC 文档与本次整合的 intent/spec/plan/verification。
- 单元测试迁移至 `tests/unit`，浏览器测试保留在 `tests/browser`。
- 工具菜单与帮助菜单按 Figma `338:776` / `338:851` 对齐为 90×50 / 103×50，并补上同尺寸断言回归。
- 项目库教程、Skill/工作流禁用态和卡片选择反馈已补齐，所有入口都有真实状态或明确 Prototype 原因。
- 恢复 Windows 一键启动入口：根目录 `start-kk-studio.bat`、`scripts/windows/desktop-release.mjs` 和桌面“启动 KK Studio.lnk”均已指向 `D:\kk-studio-next`，图标使用 `src-tauri/icons/icon.ico`。

## 仍是 Prototype

- 前端尚未接通 Tauri IPC；项目、资产、收藏、真实账号、积分、记忆和生成服务仍未持久化或连接后端。
- ComfyUI 适配命令存在桌面端基础，但模型扫描、队列和真实 provider 调用尚未由 UI 驱动。
- Figma 同状态截图对比需要在资源路径迁移后重新跑完整浏览器证据。

## 下一步

1. 按 `docs/changes/2026-09-09-workbench-consolidation/verification.md` 运行全部检查。
2. 为 project repository、memory schema 和 Tauri IPC 建立 feature slice，再接入真实存储。
3. 每个 UI 修复都补同状态 DOM/截图和失败路径测试。

## 最近验证

- `npm run typecheck`：通过。
- `npm run test`：15/15 通过。
- `npm run ui:check`：74 个文件、0 项违规。
- `npm run format:check`：通过。
- `npm run build`：通过。
- `cargo test --manifest-path src-tauri/Cargo.toml storage_paths -- --nocapture`：6/6 通过。
- Playwright 浏览器回归：93/93 通过，覆盖 1920、1440、768、390 视口。

历史过程见 `docs/archive/`，不覆盖当前状态。

## 2026-10-24 剩余 UI 验收收口（定向完成）

- 格式门禁已恢复：`npm run format:check` 通过，`npm run typecheck`、`npm test`（2266/0/20）、`npm run lint`、`npm run ui:check` 和 `npm run build` 均通过；设计检查保留既有 orphan-token warnings。
- 04/05 定向浏览器验收已绑定预览端口 1423：响应式桌面/手机 20 项、画布导航 7 项、设置布局 2 项、素材性能 6 项、视频上传 2 项、重绘 15 项通过。
- 资源库补齐资源包→标签→类型→时间筛选、最新/最旧排序和自定义日期；视频首尾帧交换保持连线 ID/顺序，音频不占帧槽。
- 重绘补齐标注、擦除、评论点、矩形选区、清除、整图/只改选区开关和上传→输入→模型→录音→发送胶囊输入；复用既有 image-edit 蒙版领域逻辑。
- 全量旧浏览器合同与 Figma Code Connect 仍分别受历史文案用例和 Dev/Full seat 权限边界影响，保持 PARTIAL，不冒称全绿。

## 2026-09-10 UI runtime diagnosis: verified delivery, partial visual acceptance

Confirmed and repaired stylesheet import deduplication/cascade issues; preserved existing pages and interactions. Latest 404:28667 / 410:67357 / 410:59708 contexts were read through Figma MCP. Current Web process PID16112 serves D:/kk-studio-next on1421; its actual browser screenshots and measured panel/sidebar/composer geometry show source changes. Full browser suite96/96 without retries, unit20/20, typecheck/build/ui:check/format:check passed. Tauri release rebuilt2026-09-10 23:10:01 and freshness reports current.

Not complete: original reported window provenance, native Tauri visual check, full same-content Figma and all auxiliary frame/state comparisons. Collapsed search retained by explicit user request. See docs/changes/2026-09-10-ui-runtime-diagnosis/verification.md and docs/evidence/ui-runtime-2026-09-10/live-browser.json. These current results supersede earlier pending validation notes, not the remaining visual acceptance boundaries.

## 2026-09-20 KK Studio 2.0 main 同步候选

- 本地稳定 main 已在隔离 worktree 完成候选整理；原 checkout 仍保持 dirty/index 原样。
- PR #1 已将 chore/TASK-KK2-MAIN-SYNC squash 合并到目标云端 main；合并后回读确认远端 main tree 与本地稳定 main 相同。
- 首发树只包含当前本地 2.0 已跟踪目录；云端旧 monorepo 当前目录已删除，旧历史仍可追溯。
- PR 记录：https://github.com/soudbs180-creator/KK-Studio-2.0/pull/1。合并后已回读 main SHA/tree SHA。

## 2026-09-20 UI 主线整合

TASK-UI-MAIN-001 从 origin/main@8aca3ab 出发，三方整合27项原目录交互修复并保留主线T3b/T4/T5；现行 Figma 的设置、搜索、资产展开/收纳及任务入口偏差已修正。34种页面状态已用实际导航捕获；原目录尚未切换前不能把候选描述成原目录最新版。准确命令、运行矩阵和同步状态见 [verification](changes/2026-09-20-ui-main-alignment/verification.md)。UI-004 保持 PARTIAL：当前唯一Figma页面中没有Landing410:59708及部分独立页面稿。治理候选TASK-GOV-002保持独立，未夹带合入。

## 2026-09-20 UI 主线整合收口

TASK-UI-MAIN-001 已完成并同步到目标仓库：PR #3（https://github.com/soudbs180-creator/KK-Studio-2.0/pull/3）通过双 CI 后 squash 合并，远端与本地 `main` 均回读为 `fb57529c719924330ec0154f5374df8f5d508e00`。本地根目录已从 `master` 切换到跟踪 `origin/main`，原 `master`、旧本地 `main` 和原工作文件均保留在归档位置；原目录 409 项已逐项 SHA-256 核对，未上传未审阅内容。现行 Figma 可取得的页面已完成同状态 DOM/截图验收；缺失 Landing 等独立 Figma 稿件仍由 UI-004 标为 PARTIAL。

## 窄屏关闭优先级补充

TASK-UI-DISMISS-002 修复账号菜单跨窄屏断点、键盘展开后外部点击不关闭；同状态三环境专项与191项浏览器回归通过。详见 docs/changes/2026-09-20-ui-main-alignment/followup.md。稳定main提交以Git回读为准，上述旧SHA是阶段记录。UI-004设计来源缺口与PERF-001压力边界继续保留。

- 补充云端大图重绘失败调查：优化归档/请求的逐字节转换，route提前捕获请求、点击后开始I/O预算。unknown用例的瞬时审批检查已改为等待异步审批；最终完整verify通过（浏览器191项、0失败/重试），unknown/音频定向10次通过，大图20倍CPU连续3次通过；新bundle index-Be6XJzPc.js已在dev/preview/隔离Desktop核对。PERF-001大规模素材库工作保持未完成。

## 2026-09-20 AI自主开发、分支和规则一致性（TASK-GOV-002）

- 最新治理规则已合入本候选；TASK-GOV-002 仍由独立 owner 维护，远端保护 API403 继续记录为 BLOCKED，不由本任务代替其 PR/审批。

## 2026-09-21 Governance closeout synchronization

- `origin/main` now includes the governance closeout at `3c4d012`; TASK-GOV-002 remains PARTIAL because hosted branch protection is still blocked by the GitHub billing/API403 boundary. Its closeout package and current ledger entry were retained when preparing this candidate.
- This candidate keeps the UI/asset work scoped to TASK-MAIN-CLOSE-002; it does not re-own the governance worktree or claim remote rules are active.

## 2026-10-03 早期任务盘点与本地收口（历史快照）

- 早期同日快照曾记录 96 项：DONE 55、PARTIAL 27、TODO 10、BLOCKED 4；当前台账以本文件顶部、`docs/governance/task-ledger.json` 和本轮 verification 为准。
- 本轮新增并完成：MCP 多标签页注册表 reread/rebase 与冲突保护（TASK-MCP-REGISTRY-001）、旧版 51+ 配置原件导出/显式恢复（TASK-MCP-REGISTRY-002）、编排器失败项依赖闭包重排（TASK-ORCH-REPLAN-001）。MCP modern/legacy 协商（TASK-MCP-PROTO-001）本地实现与回归完成，真实第三方及 Desktop 实机仍待外部验收。
- 实际回归：Node 661（653 pass/0 fail/8 skipped）、Canvas Agent 174（172 pass/0 fail/2 skipped）、Playwright 379/379、TypeScript/lint/format/build、Vite build、Cargo check 均通过；Vite 只留已有依赖注释与 bundle 大小 warning。
- 后续优先级：P0 先保护注册表数据不丢失；P1 完成真实 MCP 端点验收并推进编排器真实生成执行；P2 继续 T5/T6/T7、平台服务、VPS、Mobile、Figma 完整验收。证据见 [本轮 verification](changes/2026-10-03-task-audit/verification.md) 和 [review](changes/2026-10-03-task-audit/review.md)。
- 本轮补充：项目建设目标与验收入口已接入 `goals:check`；UI 门禁发现的 301 行 MCP 设置组件已拆分，相关任务已通过当前 head 的独立技术复核。

## 2026-10-09 开发插件失败项继续处理

TASK-PLUGIN-DEV-001在独立任务树认领，固定1421复现四个public模块500和遮罩；最小同源绝对URL及SDK静态JSX校验候选已实现，15针对性Node测试/SDK类型/插件重建通过。当前仍IN_PROGRESS，开发完整流程、最新main组合、fresh Tauri/full verify/独立审查及托管门禁待实际执行。原失败/驱动和SSR探针纠正均在[本轮记录](changes/2026-10-09-plugin-development/verification.md)保留，不预填完成。

## 2026-10-09 随包插件运行失败项继续收尾（IN_PROGRESS）

TASK-PLUGIN-DEV-001修复开发public import及真实React静态JSX校验后，回归新发现TASK-PLUGIN-RECOVERY-001 P1（归一化遗漏现有plugin）与TASK-PLUGIN-MARKDOWN-001 P1（CDN离线正文为空/模块错误）。已登记并做RED→GREEN预验收：快照10/10、固定1421实际4插件编辑/预览/内容刷新恢复零错误。共享Desktop/Web源码版本递增2.1.12，Mobile保持规划2.1.1；解析器原marked14改为精确14.1.4随包，不扩大CSP。完整验证、fresh原生、独立review和Hosted/合并仍未完成，当前任务不标DONE。见[验证](changes/2026-10-09-plugin-development/verification.md)。

- TASK-DESKTOP-FLUSH-001：本轮插件原生立即关闭实际复现最后编辑丢失（P1）；已登记并实现 CloseRequested 耐久队列守卫，重复关闭/最新revision/失败及读保护留窗/卸载单元 7 PASS。fresh 原生与当前提交独立验收仍未完成，原 FAIL 保留。

- TASK-PLUGIN-DEV-001及RECOVERY/MARKDOWN/DESKTOP-FLUSH三个新P1本地闭合：真实开发/生产/fresh原生正文及恢复、立即关闭/真实IO失败留窗与原件保护、完整447浏览器和同EXE邻接全部通过。原FAIL、来源身份和标题栏第一拖动未知原因保留；最终doc/Hosted/普通集成/main按各自收据，UI012/UI014与43项既有开放能力继续。见[本轮完整状态](changes/2026-10-09-plugin-development/status.md)。

2026-10-09 TASK-IMAGE-RETRY-004：主线6a的托管37845923441真实FAIL，区域重试验收未绑定新任务而读到3条旧结果。新隔离测试任务继续复现与修正，原失败保留，产品正确性与合并后主线验收仍需复验。

2026-10-09 TASK-IMAGE-RETRY-004本地验收：43fc全verify447零retry、14相关、804root/172Agent和development PASS；独立源码无P0/P1、41相关unit PASS，IRV-001文档矛盾已修正，最终精确head复审/托管/main恢复待回执。主线6a的原FAIL、本机未复现PASS均原样保留；运行产品/版本未改。

## 2026-10-10 KK → Codex 真实联调

- 本地已登录 Codex 账号经 KK 浏览器工作区真实验证：文本调用成功、Codex 内置图片生成成功并回写画布、`canvas_apply_ops` 新增文本节点成功，随后由 Codex 只读读取并确认节点存在。
- 图片卡片按要求显示 `图片模型未报告` 与 `来源：Codex 内置生图`，没有把 Codex 名称误当成图片模型名。
- 首次联调发现的默认模型问题已修复并复验：旧缓存 `gpt-6.1-sol` 会按 Agent `/models` 列表回退到 `gpt-6-astra`，不显式选模型的 KK 文本调用已成功；项目图片模型也不会传给 Codex 推理接口。详见 [kk 模型能力验证](changes/2026-10-10-kk-model-capability/verification.md)。

## 2026-10-13 模型接入与扩展分类

Codex 主 Agent 移至模型接入；侧栏扩展统一 Skill、MCP、协作伙伴，七种角色职责可加入对应草稿；模型菜单恢复来源层次、320px 紧凑布局与稳定滚动。按用户补充移除模型弹层的批量/数据项，节点数量和旧批次归档的 40 项定向回归通过。独立复核关闭同地址多账号身份、Google 未保存配置保留及角色来源隔离问题后，最终 Web development 7 项、production preview 7 项、Desktop 2.1.14 14 项重新验收通过；Desktop 随包 Agent 启动、健康检查、停止通过。生产浏览器全量 495 项中 492 pass，本轮 20 项全部通过，3 个已记录的既有 UI 失败；任务保持 REVIEW/PARTIAL。[验证记录](changes/2026-10-13-capability-ui/verification.md)包含资源身份、原生持久保存和无关改动哈希。自动分派与 OAuth 授权继续保持未接入。

## 2026-10-15 UI细节收敛（本地完成）

TASK-UI-DETAILS-20261015从最新18e143f修复，Desktop/Web2.1.26产品ab878ffd：紧凑设置、共享composer控件、末尾动作组、空/非空上传与扩展内容轴，删除三项旧组件及入口。完整verify退出0：Node1278/14skip、Agent199/2skip、browser635首试、UI239/0、development PASS；精确源码独立审查、官方重建及38项Native与资源字节一致性通过。原数据身份和primary dirty/index保留，owned测试实例正常关闭。Mobile2.1.1规划、真实Provider/Hosted/签名及用户视觉接受继续各自开放；[当前验证](changes/2026-10-15-ui-details/verification.md)。

## 2026-10-15 PR62合后必需门禁闭环

2026-10-15 11:54:34 UTC独立只读回读actual main492abad48b0695f6117265fba6d29e8ea2a4b9bc；本轮quality38726260549全部success（repo verify/Rust fmt+test/client check+build/WebView2/隔离Native TaskHost/证据上传），双平台guards38726260498与main-health38730589177成功，7个check-runs全success，必需verify/delivery满足。产物11969904183/39602109B未过期，未下载检验内文。非必需auto-merge38726259041 failure/jobs=[]原因UNKNOWN单列。 GDI三项验收独审满足，测试任务DONE；输出证据保护另缺取消/reporter失败两类实测，继续PARTIAL，不把结构性保护冒称运行证据。HOME源码a85及Windows38项通过，正式HOME PR继续。

## 2026-10-28 用户进度核对

安全补丁与18文件格式修复各有候选提交及限定独审PASS，均未合流。17个浏览器/开发测试文件修正后定向29项通过，完整verify复跑仍有模型菜单/Agent等浏览器失败。P1仅前置核查，ORG仅已校验归档副本（预计净64.5%，实际迁出0），P2尚未实施。用户禁止子代理，后续仅主代理直接处理；主checkout21文件原哈希不变。见[当前验证](changes/2026-10-28-browser-gate/verification.md)。

## 2026-10-28 四份整顿原文总范围复核

用户指出最近五项进度不能代替四份需求全覆盖。主代理已从首行到末行重新阅读四份，登记来源SHA256/行数/章节和[总清单](changes/2026-10-28-modularity-p0/four-document-coverage.md)：P0–P8、STD现代化、ORG-0–7及横向验收分别追踪。纠正证据外置=ORG-5/6，不能代替ORG-0/1；取代/冲突/观察/待决均保留。只完成阅读与范围整理，未改产品或声称整套完成。

## 2026-10-28 继续未完成的浏览器门禁与ORG盘点

主代理按四文档矩阵继续执行，未用子代理。修复2份Agent测试的现行CLI/能力分类进入路径，两个代表失败转通过、9项完整相关回归通过；快速三门禁2313 pass/0 fail/20 skip。ORG补查165份参考文件对照指定容器位置9文件，无hash/LF等价，全部保留。见[验证](changes/2026-10-28-agent-browser-navigation/verification.md)；其余P/STD/ORG和最终合流仍未完成。

## 2026-10-28 ORG-1从未开始推进为候选

建立[REPO-LAYOUT](architecture/REPO-LAYOUT.md)与[DEPRECATIONS](architecture/DEPRECATIONS.md)骨架、索引和ignore临时类型。3正7负配置断言、治理/索引/链接/生命周期与快速三门禁通过（2313 pass/0 fail/20 skip）。没有产品/用户数据改动或证据迁出，受保护21文件不变；只自审、未合流，ORG-0/2/5/6仍分别待验。见[本卡验证](changes/2026-10-28-repo-layout/verification.md)。

## 2026-10-28 P2薄注册器与inpaint候选

复用隔离树，不使用子代理。注册/解析/权限/版本/图环与默认关闭派发已接回原持久任务链，根2350/Mobile373单测通过，双构建任务/资产/溯源/请求/DOM同态。完整image-edit两路径各14 pass/1原窄屏fail；严格PNG仍有1灰阶像素渲染不稳定，故TASK-MOD-P2为PARTIAL。包1.2、Desktop/Web源码48、Mobile43；原生/独审/main未验，不能代替四文档其余任务完成。见[P2验证](changes/2026-10-28-inpaint-capability/verification.md)。

2026-10-28 P3a–e 源码候选：契约包1.3.0、Desktop/Web2.1.49、Mobile2.1.43。完整图R4由16降0，R1由405降367，其余规则无新增；212个迁移函数体AST一致、六份UI JSX结构一致，纯核心/infra/runtime无间接feature依赖。根2354通过/20跳过/0失败，Mobile373与Agent204通过（Agent另2跳过），根/契约/Mobile类型通过；Edge双构建各3/3通过，任务/资产/HTTP/DOM同态且4张PNG SHA完全一致。核心浏览器原9失败保留：8项在父P2错误和位置逐项一致，另1项为P2已有窄屏HUD失败。P2 flag仍默认关闭；独审、Tauri/真实Provider、完整verify和main整合未完成，五阶段分别PARTIAL。P3f、P4–8及STD/ORG等四文档其余任务继续开放。

2026-10-29 P4候选：skills→plugins→models→agent→creation后处理其余切片，R1 367→0、R3 10→0、R4保持0；根2355通过，原20跳过保留。公开出口的TSX单测加载、VM夹具与Agent初始化顺序已适配；Desktop/Web2.1.50。P5已立项待实施，所有阶段独审/原生/main未验。

2026-10-29最新候选：P4源码收敛完成：367条唯一深层依赖边降0，285条属于指定五切片、其余82条亦清零；381条导入/再导出语句按顺序改写。R3由10降0，R4保持0，其余基线不新增。25个迁移纯函数AST一致，五份既有UI结构一致，最终CSS与P3完全同字节。根最终2363通过/0失败/20跳过（P4单独阶段2355通过），Mobile373与Agent204通过。限定浏览器、体积及退出码见最终回执；独审/原生/完整verify/main尚未完成，保持PARTIAL。 P5部分完成：契约包1.4.0新增清单/JSON Schema/RPC与PermissionPort；包目录、版本/平台、逐文件SHA、权限交集、身份、消息上限/超时/重放/撤销和更新失败保护已接线。真实Edge实验T1与安装器→React→当前Context链通过；生产新包执行门默认关闭，legacy保持宿主兼容。Desktop IPC、WebRTC/其他逃逸面、独立安全审查、授权Figma/UI、T0/T2/T3与其他贡献未完成，不能称为生产插件沙箱。 当前Desktop/Web2.1.50、Mobile2.1.43；主仓与Figma树未修改，当前复用P3任务分支。

最终限制更新：任务/资产/HTTP/DOM同态，CSS字节相同；严格PNG有1像素/1灰阶差异仍未通过。P5生产门默认关闭，Web实验不能替代原生、跨浏览器与独审。
