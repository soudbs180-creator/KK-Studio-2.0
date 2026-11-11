# 主线交付、真实出图与ORG-6

用户明确要求：保护主仓21份Figma审计改动后squash合main并回收本任务树；使用已有本地ComfyUI/显卡完成一次真实工作流出图、资产归档和画布连线；沿既有manifest批量外置历史证据。三个结果分别验收，其他四文档开放项不自动关闭。继续复用既有任务分支，不创建平行实现。

现状：main c2a0228a，candidate be730617，origin/main4610c333，113/7分叉。最新CI Mobile success、verify首建基线3项failure，68路径合并冲突。21份审计原件/索引/patch再次备份于容器output/main-physical-org6-2026-10-30，未改主仓。RTX5080/16303MiB已由驱动查询确认；用户给出ComfyUI根目录，模型/入口仍须实际核验。
