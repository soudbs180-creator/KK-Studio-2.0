# Review：全页面新UI收敛与主线集成

- Task ID：TASK-UI-FULL-20261015；当前状态 REVIEW / NOT_VERIFIED（本地验收PASS，托管交付待验）；2026-10-15。
- 固定main base `694a00607f6f63de1b8c43d0ebb117adf5d34f67`；本地承接head `1653966f652390d93d490f90c0b7e9a9423f4026` 的正式source及integration审查均为CHANGES_REQUIRED，发现text纯prompt误算正文、audio坏src假可用、rightpan三项P2；不是批准回执。
- 当前source `241f3050124ad7773ced0b47a55629373177205e` 已最小修复上述三项及首页16:9，修正screen按钮旧40px断言和L/G空image夹具；14条定向真实Browser GREEN见[verification](verification.md)。当前官方隔离Native56checks PASS；root已回读精确source241与integration241正式review均PASS、三P2 CLOSED，165的CHANGES_REQUIRED保留。完整verify-3（747/747 Browser、development及全部本地步骤）已PASS，最终文档/test-only补丁head复审仍待完成，不把静态review当独立动态/Native/Hosted审查。
- 本地main承接实际104冲突、25自动差量已逐项审计，21外移历史blob精确保全；两个新增renderer冲突补审main尺寸/标题/preview不变量后保留checkpoint。15份来源包由当前任务承接，原任务branch/status与能力状态保持；Delivery704 paths/0 violations只证结构。
- 任务分支合入main基线不等于远端main落地；实际origin/main仍694。Hosted、普通PR/main与post-main尚未进行。最终review须绑定真实base/head、独立上下文与真实diff，核对新增用户空/内容/运行/失败状态矩阵及原失败记录。
- 关联：[Intent](intent.md)、[Spec](spec.md)、[Plan](plan.md)、[Verification](verification.md)、[Coverage](coverage.md)。

## checkpoint前的预检记录（历史范围）


- Task ID：TASK-UI-FULL-20261015；状态 NOT_VERIFIED；2026-10-15。
- 当前正式base为待真实merge后确认的main，已知origin/main694a006；源码HEAD6bc2e3da加dirty实现。最终已提交head尚未形成，三专项只读诊断和本轮dirty预检不作为精确SHA批准。
- 主线文档/功能ID/能力状态与80项source冲突已逐路径审计；补回main独有历史文字，不用整份ours/theirs或改例外跳过Delivery。当前任务承接15份来源包，原任务分支、开放状态及原验证SHA保留。
- 当前证据：79条定向browser GREEN；全部设置三宽3条PASS；菜单中间失败及Google持久化测试误设/RED JSON覆盖勘误均见[verification](verification.md)。普通菜单最终2条GREEN已通过，完整组合门禁仍待完成。
- 不增加依赖、第二套主题或状态；保留Provider/凭据/存储身份、原件、取消/禁用原因和历史能力状态。主线merge后重验恢复、幂等和受影响UI。
- 最终review须绑定base/head、reviewer独立上下文和真实diff，核对本包/覆盖矩阵/原失败证据；完整verify/native/exact SHA review/hosted/普通merge与post-main尚未通过，本任务不得提前DONE/PASS。
- 关联：[Intent](intent.md)、[Spec](spec.md)、[Plan](plan.md)、[Verification](verification.md)、[Coverage](coverage.md)。

- 用户追加空card仅upload/内容card才toolbar及功能分类一致性验收后，旧79及checkpoint50 GREEN不再覆盖完整当前验收；root重新修复/回归前保持CHANGES REQUIRED（新增验收）与最终review NOT_VERIFIED。

- 新状态RED为媒体6/6、retry4/4；model5失败中只有草稿1/Escape2是有效产品RED。重试源已按共享owner修复全部caller、34unit与owned lint/format通过，新caller运行GREEN/整体验证待root统一执行。全typecheck首轮在另一owner hasContent在途错误处exit1，不提前记PASS。
