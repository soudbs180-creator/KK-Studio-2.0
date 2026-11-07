# P6.1 规格

任务TASK-MOD-P6-1；base 6648e434f1a2b3d041b6a767f74831eacf9e7773；复用当前工作树/分支，不使用子代理，不修改main。

已完整阅读外部交接手册。CONFLICT：手册972adc01/2383/前序全部闭环是旧摘要；实际HEAD6648e434，上一轮根2372 pass/20 skip，独审/真实GPU/原生/完整verify/main仍开放。保留P6/P7候选，不回退。

范围：P6.1原生托管、双态工作流卡片、WS/历史归属校验→AssetPort.write→画布applyOps→结果连线；P6.2–4不扩展参数。本轮不安装ComfyUI或模型，不覆盖外部程序，不杀不属于KK的进程，不触碰生产计费。

Figma已先读01的546:187/2000:273与03的621:4094。2026-10-29新增隔离03组件：未连接3103:38859、就绪3103:38929、生成中3103:38974、沉浸3103:39019，get_design_context与截图回读完成。来源文件ZiadpErDoFweCjG3uHjkM3。所有动作44高，卡片380宽、24 padding、16/8间距、20圆角，使用原语义tokens；原生iframe内容由用户服务渲染，不伪造截图。04页面实例/完整动态原生UI验收另记。

设计：本机Python直接argv启动，优先portable/venv，模型不搬迁。Windows私有stdin gate在归属Job分配后才执行入口，隐藏窗口；stop仅关闭本机拥有的Job。已有8188服务只可连接，不接管/停止。health有超时，未就绪不能当已连接。

每张卡片持久化独立clientId。快速生成使用host socket；iframe.name使用独立editor clientId。官方Comfy前端用window.name建立WS，目标消息不会广播给另一个同sid连接，所以原生编辑产物通过有界history回查client_id，WS事件也经history归属校验才归档。按prompt/node/file生成稳定交付ID，重复/迟到/其他项目不连错；只发布output图片，temp预览不发布。关闭编辑器保留卡片监听；切项目/卸载停止监听，重载由历史恢复。不自动重发推理。

## 恢复补充规格（Desktop/Web56）

已知promptId优先按/history/<id>查询；每次轮询保持最近100条并额外回溯一批100条，unknown通过持久key恢复，editor通过卡片client恢复。offset仅十进制0..1000000，原4MiB响应上限与固定loopback/无代理/无重定向不变。首次回溯完成后停止；新submission key重新开始，关闭卡片取消后续读取。上游已清空或淘汰的历史仍无法恢复，不自动重发。

卡片可选dismissedOutputIds记录用户删除的稳定输出ID；原结果的Comfy来源description定位父卡，在同一items更新中留标记并删除节点，后续交付去重检查该标记。旧项目缺字段仍可读，新快照持久化后重开不复活。无迁移或新UI/控件。

删除入口补充：领域removeCanvasItems由画布键盘、App图片预览及Agent批量删除共同复用。标记只写入原Comfy来源卡，普通图片/其他卡不改，旧输入不变；旧卡缺可选字段仍可读。

稳定来源修正：新增结果节点可选comfyWorkflowSourceId；新产物创建时写入，旧快照加载及Agent修改旧说明前从原Comfy说明承接。之后删除只按稳定来源写原卡dismiss；说明仅作旧数据兼容。普通节点不引入来源，新字段与缺省旧快照兼容，无新UI。
