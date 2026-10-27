# TASK-MOD-P0 验证

- 工作树：`D:/kk-studio/.worktrees/TASK-MOD-P0-architecture-baseline`；分支：`refactor/TASK-MOD-P0-architecture-baseline`。
- base：`c2a0228a57be66b982d889c6710faa32cde49b7c`；原始证据：`D:/kk-studio/output/modularity-p0-2026-10-28/`。
- 开工typecheck/lint均通过。首次npm test：2297通过、2失败、20跳过；两个失败由新任务树尚未编译Agent造成。安装并构建本任务独占的Agent后，重跑为2299通过、0失败、20跳过（prepared-baseline-test.log），原失败日志保留。
- dependency-cruiser是唯一新增开发依赖，未更改产品运行时源码。

## 当前候选验证

| 检查               | 结果与原始证据                                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| typecheck          | PASS，final-typecheck.log                                                                                                                       |
| lint               | PASS，final-lint.log；health 0 blocking、2项既有allow，footguns 0                                                                               |
| 全量单测           | 独审修复后2333项：2313通过、0失败、20跳过，review-test.log及exitCode=0回执；较准备后基线新增14项                                                |
| 架构故障注入       | 14/14通过，包含长环、同SCC新边、基线扩容/同量替换、解析形式、TSX扩展替换、test-like/dist目录绕过、契约反向导入宿主、重命名同名及CLI状态码       |
| 当前架构基线       | R1=405、R2=11、R3=10、R4=16、R5=0、R6=2、R7=0、R8=0；无新增违规                                                                                 |
| 构建               | PASS，build.log；Vite已生成bundle，既有大chunk提示保留，不作为体积优化成功证据                                                                  |
| Markdown/索引/治理 | 初始PASS，现行文档135、ADR目录28文件、账本166项；均0 violations。后续格式修复登记为独立TODO任务，最终账本回读另记                               |
| 本卡受控文件格式   | PASS，包含配置CJS、脚本、测试、锁文件与eval场景的显式Prettier检查                                                                               |
| 完整verify         | FAIL，verify.log；lint/typecheck/单测/Agent构建与单测/UI静态检查完成后停在format:check。此轮早于最后两项绕过回归，之后已重跑最新快速门禁与build |
| 原主checkout保护   | 原21个dirty文件SHA-256逐一一致；src/packages/vendor产品源码diff为空                                                                             |

## 继承阻断与未验证范围

全仓format:check在18个既有源码文件失败（包含ReferenceThumbnail.tsx与17个feature入口）。对每个文件读取c2原文，确认当前文本未变且原文也无法通过同版本Prettier；证据pre-existing-format.json。P0明确禁止产品源码修改，故未夹带格式整理；记录独立TASK-MOD-GATE-FORMAT，主线分叉复用现有TASK-GOV-004。

独审发现两项验收缺口后已完成RED→GREEN；修复后重新执行typecheck/lint/npm test，全部exitCode=0（review-typecheck/lint/test.json）。R1–R8基线未扩容。新增规则、测试的格式检查与受影响增量独审另行收尾。

完整verify尚未跑到产品浏览器、设计浏览器与开发插件运行验证；Desktop安装包、真实Provider、Mobile、Hosted CI和生产发布未验。新增eval只完成确定性结构检查与后续独立上下文复核，不是live模型评估。

本地主线与远端分叉（113/7独有提交），原主checkout有受保护dirty改动，当前也未满足完整verify门禁。因此不能自动覆盖主仓、发布、强行合流或回收未整合任务树；P1/P2产品改造尚未开始。下步先以独立任务解决既有格式门禁与基线整合，保持本卡P0源码范围不变。
