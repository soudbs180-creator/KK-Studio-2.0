# Spec：生产接线与兼容边界

- Task ID：TASK-E2E-WIRING-20261104；状态：READY；日期：2026-11-04。
- 来源：[intent](intent.md)、仓库 AGENTS/AI_RULES、MEMORY-CONTRACT、UI_INDEX、用户完整 P0–P4 清单。

## P0 数据契约

`global` 映射既有 `~/.kk-memory/memory.json`，`project:<id>` 和 `session:<id>` 使用相邻子目录。Desktop 服从现有隔离数据根；Web 保留私有 IndexedDB 与授权共享只读模式。默认关闭、临时聊天不采集/注入、内容不进入 localStorage/日志/项目导出。

V1 读取在内存迁移，正式写入 V2 前保留原始字节备份；损坏和未来版本拒绝覆盖。并发比较使用读取时的原始快照，首次不存在也必须比较。文件锁、同目录临时写、flush、原子替换复用现有宿主实现。

作用域加权采用用户指定参考方案中的明确映射：session=1.0、project=0.85、global=0.70，按词法分数乘权重排序，再按指纹去重并限制条数和字符预算。不能为了通过草案测试改成作用域优先。

Agent 前置检查按实际画布实体与显式引用验证；缺实体或必需属性在付费推理/生成前返回可操作错误。无需实体的一般对话不因空图谱被阻止。

## P1–P4

使用现有调度、计划、生成、画布和插件契约，避免第二套状态源。插件未注册时插槽不新增可见内容。Figma 对应组件已有规范时复用；新增可见交互须先核对当前设计。阶段 3 dirty 工作树先检查并保留完整候选，再吸收和复验。

所有操作必须反映真实成功、错误、取消、离线和迟到结果；不支持的操作明确拒绝。Desktop、Web、390px 浏览器与原生 Mobile 的证据分别记录。
## 2026-11-04 UI 控件接线来源补记

本轮在本地控件接线前回读当前 Figma：文件 ZiadpErDoFweCjG3uHjkM3；04 首页 9:3、03 操作按钮 551:6356（由首页上下文返回）、设置插件 47:2785；视频参数 630:7196、图片 15 画幅 3287:40291。01 页 91:2 metadata 已定位现行规则框 2925:368；直接请求页级 context 返回“未选择图层”，不把此响应当作规范正文读取。沿用前序已读规范与本次具体母版，不新增视觉设计。共享控件接线保留既有业务 class、形状和回调；具体尺寸及浏览器实测另记。视频只保留本模型支持的 16:9/9:16，不能覆盖图片 15 档。固定宽度与热区问题按当前母版修正，不把文字按钮、图标按钮、拖拽把手混为同类。

## 2026-11-04 记忆范围管理设计补齐

已重新读取 01 现行规则 2925:368 的各行，包含字重 400/500/700、Dark 360/460/660、32px 常规控件及独立 44px 触控命中区。此前页级读取不足的记录仅代表当时状态。直接证据：工作区 output/e2e-wiring-2026-11-04/figma-01-typography-current.json。

本地范围 UI 修改前，先更新 [03 记忆管理母版](https://www.figma.com/design/ZiadpErDoFweCjG3uHjkM3?node-id=1189-20669)，新增范围行 4376:119305，复用内容行 1189:20259、下拉 489:2860 与图标 372:891。再补齐 [04 桌面场景](https://www.figma.com/design/ZiadpErDoFweCjG3uHjkM3?node-id=4381-63323) 和 [05 窄屏网页场景](https://www.figma.com/design/ZiadpErDoFweCjG3uHjkM3?node-id=4381-77335)，后者范围选择使用 750:59158 的 32px 可见框和 44px 命中区。原关闭态场景和独立手机未接入状态保留。

三个场景已截图回读，文本均继承 Source Han Sans CN VF；场景由可编辑层与实例组成，未将完整 UI 栅格图当作界面。证据 figma-memory-scope-scenes.json 和 figma-memory-scope-03/04/05.png。新增范围行的高保真 context 已回读；本地复用 Select 与既有设置行，未改其他设置布局。

全局为默认；当前项目使用实际活动项目 ID，当前会话使用与 Agent 注入一致的 JSON [projectId, chatId] 身份。没有对应上下文时禁用相应选项。选择控制查看、提炼、删除、清空及重置的命名空间；自动学习仍遵循既有全局写入契约。范围切换与组件卸载使迟到提炼失效。共享只读权限和临时会话限制持续适用。此设计证据不等于本地浏览器或 Desktop 已验收。


## 2026-11-05 续作契约与设计来源

本次继续复用当前分支，P1 回滚与三阶段执行、P2 34 原子操作/蓝图/编号参考、P3 分镜/光学/拉片为当前实现范围。生产 API 的严格校验优先于原 harness 的空载荷成功或非法零焦段成功；修正测试须保留真实状态及失败断言，不能把旧替身移入 src。

Figma 文件 [KK Studio](https://www.figma.com/design/ZiadpErDoFweCjG3uHjkM3/KK-Studio?node-id=4386-604)，2026-11-05 读取现行 03 组件 1190:20679、435:48879、630:7196，复用 Source Han Sans CN VF 与语义颜色变量。局部交互补充 03 `4386:604`（七项）、04 `4386:633`、05 窄屏网页 `4386:662` 已回读尺寸/变量/溢出；不改变既有工具栏单排拓扑。此为本次设计前置证据，未代表全文件或原生视觉验收。

Floorplan 与 Toonflow 参考为 MIT；蓝图按真实 `floorplan/architecture@1` 与树形输入两种格式适配，布局用 [Dagre](https://github.com/dagrejs/dagre) 3.1.3（MIT）。tigerowo 为 AGPL，未复制其源码/资源或增加该依赖，光学参数与用户给定的 `0.75*deltaRGB+0.25*deltaHist` 用平台能力独立实现。视频按实际呈现帧解码，发现丢帧拒绝完整拉片回执，限制10分钟/18000帧/128镜头。

Codex 本机 `0.166.0-alpha.6` schema 与 [官方 App Server 文档](https://learn.chatgpt.com/docs/app-server) 一致：使用 `thread/revert(beforeTurnId)`，不使用已移除的 `thread/rollback`。新线程采用 paginated，legacy 线程不做仅本地删消息的降级。回滚备份后执行补偿和严格末行回执核验，再回滚远端与本地用量投影；供应商账单与已有资产保留。
