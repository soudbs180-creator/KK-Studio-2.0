# Verification：从2.1.22继续的按钮可用性与分端修复

- Task ID：TASK-222-ACTIONS-20261014；当前状态：DONE/PASS（本地授权范围）；外部平台与真人验收保持独立边界。
- 源码基线1abbcd51f36aec8b8e906ac980f051344021e1dd（Desktop/Web2.1.22）；任务分支codex/TASK-222-ACTIONS-20261014。本轮已测产品提交b4fa7b0e955f6b4eff0fe87b5425fe173c53ca07，Desktop/Web2.1.23；Mobile2.1.1仅规划。
- 工程外证据目录：D:/kk-studio/output/actions-ui-20261014。产品源码已冻结并实际运行；最终纯文档提交另由工程外current-release收据绑定。下方历史章节中的“待完成”只描述该执行阶段，不覆盖终态。

## 最终本地验收

Desktop/Web2.1.23产品提交b4fa7b0e承接2.1.22基线1abbcd51，本任务本地授权范围DONE/PASS。CLI配置和失败回执、记忆/插件持久化与迟到结果、MCP停止等待及回执、备份确认、画布顶部上传删除/撤销和筛选已修复。沿用用户确认的手机新布局，主题及独立背景偏好保留；菜单避让、层级与内容边界在320/390×light/dark验证。完整九步verify退出0：Node1251pass/14既有skip、Agent180pass/2既有skip、production Edge574首试/0flaky、UI241/0、development5步骤PASS；Agent真实编译及官方构建通过，Rust163与fe0→b4原生源码一致。实际Tauri和同字节便携目录各35项通过，5协议一次POST/恢复、4取消或超时socket关闭、CLI桥启停、Google系统浏览器本机GET、4窄屏真实filechooser、原件/坐标/撤销偏好均核对。新依赖0，入口gzip增加1244B<16384；4278生产白名单519463832B。原资料身份、primary dirty/index及旧失败保留。产品ZIP/Web、源码及恢复由工程外current-release收据绑定；最终文档提交与已测产品提交分开记录。Hosted、真人CLI安装/登录、付费Provider、签名安装器、日常资料、实体手机及用户视觉验收各自开放，Mobile2.1.1仍规划。

| 检查 | 实际结果与边界 | 工程外回执（actions-ui-20261014内） |
| --- | --- | --- |
| 九步完整verify | 退出0，起止HEAD均b4fa7b0e；Node1251/14既有skip，Agent180/2既有skip；浏览器574首试，0失败/0flaky/0skip | verify-b4fa7b0e-final.log / .exit / -browser-results.json / 起止-head.txt |
| Agent配置、CLI/记忆/插件、集成安装器 | 定向9通过/2既有skip、83通过、3通过均已包含相应全套，不重复累加；真实agent:build通过 | config-first-green、unit-final-source、installer三项日志；完整verify |
| UI/增量健康 | UI241文件0违规；相对任务base41文件0新增棘轮违规；旧主线advisory不冒称已清零 | health-b4fa7b0e.log；完整verify |
| Development | 1421真实Vite，5步骤PASS，父工程AGENTS请求403保护有效；无HMR遮罩规避 | development-b4fa7b0e-final/receipt.json / plugins.png |
| Rust/fmt | 163通过、fmt退出0继承fe0时点；fe0→b4的src-tauri无任何差异；新官方构建实际编译 | rust-current.log / .exit；build-desktop-b4fa7b0e.log / .exit |
| 官方桌面构建 | 2.1.23，source/input/EXE三者回读，reason=current仅代表本机产物 | desktop-release-b4fa7b0e.json |
| 实际官方Tauri | 35项PASS，5协议、4取消/超时、CLI/外链/原件/坐标/撤销/4次窄屏filechooser；自有进程及合成凭据清理成功 | native-candidate/runs/1791978234481-f7acbee9-5b4f-4e58-ab96-cb6dd57bb5c9/evidence/receipt.json |
| 同字节便携目录 | 相同EXE/runtime的35项PASS；自有资料目录，清理成功；不是安装器验收 | native-candidate/runs/1791978416689-604ed753-b691-40c5-b516-029bd9a91f1f/evidence/receipt.json |
| 体积/数据 | 新依赖0，入口gzip增加1244B；资料identity/存储契约diff为空，原134任务语义保持 | final-footprint-2.1.23.json |
| 白名单/归档 | runtime4278文件、519463832B；便携4282文件；ZIP每成员SHA/库存、源码archive、恢复bundle verify通过 | package-b4fa7b0e.log / .exit；current-release-b4fa7b0e.json；最终文档版current-release收据 |

