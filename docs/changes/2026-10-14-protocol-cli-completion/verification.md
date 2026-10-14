# Verification

- Task ID：TASK-PROTOCOL-CLI-20261014；状态：本机实现与验收完成，最终分享产物由工程外哈希收据绑定。Desktop/Web源码2.1.22，Native Mobile2.1.1仍为规划。
- 基线d38cf957 clean，产品与7a/545browser、Native与portable各9项的2.1.21已验收源码相同；历史证据在ui-consolidation输出，不代替本轮。
- 本轮独立只读审查已实际确认：protocol未保存、CLI命令只复制、CodeBuddy读失败会误当empty、Gemini负缓存、当前平台Codex metadata残缺导致portable缺exe；手机缩放使32px控件实际18.55px、11px/22px旧控件。
- 真实云端账号、付费调用、CLI登录/全局安装尚未执行；owned-process和本机HTTP仅证明适配实现。

## 当前实现与定向证据

工程外原件：`D:/kk-studio/output/protocol-cli-20261014`。保留各次RED/编译失败/取消日志，后续PASS不改写前次事实。

- 协议和绑定、真实本机HTTP、流终态/顺序/尾帧及profile恢复定向38/40项通过；远程免密拒绝、本机离线Ollama可用、协议更改禁止旧任务改投、旧字段缺省保持。catalog按协议/auth分域4项、异步检测晚结果1项通过。
- 当前Rust `cargo test --manifest-path src-tauri/Cargo.toml` 为154/154，fmt通过。包含协议、原件/项目包roundtrip、CLI生命周期及Job前Node启动环境保护；5个既有编译warnings保留。回执`rust-node-guard.log/.exit`。
- 隔离production依赖与Windows发布12/12通过；EPERM/EBUSY有界重试，失败恢复原runtime，拒绝换身份/链接/外来目标。当前生产Codex0.155.1实际version/login help/app-server help通过，最终官方构建另验。
- preview1423/Edge：手机导航与待提交保护2项、320/390缩放后真实触摸2项、既有provider/CLI页面3项，7/7首试通过。主操作40px、模型/参数32px，缩放与1099切换后草稿保留；未使用force click。
- typecheck和lint退出0；lint内健康门禁沿用主线advisory，旧代码仍有发现，不能将出口0说成全仓零问题。新增CLI组件复杂度正在按职责拆分。未改阈值/豁免。

完整verify、实际Tauri/便携包、不可变源码SHA独立审查及产物哈希待最终回执；以上dirty定向结果不代替这些交付门禁。

## 51557346完整复验与独立发现

- `verify-222-third.exit=0`，Node1207pass/14既有skip，Agent172pass/2既有skip，production Edge549/549首试通过，UI241/0，development5步骤PASS；对应JSON和development源码回执保留。第一轮530pass/19fail与第二轮中断原件保留，不能把后续PASS回填旧记录。
- 全量浏览器发现并修复了手机编辑器盖住对比面板，以及懒加载焦点落到隐藏返回按钮；分别由实际命中和既有聚焦断言验证。
- 51557346独立审查CHANGES REQUIRED（F515-001/P2）：原生模型列表取消/超时仍可能保持忙碌。当前TS修复先RED再6/6 GREEN（含旧scope race），完整Rust163/163/fmt PASS；其中生产discover_models的真实TCP分别等待响应头/部分JSON，取消后2秒内服务端EOF/reset、注册表释放，原ID可重新准备。`discovery-cancel-rust-socket-full.log/.exit`退出0。
- 真实取消按钮另有RED/GREEN：原handler提前清ref会屏蔽原生错误，现保持loading/取消中等回执；取消失败显示错误、禁用导航等到结束才恢复。`discovery-cancel-ui-green.log/.exit`10/10首试通过。此browser IPC fixture仅证按钮传播，不能代替真实Native。
- 新完整verify/不可变SHA复审及新EXE仍待验证。

## d4bd37e2复验后的凭据/释放边界补充

