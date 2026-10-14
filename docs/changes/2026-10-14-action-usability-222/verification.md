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
