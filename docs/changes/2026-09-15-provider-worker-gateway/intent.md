# Intent

- ID：2026-09-15-provider-worker-gateway
- 状态：Implemented（可运行的本地 Node24 Gateway/Worker；真实公网 Gateway、Vault、对象存储和付费账单仍由部署环境配置）
- 用户问题：第一阶段的客户端适配器、批量结果和素材归档没有可重启的任务租约、额度账本、Webhook 去重和后端安全边界。
- 预期结果：合法 `managed_api`、用户 BYOK 和 `local_comfyui` 通过同一 Worker/Gateway 契约执行；任务可恢复、取消、进入死信/隔离，结果按实际用量结算并只暴露 `assetId`。
- 不在范围内：个人 Google AI Pro 或 ChatGPT Pro 登录共享、OAuth 轮换、多账号绕过限额/区域/计费、视频供应商上线和伪造真实平台积分。
