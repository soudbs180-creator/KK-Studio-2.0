# P6.1 验证与交付边界

2026-10-29；TASK-MOD-P6-1；PARTIAL。base `6648e434f1a2b3d041b6a767f74831eacf9e7773`，复用 `refactor/TASK-MOD-P3-feature-cycles` / `D:/kk-studio/.worktrees/TASK-MOD-P0-architecture-baseline`。最终源码/EXE/report hash及head见 `D:/kk-studio/output/p6-1-2026-10-29/final-receipt.json`。未修改main或安装用户客户端；用户要求不再控制桌面，后续只用浏览器/命令行。

## 实现

目录扫描复用scan_comfyui_path；源码/portable/venv启动先解析真实Python位置且强制探针UTF-8，避免WindowsApps别名逃离Job和中文路径乱码；隐藏进程、仅自有进程停止、超时健康检查。固定loopback HTTP禁止代理/重定向并限制端点、字节与产物路径。

画布新增工作流卡片，选择已存API工作流后快速生成；原生ComfyUI大屏iframe与返回按钮，关闭dialog保留编辑状态。host/editor使用不同client；WS消息触发有归属校验的history补收。AssetPort.write原件成功后调用现有画布addNode/connect，并同步完整canvas后flush。先保存intent，受理不明不重发；明确拒绝可重试，丢失回执经submission key恢复。项目切换/删除、重放不落错图或重复图。

## 已观察的检查

| 检查 | 结果/证据 |
| --- | --- |
| 类型 | `typecheck-seal.log`，0错误 |
| lint/治理 | `lint-seal.log`；R1=0/R3=0/R4=0；健康0 blocking/0 allowed，版本一致性原5个历史展示版本/1个未发布版本提示保留 |
| 根单元 | `tests-final-2.log`：2378 pass/20 skip/0 fail |
| Rust | `rust-closure.log`：271 pass/1 ignored/0 fail，含中文含&路径、系统Python与venv自有子孙回收；原8项编译warning保留 |
| 官方构建 | `native-build-final.log`，Tauri --no-bundle；构建不证明最终Native运行 |
| 浏览器 | 最终18项，资产/项目生命周期/既有P6能力/新卡片；1423生产预览、Edge、worker1/retry0；报告由回执绑定 |
| UI规范 | `ui-final-2.log`：290文件0违规；派生设计检查0 error，25条原提示保留 |
| 格式 | `format-final-2.log` |

## 中间Native夹具证据，非最终客户端验收

`native-complete/receipt.json`绑定EXE SHA `d4103400fc0f8ea8971d853e909a3019190c16c658e4e72cbd82d85d9c9d092e`：隔离data/profile、真实Tauri IPC/WS、host快速提交/editor键盘提交各一次、两张原件SHA一致、两个result edge落盘、重载后从项目库重开、停止后owned=false/ready=false。remote iframe虽有注入对象，实际get_storage_root返回“not allowed by ACL”。图片来自明确no-GPU夹具，不是真实模型输出。

此证据产生后又补了扫描接线、UTF-8探针、unknown/拒绝对账及CanvasSurface分离/正确字重；最终版本仅做Rust/Node/浏览器/官方构建，不再启动桌面。不能把中间EXE证据冒充最终EXE运行通过。原生iframe自动化鼠标没有触发按钮，键盘路径通过；物理点击未验证。computer-use曾只读取并尝试激活隔离窗口，截图与目标不一致后未点击；按用户要求停止，不再重试桌面控制。

## 失败证据及修复

保留所有red/诊断日志，不改写为成功。`canvas-green.log`揭示图片已存但canvas edges/positions尚未flush；已同步完整画布，浏览器重载/边断言通过。`native-probe/result.json`揭示本机HTTP被代理转发502；改no_proxy。`native-descendant-red-free.log`复现停止后Python子孙存活；实际解释器解析后及venv回归通过。最初UI检查超行数/字重token失败，现隔离CanvasSurface并使用既有subtitle令牌，未放宽门禁。

## 仍开放

- 真实已安装ComfyUI/GPU、完整原生图编辑界面及鼠标；最终EXE/GUI启动器与安装客户端验收。
- 卡片独立参数面板：本轮参数在原生工作流内编辑，未自动暴露任意节点字段。
- Figma03新增未连接3103:38859/就绪3103:38929/工作3103:38974/沉浸3103:39019，先读01规则与03源、再实现；04/05实例/全状态/严格像素未完成。原main审计文件保留。
- history补收只查最近100任务；服务历史已清空/超窗不保证找回。没有新增全局中断或自动重发。
- 独立review NOT_VERIFIED（用户禁止子代理），完整verify与既有9项核心浏览器失败/1像素差异仍开放。未运行完整浏览器集，未声称全部门禁通过；不能合main。
- P6.2–4、P7原候选与其他P/STD/ORG继续单独跟踪，不把这张卡当作四份原文全部完成；P2/P5生产flag不变。

交接源sha见handoff-source.json，原四文档来源及完整覆盖继续以P0的four-document-sources.json / four-document-coverage.md为准。模型不搬迁、不安装依赖/模型、无真实计费调用或生产发布。

最终浏览器补验新增工作流下游父边；菜单通过portal渲染，夹具定位已按真实DOM修正。CanvasSurfaceFrame独立命名避免Windows大小写模块冲突；未修改原canvasSurface坐标换算。

最终Edge复跑18/18 pass、0 skip/0 retry，报告与附件由final-receipt绑定。根2378 pass/20 skip、Rust271 pass/1 ignored；未重跑整套verify或宣称历史失败消失。

## 合流前独审修复（TASK-MOD-COMFY-RECOVERY）

独立审查base c2a0228a→079c5351发现IR-P6-01(P1，最近100条漏收)及IR-P6-02(P2，删除复活)。先保留RED：comfy-history-red.log与comfy-deletion-confirmed-red.log；删除用7280原两文件临时运行，finally恢复候选，实际得到删除后true。恢复11项单元通过、真实Canvas浏览器夹具删除/序列化恢复通过，Native白名单定向测试另记。历史HTTP协议依据2026-10-29核对[上游server.py](https://github.com/comfyanonymous/ComfyUI/blob/master/server.py)及[execution.py](https://github.com/comfyanonymous/ComfyUI/blob/master/execution.py)的offset/逐任务接口。证据统一D:/kk-studio/output/p8-integration-2026-10-29。最终快速/补审及SHA以随后回执为准，非真实GPU验收。

候选检查：根2391 pass/0 fail/20 skip，类型与增量lint（7280 base）通过；Rust comfy_transport::tests 1/1通过；历史11项通过；实际Canvas浏览器在删除后再次轮询、显式flush/标准化重载、卸载重挂后轮询均不复活，原目录/双态编辑/原件/连线断言保留。普通下游新增边是异步发布，保留原containEqual断言改为等待实际边就绪，无重试/容差。证据browser-comfy-recovery.log、tests-comfy-recovery.log、types-comfy-recovery.log、lint-comfy-recovery.log与comfy-transport-final.log。

独立c0ff补审：IR-P6-01关闭；IR-P6-02发现预览/App删除遗漏，并联查Agent批量删除。新增实际App deleteItem源码回调及Agent bulk回归，先RED（缺dismiss标记）后共享领域removeCanvasItems GREEN，三个删除入口同逻辑，其他卡片及原输入不改。根2393 pass/20skip、类型/增量lint/build、15项首页/连接保护/Comfy浏览器全过。删除回归及最终候选补审另绑定SHA，不将c0ff评审冒充新SHA。
