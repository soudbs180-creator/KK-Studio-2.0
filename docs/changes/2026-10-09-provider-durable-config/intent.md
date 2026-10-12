# TASK-PROV-005 — intent

## 问题（来自 T5 强杀现场证据）

`docs/changes/2026-10-08-taskhost-native-lifecycle/evidence/provider-abrupt-exit-observation.json`：
新保存供应商后立即强杀本轮 WebView 进程树，`failureMetadata.keys` 中缺失
`kk-studio-next:provider-connections:v1` 键——桌面端供应商连接元数据只落在
localStorage，进程强杀后丢失，重启后 UI 显示"没有匹配的图片模型，请配置供应商"。

## 目标

1. 桌面端供应商非秘密配置（账号/模型/credentialRef 元数据）在成功提示前有原生
   durable 落盘（`providers/connections.json`，独立于历史 AppConfig 的 config.json）。
2. 立即异常终止并重启后保留账号/模型/ref；旧浏览器 localStorage 元数据无损迁移。
3. 系统凭据仍仅在 OS vault（`com.kkstudio.provider`）；文件/localStorage/日志无秘密。
4. 失败/冲突不假报成功、不覆盖原件（conflict/损坏归档/备份恢复）。

## 非目标

- 不改凭据存储（credential_set/get 已有 OS vault 实现）。
- 不迁移历史 AppConfig 的 api_key（RISK-005 语义保留）。
- 不动 modelCatalog 发现缓存（可从供应商重新拉取，非用户关键配置）。
