# P6.1 意图

任务TASK-MOD-P6-1；base 6648e434f1a2b3d041b6a767f74831eacf9e7773；复用当前工作树/分支，不使用子代理，不修改main。

已完整阅读外部交接手册。CONFLICT：手册972adc01/2383/前序全部闭环是旧摘要；实际HEAD6648e434，上一轮根2372 pass/20 skip，独审/真实GPU/原生/完整verify/main仍开放。保留P6/P7候选，不回退。

范围：P6.1原生托管、双态工作流卡片、WS/历史归属校验→AssetPort.write→画布applyOps→结果连线；P6.2–4不扩展参数。本轮不安装ComfyUI或模型，不覆盖外部程序，不杀不属于KK的进程，不触碰生产计费。

Figma已先读01的546:187/2000:273与03的621:4094。2026-10-29新增隔离03组件：未连接3103:38859、就绪3103:38929、生成中3103:38974、沉浸3103:39019，get_design_context与截图回读完成。来源文件ZiadpErDoFweCjG3uHjkM3。所有动作44高，卡片380宽、24 padding、16/8间距、20圆角，使用原语义tokens；原生iframe内容由用户服务渲染，不伪造截图。04页面实例/完整动态原生UI验收另记。

设计：本机Python直接argv启动，优先portable/venv，模型不搬迁。Windows私有stdin gate在归属Job分配后才执行入口，隐藏窗口；stop仅关闭本机拥有的Job。已有8188服务只可连接，不接管/停止。health有超时，未就绪不能当已连接。

每张卡片持久化独立clientId。快速生成使用host socket；iframe.name使用独立editor clientId。官方Comfy前端用window.name建立WS，目标消息不会广播给另一个同sid连接，所以原生编辑产物通过有界history回查client_id，WS事件也经history归属校验才归档。按prompt/node/file生成稳定交付ID，重复/迟到/其他项目不连错；只发布output图片，temp预览不发布。关闭编辑器保留卡片监听；切项目/卸载停止监听，重载由历史恢复。不自动重发推理。

## 2026-10-29 合流前恢复修复

TASK-MOD-COMFY-RECOVERY承接独审IR-P6-01(P1)和IR-P6-02(P2)，目标为超100条历史的归档恢复以及用户删除图片不复活。不安装模型、不自动重发推理，不增加产品UI。
