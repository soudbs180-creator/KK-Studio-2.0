# 实际验证与边界

IN PROGRESS。容器日志output/org-evidence-pilot-2026-10-28；只记录此包的实际迁出和恢复，不把先前1292份复制算作已迁出。历史本地验收不等同当前Hosted/产品已完成。

## 首包候选结果

base 93fd8763dee83a60c939d95bc430873cec7ee73e，当前任务树候选。62份log毛量1357699B已迁出；[manifest](../2026-10-08-model-capabilities/evidence-manifest.json)逐项记录源Git/sha256/字节/用途/原链接；归档仍在容器output/org-evidence-2026-10-28/archive/c2a0228a57be内。本卡不迁任何PNG/JSON，也不删除主checkout文件。

- preflight.json核对全部源、Git对象与容器副本，62/62一致。62个活跃字面引用仅来自新B11基线，均分类为待移除豁免而非运行输入；其余活跃源/脚本/CI/功能/任务引用没有匹配。此前全量候选引用审计继续保留，零字面匹配不等同不存在任意动态引用。
- 历史Markdown AST仅替换verification内32个日志链接目的地，并追加显式说明。final-self-check.json用主checkout保留原文及原sha256重放这32个替换，确认其余原文、链接文字和结论不变。全体Git跟踪Markdown链接检查before86/after86，无新增缺失；旧82数字来自前次较窄扫描，不能混作本次总数。
- 全新restore-tmPnwf目录恢复62/62，sha256及大小全部匹配（migration-receipt.json）；容器原件未改。本卡实际Git源blob身份再次逐项比对，原主checkout21个dirty文件sha256仍相同。四份需求原文sha256也全部仍匹配完整阅读清单。
- B11从640→578，只有62个对应TYPE条目删除，其他基线及其来源完全不变。全包PNG/JSON/E1保留，主线实际减量仍0。候选跟踪文件/字节净变化含manifest、校验器及交付文档开销，以metrics.json为准；不把毛量或首包算作整体70%完成。
- 清单校验器RED先失败、GREEN三组通过，包含路径越界/控制符/重复/损坏字段与实际副本损坏/丢失；结构模式明确copiesVerified=false，显式container模式62份/1357699B、copiesVerified=true。既有feature/delivery检查按真实文件与五件套验证，没降低任何检查。

首次lint因控制字符正则写法失败，改用Unicode控制字符类别后通过；代码健康首报CC21（advisory）也未忽略，按职责拆出文件副本校验后重跑。最终快速门禁与格式结果见validated-*.log及对应exit回执；最终单元2345项，2325 pass/0 fail/20 skip。没有产品源码或版本变化；未重复浏览器/原生/发布，已有浏览器失败及main分叉状态保留。

复验命令（在本checkout根）：`node scripts/governance/check-evidence-manifest.mjs docs/changes/2026-10-08-model-capabilities/evidence-manifest.json <container>`。本机container为D:/kk-studio；不指定时只验证结构，不证明外部文件可恢复。恢复副本只写新空目录，不覆盖用户或主工程。当前只有作者自审，独审/完整verify/main整合和ORG-6推广仍未完成。
