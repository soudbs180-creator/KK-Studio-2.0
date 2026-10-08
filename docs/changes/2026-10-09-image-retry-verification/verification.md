# Verification：区域重试门禁

Base6a97f456ab7334f97c604461e8d29789caa754cb，源分支test/TASK-IMAGE-RETRY-004-current-attempt。主线托管37845923441 verify真实FAIL：image-edit.spec.ts196预期4收到3；原日志261598字节保留在工程外TASK-PLUGIN-DEV-001-20261009/main-6a97f45-failed-verify.txt。旧最后任务已有succeeded，等待未绑定重试身份。当前待完成受控复现、最小修复、完整门禁及独立审查；非产品回归结论。

受控750ms第四响应探针（工程外retry-red.txt）在本机实际PASS/exit0，没有复现托管收到3；原件保留，文件名不能代表结果。真实RED依据仍为主线托管37845923441首次及retry1收到3的完整原日志，直接缺陷是旧等待只检查at(-1).status而未绑定新任务。最小修正先等4条，再识别唯一新增ID并只等待其成功；所有group/four POST/原件及无关像素断言保留。增加fixture返回延迟，14项完整图片编辑零重试通过；完整新head门禁和独立审查待执行。
