# Verification：安装验收顺序

- Task ID：TASK-CANVAS-RELEASE-20261018；日期：2026-10-19；Owner：root-release。
- 状态：IN_PROGRESS / NOT_VERIFIED；currentPackage：本目录。
- branch：`fix/TASK-CANVAS-RELEASE-20261019-installer-lifecycle`；base：e43c5efaa9e80ad7ee617c852868a20e6093e08a/tree d9c0ee4206fb83bc413696b50356a887d10ad049；新head待提交。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Verification](verification.md) / [Review](review.md)。

| 项目 | 当前证据与边界 |
| --- | --- |
| 基线 | PR77 MERGED，main e43c5efa/tree d9c0ee42；d965精确本机/Hosted/独审PASS仅旧head，main质量等待自然终局 |
| 官方候选 | run39153321580/artifact12146302538；ZIP SHA256 0875f31e1e90f56848698e0e094012ed29d553418dcebaae16ed6b02ab298d83；setup SHA256 e2c1b2205edff4caa395ca66d589db47cd85090a07719fffb3ef482b1bcec393；flat4/receipt/4284实际文件PASS，非formal |
| 原安装验收 | candidate-installer-lifecycle-d965f30c-1792351370000/runtime.json SHA256 5b499831058fc8d3c169bd043c35316674d8b31cc7f3a7b5c54811eecb9db6c7；FAIL保留；安装/自有项目成功，native stop通用非200错误，首次未保存实际码 |
| 追加原顺序诊断 | candidate-installer-agent-diagnostic-1792352050000/runtime.json SHA256 3e7e87c05caa4d3f8720595cb78f3e10427bf0acf354d913fecd37cfbdfb03f8；available/running/healthy=true；stop失败后唯一HTTP观察409，health idle→preparing→4225ms ready，prepare200。无native stop重试、未发模型turn；报告仍FAIL，正常finally清理 |
| 原资料 | 上轮隔离安装前后default-data-check原3952文件全等，9项目/11聊天/22消息；本修法后仍需再核对，不以旧结果代填 |
| 本修法本地预检 | 同一d965候选四轮隔离安装exit0/PASS，4×4284文件、Agent available/running/healthy=true、stoppedRunning=false、重装/资源修复/卸载重装项目保留，finally清理无错；candidate-installer-lifecycle-home-precheck-1792352950000/runtime.json SHA256 0909ee4842015bb8aea68b7a1d79b8a674f53ecef548904a0b4c83081165afb7。仅dirty测试维护实证，不称新head工件 |
| 相关检查 | 四文件单元26/26、lint/typecheck/format exit0，两版本检查含在lint通过；历史migration2.1.36及CHANGELOG37告警保留。独立dirty预检无阻断；精确head独审/Delivery/Hosted仍待 |
| 原资料复核 | private-default-recheck-before-install-1792352132248.json：3952文件0变更/丢失/新增/不可读，9项目/11聊天/22消息、provider/snapshot hash全等，无默认app进程 |
| 正式交付 | NOT_VERIFIED；42未tag，正式包、默认安装、公开Release及Web/Mobile实际42尚未完成 |
