# Intent：对齐 GitHub 安装包下载文件名

- Task ID：TASK-CANVAS-RELEASE-20261018；Owner：root-release；日期：2026-10-19。
- 交付包角色：current；状态：IN_PROGRESS / NOT_VERIFIED。
- branch：`fix/TASK-CANVAS-RELEASE-20261019-download-asset`；base：`0cc3b4ed116d71062244e3097285a2b532de8f97`。
- [Spec](spec.md) / [Plan](plan.md) / [Verification](verification.md) / [Review](review.md)。

用户已授权统一发布一个包含 Windows Agent 的安装包、更新当前客户端与 Web/手机 Web，并保留原项目配置。正式标签前发现下载入口的真实阻断：GitHub 将上传文件名中的空格改为点；现有 `%20` 地址不能匹配实际资产。

只对齐共享下载文件名及两个现有平台回归。NSIS 本地文件名、正式 receipt、安装资源、数据和凭据身份保持原契约。本任务未发布的三端 2.1.42 继续作为同一次发布候选，42 标签尚不存在；不是修改或重打已发布版本。

验收：Web/Desktop 更新入口指向实际 GitHub 资产名 `KK.Studio_2.1.42_x64-setup.exe`；相关浏览器回归先 RED 后 GREEN。最终仍须当前 HEAD 门禁、独审、正常合并、实际 main 验证、tag fresh 包、安装/资料保留、公开下载和三端生产验收。前一阶段及其失败见[安装顺序包](../2026-10-19-installer-lifecycle-order/verification.md)。

后续4c的实际 Hosted push FAIL 中，独立受控对照证明侧栏物理点击测试缺少按钮 enabled 前提。按[补充计划](plan.md)仅增加现有测试的一条可用状态断言，保留全部交互断言和失败证据；不更改产品或把云端未知首因称为已修复。
