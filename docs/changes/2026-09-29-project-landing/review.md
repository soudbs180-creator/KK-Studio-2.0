# 项目落地审查

## Self-review（2026-09-30）

- 范围：origin/main@1e95a13 到集成候选的完整 diff；分支承接、四页 UI 基线、实际加载链、项目/素材/任务/记忆与 Provider/CLI 的数据边界、测试维护、证据及未完成项。
- 原 checkout、其它 dirty worktree、存储 key/identifier、远端 main 保护保留；历史截图先保存再按 HEAD 恢复，本轮证据独立存放。
- 原生连续保存/CAS、async确认、未配置生成、项目 unknown 删除、隔离记忆与 composer 重叠已先失败后修复，并分别用 production preview/真实原生运行复验。
- 外部真实调用、持久分组、Installer、Mobile、VPS 和用户最终视觉验收保留其状态，见 [remaining](remaining.md)。没有删除有效断言或新增 skip。

## 独立上下文与精确 HEAD

此文件是提交时的审查入口，不代填尚未发生的独立审查结果。实现完成后按 docs/engineering/REVIEW.md 和 executing-plans/requesting-code-review 调用 fresh-context 只读 reviewer；输入完整 base/head、intent/spec/plan、Review Focus 和技术裁定。审查报告、复核发现、最终精确 HEAD 与 CI 结果追加在本集成 PR 的描述/记录及交付收据；该记录是最终是否可合并的依据。

本地验证详见 [verification](verification.md)。head 改变时必须补审并重新满足托管门禁，不能把旧 review 的 SHA 修改成新 SHA。

## 托管规则与用户授权

- 2026-09-30 实际回读 main 规则：必须 PR、严格 verify/delivery、评论解决；required approvals=0，无 bypass，禁止删除与非快进。独立 AI review 不能称作第二个人类审批，作者不会自行 approve。
- 用户已明确授权“全部检查一遍并且合并分支”，并继续任务；该授权覆盖通过有效门禁后的技术主线合并。最终美观偏好/正式外部发布未被虚构。
- 回滚：保留主线基线、候选 snapshot、原分支/PR和前一可用产物；需要回退时通过新的 revert PR，不强推 main，不恢复覆盖用户数据。
