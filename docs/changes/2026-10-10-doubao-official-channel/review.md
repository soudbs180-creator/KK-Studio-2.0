# Review：豆包（火山方舟）官方通道 P1

- Task ID：TASK-AI-GATEWAY-001（P1 官方通道）
- 时间与时区：2026-10-10，UTC+8
- Reviewer/context：主代理复审，并结合独立增量审查反馈；审查对象为已提交 head `c58a2c8ce9bd886010194b18633cc0b65f23f79d`
- Base SHA / tree SHA：`8090475958f1a0bdd1b4b36ada7f2aba1e4e6264` / `e45484511f586e0e58eda78c6e2c55d313a0dbf9`
- Branch / worktree：`docs/TASK-DOCS-STRUCT-001` / `D:/kk-studio/KK-Studio-2.0`
- 关联文档：本目录 `intent.md`、`spec.md`、`plan.md`、`verification.md`

## 评审范围

- `src/domain/modelProvider.ts`：新增官方方舟预置，保留 OpenAI 兼容默认值。
- `src/features/creation/model.ts`：区分 doubao 文本模型和 `doubao-seedream-*` 图片模型。
- `src/components/settings/ProviderProfileFields.tsx` 与 `ModelProviderSettings.tsx`：预置选择、名称与 base URL 原子更新，避免连续更新覆盖名称。
- `src/components/settings/useProviderCredentialState.ts`：凭据状态读取与请求清理独立封装，不增加新的存储路径。
- 相关单测、前端冒烟和治理/功能登记。

## Findings

| ID | 级别 | 结论 | 处理 |
| --- | --- | --- | --- |
| F1 | P2 | 未知厂商模型的既有 image 默认放行语义没有被本次修改扩大。 | 记录，保持现有兼容行为。 |
| F2 | P2 | 预置选择器是一次性填充工具，选择后复位；重复选择会覆盖手动值。 | 通过「预置提供商」标签表达用途，保留当前交互。 |
| F3 | P2 | 画布参考图初版将可见世界左边界截断为 0。 | 已在 `53981de3` 改为保留负世界坐标，并增加负坐标测试；定向单测 21/21 通过。 |
| F4 | P2 | 当前参考图布局只约束水平可见区，垂直多行布局沿用既有卡片排布。 | 记录为后续画布布局任务，不阻塞本包的水平边界修复。 |

无代码级 blocker。真实方舟凭证、DPAPI、Desktop 运行态和远端规则仍属于外部/后续验收条件。

## 门禁结果

| 门禁 | 结果 | 证据 |
| --- | --- | --- |
| 定向单测 | PASS 21/21 | `verification.md` |
| 全量 unit/deploy | PASS 897/889/0/8 | `verification.md` |
| TypeScript、ESLint、格式、UI 标准、构建 | PASS | `verification.md` |
| 浏览器连接与设置页冒烟 | PASS 7/7、16/16 | `verification.md` |
| 真实方舟 API | NOT VERIFIED | 需要用户 Key |
| 远端 CI、ruleset、PR 合并 | NOT VERIFIED | 网络/远端条件不可回读 |

## 结论

PASS WITH FOLLOW-UPS：代码和本地验证满足 P1 范围，可以作为本地候选提交；真实方舟联调、DPAPI、Desktop 运行态和远端合并不能由本次本地验证替代。TASK-AI-GATEWAY-001 继续保持未完成，后续按 `task-ledger.json` 的 `nextAction` 执行。