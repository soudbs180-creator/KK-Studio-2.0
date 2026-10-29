# 图片能力任务接线 Spec

任务 TASK-MOD-P6-HOST；base `972adc011e040b6db76284de1daea42d8b2167cb`；复用既有分支 `refactor/TASK-MOD-P3-feature-cycles`，不新建工作树，不使用子代理。

独立Manifest与执行器通过现有CapabilityRegistry/TaskPort；显式ComfyUI工作流/原件绑定，不猜API端点、不新增任务队列/素材仓库；API适配接口保留，未配置不可用。

P6：先核实现有执行链；优先现有ComfyUI HTTP adapter，原件仅按assetId读取，参数显式绑定到API格式工作流，结果节点顺序固定。请求限长/限量、权限/版本/平台/禁用/取消/重放均在真实入口检查。原生未支持时明确拒绝，不绕过TaskHost。API与ComfyUI有独立适配接口位，只有真实运行的实现标可用；没有GPU/真实Provider回执保持PARTIAL。P7：内容去重不丢不同父/Provider来源，导入Origins合并，未知字段保留；SHA哈希对精确提交Prompt UTF-8计算，字段名沿既有lowerCamelCase。

验收：类型/lint/根全测、限定生产Edge/HTTP/旧项目导出快照/取消恢复对拍，R1/R3/R4仍0、不放宽基线；UI不新增控件或改样式。独审/原生/真实服务/main单列。