EXE SHA256：2d7096717d271cbfdb2c06bc38824f94bf72124176830d14003da68be4eb7727；input SHA256：6dc318be1b0fda968b98d3898cc37f69549f217a50ed5de0d41a578176515512；产品tree：a65f2a4510908073c43588e014f6ca6350a8d44f。runtime manifest SHA256：42aa2eabab5c2d3eac81d65a48ba20140082ec41e612d9883ede0a12f30e47e4。Windows ZIP SHA256：749ef748e8ed5cbe9784a712cfc4f4d094cf339efa34a91b4a4f48f9e94995ac；Web ZIP SHA256：8b2926fbe710fc86f1526a7cd0507be1b0523afc2e49b173ee8b6a03367d4193。最终文档版源码ZIP与恢复增量SHA按其最终HEAD的current-release收据回读，不复用旧源码包身份。

生产Web使用`npm run build`→固定1423 Vite preview；development固定1421；Desktop使用`npm run client:build:agent -- --no-bundle`和当前产物，CDP9350、独立--data-dir/profile/CODEX_HOME。route为创作工作区，链路main.tsx→App→Canvas/屏幕编辑器/动作门户；设置为App→lazy SettingsPanel→GeneralSettings/Provider/MCP/Companion子页。实际bundle名/哈希、input、原件与资料路径、32px上传命中、1920/1099/390/320同状态DOM/截图均在上述回执；菜单双主题320/390四张永久截图另见selected-zoom-containment-green-evidence。

Google外链核对真实官方href后，仅将测试锚点改到自有loopback静态HTML，正常点击经实际Tauri shell使系统浏览器发出GET，随后恢复href；无IPC stub，未访问真人密钥页或登录。五协议仅本机HTTP夹具文本，CLI仅owned version/help与桥健康夹具；不推导付费Provider/账号登录。停止等待不保证远端未执行，插件任意顶层副作用与已提交的记忆写入不声明可撤回。

第一次b4全套在turn_aborted期间失去测试服务，无完整退出回执，保留为INTERRUPTED（verify-b4fa7b0e-interruption.txt及原日志）；无源码改变后完整重跑的-final回执才是终态。历史失败、定位错误和中间构建原件均保留。primary新增外来并行文件单独记录，不据其变化宣称本轮修改或覆盖资料。

## 历史阶段记录（按当时SHA与范围保留）

## 基线与失败证据

- 基线typecheck PASS。只读审计确认Agent配置坏JSON/读取失败会覆盖原文件；Gemini非零退出部分JSON可误判成功；记忆/插件保存失败通知不真实；草稿触屏删除缺入口、上传仍在缩放层、资源来源清空遗漏、键盘删除撤销丢兼容收藏。
- root实际Edge/Vite development，http://127.0.0.1:1421/，main.tsx→App→lazy设置→SettingsPanel/GeneralSettings。1920/1099/390 DOM显示开关40×20、select80宽；390截图常规“默认绿色”截断。数据为独立浏览器上下文，不触日常资料。
- 首次几何脚本失败是hidden/lazy导航locator问题，未把其当产品缺陷；第二修正脚本通过，原日志保留。
- 后续失败探针覆盖记忆关闭后的延迟读取/采集、插件坏记录/加载超时/取消，以及MCP回执折叠丢失和备份恢复缺精确确认；失败日志保留，不改写为通过。

