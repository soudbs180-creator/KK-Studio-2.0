# 已知问题索引

唯一状态归属是 [task-ledger.json](task-ledger.json)；[TASK_LEDGER.md](TASK_LEDGER.md) 为生成的人类可读视图。本文件只说明问题映射，不复制任务状态。

- T3a/T3b 的 Desktop 原生素材、完整项目包与隔离恢复验收已完成；Web 项目包文件适配仍归 T9，不重复把已验收的 Desktop 范围列为未完成问题。
- T4/T5：T4 统一入口已关闭；T5 已完成 durable intent、稳定幂等身份、unknown 受理保护、原生 TaskHost journal、Desktop IPC 接入和逐 slot 输出提交。仍缺隔离 Tauri/WebView 下的提交、取消、进程重启与恢复证据；另有 Desktop Provider gate blocker：原生提交未复用前端 reservation/assertCurrent，且 native failure 的结构化 health 字段未回写连接状态，详见 [Desktop Provider Gate Audit](../evidence/ai-sdlc-2026-09-20/desktop-provider-gap-audit.md)。TASK-PROV-001 已修复首页、对话、审批和重试的 Web Provider 提交门禁，并以浏览器回归覆盖实际 HTTP 阻断；真实付费 Provider/GPU/ComfyUI 仍由外部任务跟踪。
- T6/T9：ComfyUI产品链未接通；Web存在Desktop专属入口。
- UI-001/003/004：Design System 1.3 的剩余组件覆盖、演示/真实服务边界，以及缺失 Figma Frame 的全状态视觉验收继续按账本跟踪。UI-002 的窄屏 composer 和动态文案修复已在其验收范围内 DONE/PASS；不再列为开放缺陷。
- PERF-001：TASK-PERF-ASSETS-001 已完成有界元数据分页、按需预览及原件校验。永久缩略图、大快照、单件大图瞬时内存和不可抢占 IO 的完整性能验收仍未完成。
- PLUGIN-DESKTOP-001：严格 Tauri CSP 阻止当前 `blob:` 插件模块，Web 插件可用不能代替 Desktop 验收；同源加载和原生交互尚待修复与验证。
- REL-2.1.0 / EXT-GIT：2.1.0 源码经 [PR #9](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/9) 合入 `main`；PR 当前 head 的 hosted `verify`/`delivery` 已通过，合并后 `main` 的工作流仍须按实际完成结果回读。三套远端 ruleset 已 active，`main` 有效规则含 PR/必需检查/禁删除与非快进；正式 tag、安装包和发布验收仍未完成。
- EXT-PROVIDER/EXT-COMFY/T10/T11：外部资源、真实验收与授权见账本对应条件。实现部分没有因为外部验收受阻而被错误整体标为BLOCKED。
- T12：Mobile在当前MUR之后实施，仍属于长期目标；目标运行形态未知不等于已完成或过时。

发现新缺陷先确认真实调用链、保留复现证据并录入账本。DONE只能覆盖已验证的验收范围，旧测试全绿不能取消这些问题。
