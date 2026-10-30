# Intent：普通 Chat 图片经正式素材入口归档

- Task ID：TASK-CHATGPT-IMAGE-POC-20261018；状态 READY；日期 2026-10-18。
- 请求来源：用户授权一次真实普通 Chat 生图及自动回传；本任务承接最小 KK 正式归档链。
- Owner / branch / worktree：quota_gate / `feat/TASK-CHATGPT-IMAGE-POC-20261018-archive` / `D:/kk-studio/.worktrees/TASK-CHATGPT-IMAGE-POC-20261018`。
- Base SHA：`e11b87a579a92f89d7d60f9c2f1be15bfb033065`；开工 clean。依赖复用只读，不安装或写入旧树。
- 关联：[spec](spec.md)、[plan](plan.md)、[verification](verification.md)、[review](review.md)。交付包角色 current。

## 用户原意与范围

普通 Chat 生成的一张图片自动回到 KK 的真实素材仓库和当前画布，保留准确来源；不调用图片 API、不再次生成、不使用 Work/Codex 推理额度。本任务只实现已有 assets_add → Agent bridge → assetRepository 的图片归档能力和验证，不创建第三方平台、不读取私有 token、不改用户数据或运行实例、不提交推送发布。

## 验收

1. 字节、MIME、SHA、任务及项目/聊天上下文合法才归档；拒绝 URL、迟到请求、冲突任务和未持久化结果。
2. 来源固定为普通 Chat 插件，未知模型如实记录；重复同任务同 SHA 不重复画布卡片。
3. 仓库原件回读校验、画布写入和 flush 完成后才返回真实 receipt。
4. 类型、相关测试及构建通过；真实运行配对和 Native 重开尚无证据时保持 PARTIAL/NOT VERIFIED。

## 外部边界

用户已生成唯一真实图，离线字节测试与真实 KK 归档分别报告。现有外部配对缺失时 fail closed；不导出全权 Agent token、不注入 UI、不直写数据库，不伪造 verified/completed。

## 2026-10-18 后续用户授权：通道选择和原生网页连接

用户随后明确要求继续实现自动/Codex/普通 Chat 图片通道，既可手动选普通 Chat，也可在 Codex 权威用量明确拒绝且尚未发送时切换；首次本人登录后复用会话，不用 Chrome、不额外付 API 费，不再索取状态码/截图。此项扩大原 assets_add 归档阶段的范围，由 root 负责集成、image_route 独占新增原生桥、quota_gate 独占请求准入与路由底座。对应 FEAT-040，状态 PROTOTYPE；既有未提交变更、原用户库和默认运行实例保持隔离。

该后续阶段的目标是可执行候选与真实验证，不能将尚未登录的页面或夹具说成完整接通。外部首次登录须用户本人完成；实现、状态和验收按下述追加规格/计划推进，不重写历史结果。

## 续作：会话误判、隐藏连接与原件共用（2026-10-18）

用户继续授权实际修登录回跳/会话保持，并跑通普通Chat单图下载归档；补充本人首次登录后隐藏网页、KKAI点连接复用会话、素材同原件共享减少副本，以及研究BigPizzaV3/CodexPlusPlus最新改动。当前有效会话继续使用，不保证服务端永不失效。新实证：root只读r5自有窗口AX已见个人资料菜单、历史、Chat/Work、聊天输入框；旧探针false不能解释为未登录。live窗口/profile不重启，不读认证字段，不索取状态码/截图或重复验证。

本次工程决策：先以同配置/同UDF hidden about:blank sibling，用公开BrowserProcessId证明共享浏览器进程，再由root一次固定flag加载公开Chat页，只读结构投影验证实际选择器；不接任意URL/JS/路径、不读输入/正文/账号或cookie。基于实证修复连接/隐藏生命周期，再补一次发送与新回合原图下载关联，保留准入/原件SHA/持久回读边界。图片使用canonical SHA素材库；临时下载与运行时RAM搬运分开量测，不能宣称云端和本地共用文件或零内存复制。第三方仓库只读按SHA研究，不执行安装脚本或复制其授权会话。

## 最新参考项目：OpenCodex（2026-10-18）

用户补充 lidge-jun/opencodex，继续评估它是否支持每用户首次订阅登录、自动生图和 KK 原件归档。只读固定版本与源码结论见 [研究记录](opencodex-research.md)。登录复用、Codex 原生图片工具和原件落盘可以参考；未把 Codex 后端或本地 quota 字段改写当作普通 Chat 独立图片权益。

## 用户继续授权：真实原件归档与去重

2026-10-18用户要求先把r3已下载原件实际归档到KK，再核实扣额，每人首次登录后保持连接、无Chrome/额外API、避免重复数据产物和内存累积。先复用现有可信主运行时archiveImage、当前真实Native项目/chat；不得new假host、手写DB或伪造正式生成任务。原件SHA固定2e620d3d…，不重发；重复同导入身份须复用素材和节点，持久回读成功后清理本次owned下载暂存，仅留canonical原件及小回执。

## 续行：恢复 Unknown 的已有结果

用户明确要求先找回2340fa4b状态未知请求的已有结果，不重复发送；继续自动下载、同任务去重归档并核实际扣额。归档指原件入本地canonical素材库、画布保存引用及来源/任务绑定，不代表再生成或每节点复制原图。允许公开ChatGPT历史搜索和读取该固定请求的唯一结果；不读/复制会话凭据、不改原Unknown来假造成功、不使用Chrome或付费图片API。只有实际受控恢复、目标全文/SHA范围和Native原图下载事件验证完整时，才可通过正式接口继续原任务状态与归档；没有结果或多候选仍保持Unknown，不新建替代任务。
