# TASK-SEC-ZOD-20261028：Zod安全补丁

用户授权：2026-10-28五步清单第1项，独立升级根Zod 4.5.4→4.6.7，修复GHSA-mrhx-c7xc-m3w5。仅处理该依赖、锁文件、平台版本镜像与安全回归，不混入P0、格式、P1或证据迁移。

复用干净的现有任务树，独立分支`fix/TASK-SEC-ZOD-20261028`，base为本地main c2a0228a；P0候选e35004a0保持在原分支，主checkout及Figma dirty内容保持不动。验收见[规格](spec.md)、[计划](plan.md)、[验证](verification.md)、[审核](review.md)。
