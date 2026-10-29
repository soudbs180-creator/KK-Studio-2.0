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

## 2026-10-29 交付门续修与中断勘误

78beb7a9只读独立评审已PASS（base c2a0228a），IR-P8-01/IR-P6-01/IR-P6-02均经修复补审关闭；该结论只涵盖代码范围，不替代CI、完整verify、原生或真实GPU。原回执为工程外independent-review-78beb7.md。

full-gates-56-final：默认verify因初建baseline顺序不匹配失败；Agent构建、204通过/2跳过、UI规范和格式通过。浏览器序列在447/901后无运行进程、无退出码/最终报告，记录INTERRUPTED：339通过、108失败；design/development/native阶段未执行。原日志与逐项失败保留，不能称完整全绿。部分失败来自旧设置/模型菜单前置，另有消息回写和窄屏几何等真实待核验项。

根消费契约TS的干净安装原先出现TS7016，不能依赖packages/creation-contracts私有node_modules掩盖。隔离目录只改根semver7.8.5/@types7.8.0，根npm ci、Mobile npm ci、根/Mobile类型检查均0，且无私有契约安装或新file链接；见clean-contract-consumer/preflight-final.json与candidate-root-*。实际根清单/锁随后采用同一最小改动，Mobile锁已有相同声明，无需重写。

桌面指纹回归：只改契约TS原先不变、链接源不拒绝，实际仓库新增两项测试先RED，补受控输入后27通过/1原符号链接权限跳过；新junction断言实际执行通过。覆盖现有/新增/删除TS、清单与schema、忽略安装/日志。transpiler协议类型仅重命名，未弱化R8检查，公开出口不变。类型、增量lint、全单元及构建的最终退出见contract-fix-*日志；默认origin/main首建baseline和远端分叉仍单列，不能用增量lint替代。

交付续修实际检查：根类型0、Mobile类型0、增量lint0（base78beb7a9）、全根2397通过/20跳过/0失败、production build0、diff --check0；桌面新指纹两条断言均实际执行。仍不代表默认全分支verify通过。

## 2.1.57 聊天交付修复

TASK-MOD-CHAT-DELIVERY：publishTaskOutputState从已验收的text结果调用领域appendChatTaskReply；原聊天明确按originChatId，重放只更新同一reply ID，缺少聊天/用户请求时不恢复已删数据。Agent syncProject在disconnected时只读当前聊天本地消息，解决离线历史首次打开/切换不可见；不改JSX/CSS/设计、不请求网络、不写项目。五种publisher归属/缺失/删除与重复测试、实际host离线切换测试均先RED；修复后75项定向全过。Desktop/Web56→57、Mobile43不变；全量根、类型/增量lint/build与现有浏览器断言的实际日志为chat-delivery-*，最终结果后补。

重试补充：独审指出retry任务无对应新请求，新增retry与删除原request后retry的RED，回复改用retryOfTaskId根身份；最终77项定向/根2405通过、20跳过、0失败，根类型0、增量lint0、生产构建0。中间chat-delivery-unit保留1项重试RED，最终chat-delivery-final-unit为替代结果，不覆盖旧失败。

## 2.1.57补验与2.1.58草稿修复

cc8e5f7c独立只读补审正式PASS，IR-CHAT-01/02关闭，77定向复验及额外内存断言确认已连接同范围远端消息和拒绝交付不受影响。原聊天浏览器3/3通过（worker1/retry0）；格式0、design9/9与开发插件四步验收通过，官方2.1.57桌面EXE构建0（未启动/安装，不能算GUI验收）。主仓21份原件和HEAD再次校验不变。

默认origin/main verify仍失败3项：架构初建必须无产品改动、基线commit匹配、目录基线commit匹配；R1/R3/R4/R5/R7/R8均0，R2=11/R6=2，未弱化门禁。增量lint不能替代该默认门。PR81仍draft，远端分叉/冲突与完整浏览器未闭环。

TASK-MOD-MODEL-DRAFT：现有浏览器供应商通知测试在已保存元数据对象重建后supported变unknown，真实RED；内容签名守卫修复后原通知/草稿/保存断言全部通过（model-draft-browser-green-final.log）。中间第一次修复已过草稿断言却在旧“保存此模型能力”locator失败；改为现行同一按钮“保存此模型参数声明”，未删断言、未放宽时间或像素容差。Desktop/Web57→58，Mobile43不变；后续快速检查/构建/当前SHA审查另记。

独审下一簇诊断仅为待修证据：M3规格要求独立目录拉取；fetchProviderModels当前宽松解析丢image/unknown元数据、接受{}；独立入口缺生命周期取消及写前归属保护。不得把这些缺陷转成新成功预期；测速入口文案/JSON契约冲突需当前Figma对位。该簇继续开放，不以本次草稿修复称全部模型测试已绿。

MODEL-DRAFT补充复核：整对象签名仍因enabled/isDefault偏好变化重置草稿，独审预检指出后补真实默认/启停RED。签名现仅账号/模型及实际回填的kind/sizes/family/variant/aliases/image；增强浏览器包含默认/启停/原保存及真实元数据false/3更新，1/1通过。最终根2405通过/20跳过/0失败、类型0、增量lint0、production build0（model-draft-final-*）；Hosted cc8e5f7c Mobile与deploy-linux success，verify同3项基线失败，非全套通过。
