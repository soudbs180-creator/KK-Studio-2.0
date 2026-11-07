# 资产溯源对齐 Intent

任务 TASK-MOD-P7；base `972adc011e040b6db76284de1daea42d8b2167cb`；复用既有分支 `refactor/TASK-MOD-P3-feature-cycles`，不新建工作树，不使用子代理。

统一PromptHash/ParentId/Origins的写入和去重；旧字段可选，读时不回写，不改变资产字节ID/原件与快照格式。

承接用户P6逐个独立能力与P7溯源要求；三能力分别验收，不把一项完成等同四份原文全部交付。
