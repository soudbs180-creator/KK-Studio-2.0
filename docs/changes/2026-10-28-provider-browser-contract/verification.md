# 实际验证

IN PROGRESS。base bf2e2b6f，固定1423/真实Edge，日志归容器output/provider-browser-contract-2026-10-28。已重新build当前产品并保留large-chunk警告；本卡无产品源码变更。

## 最终候选记录

实际范围按spec追加：产品canvas-hud.css一个定位属性、useTaskExecution两个既有健康写入时序；Desktop/Web源码45→46，Mobile43不变。早期“无产品改动”仅指入口诊断阶段，不是最终范围。Figma01规则及03任务列表/顶部实时只读核对；未改Figma，也未声称全量视觉同步。截图仍存在搜索/筛选等旧投影差异，此卡只验关闭命中与工作台可达。

- 原代表2例RED保留（red.log）。入口/前置候选先恢复1例，另一例继续暴露关闭透明层拦截click；geometry-probe记录关闭按钮static、32px外框与整面板拦截，未force点击。
- 恢复relative后3例代表通过；完整调度首轮13 pass/2 fail，其中1例停在旧partial HUD隐藏，修正为真实任务卡10/16后两例均显露429冷却仍active。storage-probe明确HTTP429错误已发布、IDB真实写锁completed=false、requests=1而连接active；不是未收到HTTP或夹具没占锁，未将其归咎为夹具过时。
- 移动两个健康更新至项目保存等待之前，保留全部原身份、取消、代际与租约守卫；最终同一构建完整调度15项和任务面板390/1920两项共17 pass、0 fail、0 retry（final-browser.log）。2个故障注入用例实际跨过原失败行，校验另一项目不提交、10/16部分完成、保存冲突后仍冷却及activeJobs最终0。
- 同一最终构建的保存/归档及现行入口邻接回归4 pass/1 fail（save-adjacent.log）。失败仍是Web保存场景：390宽度下project-task-status边界轮询得到Infinity，未越过原几何断言；phase、取消命中和恢复后续不能宣称全部执行。测试文件及原断言未改。不能以调度全绿替代全部浏览器/完整verify。
- 当前typecheck/lint/format均exit0；单元2345项，2325 pass/0 fail/20 skip。ui:check exit0，官方design lint有25个warning/1info，未屏蔽；代码健康0问题。构建保留既有large-chunk警告。根typecheck只覆盖src，新浏览器文件还经ESLint和真实Edge执行。

Web链路为index.html→src/main.tsx→App→Canvas→CanvasHud→TaskPanelPopover/TaskDetail；真实preview 127.0.0.1:1423，production dist来自本轮health-build。工作台点击和关闭回焦在390/1920均通过，截图已复制至容器task-panel-390.png/task-panel-1920.png并作者查看；截图只证明此交互状态，不代替当前Figma全量验收。

这里只是working-tree候选检查；最终提交、保护指纹和交付完整性另有回执。没有生成新的Tauri EXE/安装器、没有Hosted/付费调用、没有独立审核或main合流。原主checkout dirty受保护，不更新用户安装客户端；完整verify仍未通过。

最终保护回执protection.json确认原主checkout21个dirty文件及4份需求来源哈希不变。源输入指纹与最终提交另记录到容器，避免把dirty候选的运行错误归属到旧HEAD。所有日志保留原结果，没有将早期governance活动任务分支冲突2项改写为通过；按已经验过但未整合的真实状态将任务转PARTIAL后，最终175任务0违规。
