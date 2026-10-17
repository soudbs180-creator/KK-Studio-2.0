# Spec：手机入口、数据与发布边界

- Task ID：TASK-WEB-RELEASE-20261017；[Intent](intent.md) / [Plan](plan.md) / [Verification](verification.md) / [Review](review.md) / [Release](release.md)。
- 仅组合 Web 发布包初次进入 `/` 或 `/index.html` 时，视口宽度≤767或手机 UA进入 `/mobile/`。保留查询及 hash；`view=desktop` 明确访问桌面。Desktop 深链接不劫持；不监听 resize 自动换应用，避免丢失编辑。
- `/mobile/` 为独立 Expo/React Native Web 页面，聊天为主、抽屉和底部输入条沿用既有手机 UI。手机入口和深链接刷新均须能加载 Mobile 自己的脚本及资源；Desktop/Tauri 普通 build 不植入跳转。
- Web 默认建立真实 local context，不伪造账号或 AuthSession；本机项目、草稿、原件持久化在原 Mobile IndexedDB 中独立 namespace。只将已验证真实账号传给 Gateway/Comfy 服务；无账号的远程专属操作必须明确拒绝。
- 可选账号入口继续使用真实身份协议，未部署正式身份服务不能称账号已就绪。Native 默认登录路径不改变。所有 Web 长期凭据仅在会话内存中持有，非秘密项目正常保存。
- 不迁移、删除或覆盖原 Desktop Web 数据；手机设置提供桌面原资料入口并说明空间分别保存。损坏或不兼容数据必须保留、阻止写入并提供重新读取，不能静默创建空快照。
- 只有正式非 draft、非 prerelease Release，经 exact-main 质量与独立复审后构建组合包。普通提交不触发上线。保留 current 与一个 previous；旧托管静态发布按发布器校验后清理。Mobile HTML和主JS也须逐hash通过HTTPS健康，失败恢复两指针。API、数据库、上传目录不动。
- 临时 root SSH 公钥仅用于本次部署/检查，完成后撤销；永久自动发布使用受限普通用户。现有本地其他 worktree/index 与未提交文件不动。
- 手机 Chromium 触控/UA模拟与实体手机 Safari/原生包验收分开记录，不冒充真实 Provider 或原生发布接受。
