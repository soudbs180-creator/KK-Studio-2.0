# 已知问题索引

唯一状态归属是 [task-ledger.json](task-ledger.json)；[TASK_LEDGER.md](TASK_LEDGER.md) 为生成的人类可读视图。本文件只说明问题映射，不复制任务状态。

- T3a/T3b：原生素材最终验收、完整项目包与跨环境恢复。
- T4/T5：T4 统一入口已关闭；T5 已完成 durable intent、稳定幂等身份、unknown 受理保护、原生 TaskHost journal、Desktop IPC 接入和逐 slot 输出提交。仍缺隔离 Tauri/WebView 下的提交、取消、进程重启与恢复证据；TASK-PROV-001 已修复首页、对话、审批和重试的 Provider 提交门禁，并以浏览器回归覆盖实际 HTTP 阻断；真实付费 Provider/GPU/ComfyUI 仍由外部任务跟踪。
- T6/T9：ComfyUI产品链未接通；Web存在Desktop专属入口。
- UI-001–004：共享组件契约、窄屏composer裁切、动态文案、任务fixture首屏误读和全状态视觉验收。
- PERF-001：原件全部转data URL与逐项读取，缺缩略图/分页；大型库IO和内存尚未验收。
- T0：原checkout的pnpm-lock.yaml/pnpm-workspace.yaml与npm唯一锁冲突；文件仍保留在原始dirty现场，未进入隔离候选。正式整合不能隐藏该冲突。源码候选、远端旧产品和VPS版本必须区分。
- EXT-PROVIDER/EXT-COMFY/EXT-GIT/T10/T11：外部资源、真实验收与授权见账本对应条件。实现部分没有因为外部验收受阻而被错误整体标为BLOCKED。
- T12：Mobile在当前MUR之后实施，仍属于长期目标；目标运行形态未知不等于已完成或过时。

发现新缺陷先确认真实调用链、保留复现证据并录入账本。DONE只能覆盖已验证的验收范围，旧测试全绿不能取消这些问题。
