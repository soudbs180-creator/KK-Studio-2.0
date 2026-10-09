# Verification：区域重试门禁

Base6a97f456ab7334f97c604461e8d29789caa754cb，源分支test/TASK-IMAGE-RETRY-004-current-attempt。主线托管37845923441 verify真实FAIL：image-edit.spec.ts196预期4收到3；原日志261598字节保留在工程外TASK-PLUGIN-DEV-001-20261009/main-6a97f45-failed-verify.txt。旧最后任务已有succeeded，等待未绑定重试身份。当前待完成受控复现、最小修复、完整门禁及独立审查；非产品回归结论。

受控750ms第四响应探针（工程外retry-red.txt）在本机实际PASS/exit0，没有复现托管收到3；原件保留，文件名不能代表结果。真实RED依据仍为主线托管37845923441首次及retry1收到3的完整原日志，直接缺陷是旧等待只检查at(-1).status而未绑定新任务。最小修正先等4条，再识别唯一新增ID并只等待其成功；所有group/four POST/原件及无关像素断言保留。增加fixture返回延迟，14项完整图片编辑零重试通过；完整新head门禁和独立审查待执行。

## 43fc本地最终验收与文档收尾

完整verify exit0：root804/812、Agent172/174（原skip8/2）、447browser/447attempts、0实际retry/flaky/skip；严格development四插件PASS精确source43fc。只测试及治理文档改变，产品全部文件与base6a相同，Desktop/Web2.1.12及Mobile规划2.1.1不变。独立source43fc报告真实CHANGES REQUIRED（IRV-001/P2仅文档合并阻断），独立41相关unit、ESLint/format/gov110/features35/md102/version/delivery9 PASS；本收尾删除矛盾的“本机必须复现”验收并同步实际结果，原source报告保留，最终精确doc-head补审待实际执行。证据manifest无损包含原FAIL和本机未复现PASS，本地DONE不代表Hosted、已合并或主线恢复。

文档收尾首轮gov/lint真实失败：DONE verification字段引用英文历史FAIL被有效检查拒绝；仅将该验证字段的历史表述改为“原主线失败”，所有实际失败/未复現/原审查结论仍在原件、verification/review及当前事实明确保留，检查未改动。修正后门禁须另跑，不改原失败输出。

## 105后续当前状态

source105补充Windows诊断且独立SOURCE PASS。完整verify实际9flaky、误用preview1431实际10FAIL和默认1423最终447/447零retry各自原件保留，不能互相覆盖。[诊断收尾与完整原件](../2026-10-09-windows-entry-diagnostics/verification.md)载明准确来源、历史误读勘误和未完成任务。当前Hosted及最终doc-head/main推广待验。