`verify-222-final-code.exit=0`与550browser首试通过、development5步骤PASS原件保留。运行browser阶段只追加了未执行的RED unit fixture，未改产品源码；此回执不代表新增fixture或最终修复已全量验收。独立复审指出两条未覆盖路径：Native已保存密钥在可取消fetch前额外读取，release等待时取消仍能保存late catalog。`discovery-cancel-release-vault-red.log/.exit`两项实际失败；修复后`discovery-cancel-release-vault-green.log/.exit`8/8通过。最终clean提交完整复验、Native与独立审查另验，不能以此旧绿覆盖。

## 7113901b与旧检测取消错误补充

7113901b的完整verify退出0：Node1214pass/14既有skip，Agent172pass/2既有skip，production550首试/零flaky，UI241/0，development5步骤PASS；官方Agent no-bundle构建退出0、4278生产文件，未先运行该EXE。独立复审发现编辑新草稿导致旧ref失效后cancel:/release错误会被吞掉；保持原有编辑行为，将旧检测取消失败通过现有独立feedback提示，不覆盖新draft或新busy。正常点击/编辑的browser RED复现后20/20 GREEN（含原有交互与手机导航）通过。短暂fieldset锁定候选未提交且已回撤，失败原件保留，不能作为最终UI。最新修复提交的完整门禁、新EXE与Native/portable仍另验。

## 66a144ee全量发现的展开间距

66a144ee完整verify浏览器550pass/1fail（首次与重试均差1px），development因前步失败未执行，原目录与JSON保留。实际同帧DOM：工具栏40px、textarea bottom66px，空隙7px；旧CSS仍按35px预留导致不足，不是舍入或字体推断。改为共享`--kk-control-h-lg`，同一时点读取边界并保持原>=8px断言，再覆盖动画完成状态；28项控件/画布/响应式首试GREEN。新最终提交完整复验/构建/Native仍待回执。

## 最终da6141e6本机验收

Desktop/Web2.1.22产品da6141e6完整verify通过：551浏览器首试、Node1214pass/14既有skip、Agent172pass/2既有skip、UI241/0、development5步骤PASS；Rust163与原生源一致性确认，独立源码审查PASS。官方Agent构建、真实Tauri22项和同字节便携目录23项通过，5协议文本均保存/重载/GET检测/NativeTaskHost一次POST/结果恢复，无重复；4取消/超时场景实际socket关闭且目录字节保持。手机为响应式WebView/Web，非Native Mobile。新依赖0，入口gzip增加3247B<16384；4278生产白名单519462029B，其中8个缺失的当前平台Codex必要文件407521436B已恢复，不把旧残包当同功能体积基线。原资料身份、primary dirty/index和历史失败保留。最终ZIP/源码/Web/恢复与哈希由工程外current-release收据绑定；Hosted、真人CLI安装/登录、付费Provider、签名安装器、日常资料和人工视觉验收继续各自开放。

工程外原件：`verify-222-da6141e6.log/.exit`、`browser-222-da6141e6-results.json`、`development-da6141e6-receipt.json`、`discovery-cancel-rust-socket-full.log/.exit`、`build-desktop-222-da6141e6.log/.exit`、`desktop-release-da6141e6.json`、`native-da6141e6-receipt.json`、`portable-native-da6141e6-receipt.json`、`independent-review-da6141e6.md/.receipt.json`、`final-footprint-2.1.22.json`。

Native首次10项后脚本select标签exact定位失败：原生label包含选项文本，prefix定位后第二次22项通过；产品源码未改、第一次失败及cleanup保留。真实环境Gemini无完整安装时正确禁用桥；便携23项通过使用独立version/help-only CLI夹具验证真实桥启动/健康/停止，不冒称真人安装/登录。所有截图/DOM为1920、1099、390的真实Tauri WebView逻辑视口，非物理手机或窗口尺寸验收。EXE未签名。

产品源码在da之后只能是文档增量；最终分享ZIP解压成员逐字节核对已实测EXE/manifest，并验证源码archive和恢复bundle。最终文档HEAD与ZIP哈希回读工程外`current-release-<HEAD8>.json`、`current-2.1.22-validation.json`，不嵌入自引用SHA或改写历史失败。
