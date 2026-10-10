# 实施计划

- [x] 新增 `scripts/check-version-consistency.mjs`，覆盖平台镜像、嵌套 lock、Tauri 依赖和活动源码扫描。
- [x] 增加单元测试，验证同步元数据通过、嵌套 lock 漂移失败、源码旧版本被提示。
- [x] 将检查接入 `npm run lint` 和 Windows quality workflow。
- [x] 更新版本规则、分支/合并规则、开发命令表和 AI 协作规则。
- [x] 保留桌面内容指纹/receipt 启动器作为本地 fail-closed 机制，并记录跨环境发布边界。
- [ ] 在真实远端 CI、发布存储和其他机器安装后回读当前 SHA；这些属于合并/发布阶段，不能用本地证据代替。
