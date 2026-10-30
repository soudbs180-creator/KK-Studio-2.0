# Review：普通 Chat 图片归档

- Task ID：TASK-CHATGPT-IMAGE-POC-20261018；状态 dirty diff独立预检PASS / 提交HEAD与Native NOT VERIFIED；2026-10-18。
- Base `e11b87a579a92f89d7d60f9c2f1be15bfb033065`；未提交 diff 仅可作预检。
- 默认库既有原件后置归档/重放/重开已有实际证据；正式新任务执行和扣额仍未验证。旧阶段结论按当时时点保留。

## 过程预检与修复

root预检指出普通Chat sourceJobId应保存真实jobId，已改并测试；仅魔数不足以证明完整图片，已加入浏览器Image.decode及已有尺寸上限，截断PNG反例RED/GREEN。

独立archive_backend预检指出删除卡片后丢失job→SHA与可选字段契约不齐：已新增独立持久imageArchiveReceipts及删除tombstone；新严格归档只接受kind/title/imageUrl/source/archive五字段，legacy素材参数保持。双host冲突又以真实反例RED确认，修为仓库存储await后提交前重验binding。全部修复未放宽有效门禁或伪造回执。

最终源码冻结manifest aggregate `033ef91123a9801d6aa1e6061798d7b697a5fd86f1a4c315064cab9d1b10f2bf`。独立上下文image_route逐个核对22文件SHA并重算aggregate一致；独立重跑agentImageArchive/agentImageArchiveSnapshot/agentConnection共67/67 PASS、0 SKIP，最终未发现已证实实现blocker或false verified。已审HTTP scope→定向SSE→bridge→仓库→flush→持久snapshot→原件/来源回读、后置binding重验和tombstone。root另核hash并完成指定Chrome最终真实解码/IDB夹具PASS。未提交diff只作预检，不冒充提交HEAD正式审核。资产回读missing/corrupt/MIME/provenance等负向分支未逐项单测，按本轮独审指示记录为非阻断证据边界；不能把unit宿主mock当真实Native。

## 2026-10-18 续作 dirty diff 预审

quota_gate 独立只读指出并复验关闭两项真实阻断：画布 hook 原先即使显式 Chat 仍要求 Codex connected；首页仅绑定项目而未绑定原聊天，保存/连接期间可能采用另一聊天。现 Provider 随偏好刷新、仅图片 Chat 路由绕过 Codex 门禁；首页冻结 activeChatId、runner 捕获 scope/epoch 并在 await 前后校验，项目/聊天/页面切换主动取消。新增真实 hook/函数 VM 行为反例通过，未知或已接受 Codex 请求不会自动跨通道重投。

原生 mark_archived 同任务全部 origin 必须网页来源，混合插件/网页拒绝；image_route 与 quota_gate 相互复核并以负例 RED/GREEN。App 预审 hash fe20f67dc02882d0f2df4f7475234b1f642c7102bd798ba04badd0a5ac25bc9b、Canvas c05316b91e319e8f077a35d947ba16066737abd2c4241a7715c30675991783e0；最终代码输入由工程外 subscription-code-manifest.json 记录。预审未发现剩余 critical，不构成提交 HEAD 审核或真实普通 Chat/Native 额度和归档通过。

仍然开放的能力阻断是认证会话及未实现的网页自动发送/下载适配，已在 UI/功能卡/账本标明实验未通。没有为得绿灯解除门禁或伪造原图回执。

## 本地会话与后台连接续审

新实际页面证据已纠正上述“认证会话未确认”的当前状态；自动生图/原件归档仍未通过。quota_gate对DOM及接线独立窄审，要求唯一可用编辑器、同组且enabled Chat/Work与明确pressed状态；消除旧composer ID的OR旁路，认证路径先返回且不读DOM。download保持false，未由mode识别放行模型请求。

真实Native发现main关闭后隐藏窗口残留，root修复后的3Rust独审无具体阻断：webview SHA2266e56567e6f0d1b4d490264d407a0367c622e5f27a510ac6cf9e5750f16a5f，commands aa57f8b5de8c29226bf83b462c998d08a1aeeafad9e0d627fd5bc43a506beb9d，main e0d47fcf6f52ab8c4f89d7a5186e2e2704081c269b57effe46b2359e41136dd9。保存失败仍关闭自有窗口、仅main Destroyed触发、既有Exit清理不变；不kill共享浏览器、不删除profile或原件。真实关闭RED/GREEN属于root现场证据，独审不冒充现场执行。

工程外一次执行器r1独审发现草稿后出现challenge仍可准备/点击；只有aboutblank启动，未建立home/draft/submit flag即停止，原journal保留。r2每次mutating action重验明确login/challenge/title，Send总数与可用数都必须为1；6项DOM负例通过。quota_gate按Rust0eaa7b39d304c0cc2822a73b6db74804d90c69a72c2014b4decc264b6924dbc2、JS96cf47c4c3a93f28dc926bf95138830685a5c2054ad736871caaa9ae38873b80首尾核验后无阻断，root才独占执行一次。源码审查不证明模型受理、图片完成、下载或扣额。

## OpenCodex 与 r3 已有图下载续审

OpenCodex固定main/v2.88.0/6936d988的49份公开源码完成Git blob对账，root另复核本地SHA，研究与可复用/不可推断部分见[研究记录](opencodex-research.md)。未运行第三方项目或采用其本地额度字段改写。

