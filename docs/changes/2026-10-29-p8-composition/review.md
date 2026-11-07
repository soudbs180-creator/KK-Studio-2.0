# P8 评审

自检：原35函数、桥接12语句/两设置effect、主JSX/CSS入口/产物内容hash及4组同态。类型需要把activeProjectIdRef保持原string|null窄型，未改运行分支。原自动整理imports导致CSS换序已修正，失败构建/原始报告保留。

Independent review：NOT_VERIFIED。用户禁止子代理，不能将自检称为独立上下文审查。main整合仍须满足REVIEW.md/BRANCH-POLICY及当前门禁，不能因为要求收官而宣称这些条件已满足。真实GPU和最终Native仍未验收。

## 2026-10-29 用户授权与独审补充

用户已明确允许只读独立评审。独立上下文/root/p8_independent_review实际审查base c2a0228a57be66b982d889c6710faa32cde49b7c至head78beb7a9ba5ee95b5083537013bb8bb17af13432；最初CHANGES REQUIRED，三项发现经84/11/81定向复验逐步关闭，最终限定代码范围PASS。详见工程外independent-review-78beb7.md及会话原消息；不是作者GitHub approval。之后的交付修复必须以新SHA补审，旧PASS不能直接沿用。

集成仍CHANGES REQUIRED：默认治理/Hosted CI、浏览器全套、origin/main冲突及主仓审计改动保全未完成；真实GPU/最终Native未验收。PR81为draft，不允许提前合流或清理工作树。

2026-10-29补审：独立/root/p8_readonly_review正式确认78beb7→4c3d6691交付底座增量PASS；4c3d6691→cc8e5f7c聊天交付增量PASS，IR-CHAT-01/02关闭，77定向独立复验。原消息与工程外independent-review-cc8e5f7c.md保留；之后MODEL-DRAFT需新SHA补审。完整浏览器、默认治理、远端冲突和真实GPU继续开放。

455cbb6d（basecc8e5f7c）正式独审PASS：独立内存验证同通知/偏好保草稿，账号/模型/实际元数据变化同步，无新增P0/P1/P2。后续UI文件边界纯提取按新SHA补审，原PASS不自动沿用。目录安全/规格冲突及完整合流门仍开放。
