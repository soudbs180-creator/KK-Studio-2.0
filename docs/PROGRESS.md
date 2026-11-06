# 当前进度

2026-11-06 UI-004：按用户要求全部经MCP、先Figma后本地。本批已修正设计字体/首页封面/品牌资源，26定向生产浏览器通过，Desktop2.1.66重建且源码指纹稳定（EXE659e1eb4141f）。当前仍PARTIAL；全页六态/像素、最新整套verify、Native窗口、独审与发布未完成，原数据读取保护保留。审查分支上 verify、delivery、installer 的失败正在按[门禁修复](changes/2026-11-06-ci-gate-repair/verification.md)处理，远端重跑通过前不能合并。当前事实查[状态](governance/PROJECT_STATE.md)，逐轮回执查[UI验证](changes/2026-11-05-figma-local-sync/verification.md)。

2026-11-05第二阶段：main@752f7dbd基础上补齐B1–B5及A1–A3，health 0 blocking、版本0 warning、E2E312/312；完整verify/当前Desktop/独立审查以[本次验证](changes/2026-11-05-step2-deep-water/verification.md)为准。保持外部模型与正式发布的未验边界。

## 先前候选记录（非当前工作树状态）

2026-11-05，六支柱接线任务进行中，当前 `codex/TASK-E2E-WIRING-20261104`、HEAD `6719c6d1` + dirty，候选 Desktop/Web `2.1.65`，尚未合流。

- 阶段 2（已完成并合流）：打通 ComfyUI 工作流动态参数（正反提示词、Seed、步数、尺寸、采样器、模型）在画布节点与属性面板的双向同步，接入原生编辑器桥接回写，全面开启局部重绘、扩图、高清修复、图层拆分四项生产入口，`FEAT-004/005/040/041/042` 升级为 `REAL`。
- 阶段 1（已完成并合流）：精简治理入口并归档历史；19 个已实现历史任务收口；修复触屏连线菜单点击、底栏尺寸与长模型名称换行。
- 当前局部门禁：verify-3曾全套通过（2650单测、931浏览器通过）；记忆后端续作2652单测/20跳过，作用域UI定向12/12，最新StrictMode与关闭提炼修复37/37；整套复验进行中。Rust424通过/1忽略。阶段2的2494单测与Tauri验收属于历史候选。
- 阶段 3 实施中：四模态统一真实提交，删除本地假生成分支，Veo 异步回执恢复与 speech 归档已接原生宿主；严格参数/参考校验、取消 unknown、迟到结果围栏与原件校验已实现。全量门禁、独立复审和 Desktop 验收完成后本地合流，再推进阶段 4。
- 六支柱：记忆范围管理已沿Figma03→04/05接到实际设置入口，读取/提炼/删除/清空/重置分域，含迟到与卸载围栏；控件/网关/扩展/Agent已有生产调用。聊天回滚、授权执行、34项画布操作/Floorplan、分镜/光学/切镜与harness纯生产转出已落地，最新整套门禁和当前Desktop待验。
- [六支柱当前验证](changes/2026-11-04-e2e-wiring/verification.md)与[独立预审](changes/2026-11-04-e2e-wiring/review.md)记录具体边界；阶段3两项P1已关闭、独立136/136。最新完整verify、当前Desktop、真实付费服务和合流未完成。

[阶段 2 验收](changes/2026-11-03-comfy-production/verification.md) · [阶段 1 验收](changes/2026-11-03-mainline-reset/verification.md) · [台账](governance/task-ledger.json) · [历史](archive/PROGRESS_20261103.md)

2026-11-05续作：P1–P3生产接线与harness清零已实现，e2e312/312、单元2684通过/20跳过、定向浏览器102+2通过；独立预审2P1/4P2修复后等待正式SHA复核。最新完整verify17、当前Desktop构建、PR/CI/main与工作树回收未完成，详见交付验证记录。
