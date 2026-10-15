# Spec：独立测试产物目录

- Task ID：TASK-VERIFY-EVIDENCE-20261015；状态：READY；[Intent](intent.md)。
- Playwright每次加载配置申请唯一run目录；outputDir仅指向该run中的artifacts，JSON报告在同run独立路径，不能再清理test-results父目录。CI现有test-results递归收集继续可用。
- 开发态和Native插件验收复用同一目录分配器；KK_PLUGIN_EVIDENCE_DIR仅接受本次新建目录，已存在则失败关闭。不得覆盖已有截图后才因receipt的wx报错。
- 目录由独占mkdir创建，父目录允许补齐；既有目录、文件或符号链接均拒绝复用。无删除/移动既有证据，没有永久自动清理。
- 精确源码SHA由Playwright report metadata及既有开发态receipt记录；固定1421/1423、真实Edge channel和finally关闭语义保持。
- 回归使用临时合成项目与不申请page/browser fixture的Playwright测试；旧文件内容手写独立字节，正常与失败运行后逐一比较。新结果不与旧验证混写。
- 仅测试设施，不新增依赖或ADR；版本按VERSIONING测试类规则保持Desktop/Web2.1.33、Mobile2.1.1。
