# Spec：统一 Mask 主线整合

- Task ID：TASK-IMAGE-EDIT-001；主线base 1d6f640ac6f3a1e7af32c38d85596527704dc54a；已审旧source e7cfd285366fdb12902dd9bfe809069f29393281。
- [原功能spec](../2026-10-08-unified-image-mask/spec.md)和[ADR-010](../../architecture/adr/ADR-010-unified-image-mask.md)保持算法、schema、能力与恢复边界。
- AC1：图片卡片只承担选择，预览/重绘/比较/收藏/删除继续在上方选中操作栏；双击和操作栏预览进入App承载灯箱，删除来源节点后灯箱与连续编辑不被意外卸载。
- AC2：框选/画笔/色块共用Mask、裁剪和融合；请求、项目包、重启恢复、清空/撤销和意见隔离通过当前组合验证，Mask外像素不变。
- AC3：首页不实例化Canvas/Conversation，设置继续按需加载；Desktop40px单排/真实窗口操作与Web三宽度保持。
- AC4：相关回归、完整verify/Rust/client/fresh release及两端实际DOM/截图、独立新SHA审查、最新Hosted门禁和实际合并后main CI通过。
- 当前Mobile无原生产物；真实模型效果、任意语义几何漂移、物理手机和用户验收仍由TASK-IMAGE-EDIT-VERIFY-002承载。
