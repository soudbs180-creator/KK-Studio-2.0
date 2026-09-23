# Desktop Agent 验证记录

Windows Agent 托管子项 PASS；TASK-AGENT-002 整体 PARTIAL。基线为 cf344ddcdf039c6e62aeb9c65106e2a2339c0bb4 加既有未提交工作，本轮隔离分支 fix/TASK-AGENT-002-desktop。未commit/push。原工程回传结果单独写入 evidence/integration.json。

## 已完成与重新核验

- 原工程起始快照：完整 verify 为351 Node/266 browser，Rust74通过；旧Codex清单380/380源码与当时原工程相符，旧Web JS/CSS匹配。DS002的旧截图来源10/12、UI005为17/38、UI006为21/23仍同字节；这些历史截图不能当作最终当前产物验收。
- 修复手动 Agent 无环境凭据时保存/打印Token的漏洞；当前saveConfig始终写空Token。合成非生产Token反例先失败再通过，桌面实际配置/浏览器localStorage均无连接Token。
- vendor完整源码、锁文件、许可证解除忽略，根npm ci从锁文件安装并构建Agent和四个插件；不带node_modules、会话、日志或auth.json。当前vendor源码指纹见 evidence/vendor-source-manifest.json。
- 当前候选 lint/typecheck/format/UI/build通过，356 Node/270 browser全通过；Rust78/78及fmt/check通过；Agent126通过、2个POSIX文件权限测试在Windows按既有条件跳过。没有隐藏失败或flaky。
- 独立目录重新npm ci（不复制依赖）、356单测及production build通过。首次纯文件导出单测355/356，唯一失败为deliveryPolicy需要Git HEAD；随后只为隔离验证目录引入本地基线Git元数据，重跑356/356，未修改原仓库历史。

## 实际运行链路

路由/import链：App → SettingsModal网络分区 → AgentConnectionSettings → DesktopAgentControl → agent_runtime_* IPC → 随包Node/desktop-entry → vendor HTTP/Codex。沿用 DESIGN-SYSTEM tokens/shared settings样式。

Web：npm run test:ui 构建后用固定1423 production preview，270项包含Web禁用说明、缺资源、托管连接/停止以及慢外部握手不被接管；模拟IPC证据不等于真实桌面。

Desktop：npm run agent:package；CARGO_TARGET_DIR指向工程外本轮rust-target，再运行 npm run tauri -- build --no-bundle --config src-tauri/tauri.agent.conf.json。启动当前EXE，--data-dir与WebView profile使用独立临时目录，CDP9345。实际URL http://tauri.localhost/、production模式、原生数据根与JS/CSS内容逐字节核对。

隔离候选EXE SHA-256：5433b57a46b93d15ad3ddbe8693976ceb80a4cde749e0f2ad276b4ce9ec5e7ca。实际前端 index-C112It_R.js / index-DgWAVrvj.css；哈希详见 evidence/desktop-runtime.json。运行包4,269文件逐项SHA-256核验；独立审查还核对136个生产包、210条依赖边的真实物理解析位置，没有通过flatten改变版本解析。

真实账号验收：scripts/audit/check-agent-desktop.mjs --real，8项通过；经KK对话发出最小请求得到KK_DESKTOP_READY。另直接运行随包stdio MCP，canvas_get_state返回本次实际画布3个节点。停止/重启保持同一线程，应用二次启动可恢复；正常退出和强退均实际核对12个自有进程已退出，外部17381仍运行。只读MCP回路不扩大为任意第三方工具验收。

空会话验收：同脚本不加--real，7项通过，不发送模型turn也能跨服务与应用重启保留线程。报告 evidence/desktop-empty-runtime.json。新建主线程显式legacy历史并通过官方thread/name/set持久化；不修改既有历史或临时Skill线程。

## 失败与修复记录

真实验收依次暴露并修复：Windows verbatim路径无法传给Node；Codex0.155.1默认paginated历史接口拒绝list_turns；恢复中的hello旧状态覆盖后续状态；未发送输入的空线程未物化；停止门禁错误等待只读账号请求；安装脚本子串误判漏改Token保存；验证脚本忽略signalCode误判强退未结束。原始日志保留在工程外 output/remaining-verification-20260922。

最终组合验证中的一次Playwright启动被外部1423占用阻断；没有结束他人进程、换端口或复用未知服务器，端口自然释放后重跑270/270通过。审查发现同数据根多实例覆盖端口、慢外部握手被接管，两项均修复并增加用例。独立预检见review.md。

## 使用与未完成边界

Windows打包命令 npm run client:build:agent；现有已登录Codex身份沿用，运行数据在原KK数据根/app/agent，不复制登录文件。打开设置 › 网络 › 启动并连接。普通无资源包诚实显示不可启动；Web仍手动连接本地服务。服务启动不自动发模型请求。未发送过消息的新主会话以KK Studio作为初始名称。

Proxy托管、其他软件/网页并发、非兼容API、音视频、附件/参考编辑和通用第三方MCP详见 [当前清单](remaining.md)。真实内置生图沿用前轮Web历史证据，本轮未重复生成图片；付费Provider、安装器/签名/干净Windows机器、Hosted CI、正式PR/发布均未以本地验证替代。

## 原工程最终回传与并发合并核验（2026-09-23）

本轮最初按原件SHA核对回传64个增量文件，首次原工程完整verify为356 Node/270 browser通过。随后TASK-UI-007回传响应式UI；本轮保留它的源码、共享账本与新文档，没有用隔离候选覆盖该任务。最终在组合后的原工程重新运行npm run verify，356 Node/286 browser全部通过，lint/typecheck/format/UI/build通过，55任务与29功能均0违规，退出码0。原工程Rust78/78和fmt通过，相关Rust源码未被并行UI改变。

最终复测绑定522个当前源码/构建输入文件，复测前后逐项哈希无变化。针对原已登记的2,062个非本轮文件，保留并行UI更新后的最新字节；本次测试改写的19份截图/报告均先归档，再恢复到本次复测前内容，最终无额外变化。并行更新与历史基线的差异单独记录在integration.json，不能误称整个工程一直与最早基线相同。未commit/push，HEAD保持cf344ddcdf039c6e62aeb9c65106e2a2339c0bb4。

最新运行来源为原工程src-tauri/target/release/kk-studio.exe，SHA-256为4b8f8a047b4a444935fe4a1245c8056afcdcbe99922d00c4608385c964aef63e。此EXE由并行UI任务的client:build:agent构建，本轮重新核对其实际tauri.localhost资源并执行Agent验收：真实Codex/MCP/lifecycle 8项和空线程7项均通过；JS index-DAcUlW9R.js、CSS index-D1bWxVd5.css逐字节匹配当前dist；运行包4269个文件全部哈希匹配。正常/强制退出各回收12个自有进程，外部17381保持原状态。使用独立临时data/profile，没有切换用户KK数据根。

最新证据：evidence/integrated-source-manifest.json、evidence/integrated-browser-results.json、evidence/integrated/desktop-runtime.json、evidence/integrated/desktop-empty-runtime.json、evidence/integration.json。上文270项浏览器和5433开头EXE指纹对应隔离候选；最新组合版本以本节为准。干净安装验证仍对应Agent候选，其锁文件与vendor源码在组合版本中未变；不将这项声明扩大为正式安装器、签名或干净Windows机器验收。
