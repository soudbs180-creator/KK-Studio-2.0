# 共享接线 验证

PARTIAL；TASK-MOD-P6-HOST，base `972adc011e040b6db76284de1daea42d8b2167cb`。head与源码/构建/报告hash见外部final-receipt.json。

共享层接线单独立卡，明确变更CreationTask可选字段、快照验证、原件解析、保存后执行、原连接租约与ComfyUI适配器；没有第二套队列或素材库。

本地源码候选；Desktop/Web2.1.51、契约1.5.0、Mobile2.1.43。沿原任务9态与单一资产仓库，未新增UI或图像算法。P2开关仍默认关闭，P5新包生产执行门仍关闭。

| 验证 | 本次证据与结果 |
| --- | --- |
| 根类型/契约类型 | types-release.log、contracts-release.log，exit 0 |
| 根全量测试 | tests-release.log：2372 pass、20 skip、0 fail |
| 独立关闭/实际升级回退 | imageCapabilities/imageCapabilitySubmission：逐项1.0→1.1执行→回退1.0、其他能力保留；权限/引用/禁用拒绝 |
| 真实HTTP边界fixture | imageCapabilityWorkflow：原字节上传、精确Prompt/参数、绑定原件必须可达最终输出、节点结果顺序/数量、失败状态、取消及旧服务安全降级 |
| Edge生产预检 | browser-release.log：17 pass、0 retry，固定1423、1 worker。其中8项能力测试（3成功+5故障），1项资产读取失败恢复，8项原项目生命周期 |
| 资产溯源 | 真实IndexedDB归档与重载、CompanionStore及Rust同字节不同parent/Provider/导入Origins；Prompt原UTF-8 SHA256、时间戳重试不重复、200条上限 |
| Rust资产存储 | rust-final.log：18 pass、0 fail；不是Desktop GUI证据 |
| Mobile | 373 pass、类型通过；没有启动Mobile新功能 |
| Agent/服务 | Agent204 pass/2 skip；真实伴随服务HTTP重启/备份恢复与生产Edge smoke通过 |
| 构建/UI/治理 | 构建通过；最终lint/格式/UI/代码健康、R1/R3/R4、CSS/体积与受保护文件hash，以容器output/p6-p7-2026-10-29/final-receipt.json为准 |

保存RED：lineage-red、rust-lineage-red、boundaries-red、submission-red、graph-origin-red、upgrade-red；初次根测试的1.4版本断言和纯ES2022 structuredClone失败保留后修正。新增代码引起的复杂度增长已通过职责抽取清零，不放宽门禁。首次卡片标题/账本显示状态及Python提取断言失败保留；后者只完成第一处提取后停止，恢复脚本逐处继续，最终类型/全测/健康重新通过。

**未完成**：真实GPU/节点/模型/Provider API、Desktop原生TaskHost与GUI、独立审查、完整verify与main整合。Web回执使用FixtureTransform和路由HTTP夹具，证明接线不证明图像算法质量；没有新增生产按钮。取消旧ComfyUI只能请求移除排队项，运行中任务需在引擎确认，不能保证旧引擎已停算。超时/取消/受理不明不自动重发或换Provider；已归档结果保留，手动重试缺失槽位会重跑显式图，不能当作引擎断点续算。

父候选原9项核心浏览器失败与严格PNG的1像素差异仍开放，本轮17项不覆盖它们、不能推断完整verify全绿。遵守用户不使用子代理，独审NOT_VERIFIED，作者自检不充当独审。主仓main及其21份Figma相关dirty文件保持原状；没有发布。四原文其他P/STD/ORG及OPT-101/102/003同源任务继续开放。
