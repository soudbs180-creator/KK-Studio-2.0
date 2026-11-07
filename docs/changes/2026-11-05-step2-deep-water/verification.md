# 验证记录

任务：TASK-DEEP-WATER-20261105。状态：IN_PROGRESS。

基准：main@752f7dbd，唯一 worktree D:/kk-studio/KK-Studio-2.0，开工干净。

基线 health:check 输出 26 blocking、2 allowed（advisory，退出码 0 不代表无阻断）。日志：工作区 output/logs/step2-deep-water-2026-11-05/health-baseline.log。

当前治理 PROJECT_STATE 仍描述旧 dirty 分支，属于基线文档漂移，最终按实际证据校正。外部 Provider 质量、Web 与 Desktop 同态验收单独报告，不用测试替身代表 live 调用。

Figma 前置：2026-11-05 新增并回读 [B1/B2/B4 设计](https://www.figma.com/design/ZiadpErDoFweCjG3uHjkM3/KK-Studio?node-id=4394-52689)，复用 03 现行组件 551:6356、489:2652、750:59158 与原 4386:604 样式变量；25 个 Text 使用 Source Han Sans CN VF。按钮长文案换行缺陷已修复后截图复核。其余共享控件替换保持现有设计状态。

## 回归发现与处理

- 初次流式重构增加有效响应路径的await，导致即时取消监听错过；原10项取消/分块测试定位后恢复原调度顺序，未修改断言。
- 独立预审发现并修复：蓝图扩展未恢复；修复可删台词；隐藏输入的可见包装；参数菜单关闭无导演监听；单镜被其他违规镜阻断；并发覆盖；100+1分组不可保存；node_rev正常新增卡拒导。新增边界测试保持原状态/字段。
- verify-3 产品浏览器：943通过、2失败、1 flaky、1既有跳过。两失败均为旧帮助菜单高度186px断言；B4新增一个真实44px导出行后为230px。按本次Figma4394:52689及授权新动作更新精确高度为230，保留168px宽度、菜单可见与窄屏防溢出断言并加导出入口可见断言；非放宽阈值或隐藏失败。手机空上下文入口1项首次失败后重试通过，记录为flaky，继续定向复验。

补充：Figma4394:52689定义蓝图两操作，未直接规定168×230整菜单。230是原菜单186加现有40px控件高度与4px间隙的运行组合几何。独立review已确认此断言调整合理。

蓝图文件统一64MiB上限（包含嵌入媒体）；3MiB预览实际JSON往返与超限拒绝测试通过。导出不会生成自身入口拒收的超限文件；超限提示保留原数据并建议项目归档。

## A1 复杂度收口（2026-11-05）

对照 origin/main `9b1038a75a62`，`npm run health:check` 在拆分前为 3 blocking、2 allowed（advisory，退出码 0）。阻断项是 `StartComposer` CC 23、`normalizeDraft` CC 22、`createProject` CC 31。

三处只把分支抽到同文件纯函数：`homeGenerationGate`、`persistedDraftKind`、`codexGenerationDescription`、`sizedImage`、`parsedProjectMedia`、`creationItemParameters`。拆分后同一命令为 0 blocking、2 allowed。`creation.test.ts`、`mediaTask.test.ts`、`homeMediaSelection.test.ts`、`composerLayout.test.ts` 共 31 项通过。完整 `npm run verify` 与 Desktop 验收未跑，本任务仍是进行中。
