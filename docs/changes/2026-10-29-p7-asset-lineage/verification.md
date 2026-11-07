# 资产溯源 验证

PARTIAL；TASK-MOD-P7，base `972adc011e040b6db76284de1daea42d8b2167cb`。head与源码/构建/报告hash见外部final-receipt.json。

复用既有promptHash/parentId/origins，修复同job/hash但不同parent或Provider、导入Origins丢失；TS与Rust去重身份同规则，不做读时回写或用户数据迁移。

验证表和运行限制统一见[共享接线验证](../2026-10-29-p6-image-host/verification.md)。本卡相关单元/浏览器均在该表中逐项列出。

P7旧项目/导出包/快照回归随根全测，Native为Rust存储测试，原生GUI/独审/main仍未验收。