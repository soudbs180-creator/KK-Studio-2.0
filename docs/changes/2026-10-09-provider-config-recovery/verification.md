# Verification：Codex配置恢复

## 2026-10-09 当前精确源码验收（a3）

TASK-PROV-CONFIG-004源码为a3bcb031b48b57421123e51bfa6a1d9508558152，该源分支已普通合并main6a，Provider尚未合入主线；Desktop2.1.13/Web2.1.12/Mobile规划2.1.1。下方保留历史阶段的失败与待验描述，其“当前”仅指记录时点。

| 检查 | 真实结果 |
| --- | --- |
| 当前相关provider/CLI | 36/36，含最小及嵌套多行inline table、profile失效引用、原型同名键、幂等与诊断脱敏 |
| 完整npm run verify | exit0；root804/812、Agent183/185，原skip8/2；447browser/447attempts、actual retry0/flaky0/unexpected0/skip0；四插件strict development通过 |
| Rust/桌面构建 | fmt、102tests、client check与fresh带Agent Tauri --no-bundle均exit0 |
| fresh桌面TaskHost | 同EXE11/11，errors[]，隔离凭据清理完成；19571712 bytes，SHA256 5cd7d6acc3e77d898644ab97f9edbacff257fa6b378da01e1eda41b02dc97f00 |
| 实际生产运行时 | 全4296 manifest路径/bytes/hash通过；包内node.exe+agent/dist/index.js六命令exit1,1,1,1,0,0；没有tsx或开发依赖替代 |
| 隔离文件与独立parser | root/profile/坏输入拒绝时原config/prior catalog不变，不创建new catalog；显式有效active幂等，用户profile/CRLF保留；Python tomllib独立解析实际TOML1.0配置通过 |
| 精确源码独立review | /root/mask_final_doc_review补审a3 PASS，PROV-CONFIG-REVIEW-001/P1 CLOSED；正式报告SHA256 f1238cccf8ffb51baea2d18f04a1bd89104d136bda2f81382cd2d7c8ee81a76a |

smol-toml1.9.0精确锁定/BSD-3-Clause，许可证随包。原408审查为真实CHANGES REQUIRED：TOML1.1多行inline对象内部键曾误作根选择；35/36 RED后加入词法{}深度，当前36/36与生产包验证通过。Python参考只覆盖本次实际1.0输入，不冒称校验所有1.1语法。校验前不写入；原子文件写入沿用现有helper，不声称跨config/catalog多文件IO完全事务。

fresh-artifact原receipt的sourceDirty=true保留；实际Cargo/schema生成行尾已另做blob/JSON核对及生成元数据勘误。没有将旧receipt改成false。

当前主线为PR42落地6a97f456ab7334f97c604461e8d29789caa754cb，source cc28d8c与landing完整tree相同。实际post-main37845923441 verify失败（区域重试预期4收到3），原FAIL保留。PR43 fa36d35的pull_request37851243837全部成功，但同head push37851173715 Windows入口单测失败（status null，原日志缺error/signal，原因UNKNOWN），因此PR43仍draft、未合并；不能称主线已恢复。

当前候选账本124项：DONE66/TODO25/PARTIAL28/BLOCKED4/REVIEW1，开放58项。本任务REVIEW表示源码及本地验收完成、最终文档与交付待验；TASK-PROV-003与FEAT-032整体仍PARTIAL。新UI012/UI014继续任务已独立分配工作树，原owner checkout不动。真实用户Codex/Claude消费、App配置UI/HTTP、真实Provider费用、物理手机、安装/发布与用户视觉仍未由本任务验收。

证据见[无损归档清单](evidence/manifest.json)。归档包含原RED、review408失败、a3通过与主线/PR43实际失败；压缩字节、解压原字节及提交后的Git blob必须分别核对。最终文档提交、Hosted、普通PR、landing全树与post-main分别待实际回执，旧PASS不能换成新SHA。

## 历史阶段记录（原文保留）


- Base8c921a525ae505a558b0efee641830f1d61166fa，工作区D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-PROV-CONFIG-004。
- 独立npm ci/Agent npm ci完成；当前main旧25项provider/CLI回归PASS。原件日志D:/kk-studio/.verification/TASK-PROV-CONFIG-004-20261009。
- 新故障RED、实现、组合main、完整检查与独立review、Hosted/merge/main尚未完成；不把旧健康报告或基线当成修复完成。

## 当前隔离工作区预验收

- provider-red：旧25通过，新5组真实失败，未改写。加入解析器后provider-green-working30/30；boundary扩展发现末尾空行导致重复应用不幂等，provider-boundary-green仍真实FAIL；移除split末尾哨兵后33/33，新Object原型同名键保护后provider-final-working34/34。
- all-agent-working180/182（原Windows skip2），随后增加原型同名键测试，最终全量还需新提交执行。Agent build通过；fresh带生产依赖包4296文件逐项hash验证，smol-toml1.9.0与许可证真实随包。
- packaged-working实际运行包内node.exe及agent/dist/index.js，不使用tsx或开发node_modules；2次移除当前provider明确exit1，config/prior catalog原件不变、不创建new catalog；显式有效active两次exit0，用户profile和CRLF保留、输出幂等。独立Python tomllib解析通过；仅隔离目录、无真实Provider请求。
- 新依赖为显式锁定smol-toml1.9.0/BSD-3-Clause，registry integrity实证在toml-dependency-metadata.json。输入/结果解析异常不带原config行；root模型选择只由显式active改变。catalog延后到合并及原secret检查通过后写入。
- 这些为当前工作区预验收；PR42落地后的组合main、Desktop版本递增、完整verify/新原生包/精确head独立review与托管/main gate仍待执行。TASK-PROV-CONFIG-004继续PARTIAL，TASK-PROV-003整体不变。

- profile-reference-red实际复现profile残留受管引用，修复后35/35；原型同名用户键保留。新的19条承接/53分支时点分类及12项缺口任务见health-followup.md；UI014容量中断已登记续验，旧候选原件未动。

## 最新主线组合准备

PR42已普通落地6a97f45，整个tree与已审cc相同；本分支merge814f2b27已纳入该main，仅PROGRESS发生真实冲突，双方历史逐段保留，122任务生成视图重建。Desktop仅递增2.1.13、Web2.1.12；npm ci按组合锁重新安装/编译Agent与四插件通过。新增P3原生拖动诊断后123任务，13个后续项仍TODO，当前任务仍PARTIAL。合并前health-lint-pre-merge因修改源码路径未重建TaskLedger而FAIL，原日志保留，生成视图后corrected通过；未放宽门禁。完整verify/fresh桌面组合/精确head审查随后执行。

独立408复审真实发现多行inline table作用域误判（P1），新增回归先35/36 FAIL；只补词法{}深度后36/36 PASS。408全verify真实PASS：root804/812与原skip8、Agent182/184与原skip2、浏览器447项/447attempts/0实际retry或flaky、4插件development通过。合并后主线6a托管37845923441真实FAIL：image-edit区域重试读取3条旧任务却先匹配旧最后succeeded；原失败日志完整保留，单独续修，不冒充主线PASS。新源码head及fresh包验收待完成。
