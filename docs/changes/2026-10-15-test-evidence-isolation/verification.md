# Verification：测试输出隔离

- Task ID：TASK-VERIFY-EVIDENCE-20261015；角色：current；状态：PARTIAL；[Intent](intent.md)、[Spec](spec.md)、[Plan](plan.md)。
- base89fba48244d58f0a18df8766951b02a785c5810b；cwd为既有TASK-GOV-PHASE0，root单写入者；原治理分支/原GDI候选/旧回执缺失均保留。
- 基线：当前治理89fba已独审、delivery28/0、governance143/0；产品与main235e相同。旧证据清理事故单列，本任务不伪造恢复。
- 新回归先在合成临时目录运行真实Playwright，不启动浏览器、无Vite/用户profile/外部服务；RED/GREEN命令、退出码和精确SHA随后追加。
- 受保护的完整verify、main集成与客户端验收未执行前不称完成。

## 实际RED/GREEN

- 首轮fixture模块URL被Playwright转为CJS require后无法解析，属测试harness错误；改为安装模块绝对路径后重跑，未以该错误证明产品RED。
- 有效RED：正常和主动失败两种真实Playwright运行均完成其预期退出后，`Historical evidence was deleted`断言失败，2/2红；只删合成临时目录中的旧字节，未用真实历史原件做复现。日志test-evidence-red.log。
- 初始GREEN：独立目录配置后，上述两项与verificationOrigins共4/4通过。
- 扩展旧目录/文件/链接拒绝、唯一run/report及suite路径边界；沙箱junction夹具EPERM单列，经平台批准正常Windows权限重跑，结果随后记录。typecheck已exit0。
- 本轮日志均在工程外 `D:/kk-studio/.verification/2026-10-15-unified-execution-0908/`，不覆盖旧回执。

- 批准后的定向回归7/7通过，0skip；新JSON报告包含当前源码HEAD，正常/失败各一份真实报告且旧三类字节不变。
- 本树Agent锁定依赖安装151packages、agent:build均exit0；完整 `npm test`：1346 total、1332 PASS、14既有平台skip、0FAIL，exit0，日志test-evidence-unit.log。未运行实际浏览器/Native页面；合成Playwright用例不申请page或browser fixture。
- `npm run lint`、`npm run typecheck`均exit0；health/footguns当前diff0发现（现有advisory模式），未放宽门禁。版本保持2.1.33/2.1.33/2.1.1，CHANGELOG既有发布漂移警告保留。
- 提交前源码冻结，最终SHA、format与独立审查以随后回执追加；完整浏览器验证需先在本分支接入GDI保护。

- `npm run format:check` exit0；治理生成143项/0违规。完整verify仍待GDI保护，不能将当前单测/静态通过替代浏览器与客户端验收。

## 独审后的补充回归

- e5d5dc31精确HEAD定向7/7、两个正式插件入口existing-dir拒绝2/2通过；外部test-evidence-result-e5d5dc31.json记录6份日志hash。
- 后续独审CHANGES REQUIRED，初始通过不代表完整保护。worker产物/报告同run新断言在正常/失败两项均2!=1而RED；修正后2/2 GREEN。截图守卫先把6个已安全helper误报，核对后支持已验证outputPath helper，再以48个真实固定路径RED；迁移17文件48处后与worker共3/3 GREEN。日志review-worker-red/green、review-screenshot-red-validated、review-both-green均保留在工程外原本轮目录。
- 浏览器尚未启动；补充完整Node/静态与冻结提交独审待续，真实PNG/旧文件字节保留随GDI保护接入后验证。

- 审查修正后完整npm test exit0：1347 total/1333 PASS/14既有平台skip/0FAIL（test-evidence-review-unit.log）；typecheck/lint exit0。首format因两条链式截图格式报告失败，二次格式化后完整format:check exit0，首错与复验分文件保留。补充仅路径与worker配置，未启动浏览器或修改业务断言。
