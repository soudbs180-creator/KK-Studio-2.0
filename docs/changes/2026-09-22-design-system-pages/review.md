# 独立评审与修正（TASK-DS-002）

- 规则：AGENTS.md、AI_RULES.md、docs/engineering/REVIEW.md；执行计划要求一次fresh-context评审。
- 独立上下文：`/root/ds_pages_review`，2026-09-22；初次11文件实际delta、来源SVG/相关消费者、源CSS的独立Edge内存绘制、既有DOM/截图/native脚本只读核对。未修改候选/index/分支，未写测试产物；没有宣称正式GitHub审批。
- base/head：`cf344ddcdf039c6e62aeb9c65106e2a2339c0bb4`；dirty基线另由review-manifest与review-delta绑定。候选没有提交，性质为独立预检。

## 首次发现：CHANGES REQUIRED，无P0/P1，两项P2

| ID | 问题与复现 | 修正与覆盖 |
| --- | --- | --- |
| DS002-R1 | category允许80字符，旧胶囊未限定宽度/换行；390px下独立复现按钮987px、页面scrollWidth1005px。原基线也存在，但本批长文本验收仍必须处理 | shared ui-capsule min-width0/max-width100%/overflow-wrap:anywhere；实际新建80字category、保存重载、无横向溢出、点击筛选/返回全部。root也复现615px overflow的RED |
| DS002-R2 | 浅色selected填充与页面1.16–1.74，原边框与unselected一致，持续状态不能只靠浅色差异 | selected使用text-accent边界并加inset1px与600字重，形成两像素边界而不改变品牌fill；16种主题/强调色均核对非hover边界≥3 |

两项已接受，17项相关浏览器（10页面+7连接/菜单）在不重试条件下通过。最终独立修正复核结果与完整verify/新版Tauri另行追加。

## 回归测试校准

首次完整verify的connection-drag菜单End断言1次flaky；后续同断言再次失败（含retry）。发现测试写死SVG为最后项，而pluginLoader并发激活、nodeRegistry按完成顺序保存，最后项没有固定SVG契约。本轮仅校准测试：等待4个内置插件可见后，End仍必须聚焦实际末项；保留初始文本、ArrowDown图片、Escape回焦、5视口和减弱动态断言。没有跳过测试、提高retry或修改业务菜单来制造通过。

## 未评定范围及归属

- 在线Ardot与缺失Frame、最终用户视觉验收：保留TASK-DS-001/UI-004，不阻塞本批规范一致性修正。
- 真实Provider/GPU/MCP/TaskHost/平台链：原任务保留；本批Desktop只验证UI、隔离身份、资源包与偏好/Skill重启。
- 未改的Skill导入/schema/业务失败处理完整性：非本次全面业务审计，不据此关闭TASK-CAP-001。
- 原工程安全回传及最终检查：由root逐文件比对原始快照后执行，最终结果记录到verification；不以独立静态预检替代动态验证。

没有commit、push、PR、远端审批或发布操作。

## 同一独立上下文的限定修正复核：PASS

`/root/ds_pages_review`复核R1/R2与End测试校准后无新增finding。其独立Edge内存运行16组合：80W胶囊宽293/高74，329px页面scrollWidth329，overflow0；非hover边界最低5.475:1，内描边与600字重生效。已回读HTML/Markdown/SVG/便利贴4项等待条件，确认测试仍要求End聚焦实际末项且保留原键盘行为。

最终12文件全部匹配review-manifest，manifest SHA256 `1450ad29a8c9bd9df9f41166c179c06f04ba1697f0ef85f61f3684eb95bf1bbe`。此限定修正复核关闭R1/R2；完整verify、真实Tauri和回传验证分别由root在verification记录，不能互相替代。
