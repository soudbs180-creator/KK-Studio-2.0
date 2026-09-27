# Review：画布图片对比

- Task ID：TASK-COMPARE-001
- 状态：实现者自审完成；独立上下文最终审查待执行
- Base：`origin/main@a89792a`

## 实现者自审（2026-09-27）

- 范围：新增纯 UI/领域层对比选择，不改变项目 schema、原素材、生成队列、凭据或新依赖。Desktop/Web 共用前端，分别以 preview 和 release 操作验证；原生 Mobile 未在范围内。
- 主路径、失败态和键盘：本地图片选择/撤销、2–4 张上限、同步滚动缩放、两图滑块、0% 加载失败重试、删除剔除、Escape 回焦。右键/双击在对话框内不再触发画布菜单。
- 发现并修复：画布可用宽度曾取到侧栏入场动画中的 `DOMRect.left`，导致 1440px 对比选择条落在对话侧栏之下；改用稳定的布局 `offsetLeft`，并对 1201–1350px 选择条换行。回归在 1440/1220px 实际点击通过。
- 截图、构建身份和命令见[验证](verification.md)；候选 `npm run verify`、Tauri check/build 与隔离 release GUI 通过。最终提交后仍须核对精确 head、`git diff --check` 和交付门禁。

## 尚待独立和托管门禁

- 独立上下文 review：NOT VERIFIED；须绑定本次提交的 base/head SHA，检查实际 diff，不能把上述自审算作独立结论。
- Hosted PR `verify`/`delivery`：NOT RUN；用户产品验收：NOT RECORDED；主线集成/正式发布：NOT DONE。
