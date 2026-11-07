# ADR-031：插件权限与实验隔离运行时

- 状态：PROPOSED；P5部分实现，生产执行门保持关闭。
- 日期 / Task / Owner：2026-10-29 / TASK-MOD-P5 / root
- 来源：[P5规格](../../changes/2026-10-29-p5-plugin-permissions/spec.md)、[MODULARITY](../MODULARITY.md)、四份原文补篇A4/A6，与OPT-401共用同一设计。

## 决定和兼容

OPEN-3采用补篇A的legacy兼容：既有SDK、四个随包插件和已安装JS继续原路径加载；诊断明确其仍有宿主权限。该路径不是安全沙箱，新清单加载失败不降级执行JS。旧存储key、项目、插件节点和资产保持，不自动删除或改写用户数据。

契约包1.4.0新增kk-plugin.json的Zod定义、JSON Schema与RPC定义、PermissionPort；既有1.x字段兼容。apiVersion当前支持主版本字符串1，未带清单的旧SDK按legacy兼容；未来引入下一主版本仍需保留上一版。JSON Schema表达结构与基础限制，宿主Zod和运行检查继续负责semver、命名空间、完整性等语义，不把静态Schema当成授权。

清单必须校验版本/宿主范围/平台、命名空间/重复节点、权限集合、逐文件SHA-256和包目录；外部包不能自称builtin。下载省略凭据、拒绝重定向，清单128KiB、单文件1MiB、总包4MiB、最多32文件。每次启用/恢复重新验包，不信任持久化的解析结果。安装、更新、停用及失败回退复用原store/loader，保留上一版本记录；并发变更/卸载/取消后不复活旧操作。

权限由宿主保存的声明与授权交集决定；主体从宿主绑定，消息不能指定其他插件身份。RPC仅开放明确方法，逐消息Zod校验，64KiB、最多8并发、512次会话请求、15秒期限；同ID不重复提交，停用/超时阻止迟到回复并向现有AI方法传AbortSignal。取消请求不代表Provider已撤销受理。

## 分级运行时

| 档位 | 当前候选 | 验收/降级 |
| --- | --- | --- |
| legacy / 原随包插件 | 原宿主React SDK兼容，增加诊断 | 仍具有宿主权限，不宣称已隔离或已有新清单完整性 |
| T0 declarative | 清单可校验 | 工作流/Skill/Capability贡献未接线，明确拒绝，不静默忽略 |
| T1 iframe | Web实验实现及真实Edge fixture；两个opaque-origin frame，受限RPC | 默认不启用，Desktop明确不可用；没有原生、全浏览器或生产隔离结论 |
| T2 Worker / T3 MCP | 清单可声明，执行器未提供 | 明确拒绝；Worker不能作为网络安全边界，不重造MCP进程管理 |

实验T1使用可信外层限制子frame只导航blob，guest禁止后代frame、直接连接、外部脚本/图片、Worker、表单和对象；均不带allow-same-origin，不下发IPC或宿主运行时。内层的inline脚本策略仅属于无权限的隔离文档，Tauri应用CSP没有放宽。每次RPC取当前宿主Context，React重渲染不重启guest；停用/卸载关闭会话。

依据：[W3C CSP3本地scheme继承](https://www.w3.org/TR/CSP/)、[MDN iframe sandbox](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe)、[frame-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-src)、[Tauri capabilities](https://v2.tauri.app/security/capabilities/)。Tauri文档指出部分平台不能区分嵌入iframe与窗口的IPC，不能凭Web测试启用Desktop；当前CSP和历史同源模块修复保持。

## 未完成与退出

实现后补核了成熟方案：[Comlink](https://github.com/GoogleChromeLabs/comlink)提供远程对象代理，[Penpal](https://github.com/Aaronius/penpal)提供方法调用、连接与调用期限。两者仍需接本项目Zod白名单、主体授权、消息配额与任务受理边界；当前候选仅验证固定方法的权限适配和标准postMessage，不作为通用RPC框架。扩大API或形成正式SDK前，须复核Penpal适配与替换实验传输的收益，不能把此实验原样当成正式沙箱。

生产loader的enableSandboxPackages默认false，App没有开启入口。测试显式opt-in只证明限定Web fixture；WebRTC/更多网络API、CPU/内存耗尽、不同浏览器、原生IPC及独立安全审查尚未通过，不作为“完全沙箱”发布。授权/撤销UI须先完成Figma设计；现有安装UI不给新包默认权限。受信builtin目录签名/完整性、T0/T2/T3、其他贡献与完整SDK/脚手架仍待OPT-401同源推进。

回退本候选提交即可恢复原加载器；不迁移既有数据。原失败日志保留，任务PARTIAL；完整verify、独审、真实服务、原生与main整合另验。
