# 调度浏览器门禁的现行契约修正

TASK-MOD-GATE-BROWSER，owner root，复用原test/TASK-MOD-GATE-BROWSER分支及任务树；ff接入此前ORG候选至base bf2e2b6f948f10e936a45e58e397bdf0a284a9ad。本卡修正provider-scheduling的旧断言/前置，并修复新暴露的任务面板关闭伪元素越界拦截；恢复真实工作台鼠标入口，不绕过点击或改变调度逻辑。用户禁止子代理。

继续选项1：本批base b8acad1c，移除折叠侧栏遗留HUD宽度覆盖，修复宽屏容器归零；保存用例按当前任务详情验证三个宽度的归档生命周期及同宽度reload。Desktop/Web源码46→47，Mobile43不变。P1仍未开始；P0/ORG只在所有适用门禁完成后合流。
