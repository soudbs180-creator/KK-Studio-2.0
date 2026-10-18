# Verification：公开下载名

- Task ID：TASK-CANVAS-RELEASE-20261018；状态：IN_PROGRESS / NOT_VERIFIED；日期：2026-10-19。
- branch：`fix/TASK-CANVAS-RELEASE-20261019-download-asset`；base：`0cc3b4ed116d71062244e3097285a2b532de8f97`；最终 HEAD 及其完整验证以本 PR 的精确提交和外部回执为准，不将 dirty 预检称为提交后门禁。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Review](review.md)。

独立只读诊断已实测现存公开 Release：同 tag 的 dot 资产地址匿名 GET 得到 302，唯一替换为 `%20` 的地址得到 404；GitHub 官方资产 API 文档和 gh 维护者说明确认服务端规范化。不是以尚不存在的 KK42 地址 404 推断问题，也没有创建测试 Release 或上传 dummy。

规则依据：[GitHub REST 官方资产文档](https://docs.github.com/en/rest/releases/assets#upload-a-release-asset)、[gh 维护者的直接复现](https://github.com/cli/cli/issues/10585)。独立诊断 `release-asset-filename-readonly-diagnosis.md` SHA256 `9370ef634e10695a213cd82da7eda748c38ffd104dda6334a9bd7537f7b446c9`；其中推荐保留 download 属性的旧展示名是备选建议。本修法经调用方核查，现有导出仅供设置页使用，因此直接将公开 filename/href/download 一并改为 dot；本地 NSIS/receipt 不消费该 UI 常量。

| 检查 | 实际结果与证据边界 |
| --- | --- |
| 旧 production build | base0cc、原共享常量，`npm run build` exit0；1423端口空闲，Playwright自身严格启动preview，Edge1920×1080 |
| RED | 仅将现有browser用例预期改为公开dot名，workers1/retries0；exit1，精确在href断言收到`KK%20Studio`而预期`KK.Studio`，尚未点击下载；报告run `5be28449-c828-4dac-8c74-e3c6190ae33c`；原log SHA256 `1afdc6b15aed75be4c8f99b710843c302f2e13130401d8d29724787eb6125a6d` |
| 最小修法/GREEN | 只改共享filename常量并加原因注释、同步Desktop预期；fresh production build exit0，同一browser用例1/1首过、workers1/retries0、下载/页面/版本/Agent说明全部原断言保留；报告run `2d83c03c-7b34-4cf5-b7cf-a8f6e6a94b3d`；log SHA256 `da6f040a878064e69b199f829ee495c28465a1434b45794d4e2040b5245d60a7` |
| 相关静态检查 | `npm run typecheck` exit0；三个代码/测试文件的Prettier check通过。新旧主入口gzip均237.16kB；无依赖/组件/样式新增 |
| 当前完整门禁 | 提交后精确HEAD的完整verify、独审、Hosted/Delivery/Windows candidate及正常merge仍待；本表前项只是dirty相关实证 |
| Native实际URL | 正式包安装后由外部 `installed-acceptance-42-release-url.mjs` 精确断言dot href；实际NOT_RUN，不借Web回归代填 |

42 标签、正式安装包、默认资料安装和生产交付仍 NOT_VERIFIED。原 35 push 首败/UNKNOWN/nonblocking/strictfalse及 e43 两 flaky、d965候选安装首败与顺序修法实证保持原义。0cc的原主线CI继续自然结束、保存其自身raw；本真实下载修复使其不再是最终tag来源，不取消或重跑它来掩盖信号。见前阶段验证及工程外原始收据。