## 历史定向结果（终态前）

| 检查 | 实际结果 | 回执 |
| --- | --- | --- |
| Gemini/记忆/插件定向unit | 当前83通过，0失败、0跳过；此前75通过保留 | unit-final-source.log / .exit（0） |
| Agent配置定向unit | 11项：9通过、2既有跳过、0失败 | config-first-green.log / .exit（0） |
| TypeScript | PASS，退出0 | typecheck-second.log / .exit |
| UI标准 | 241文件，0违规，退出0 | ui-second.log / .exit |
| 生产构建 | PASS，退出0；只证明可构建 | build-targeted.log / .exit |
| 当前按钮/设置/画布浏览器 | 45/45首试通过，0失败、0重试 | browser-precommit.log / .exit / -results.json |
| 历史按钮/设置/画布失败阶段 | 23项：18通过、5失败；均被当前回归关闭 | buttons-green-second.log / .exit / -results.json |
| 历史MCP/备份失败阶段 | 6项：4通过、2失败；当前45项已包含复验 | mcp-backup-red.log / .exit / -results.json |
| 本任务代码健康增量 | 对base1abbcd51：37文件，0新增棘轮违规 | health-task-current.log |

上述5项浏览器失败分别涉及未加载插件卡片顶部删除、320px/50%缩放图片和视频上传、工具栏和键盘删除后的偏好恢复，当前实际页面均已通过。MCP折叠回执、停止等待及备份确认/取消/恢复同样在当前45项实测；恢复取消0次POST、确认1次POST，旧IndexedDB保留。

中间44项41通过/3失败，是手机扩展标签隐藏“工具”辅助字后，新增测试仍匹配“MCP 工具”造成的定位错误；依据实际无障碍树修正为MCP主标签，11项专项与当前45项通过，原失败保留。独立预检另复现启动/发现迟到结果可重新启用插件；新增8项在实际checkout全部RED，保存/激活前核对当前记录后GREEN，83项包含其回归。模块任意顶层代码不在撤销声明内。

## 历史候选行为与证明范围

- Agent只对ENOENT初始化；坏JSON/结构或不可读时保留原字节；沿用原子写，保存成功后更新workspace/origin内存。Gemini非零退出部分JSON与超时返回错误，不假报成功。
- 记忆开关保存错误在设置中可见；排队采集和读取等待后再次检查关闭状态。插件读失败阻止覆盖，合法旧字段保留，保存失败不发布新状态；更新核对身份、保留启用偏好，加载支持15秒上限、停止等待与迟到激活防护，失败清理宿主管理资源。
- MCP候选保留折叠后的参数/回执、锁定busy期间导航和相关动作，AbortSignal沿现有调用传递；停止等待提示请求可能已在远端执行。备份恢复确认包含具体ID，取消不恢复。
- 顶部屏幕动作复用原上传input和删除/撤销链；320px HUD定位和喜欢/兼容收藏偏好已补最小修正，资源清空统一重置来源。通用开关/选项与上传使用现行tokens。
- Google获取密钥已有Web独立页面夹具场景及Desktop shell候选入口；本轮fresh Tauri外部浏览器回执尚未取得。Web夹具不代表真实密钥、登录或Desktop壳已验收。

## 历史阶段未完成门禁（终态前）

- 完整npm run verify及development、适用Rust/native回归；现有root14/Agent2跳过项继续明确列为SKIP。
- fresh生产Web和官方Tauri重建：实际启动命令、1421/1423或Tauri模式、route/import链、bundle身份、同状态DOM/截图与320/390/1099/1920px交互证据。
- 最终base/head绑定的独立审查、提交、便携目录实测、源码/Web/ZIP白名单及hash/receipt回读；未取得前不更新为DONE或宣称最新产物已交付。
- Hosted、真人CLI安装/登录、付费Provider、签名安装器、日常用户资料/实钥、实体手机与人工视觉验收继续保持各自未验证边界；本地fixture或旧2.1.22成功不关闭这些任务。

