# Review：统一现有 UI 细节

- Task ID：TASK-UI-DETAILS-20261015；状态：NOT VERIFIED。
- Base：18e143f06ee6741d20d45346fd1bb77f34bef606；最终head及独立审查待完成。
- 自查：不新增依赖或第二套主题/菜单/状态；保留Provider/凭据/存储identity、草稿字段和生成路由；按用户反馈删除旧入口及重复上传。
- 旧验收差异：2.1.25设置固定大外壳、首页生成参数、非空图片/视频继续上传的断言均被本次用户反馈覆盖；历史日志保持原义。
- 关联：[Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Verification](verification.md)。

- 独立在途precheck：ui_independent_review识别并复核手机首页尾组拆分及空图独立上传被toolbar遮挡两项，修复后无剩余阻断。此为dirty precheck，正式sourceSHA绑定待完成。
