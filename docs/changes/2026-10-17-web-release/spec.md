# Spec：固定产物发布与一个回滚版本

- Task ID：TASK-WEB-RELEASE-20261017；状态 IN_PROGRESS。
- [Intent](intent.md) / [Plan](plan.md) / [Verification](verification.md) / [Review](review.md)。

## 发布与数据契约

1. 从固定已验收提交隔离构建，不读取原工作树的 dirty 产品代码。原始 154 个文件须逐个哈希匹配客户端验收构建。
2. 通过当前托管质量门禁和独立精确源码审查后，经普通 PR 合入 main，再绑定 main SHA 与静态包。
3. 保持 HTTPS origin、存储 key、数据库、上传目录及原 API/PostgreSQL 服务。仅切换 `/var/www/kk-studio-next/current`；Nginx 根保持 `current/dist`。
4. 包内只允许清单列出的普通静态文件；传输与解包校验整包和逐文件 SHA256，拒绝路径穿越、链接、重复条目、超限及同名不同内容。
5. 加锁原子发布，保留一个 `previous` 回滚版本；新版本健康检查失败须回切。只有新版本确认健康后，才清理本发布器可核验的更旧静态发布。
6. 自动发布仅跟随正式 Release；普通提交、仅推 tag、draft 和 prerelease 不触发。发布 tag 必须属于通过同 SHA main 质量门禁的源码，版本须与 Web 版本源一致。
7. GitHub 使用专用普通用户和 forced command SSH 通道，只能接收受校验发布包；禁止 PTY、端口/代理转发、任意远端命令或 root 自动登录。临时人工部署 root 公钥完成后撤销。

## 浏览器验收

真实 kkai.plus 使用隔离浏览器上下文，记录实际 bundle、build-info、DOM 和截图。390×844、390×480 验证 phone 首页、底栏、项目库、聊天和设置；844×390 按现有断点为 tablet。不得用用户现存浏览器资料进行生成、重置或迁移。

静态发布不构成真实账号、Provider、Agent 本机桥、独立 Mobile 或实体手机验收。
