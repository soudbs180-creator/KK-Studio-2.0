# TASK-MOD-P0 引用核对清单（只读）

## 方法与证据

原始清单位于容器`output/modularity-p0-2026-10-28/inventory.json`；可复跑脚本为`output/scripts/modularity-p0-inventory-2026-10-28.mjs`（参数为仓库路径及一个不存在的JSON输出路径，拒绝覆盖）。按git ls-files枚举受控文件，用git grep逐字检索源码、脚本、CI、测试、文档、registry、ledger与门禁；历史changes/evidence/archive引用另列。

本次跟踪文件5476，docs3600、236752222字节；与外部“docs3482”的统计口径有差异，以本次清单为准。工作树中的忽略构建缓存不计入Git体积；移出工作树也不会缩小Git历史。

## 候选与处理

| 项                   | 活动/历史字面引用文件数 | 本卡结论                                             |
| -------------------- | ----------------------- | ---------------------------------------------------- |
| TEST_READY.md        | 0 / 0                   | 候选，内容价值和退役需ORG-3另卡，当前保留            |
| TEST_INFRA.md        | 3 / 0                   | 有引用，先确认测试是否读取文件，当前保留             |
| receipt.json         | 26 / 78                 | 构建/CI/发布证据有引用，保留                         |
| start-kk-studio.bat  | 16 / 17                 | 真实启动入口，保留                                   |
| verify-kk-studio.cmd | 5 / 3                   | 验证入口有引用，保留                                 |
| docs/reference       | 17 / 19                 | 活动引用存在；容器内容逐份hash/diff未完成，默认不迁  |
| docs/superpowers     | 10 / 12                 | 活动引用存在，不能当无用文件整体删除；默认不迁       |
| docs/evidence        | 19 / 107                | 门禁/registry/历史证据引用存在；OPEN-2未决，默认不迁 |

数字是字面路径检索，并非全部相对链接或运行时构造路径的完整引用图；零命中只代表候选，不代表可删。未进行删除、迁移、重命名、git rm --cached或Git历史改写。证据manifest是否可被delivery/feature检查接受仍待ORG-5前核实。

本地3个已有分支main/master/Figma任务均保留；为本卡新增单一P0任务树。远端清理须先核对PR/SHA/用途，本卡不处理。分叉详情和主checkout保护见[verification](verification.md)。