r3 live前独审复现真实阻断：预览范围严格查找失败后仍fallback首容器，两个不同大图加一个Download可错误放行。旧源码/EXE保全且未live；最小修为没有合格scope即拒，必须唯一大图且同identity、唯一明确Download，新增反例先RED后GREEN。quota_gate按7个修后freeze hash复核源码diff与9Rust/7DOM日志后无阻断，root才启动。最终DOM59c69eff…/EXEe6be6e45…；源码审核和root现场下载/解码分别记录于verification，不自动升格quota/archive/formal task字段。

## 默认 Native 后置归档窄审

image_route 只读核查复用实际 App singleton/bridge 的路线，没有代码层阻断。执行后 quota_gate 按工程外 harness SHA29d7cf82…和归档/清理/重开回执只读复核：默认9项目、目标节点/资产/来源各1、持久 kk-asset 无PNG base64、canonical bytes/SHA一致、暂存不存在；当前 PID74324 路径/EXE SHA 与重开 receipt 一致，旧PID76948已退出，原账号Browser33024和r2仍在。源码和回执未显示伪造正式任务、markArchived或新生成调用。

其他8项目和原聊天内容保持，依据 root 当时 harness 的前后逐值断言；独审没有重建 before 快照，也没有再次调用 bridge 或写用户库。归档 receipt SHA070a31a9…、cleanup14231d4b…、reopencc1b70e2…。本轮只审已有原件导入和清理，不代表正式自动生成管线、真实扣额、完整提交HEAD或发布审核通过。

## 正式适配、严格草稿与导航时序窄审

正式适配的迟到旧Requested回调跨新任务风险由独审捕获并以owned窗口generation隔离，新的回调不能只按active查归属。已接受/Unknown任务不重投；按真实页逐项绑定唯一prompt、image、preview、download、原件校验与实际archiveImage尾链。仅源码实现不能升级为正式真实一图已验。

quota_gate独立重跑TS21/21，源8f268e68…、test50b365c9…，确认ordinary/download双就绪等待、scope/取消及单submit，主函数CC19符合目标20。严格草稿五文件冻结aggregate9c964861…，独审哈希全部一致、DOM25/25PASS；无innerText OR/空白折叠旁路，未知结构拒绝，已知完全相同预发送草稿的内部许可不能由public DTO指定，旧epoch不同不等于接受旧回调。

新真实任务2340fa4b返回Unknown后没有重发或修改journal。导航Source时序两Rust修复冻结aggregate d1e44808…；review_poc_server独立复核rs170ec2a6…/testce3c1be4…，Pending只在严格observe过渡允许，所有mutating action和第二会话仍拒，旧Unknown不成功/不fresh。root实际main26及完整构建通过。源码审查、离线测试与当次真实Unknown因果及修后闭环严格分开。

只读observer最终源820d96cf…/EXEd4fa5f7f…由root读审，无导航/DOM/下载、Source仅安全布尔投影，有限接收及自身退出。root启动前所有权核验发现旧进程退出，未运行observer；不以其synthetic自检冒充现场采集。实际扣额仍unknown，未发布或替换日常入口。

最后独立只读复核确认默认canonical/单node/单来源/kk-asset与暂存清理、三任务2Blocked+1Unknown、最新EXE和源freeze一致；不声称旧journal全文件bitwise相同，仅核已保存安全投影。两份browser测试仅补已有新设置与closed连接状态读调用，root按raw结果确认定向3首试通过；其余功能断言保持，未改产品或放宽门禁。当前54输入aggregate c1bc7893…是未提交源码身份，不是完整提交HEAD/发布审核。

## 同一 Unknown 只读恢复及恢复树独审

quota_gate 实现 Native 私有历史恢复与真实下载尾链；image_route 独立核查原job/scope/epoch/fullpromptSHA、window generation、只读历史动作集合、唯一canonical与FULL+图片二次确认、sticky下载burn及真实Requested/Finished推进，未发现阻断。公开recover只接受原TaskRequest，不收URL/脚本/外来bytes。恢复后Downloaded/Archived仅复用，不重下；任何同job暂存存在即拒，不从Unknown生成新job。

review_poc_server独立复核最终9项DOM：全部visible canonical先计数（含disabled和同path），唯一enabled才开；不读anchor正文，查询在URL解析前丢弃，当前URL/私有绑定仍严格无query/fragment，只location.assign固定origin+canonical，原链接不点击。此前按snippet筛候选的阻断已关闭，末尾分号问题关闭，原始函数可按Rust嵌入方式编译。TS完整prompt保留/原epoch恢复、作用域校验、取消、未知不重发、真实归档回执尾链已审；相关Node47通过。

外部清理后从保留1d4a0692恢复的新带锁worktree再独审：Native4文件和TS4文件精确等于冻结字节或仅CRLF换行，不是手工猜回源代码。新目录Native实际main39通过；编译/独审均不替代真实下载、归档与扣额证据。

当前caller边界：设置页实际连接并保存图片偏好；仅首页Codex图片与canvas图片入口接普通Chat/发送前fresh quota切换。主Agent文本对话仍走Codex，不能描述为所有对话自动转Chat。recoveryJobId目前由受限工程联调调用，尚无正式App恢复按钮。每OS用户目录保存各自WebView profile，无硬编码账号；同用户有效会话冷复用已有证据，多用户与失效重登仍未验。
