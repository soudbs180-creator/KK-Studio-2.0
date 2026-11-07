# 验证

IN PROGRESS。日志统一保存容器output/repo-layout-guard-2026-10-28；本卡不会迁出证据，实际体积减少仍为0。最终命令、基线统计、RED/GREEN与保护检查追加于此。

## 候选收尾

base 61bf4b81ea35969c1c60e9d991ce4dddc9425fc2；本卡前置是任务树内P0/ORG-1实现，不表示它们已主线合流。接入governance后真实仓库172任务、布局640条存量命中、0新违规。原R1–R8检查完整保留。

- RED：缺少实现模块时repoLayoutRules单测失败（red.log）；GREEN：9项全部通过（green.log），包括独立Git仓库中的未跟踪非ASCII/空白名、强行add忽略日志、bootstrap偷加基线、已提交基线扩张、损坏配置和无效base。纯规则测试覆盖合法路径、7种禁入后缀、src old备份、图片204800/204801边界、存量删除/减小、等数换项、图片增长和损坏值。
- 快速typecheck/lint/npm test均exit0；2342项中2322 pass/0 fail/20 skip。format:check全绿。根typecheck范围仍是src，不能宣称它类型检查了测试脚本；新脚本经ESLint、实际Node执行及故障注入验证。
- 根白名单26→26；历史命中640→640，其中IMAGE271/TYPE219/NAME118/LOCATION32/ROOT0。这是规则命中数而非独立文件数，未迁删任何旧证据，实际瘦身0。Git暂存候选的文件/字节前后指标保存在metrics.json，不把新增基线占用当作体积减少。
- 主checkout原21个dirty文件sha256全部不变（primary-protection.json）；产品src/packages/vendor/mobile/src-tauri均无本卡改动。未运行产品浏览器/原生/发布检查，因为仅治理变化；已有浏览器3项代表失败保持原状态，不把快速全绿称作完整verify全绿。

当前作者自审，独审NOT VERIFIED。完整verify、main分叉整合及候选回收仍开放；不能为立即合流而覆盖主checkout用户修改、绕过审核或改写历史。
