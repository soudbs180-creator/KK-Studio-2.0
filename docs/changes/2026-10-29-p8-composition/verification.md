# P8 验证（源码候选）

TASK-MOD-P8；base792759611c60f698366b755f94198071c6c65c27；复用既有工作树/分支。Desktop/Web2.1.53，Mobile2.1.43，契约1.5.0。尚未合main，未更新安装客户端/发布。

## 实现与不变项

七组现有装配责任迁入src/app：Skills、首页模型、Agent订阅、会话投影、任务协调、Agent/插件桥、主题/快捷键。App从2002行降至1546行（按splitlines计）。35个原函数体AST一致，Agent桥12条语句/闭包和两项设置effect及依赖一致；主返回JSX完全一致，28个CSS入口顺序不变。App保留必要的原模块求值顺序，不让自动整理import改变CSS副作用先后；构建CSS恢复index-0k4mv2N2.css原内容hash。代码/函数不是第二套任务或Provider实现。

旧conversationSubmitScope回归改从实际App/私有hook源码读取原函数，48项原业务断言全留，先见缺模块RED后48/48 GREEN。没有把源码路径变化当成业务回归删断言。

## 浏览器同态

工程外证据D:/kk-studio/output/p8-integration-2026-10-29。7927原App与候选App在相同2.1.53版本、相同项目ID/主备快照输入下分别构建；期间只临时替换本任务自己的App文件，finally恢复并核对。主仓从未参与构建或编辑。

1920×844、390×844各取工作台/设置，共4组DOM原始SHA完全一致；四张PNG逐字节相同、0差异像素。真实Edge1423生产预览、worker1/retry0，沿原headless Shell防线，仅本测试额外使用disable-gpu软件渲染，并要求连续两次PNG完全一致才取样；没有遮罩或增加像素容差。原硬件渲染下窄屏设置存在53像素差异，原始browser报告仍保留；软件对拍不能替代真实GPU/桌面客户端验收。来源/比较见parity-stable-comparison.json、move-proof.json和software-differential-*。

## 合流前已知缺口

P8改动前已复现codex-home-routing四失败，改动后同四位置失败；属于原完整verify缺口，单元2378通过不是全套门禁已绿的证据。后续测试前置/能力菜单核验作为门禁修复单列，不回退现行界面。真实GPU、独立review、完整verify、main/远端CI仍待完成。

主仓21份dirty文件已逐字节复制并核SHA，保留原patch、索引对象清单；与分支重叠4路径为docs/README.md、governance两账本文件和package.json。主仓保全与fetch结果见primary-preservation/及merge-preflight.json。origin/main与本地main仍分叉，不能把本地快进条件称为远端已合并。

当前检查与最终head/hash以工程外最终回执为准；P0–P7/STD/ORG原开放项、P6.1参数面板/Figma实例/真实GPU不自动关闭。

## 合流门修复（P8之后单独提交）

TASK-MOD-CHAT-PROJECTION：原App选择聊天只改activeChatId，persist hook不自动重建派生composerDraft/messages，导致界面仍显示上个聊天。实际App回调新增回归先RED（A draft而非B draft），再使用既有projectChatView投影；保持原聊天/持久schema不变，49项会话回归通过。此为P8后的有意行为修复，不修改/冒充原P8的35函数同态证据。候选Desktop/Web54；最终浏览器和全门禁另记。

TASK-MOD-HOME-SESSION：真实浏览器发现首页预连接后新项目无法初始化；新建项目显式请求fresh，连接层只允许能读取归属且没有线程的空聊天执行新建，已绑定聊天不可替换，原远端归属/忙碌/审批判断保留。App实际调用和空聊天保护先RED后GREEN；69项定向单元及根2383 pass/20 skip、类型通过。仿真threads/new原来总返回同一个ID，改为逐次独立ID，跨项目保留原隔离断言并增加线程ID不同断言。Desktop/Web55；浏览器、lint及完整门禁以随后外部回执为准，真实GPU与Native启动未验收。

首页原8项浏览器现全部通过（codex-gate-home-unique.log，worker1/retry0）；增量lint以f10147b9为GOVERNANCE_BASE通过。默认origin/main全分支lint仍失败：架构首建基线要求只建基线不改产品，目录首建基线要求匹配其记录的Git base；这两项是实际合流顺序缺口，不改检查或重写历史来伪装通过。完整序列分别记录增量检查与集成阻断。

更正079c候选：全量浏览器发现普通聊天手动fresh的保护被泛化，补RED后要求调用者携带当前新projectId，普通手动、其他项目、已绑定聊天仍拒绝；Native生命周期转发同一身份。84定向/2386根单元通过（20skip），类型/增量lint通过；14项首页与连接保护浏览器全过。首次901项全量运行仅留下前152项输出，无最终退出/完整报告且进程已结束，记INTERRUPTED，不能算全量完成。独立评审获用户授权已启动；P6历史恢复发现另卡修复。
