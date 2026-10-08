# Plan：TASK-UI-011

- Branch：codex/TASK-UI-011-image-selection-actions；worktree：D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-UI-011-image-selection-actions。
- 起始 main：5dd6e6dddaf00cf2d5c14ae02ef5974c72238232；原树 clean；独立 npm ci，不共享依赖。
- [Intent](intent.md) · [Spec](spec.md)

1. 登记任务与 FEAT-001；保存用户参考图片。检查实际图片/结果卡片、选中状态、指针事件、样式顺序及相关回归；先取得基线与实际 RED。
2. 用共享选择动作栏替代内部常驻动作，保持现有功能/生成门禁；位置随当前卡片几何，命中尺寸独立于画布缩放。修改前确认模型任务没有同时写相同组件。
3. 按既有规范审计新页面入口，修复实际偏差；同步 UI_RULES 与功能卡，只提升有真实证据的结论。
4. 运行图片/比较/拖动/键盘/模型/任务相关回归、全部 verify/UI/format/build；Web 固定 1421/1423 串行验证；fresh Desktop 独立数据/凭据/进程验收。
5. 承接实际最新 main（T5 与模型任务），处理版本和账本的具体冲突、复验、提交独立补审；当前 PR 门禁通过后按已有用户授权合并。

Rollback：revert 本任务；保留历史证据、原件与其他分支，不删除用户数据，不切换临时端口或停别人的进程。

独立审查返修增加两个验收：顶部手势结束/取消重选恢复及390px双排HUD碰撞；六阶段必须含非空任务与失败输出。共享DOM几何用于定位和自动reveal，遵守手势/undo与空卡片连线语义；评论/任务动作消费同一32px按钮类，不放宽采样。原失败日志保留，修复后重新绑定full/Web/native/精确SHA证据。
