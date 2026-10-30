# ADR-033 ComfyUI 本机托管与双态画布卡片

2026-10-29；ACCEPTED（本地源码候选，能力仍PARTIAL）。Desktop/Web2.1.52，Mobile2.1.43，契约1.5.0。

## 决策与边界

沿用scan_comfyui_path扫描用户已有目录；支持源码/portable根目录，优先其Python/venv。不下载模型、不搬迁文件、不执行用户批处理字符串。启动先以隔离模式解析实际Python位置，避免WindowsApps执行别名通过系统代理激活解释器而逃出Job；私有stdin gate在Windows Job分配后才执行site/ComfyUI。隐藏窗口，固定127.0.0.1:8188；停止只关闭本应用拥有的Job，不按端口杀进程。源码与venv子孙进程回收有回归。现有外部服务可以连接，停止命令不认领它。

本机桥只允许system_stats、最多100项history、prompt和output图片view，禁重定向并明确no_proxy。JSON最多4MiB、工作流256KiB、图片32MiB，路径拒绝越界；不会返回任意本机文件。system_stats健康有超时。CSP只增加固定loopback iframe，未增加remote capability；Tauri2.11.5实际远程iframe的get_storage_root被ACL拒绝，不能以注入对象存在与否判断权限。

每卡独立项目/node identity，host与editor使用不同clientId。官方前端以window.name选WS身份，因此iframe.name绑定-editor，宿主监听-host；不能抢占同sid WS。executed触发有界history回查，核对prompt额外信息中的client_id，补收原生编辑器与断线输出；不把其他客户端图片归档。按client/job/node/file生成稳定节点ID，AssetPort.write成功后才调用既有addNode/connect，并同步完整canvas后flush。保留原件、结果边、元数据与用户快照身份；不新增资产库或推理队列。

快速生成先持久化submission intent；受理不明不重发，history中的submission key可消解丢失回执。明确400等拒绝释放intent，502/断线保持unknown。工作流失败只释放同卡的提交；迟到结果经project/card生命周期校验。已创建节点的重复历史不重复落图。编辑器返回只关闭dialog，iframe保留至卡片/项目卸载，保留未保存编辑；卸载停止监听。任意ComfyUI节点参数仍在原生编辑器修改，不自动猜测卡片参数或覆盖模型。

## 备选与兼容

不引入新画布引擎/ComfyUI编辑器，不用第二个同sid socket，不全局interrupt，不执行任意启动shell。沿用可选comfyWorkflow字段和旧text节点kind；旧快照保持可读。Web可浏览已保存信息卡，连接本机入口限Desktop。Mobile未交付。P6.2–4既有能力候选保留，其原生TaskHost接线与真实模型验收未被本卡替代。

Figma先读取01与03，再新增四个隔离03组件，全部语义token与44px按钮；04/05实例、全状态视觉与严格像素验收未完成。该卡有界实现不等于整套Figma或四份工程规范完成。

## 失败与回退

服务不可用时显示目录引导；路径/端口占用/无Python拒绝启动，不停止外部程序。归档成功但画布保存失败保留资产与原项目恢复机制，不假报保存成功。history仅100条，服务清空历史/超过窗口的漏收任务不能自动找回；应扩大为逐任务恢复时再加入持久job查询。关闭能力入口不删除已有卡片/资产。完整版本回退前沿用现有备份与schema保护，禁止旧程序覆盖新快照。

## 依据与验证

- [ComfyUI官方前端api.ts](https://github.com/Comfy-Org/ComfyUI_frontend/blob/main/src/scripts/api.ts)：window.name与queue client_id；协议核对2026-10-29。
- [Tauri Capabilities](https://v2.tauri.app/security/capabilities/)及[Runtime Authority](https://v2.tauri.app/security/runtime-authority/)；实际拒绝以本轮隔离Native回执为准。
- [本轮验证](../../changes/2026-10-29-p6-1-comfy-canvas/verification.md)。真实GPU、用户已安装客户端、独审、完整verify/main仍未验收；2026-10-29用户要求停止桌面控制，后续验证采用浏览器/命令行。

## 2026-10-29恢复修正

原100条窗口限制由逐任务ID优先查询与每轮100条分页回溯修复；固定loopback的白名单只追加严格数字offset，响应上限不变。卡片增加可选dismissedOutputIds保存删除意图，缺省兼容旧快照；删除同时记录，历史轮询不得重新插入。服务已淘汰/清空的历史不保证恢复，不自动重发。具体规格/验证见原P6.1交付包。

稳定来源补充：结果的comfyWorkflowSourceId与说明分离，加载旧输出或Agent编辑前承接旧说明中的来源。三个删除入口共享领域removeCanvasItems，保留已删除ID；修改标题或说明不改变来源或重新导入许可。
