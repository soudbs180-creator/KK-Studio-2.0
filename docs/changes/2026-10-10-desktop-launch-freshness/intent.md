# Intent

启动快捷方式检查到源码新于 release EXE 时，不能因为本机 node_modules 与锁文件漂移而停留在旧客户端。目标是修复依赖漂移导致的 Tauri 构建拒绝，并把启动、构建、运行产物身份纳入同一验收路径。

范围：Windows 开发 checkout 的 `desktop-release.mjs`、对应单元测试与启动规则。正式安装器自动升级服务不在本任务范围内。
