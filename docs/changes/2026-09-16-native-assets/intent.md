# Intent

- ID：native-assets-20260916
- 状态：Approved — 用户在审计及 T1/T2 推进中连续指示“继续检查项目，完成未完成的”。
- 用户问题：Desktop 素材原件仍依赖 WebView IndexedDB；项目嵌入完整 data URL，与16MiB字符裁剪冲突。
- 预期结果：执行审计 T3 的第一可验收部分：Desktop 原生素材持久化与项目引用，正常重启或使用全新 WebView profile 后可恢复。
- Primary Platform：Desktop；Shared 为素材元数据/校验；Web 保留 IDB adapter；Mobile 不在当前 MUR。
- 旧版参考：仅内容校验与备份经验；不迁移旧数据或引用旧架构。
- MUR：是，原图可靠保存是基础流程前提。
- 后续：完整项目包、跨环境导入、目录选择/导出界面属于同一 T3 后续单元；没有验收前保持未完成。

