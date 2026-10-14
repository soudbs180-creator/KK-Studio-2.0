# Verification：从2.1.22继续的按钮可用性与分端修复

- Task ID：TASK-222-ACTIONS-20261014；当前状态：PARTIAL，尚未完成最终修复验收或交付。
- 源码基线1abbcd51f36aec8b8e906ac980f051344021e1dd（Desktop/Web2.1.22）；任务分支codex/TASK-222-ACTIONS-20261014。本轮共享源码候选Desktop/Web2.1.23，Mobile2.1.1仅规划。
- 工程外证据目录：D:/kk-studio/output/actions-ui-20261014。以下为各执行时点的回执；最终源码尚未冻结，不能视为最终SHA的完整PASS。

## 基线与失败证据

- 基线typecheck PASS。只读审计确认Agent配置坏JSON/读取失败会覆盖原文件；Gemini非零退出部分JSON可误判成功；记忆/插件保存失败通知不真实；草稿触屏删除缺入口、上传仍在缩放层、资源来源清空遗漏、键盘删除撤销丢兼容收藏。
- root实际Edge/Vite development，http://127.0.0.1:1421/，main.tsx→App→lazy设置→SettingsPanel/GeneralSettings。1920/1099/390 DOM显示开关40×20、select80宽；390截图常规“默认绿色”截断。数据为独立浏览器上下文，不触日常资料。
- 首次几何脚本失败是hidden/lazy导航locator问题，未把其当产品缺陷；第二修正脚本通过，原日志保留。
- 后续失败探针覆盖记忆关闭后的延迟读取/采集、插件坏记录/加载超时/取消，以及MCP回执折叠丢失和备份恢复缺精确确认；失败日志保留，不改写为通过。

## 当前定向结果

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

## 已写入候选的行为与证明范围

- Agent只对ENOENT初始化；坏JSON/结构或不可读时保留原字节；沿用原子写，保存成功后更新workspace/origin内存。Gemini非零退出部分JSON与超时返回错误，不假报成功。
- 记忆开关保存错误在设置中可见；排队采集和读取等待后再次检查关闭状态。插件读失败阻止覆盖，合法旧字段保留，保存失败不发布新状态；更新核对身份、保留启用偏好，加载支持15秒上限、停止等待与迟到激活防护，失败清理宿主管理资源。
- MCP候选保留折叠后的参数/回执、锁定busy期间导航和相关动作，AbortSignal沿现有调用传递；停止等待提示请求可能已在远端执行。备份恢复确认包含具体ID，取消不恢复。
- 顶部屏幕动作复用原上传input和删除/撤销链；320px HUD定位和喜欢/兼容收藏偏好已补最小修正，资源清空统一重置来源。通用开关/选项与上传使用现行tokens。
- Google获取密钥已有Web独立页面夹具场景及Desktop shell候选入口；本轮fresh Tauri外部浏览器回执尚未取得。Web夹具不代表真实密钥、登录或Desktop壳已验收。

## 最终门禁仍待完成

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
