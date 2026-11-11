# 验证记录

- Base：`af2f988c019388427b24e92f709ce79d98171136`。
- 工作目录：`D:/kk-studio/KK-Studio-2.0`；复用主 checkout 的任务分支。
- 基线快速门禁：typecheck/lint exit 0；2474 单测通过、20 既有跳过、0 失败。
- UI 静态 exit 0；Agent build/test exit 0，204 通过、2 既有跳过。
- 基线 Edge：905 通过、21 失败、1 既有跳过、0 flaky；2 workers、retries=0、1423 生产预览。
- 原报告：`test-results/browser/3195d708-9c5e-4b35-9e96-e66348d996ca/browser-results.json`。
- 既有格式问题：8 个文件，Prettier 修正后 8/8 TypeScript AST 同形。
- 1421 已启动当前 Vite development，页面回读确认 `/src/main.tsx`；截图和日志在工程外目录。
- 归档收据、原始错误、命中探针与后续门禁统一保存于 `D:/kk-studio/output/mainline-reset-2026-11-03/` 和 `output/logs/mainline-2026-11-03/`。

修复后验收（2026-11-03）：

| 检查 | 结果 |
| --- | --- |
| typecheck / lint / UI / format / build | exit 0；lint绿色日志为 `phase1-ledger-lint.log`，此前认领冲突失败日志保留 |
| 单元测试 | 2494项，2474通过、20既有跳过、0失败 |
| 完整Edge | 926通过、0失败、1既有live服务跳过、0flaky；4 workers / retries=0；run `16f71b2e-9b2a-4eb9-b162-28e0b84ea943` |
| 提交后Edge | `71064b0e`重新build并复验相关六份spec，56/56通过；见 `phase1-710-browser.log` |
| Agent / 设计 / 开发态 | Agent 204通过/2既有跳过；设计预览9通过；L4脚本1条件跳过；1421开发态4个真实插件步骤通过 |
| Desktop | 官方启动器重建2.1.63，真实Tauri `http://tauri.localhost/` / production；隔离项目验证底栏、菜单及44px触控入口通过 |
| W1清单 | 原剩余16项逐项匹配当前PASS；119/119关闭，历史228项原错误与分类保留，两个摘要open均为0 |

完整套件和开发态原始metadata保留提交前候选的 `af2f988c`，不改写为提交后结果。提交后56项绑定 `71064b0e`；该提交源码指纹、dist SHA及Native构建收据分别保存在工程外 `710-source-receipt.json` 和 `native-smoke/`。

Native EXE SHA256：`d9376bbc26f92b035460dbb72a62993380325ef06cebe8aff73652a74beb6727`。Web入口 `index-BgoEbRgA.js`，SHA256：`b53028fcd9172ffe916abb1820986ec30e34b49c8d0052edd676aea8b193b5c6`。Native自动宽度含0.666667px边框取整，实测283.333/303.333px，设计参考284/304px；浏览器精确断言保持不变，原Native整数探针失败保留。

现有Git只登记canonical checkout；两处旧目录仅剩空依赖链接，自动审批拒绝清理命令，清单与不可变回收计划已保存。未删除历史master或用户资料。
