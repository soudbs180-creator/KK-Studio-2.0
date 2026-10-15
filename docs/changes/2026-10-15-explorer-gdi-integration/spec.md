# Spec：安全测试保护统一集成

- Task ID：TASK-EXPLORER-GDI-20261015；状态：READY；[Intent](intent.md)。
- 源码来源：af8独有playwright.config.ts、三条scripts/audit运行检查、scripts/testing/headless-edge-options.mjs、tests/desktop/headless-edge-launch.mjs、development/plugins.mjs。共享helper锁定Playwright1.63.0及唯一disable-features默认switch，保留原15项加msWindowTabManagerPublic；升级/default形状变化失败关闭。
- 与输出保护的交点仅配置import/use及开发态import/launch；保留新独立run/worker继承、源码metadata、显式旧目录拒绝，不能因cherry-pick退回默认test-results清理。
- 原finally/browser.close不变；native CDP分支与用户浏览器不改。真实Windows测试只读取自有browser/renderer；100页压力标题唯一，采样自有代理并关闭自有context/browser，不杀进程、不改注册表/配额。
- 完整verify前先确认1421/1423空闲；若占用保留失败并协调，不换端口/复用server/杀用户进程。先在隔离旧合成报告/PNG/receipt上建立hash，再测新run，旧原件与新结果分别保存。已有完整外部备份437files只读保留。
- 历史af8完整verify与旧开发态证据损失分开：[事件](../2026-10-15-unified-execution/incident.md)。本集成不得重造旧receipt/PNG。新增实际PNG、source SHA、HEAD/frozen source身份及完整Node/Agent/browser/development结果单列。
- Desktop/Web2.1.33、Mobile2.1.1保持；无UI变化、真实Provider/日常客户端验收不由测试fixture代填。

- 首轮环境遗漏postinstall插件步骤造成11项失败，完整保留后仅补锁定依赖/构建，同源码11项全部首试恢复。为失败关闭，UI/development测试入口显式先plugins:build，缺依赖在浏览器前报错；既定postinstall及依赖版本不变。
- SHOT-01补强：截图options需可静态检查的内联对象，path必须直接outputPath调用；quoted属性标准化，条件/变量options/shorthand/spread未知形态均拒绝。6个既有安全helper调用改直调以简化守卫，不解释任意TypeScript数据流。