## f3d2ab86完整检查与轨道测量纠正

f3d2ab86的完整verify退出1：Node1248通过/14既有跳过、Agent180通过/2既有跳过、浏览器568通过/2失败，development因前步失败未执行。两个dark/light颜色规格仍测量按钮透明命中区；实际开关轨道已移到::before。保持对比度>=3及全部8种颜色，改测实际伪元素并新增轨道token配对断言。首次补测误用不存在的token而失败，改为已注册的--bg-accent/--ui-control-off；当前8/8首试通过。三次原件分别为verify-current、switch-track-measure-green和switch-track-measure-second-green日志/JSON，不能以最新结果回填旧失败。新clean提交完整verify、原生与产物仍须独立复验。

## fe0ff7a2完整复验与桌面构建链发现

fe0ff7a2完整verify退出0：Node1248通过/14既有跳过、Agent180通过/2既有跳过、production Edge570/570首试、UI241/0、development5步骤PASS；源码独立审查PASS。Rust163及fmt通过。该回执不含后续新增Agent构建门禁，也不代替新的桌面构建。

官方带Agent构建首先因install-desktop-support旧token片段检查失败；三项隔离安装器回归先RED（2通过/1失败），增加明确的当前集成片段兼容后3/3 GREEN，旧片段和异常拒绝仍保留。随后agent:build真实编译发现ensureSiteWorkspace推断返回类型丢可选字段，补显式SiteWorkspaceConfig返回后构建退出0。verify新增agent:build，防止以后只跑可执行TS测试而漏掉当前Agent编译/集成检查。原构建失败与TS错误日志保留；新的完整verify、提交独立补审、官方构建与Native仍待取得。

## 67ba0261与实际手机菜单遮挡

67ba0261完整9步verify退出0：Node1251通过/14既有跳过、Agent180通过/2既有跳过、production Edge570/570首试、UI241/0、development5步骤PASS。官方带Agent构建退出0，EXE aab8b9160d5ae082afe89b126288e9b373e685ff7ecdf0943ddb28648b85c95b，source/input和运行时白名单核验；源码审查PASS WITH FOLLOW-UPS，TESTING文档九步同步待最终收尾。

该EXE实际Native在窄屏上传阶段失败：图片操作工具栏截获缩放50%选项；完整31项已完成部分保留，但整体不得标PASS。5协议一次POST/结果恢复、CLI桥与Google系统浏览器的本机独立HTML GET等前序回执保留，cleanup/合成凭据清理成功。新增390/320×light/dark回归，首次是上传/参考两个input的locator错误，纠正后4项实际命中RED；工具栏避让缩放菜单后专项23项GREEN。进一步覆盖全部比例，屏幕编辑器遮挡下方选项4项RED；增加现行画布菜单层级token并保持喜欢/标签在其上，23项首试GREEN。原Native和browser失败不改写。

用户澄清沿用之前确认的手机新布局；源码审计确认原响应式布局与浅色基础tokens保留，独立背景偏好不强制改白。最终新clean提交完整检查、重建EXE与Native/便携目录仍待回执。

## f5b7c7bb完整检查与菜单内容边界

f5b7c7bb完整9步verify退出0：Node1251通过/14既有跳过、Agent180通过/2既有跳过、production Edge574/574首试、UI241/0、development5步骤PASS。独立UI补审发现手机菜单固定224px高度使400%选项超出圆角背景；原命中检查没有覆盖包含关系。增加全部比例的菜单内包含断言后，320/390×light/dark四项RED；手机高度改为内容撑高后导航与选中菜单11项首试GREEN，四张截图保存在工程外selected-zoom-containment-green-evidence。桌面原帧和已确认手机布局保留，TESTING同步九步门禁。新源码完整复验、独立补审与桌面产物仍待回执。
