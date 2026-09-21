# Review

- 审查者：独立子任务 `/root/visual_runtime_matrix`；属于 AI 独立审查，不是 GitHub 人工 approval。
- 范围：`frame-accuracy.spec.ts`、`creation-flow.spec.ts`、`asset-performance.spec.ts`、`helpers.ts` 与最终整合差异；初审基线为 5e44f6e，CI 失败复核绑定 42ec66a，当前整合候选为 bb96dad。
- 顺序创作等待：确认 App.tsx 在页面切换之后仍异步持久写入和执行任务；同项目存在 queued/running 时提交被拒绝。测试等待第一张结果实际完成符合该契约，消息数、保存状态、刷新后内容断言均保留。未发现阻断问题。
- 侧栏动画 P2：初版用 `document.getAnimations()` 会把仍有 fill 的会话动画重新置零。已收窄为 `.sidebar.getAnimations({subtree:true})`，只同步侧栏宽度、导航、品牌与内部位置轨道。仍要求真实 CSSTransition、非零时长、中间位置、起终点和原几何断言。修改后需再次定向验证并由审查者补审。
- 验收边界：五个固定时间点验证真实 CSS 轨迹，不宣称捕获连续动画的每一帧。
- CI 失败复核：两次 hosted Windows verify 均在 `asset-performance.spec.ts:15` 的 `seedArchive` 首次 `page.evaluate` 处超时，后续素材测试能继续通过；另一次 663px UI 用例只在 1 秒动画 settle 窗口 flaky。按 fixture 数量和字节大小推算，单事务同时保留 125 个 2.35MB Blob、125 个约 3.13MB legacy data URL，可能形成约 685MB 级别的准备压力；该数值是理论推算，不是实测 heap 峰值。
- 修复边界：将 fixture 按 8 项批次生成、哈希并提交 transaction，只在首项保留 legacy `preview`，返回 rows 只保留轻量 metadata，并为 transaction abort 加显式失败；保留 125 项原件、legacy 兼容、metadata-only 列表、0 次初始原件读取和详情 SHA 断言。动画 settle 窗口改为 5 秒，没有放宽业务断言。修复后定向 asset/design 10/10 通过；仍需 hosted CI 重新验证。
- 远端门禁事实：PR #8 的 delivery 已成功；verify job 没有启动，GitHub check annotation 是账号付款失败或支出额度不足。该平台阻断保持 BLOCKED，不能称为远端 verify 通过。
- 候选证据绑定：`bb96dadc08c12a2177481d2ae1e4dda605cc77d4` 在 2026-09-21 09:30（Asia/Shanghai）后的本地完整 verify 已由 `.tmp/verify-batched-final-2.log` 记录为 172 Node、197 browser、0 failure/flaky、UI121/0；此前 `42ec66a` 的 hosted timeout 仅是失败历史，不能冒充当前候选通过。
- 治理并发：TASK-GOV-002 有活跃用户任务维护 PR #4，不能因其工作树干净就推断无人写入；本任务不修改该 PR 分支。合入本轮候选前重新 fetch 当前 main。
- 根目录并发：另一活跃功能任务正编写 Skill/ComfyUI/MCP；其 root 未提交内容不纳入本轮提交、不移动或覆盖。
