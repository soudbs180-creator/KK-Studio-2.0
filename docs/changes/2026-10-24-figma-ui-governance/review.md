# Review：范围、风险与回退

- 保留现有 checkout、分支和未关联 staged/unstaged 改动；没有执行 reset、clean、覆盖或发布。
- 新增代码复用既有 `image-edit` 区域逻辑和 Canvas persistence，未重新实现图片遮罩引擎。
- 主要风险是浏览器门禁存在环境性超时、完整 verify 受既有格式漂移阻断，以及 04/05 页面仍未完成全量同态验收；相关能力保持 PARTIAL/NOT VERIFIED。
- 如需回退，按本目录 spec 中的字段与文件切片回退，不回退整个工作区。
