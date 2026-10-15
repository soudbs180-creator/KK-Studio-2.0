# Spec：全页面新UI收敛与主线集成

## 当前2.1.30验收补充（2026-10-15）

正常桌面侧栏展开期间，项目控件不可命中或focus；真实300ms轨道稳定后，一次物理32ms按下/抬起只创建一个文件夹，坐标不漂移，正常折叠再展开保留该文件夹。复用既有motion token及step-end visibility，减少动画和窄屏保持原行为，不改handler/数据/timeout。

verify8 760首试、Native9 87项及TaskHost current5无注入11项分别通过。实际覆盖、旧Hosted因果限制、Native8单位夹具更正及Native4偏好风险以[最新验证](verification.md#2130-当前本地验收)为准；最终SHA门禁和普通PR59集成未完成，继续REVIEW/整体NOT_VERIFIED。

## 此前阶段记录（原文保留，最新状态以上方为准）

## 当前2.1.29验收补充（2026-10-15）

三种CLI管理区共用独立卡片角色：card surface、16px内边距、20px容器圆角、14/20标题正文、可见文字>=12px且不横溢；保留其他键值卡片和原操作/busy/安全owner。TaskHost reload后等真实storage ready、无alert及UI/持久草稿一致，原n4/恢复/unknown/秘密断言不放宽。

本地verify7/Native7/TaskHost current4已分别通过，详细范围和历史guard勘误只以[最新验证](verification.md#2129-当前本地验收)为准；视觉shim不等真实CLI登录。最终SHA独立审查、Hosted/Delivery、普通PR59合并与main/post-main未完成，继续REVIEW/整体NOT_VERIFIED。

## 原需求与历史阶段记录（原文保留，最新状态以上方为准）

- Task ID：TASK-UI-FULL-20261015；状态：REVIEW / NOT_VERIFIED（本地2.1.28验收PASS，最终SHA/Hosted/PR/main待验）。
- 页面矩阵：实际App所有可达首页、项目、扩展Skill/MCP/伙伴、ComfyUI、设置所有分类、资源/搜索/任务、个人信息、帮助与快捷键及相关弹窗；不存在或禁用能力准确记录，不假造节点。
- 卡片矩阵：图片空/上传/参考/生成、视频空/非空、文字/音频输入、HTML/Markdown/便利贴/SVG插件、历史collection归一化。各节点采用同一套角色规则，来源只改变数据与可用动作。
- 模型与输入：首页/Agent/对话消费共享菜单与文字控件，画布保留生成专属参数；重绘和Google路径保留原能力并收敛可达模型UI。长模型、变体、窄屏、菜单/Escape和重载不遮挡或退回旧几何。
- 数值只消费tokens：文字操作胶囊999、上传/图标圆角8、同排同高度24/32/40；常规composer控件32。卡片/弹窗分别消费既有语义，不能把所有容器都改成胶囊；至少12px的可读文字。
- 恢复：历史snapshot通过已有codec归一化后使用当前组件；开/关菜单、选择状态、保存与重开不得返回旧上传工具栏或截断用户已接受的输入。
- 验收：先真实浏览器RED并保存，再修共享根因和GREEN；390/1099/1920生产浏览器、完整verify、Desktop当前构建及同态证据、精确SHA独立审查。UI检查与真人Provider/发布/用户接受分别记录。
- 主线：保留既有治理与功能记录，提交PR；当前head的托管门禁/Delivery及独立审查完成后普通合并，fetch后复核origin/main和post-merge检查。不得直推main、force或绕过规则。

- 覆盖与非同义状态见[coverage](coverage.md)。主线102个预检冲突与104个实际冲突逐路径裁决，不能整份选ours/theirs；15份历史交付包作为当前整合来源引用，不把原任务开放能力改为DONE。历史候选Desktop/Web2.1.27已由版本脚本递增；当前最小设置竞态修复候选Desktop/Web2.1.28已递增并build，Mobile2.1.1规划不变，产物与托管完成状态分别验收。

## 用户追加的状态与功能验收（必须满足）

空card只保留upload，不显示内容toolbar；内容card才显示与真实载荷对应的toolbar，同卡同一时刻不能同时显示两套入口。适用于图片、视频、音频、文本、HTML/Markdown/SVG/便利贴等已实现插件及旧项目恢复；各类型按实际正文/媒体/插件数据判空，标题、选中、prompt草稿、generationIndex或历史状态字段不能单独证明已有内容。不凭空新增上传或生成能力；无该类型upload能力时记录实际入口与限制，由root按用户规则统一状态owner。

| 状态 | 必须验证的动作与互斥 | 功能证据 |
| --- | --- | --- |
| 空态（初建/重开/清空） | 仅upload入口；内容toolbar为0；选择/Enter不能唤出内容动作 | 上传取消/非法文件不造内容；有效上传完成后才转内容态 |
| 有内容（上传/导入/生成/旧恢复） | 不再显示空态upload占位；仅一套对应toolbar；动作可命中 | 预览/编辑/替换/下载/喜欢/标签/删除按实际能力生效，保存重开保持内容与身份 |
| 运行/等待/审批 | 对应同卡任务的可取消/等待动作；不显示错误重试或允许重复提交；别卡任务不串入 | 计数/请求身份不重复，取消与迟到结果遵循原归档/unknown边界 |
| 失败/取消/离线 | 错误可读，保留已有内容或空态事实；重试/上传与内容动作按真实可用性互斥 | 安全失败可重试，受理unknown/submitted不普通重试；无实际执行者不得显示“生成中” |
| 恢复/损坏/插件缺失 | 回到当前renderer；缺原件/插件不能装作有可用预览，禁用原因可读 | 取消、reload、undo/redo不丢草稿/坐标/边/原件，不自动提交；恢复后再次验证互斥 |

各类型×上述状态必须有明确适用/不适用与证据，不能仅测按钮32px。扩展Skill是文本指令、MCP是协议工具、伙伴是职责、模型接入是执行连接；相同能力经多入口到达时只保留一致配置与状态，busy/取消/失败/重新打开不能产生双选中、假连接或可点但无动作。任务UI可用动作必须与实际提交/恢复谓词一致。

此前79条定向GREEN及green-checkpoint的50条GREEN只证明其原测试范围；它们没有证明本段新互斥与完整功能验收。新增真实RED、修复和三宽GREEN及完整门禁仍为待完成，原记录不覆盖。


当前241仅有审查修复14条定向GREEN；165完整Browser五失败与正式review三P2保留原回执。新互斥、分类和受理fence已有对应真实运行证据，但最终整体验收仍须新的完整verify、Native及精确SHA复审，不能以局部通过宣布本规格完成。


阶段补充：241官方隔离Native56checks与精确source/integration review均已PASS；完整verify-2、最终文档head复审及Hosted/PR/main仍待实际回执，整体任务不提前完成。


最终本地验收：verify-3完整PASS（Browser747/747、Node1295/14skip、Agent199/2skip、UI242/0及development），Native56与精确source/integration241复审PASS。旧失败及test-only音频selector修正保留；最终提交head/Hosted/PR/main仍待验，整体NOT_VERIFIED。

## 当前续修验收约束（2.1.28）

当前提交基线2d4be5fca4c2167d4bc0d500634645624f311505上新增最小设置竞态修复候选。真实select连续B→A不得把A字段缓存为B的dirty草稿；目录更新仍保留用户dirty、clean字段采用最新目录，账号/协议/auth/model隔离、trim/save校验与秘密不外发/不持久化继续保留。冻结旧产品RED2三项全失败→layout同步修复后settings42项全通过；这份定向收据不代替当前完整verify、fresh Desktop/Web同态或精确SHA独立审查。

Native TaskHost夹具必须消费当前共享模型菜单/官方API入口，不向模型菜单重新加入批量/数据项；四结果持久草稿通过既有原生快照CAS准备，实际提交body.n、持久intent、重启恢复、未知slot无普通重试及秘密清理断言保持。旧release2.1.27已有11项PASS，当前2.1.28完整verify/fresh Native/资源身份、最终SHA复审与新Hosted/PR/main/post-main待验。sidebar历史flaky原缺trace根因UNKNOWN，本地五次未复现不能代填已修复。Mobile2.1.1规划及既有功能状态不变，旧失败与混合源码诊断边界见[verification](verification.md)。

当前本地验收已达到本轮2.1.28组合范围：完整verify-6含747 Browser首试/0实际retry、development四步骤及全部本地步骤通过；fresh Native5 56项与新版TaskHost11项分别PASS，verify后实际input/EXE同字节。Native2/3/4前置夹具失败、2d PR质量门禁settings flaky及旧Native菜单FAIL保持原义。最终提交SHA独立source/integration审查、新Hosted/PR59/main/post-main仍是规格必需而尚未完成的交付门禁，任务REVIEW/整体NOT_VERIFIED。具体统计、哈希与范围按[verification](verification.md)最新收据，不用本地fixture替代真实Provider或用户最终接受。
