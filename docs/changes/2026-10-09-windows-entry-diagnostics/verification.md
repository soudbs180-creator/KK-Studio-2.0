# Verification：Windows入口诊断

Base6a，实施前head fa36d3512af1344cd28961bfbfad3f7aee1c9193。真实push37851173715 root803/812、fail1、skip8：入口started.status null≠0；未记录error/signal，原因UNKNOWN。独立一次本机带外部trace定向PASS且实际Node被BAT选为D工具v24.20，父v24.21；未称已复现或修复。相同null可以分别来自ENOENT与ETIMEDOUT，不能将整个22.49s误认为单cmd用时。当前新诊断实现/受控失败和新全量/Hosted待执行；旧完整PR37851243837成功不消除同headpush失败。

## 2026-10-09 精确 source105 验收与历史失败边界

source10577c1225ef2a93b1e74265027050c7f5e8bd6a，base6a97f456ab7334f97c604461e8d29789caa754cb。独立源码 review-source-10577c1.md PASS，IRV-DIAG-002已关闭；入口12/12通过，真实 ENOENT/ETIMEDOUT故障保持exit1。三段进程诊断完整，原断言/10s timeout和全部791产品文件不变。原 pushfa36 failure status=null原因仍UNKNOWN，TASK-WINDOWS-ENTRY-RECOVERY-003继续TODO。

完整npm run verify exit0：root804/812、Agent172/174（原skip8/2）、strict development四插件PASS；浏览器实际438PASS/9flaky，原件保留，不能称447零重试。额外preview1431 workers4/retries0实际437PASS/10FAIL，7处默认1423端口断言与3处服务默认来源契约不符，保留原件且不作为最终验收。恢复默认production preview1423，在同一clean105和其生产dist上完整447/447、447attempts、0retry/flaky/skip，原始JSON SHA256 d86b6ddc4cb27af100305f11380976c509d153b9c5a3917a55aef11f89ea2c47，实际started2026-10-09T02:06:32.867Z。此前9个瞬时失败原因UNKNOWN，TASK-VERIFY-CONCURRENCY-002排期；端口配置一致性另登记TASK-VERIFY-ORIGIN-003，不改断言/timeout或来源白名单。本机通过不能证明旧Hosted原因已修复。

一次误读历史docs/evidence/browser-results.json的文件原件与勘误均保留，其Sep29两失败不能算105当前结果；正确新report由test-results/browser-results.json实际复制、绑定SHA并验证447一次。

原fa36 PR37851243837整体SUCCESS但真实446PASS/1flaky；push37851173715实际入口FAIL。旧主线6a run37845923441实际区域retry FAIL仍保留。当前草稿PR43已推送105；最终doc-head独立补审、当前Hosted、普通合并及新main均待完成。未发布、未安装、未改真实用户配置/数据；Desktop/Web2.1.12、Mobile规划2.1.1。当前114项{"DONE":68,"TODO":16,"PARTIAL":26,"BLOCKED":4}，原main109任务逐对象保留，全部35功能不变；新2个P2未完成明确入账。

[无损manifest](evidence/manifest.json)收录49份新原件，各源/阶段以其原receipt为准；旧20归档未改。

最后文档门禁：lint/version/gov114/features35/md102全部PASS，diff-check通过；其原始输出和出口另追加无损归档。
