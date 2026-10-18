# Plan：手机输入框焦点修复与无额度验收

- Task ID：TASK-MOBILE-COMPOSER-001；IN_PROGRESS；2026-10-18；交付包角色：current。
- [Intent](intent.md) / [Spec](spec.md) / [Verification](verification.md) / [Review](review.md)。base97ef与分支/工作树见Intent。

1. root保存canonical/隔离树基线、真实本地浏览器红测和失败截图；本地既有uiComposerDraft基线5项通过。旧图文任务PR70/71以其实际门禁/合并证据有界结案，仅解除同工作树REVIEW占用，其他任务不批量修改。
2. root在Composer作interacting生命周期最小修复，先保留真实browser失败再验证四视口、模型/添加/展开、Enter、取消、草稿恢复；依赖与Provider不变。文档代理只写本包、同任务治理与FEAT-028登记，不碰产品/测试/版本，不stage或commit。
3. root按现有版本命令递增Web/Mobile，执行相应Mobile检查、组合构建、定向/必要完整验证。每轮独占证据输出，不覆盖历史失败和图文收费收据。
4. 冻结源码head后独立review，实际Delivery/Hosted和正常PR门禁满足再合入main；对实际main完成要求的门禁，创建正式Release，沿既有自动发布。不扩大SSH权限，不改变业务服务/库，不再次生成。
5. 上线后回读version/source/bundle，复验模型控件、旧资料/原件/刷新；核对current/唯一previous和回滚可用性。将结果更新本包和账本，未跑项保持NOT_VERIFIED，实体手机最终体验由用户确认。

## 恢复与限制

初始紧凑状态保留，锁存仅影响进入输入后的同组件UI。项目/账户切换沿既有key重挂载；触摸取消不应打开面板。发现回归先停止发布并修复，不放宽门禁或用onPressIn绕过。

现网39/38库存是上一轮实际核验，不当成本轮已发布40的证据。新版本仅在正式Release后部署，目标40/唯一39；不额外保留多个静态回滚版本，不删除业务资料。后台真机事件与截图工具内部环节若缺证据如实保留边界，不通过付费生成补验。
