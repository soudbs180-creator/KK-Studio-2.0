# 图层拆分 验证

PARTIAL；TASK-MOD-P6-LAYER-SPLIT，base `972adc011e040b6db76284de1daea42d8b2167cb`。head与源码/构建/报告hash见外部final-receipt.json。

本能力独立Manifest/执行器，显式ComfyUI工作流接原TaskPort，关闭与版本并存回退不影响其他能力。

验证表和运行限制统一见[共享接线验证](../2026-10-29-p6-image-host/verification.md)。本卡相关单元/浏览器均在该表中逐项列出。

此能力只有ComfyUI明确工作流实现；provider-api接口位未配置即拒绝；真实GPU/原生/生产UI/独审/main未完成。