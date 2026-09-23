# Intent

- ID: TASK-CONSOLIDATE-200
- 用户要求：将 kk-studio-next 的所有新内容融合到 KK-Studio-2.0，检查并移除旧的重复目录，缩减体积而不损坏既有功能，融合版本定义为 2.0.0。
- 授权：本轮明确要求本地融合、整理和删除已过时目录；不自动执行生产部署、付费服务、数据格式迁移或远端主线强制更新。
- 当前证据：两个主目录均为 3c4d012 / tree a3406e8 且干净；next 另有尚未集成的 UI/performance、安全、Skill/MCP/ComfyUI 候选。旧 archive 有未提交源码；data backup 与 archive/data 的 46 个文件校验相同。
- 结果：D:/kk-studio 只保留 KK-Studio-2.0；最新实现集中到一个可验证分支，恢复资料独立保存在 D:/KK-Studio-recovery-20260921，分享包不包含私有数据、Git、依赖和编译缓存。
