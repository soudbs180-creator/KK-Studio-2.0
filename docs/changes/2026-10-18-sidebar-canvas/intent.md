# Intent：侧栏持久化与宽图连线收口

Task：TASK-SIDEBAR-CANVAS-20261018；关联TASK-PROJECT-SIDEBAR-001、TASK-CANVAS-WIDE-PORT-20261014。
用户要求先完成侧栏置顶/排序持久化，再完成宽图连线和实际桌面验收。保全所有现有改动与用户资料，不删除/移动文件，不调用额度模型，不push/merge/发布。

base ab2ceef00df6452580b839f29f39747174ad0b68，复用原审计物理树和独占依赖，新branch fix/TASK-SIDEBAR-CANVAS-20261018；7树110dirty/index/all-ref bundle及当前raw3已工程外保全。Desktop/Web共享行为改变，自动递增至2.1.39候选，Mobile不变。
