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

## 保存生命周期与宽屏容器追加验证

base b8acad1c；修改候选未提交时执行，固定1423/真实Edge/production preview、workers=1、retries=0。重新build源码Desktop/Web2.1.47、Mobile2.1.43（hud-width-build.log，exit0，保留large-chunk警告）。

- save-hit-probe.log证实1099保存文案pointer-events:none，而HUD旧取消button落在父容器裁切区外。信息文案命中断言无效；取消裁切另挂TASK-UI-HUD-CANCEL-CLIP，不宣称修好。
- save-layout-probe.log及save-layout-rules-probe.log：1920视口的canvas可用宽1342px，HUD却0px；sidebar折叠旧高优先级width:auto覆盖现行width，与inline-size容器造成内在宽归零。未用重试/超时规避。
- 移除两处旧width覆盖后，保存文件6 pass/0 fail（save-lifecycle-width-fixed.log）。补强同宽度reload后，与调度15、任务命中2及邻接7合跑30项：27 pass/3 fail/0 retry（hud-width-adjacent.log，run152e6a38-48db-47c1-9b0c-b732abf4c7f9）。保存6项全部通过，包括390/1099/1920等待归档→1/1完成→同宽度reload恢复；归档失败/快照写失败/原生恢复夹具均通过。
- 3个失败与本批之前final-adjacent.log同名同症状：390新增卡片右边界383.785>382、缩窄编辑器不能完整进入可操作区、HTML200在旧测试连接入口显示success。均保留原断言，归TASK-MOD-GATE-ADJACENT继续诊断；最后一项存在快速测速/独立目录拉取的新旧契约冲突，尚不据此断言应更改哪条产品路径。
- 390截图已作者查看：真实任务详情正在生成0/1、取消任务可见可达。整体顶部仍有旧投影拥挤等差异，本卡不宣称全量Figma视觉已同步。读取当前Figma03 655:141110及01 597:67551支持现有宽度和入口规则，无Figma写入。

本追加的当前快速门禁结果、保护指纹与提交另存最终回执。完整verify/当前独审/Tauri运行/main整合尚未完成，P0/ORG不关闭，P1/P2未实施。

当前候选快速门禁：typecheck、lint、format、ui及build均exit0；单元2345项，2325 pass/0 fail/20 skip。保留ui设计25warning/1info、5处历史版本文案及CHANGELOG漂移、large-chunk警告。lint显式GOVERNANCE_BASE=b8acad1c31eef37b1702c30a428bdff966525551，以本卡父候选作增量比较；默认main比较在未合流的P0/ORG bootstrap处仍报2项，不把本卡lint通过当作main整合通过。生成账本视图被格式工具改排引起的1项stale已重新生成，最终178任务0违规。hud-width-candidate.json确认原主checkout21个dirty文件及4份需求来源SHA不变；原始失败日志、JSON与三宽截图均保留。
