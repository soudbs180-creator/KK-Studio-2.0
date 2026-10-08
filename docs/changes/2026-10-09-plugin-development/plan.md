# Plan：开发插件失败项收尾

- Task：TASK-PLUGIN-DEV-001；AI技术方案已就绪，用户授权的既有失败项修复。
- 先登记任务、npm ci和适用规则/实现/原CSP方案阅读；保留当前base 1d6f640ac6f3a1e7af32c38d85596527704dc54a 和 PRE-EXISTING FAILURE。

1. 用真实固定1421开发环境先复现旧路径失败；记录原DOM/遮罩/请求/console/截图，新增严格development集成guard先RED。端口有他人服务时等待，不复用/杀进程。
2. 仅改随包import的浏览器URL解析，保留同源判定、缓存戳和远程分支；不改Vite插件/HMR/CSP。
3. 复验development四插件创建/管理/持久启停及零错误；接入现有quality CI。
4. 等待蒙版PR41普通落地主线，在此任务分支合入最新main，按该组合更新版本、文档及范围；冲突逐项保留双方事实。
5. 完整verify、fresh Agent Tauri build、实际plugin CSP回归、production插件与相邻首页/上方操作栏回归。证据在工程外独立目录，归档原件，失败不覆盖。
6. 独立review精确提交、当前Hosted verify/delivery、普通squash、landing全树核对、main FF-only和实际post-main CI后才宣告本task完成。

- 恢复：保留branch/worktree和旧raw；Git恢复本次源提交，不触碰用户数据、快捷方式、生产发布。
- [verification](verification.md) 按实际执行追加；[review](review.md) 在当前已提交SHA正式审查前为NOT VERIFIED。

- 新发现 PLUGIN-DEV-002（React静态JSX校验，P2，当前任务内修复）：最小修改SDK jsx/jsxs/jsxDEV和三个真实React桥回归。初次SSR警告探针不能代表DOM校验，原探针及失败保留；改用锁定React18的实际静态/动态校验状态，真实DOM的console断言保持不放宽。

- TASK-PLUGIN-RECOVERY-001（P1，新登记）：先以真实重启失败和Node snapshot round-trip/坏负载测试RED验证遗漏；最小恢复已有plugin字段，并在共享codec输入处校验JSON负载。保留既有schema版本/数据身份/秘密门禁，Web与fresh Tauri均复验节点内容和坏数据原件保护。

- TASK-PLUGIN-MARKDOWN-001（P1，新登记）：共享真实编辑flow先阻断CDN获得正文为空/模块错误RED；将已有marked14固定14.1.4构建随包（npm registry版本/integrity已验证），移除无效远程声明与异步加载状态，不扩大CSP。新增真实四插件正文/IndexedDB备份保护浏览器回归；新native driver真实重启及坏数据/恢复复验，旧CSP启停driver不删减。

- 唯一active worktree任务为TASK-PLUGIN-DEV-001；两个新增相关缺陷已有实现/局部验证，账本保持PARTIAL等待最终验收，串行同一逻辑目标且同一实现者。原错误的三个active任务声明由治理门禁拒绝，原source-lint.txt保留FAIL；没有改门禁。
