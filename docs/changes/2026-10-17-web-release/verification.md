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
- run39036730592 的 Node 测试1838 PASS/2 FAIL/18 SKIP：新增发布测试夹具也受到 Windows TEMP 8.3 别名影响，Python安全校验正确拒绝非规范目录。本轮只在fixture创建后realpath，不改控制器；同一真实短路径环境先复现两项RED，再GREEN，完整deploy31组18 PASS/13既有Windows SKIP/0 FAIL。Linux和新托管结果待当前提交。
- 隔离production preview手机390×844/390×480：首页、底部导航、项目、聊天、设置、草稿旋转和重载通过；平板844×390、桌面1920×1080全10步通过。**已验收469版本的手机应用菜单存在左侧裁切68px，fresh首次打开且无缩放/旋转也复现；完整手机报告保持FAIL，只有corePass。** 本次发布保持已验收产品字节，未夹带CSS改动；此既有问题与生产布局证据必须分别报告。工程外stage保留完整失败截图和DOM。

尚未执行上线、生产手机验收或旧版本清理；自动发布尚未完成。原有本地/原生通过不替代这些门禁。

## 用户授权的新2.1.37候选

用户明确选择“本次一起修复菜单，并重新验收新版本”。手机popover改相对视口fixed定位，保留安全区/短屏滚动/触控/原Escape行为；新增两尺寸browser用旧production包先RED，再新2.1.37 GREEN（2/2首过、0retry）。原生产验收脚本只在本地副本替换origin，四尺寸40/40通过；fresh首次两手机菜单x90/right378/y50，短屏bottom390，无裁切。原FAIL原件及scale1证据保留；生产脚本哈希不变，尚未访问线上新版。

仓库版本工具升级Desktop/Web2.1.37，Mobile仍2.1.1；version check/consistency零警告，tsc+Vite生产构建通过，主JS index-DKRxIk-m.js。旧2.1.36 Native收据不证明新Native安装/验收，本次不修改用户日常客户端或其数据。

截图复核发现workspace工具栏还会盖菜单顶部（fresh首页无该工具栏）；新增两workspace态回归先RED（首项为disabled也不略过）。最终只在phone菜单打开时，将topbar祖先提升到既有popover token，菜单关闭及平板/桌面层级不变。重新build主JS index-C8InjtPW.js；四browser回归首过0retry（00cf7eec-21ef-4b96-a26b-7d72d979f5d5），最终四尺寸40/40通过，workspace首项bounds99/87/270×44、elementFromPoint为该BUTTON。生产验收脚本同步加强此断言，SHA b4428d613c14a8a60d3b241c40353e31a021b6954d3d19ac00276017fe6b4887，真实域名新版仍待发布后验证。

归档同输入/身份因mtime不同而出现不同SHA已先RED复现；新packager固定tar元数据并用Node标准gzip流，无新增依赖、不放宽controller同名不同包限制。同平台/工具链/相同输入改变mtime、从新目录反序重建后三份包完整字节相同；Windows32组19 PASS/13既有平台SKIP，Linux32/32 PASS/0 SKIP（含首次健康失败后重新打包再部署成功），最终托管待当前SHA。未承诺不同OS/tar实现之间归档字节相同。

独立复核又覆盖源文件444、目录700和进程umask077扰动，补齐stage文件644/目录755归一后归档仍逐字节相同；仅写stage，源dist不改。最终Linux32/32再次通过。lint/type/UI/format及版本检查通过，存量code-health/footguns/design orphan token advisory保留。
