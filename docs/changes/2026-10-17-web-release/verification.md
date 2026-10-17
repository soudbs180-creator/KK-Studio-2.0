# Verification：Web 发布与正式 Release 自动同步

- Task ID：TASK-WEB-RELEASE-20261017；状态 IN_PROGRESS；2026-10-17。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Review](review.md)。

## 当前证据

- 固定产品 source469 / docs headbbc8；独立树安装、插件构建和生产构建成功；原 dist 与隔离重建均154文件，逐文件内容完全相同。收据：工程外 `.analysis/kkai-web-release-20261017/dist-fixed-comparison.json`。
- 原候选 PR64 已建立；治理/Delivery/deploy-linux 通过。verify run39034325940 的 Rust 测试212通过/1失败/1ignore：Windows runner 的 RUNNER~1 短路径与规范路径比较失败。需最小修正测试比较后重新跑门禁，尚未合并或部署。
- 发布器最终安全修复版在 VPS 独立临时目录执行31项 Linux 测试，31 PASS/0 FAIL/0 SKIP；涵盖解压预算、指针切换异常、previous先设置、健康检查失败回退、清理边界和强制SSH命令拒绝。原 CRLF 测试失败、空stdin导致0测试的日志均保留，不作通过证据。
- 独立聚合审查 d95→bbc8 无静态发布阻断项，140个定向测试通过；保留禁止手机页面缩放的非阻断可访问性观察。
- VPS Nginx 指向 `/var/www/kk-studio-next/current/dist`，current 为 releases/4a06ea8；releases 仅一个旧版。原 kk-api PID693、PostgreSQL PID673、Nginx PID666，均 active/running。
- 临时 root SSH 公钥经用户明确授权；设置 restrict 和到期时间，完成后必须删除。私钥仅工程外，不进入 Git/日志/发布包。
- PR65 首轮 Delivery 在 HEAD_BRANCH 条件下发现上游三个未入 main 的 change package 尚未绑定本聚合发布记录；本任务追加其原始 verification 作为交付来源，保留原149任务对象和原分支历史，门禁本身不变。后续本地验证显式传入同一 --branch。
- 受限普通发布账号、root持有控制器/SSH授权文件、旧版adopt及等价relative current已安装，旧122文件逐哈希不变。Nginx配置检查/reload通过；首次紧接reload读到旧worker后，独立HTTPS重读确认no-cache；API693/DB673/Nginx666保持。正式Release与生产切换仍未执行。

尚未执行上线、生产手机验收或旧版本清理；自动发布尚未完成。原有本地/原生通过不替代这些门禁。
