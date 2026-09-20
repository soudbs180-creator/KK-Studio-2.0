# Intent

- ID：project-package-20260918
- 状态：DONE — Windows Desktop package export, preflight and isolated restore accepted at source 379b302; Web transport remains T9.
- 用户问题：当前 `creation-v2.json`、草稿下载和资产仓库分别可恢复，但没有一个同时携带项目图、节点、连线、视口、任务/消息、引用素材与原件的可校验迁移包。把草稿 JSON 当作跨环境备份会丢失原件，直接写入当前数据根目录又可能覆盖有效项目。
- 预期结果：定义一个可版本化、无密钥、内容寻址的 `.kkproject` package contract，并以“读取/预检 → 隔离 staging → 回读校验 → 原子发布”的流程在用户选择的独立新 data root 恢复；所有失败均保留源包、源项目和已提交原件。
- Primary Platform：Desktop first；Web 复用同一 manifest/checksum 与 IndexedDB adapter，文件系统/目录选择和本机 staging 由平台适配器提供；Mobile 不在当前 T3b MUR。
- 前置：T1/T2 已有 snapshot schema/CAS 和画布 graph 校验；T3a native asset repository、`assetId` 引用、水合/缺失保护可复用。
- 后续：T3b 不包含真实 Provider、ComfyUI、云同步、公开分享或自动旧数据迁移；这些仍按任务账本保持独立状态。
