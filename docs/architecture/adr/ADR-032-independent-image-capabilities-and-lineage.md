# ADR-032 独立图片能力与资产溯源

2026-10-29；ACCEPTED（源码候选，运行验收按各任务卡）。契约包1.5.0；Desktop/Web源码2.1.51，Mobile2.1.43。

## 决策

`image.outpaint`、`image.upscale`、`image.layer-split` 各有独立Manifest、1.0.0执行器和功能卡。使用原CapabilityRegistry与TaskPort，精确版本派发；`imageCapabilities` 可分别关闭，注册表可单独卸载新版本回退旧版本，不替换其他能力。不是第二个队列或素材仓库。P2 inpaint与P5插件门保持原配置。

第一适配器复用已有ComfyUI HTTP边界，原件只从归档assetId读取并上传，明确绑定LoadImage.image、参数和最终输出节点；工作流由调用方提供API格式，不按提示词猜图、不新增自研扩图/修复/分层算法。扩图四边0至4096且至少一边非零；修复倍率2/4；分层2至16个命名结果。最多256节点、256Ki字符、16输出、原图32MiB；不允许凭据字段进入任务工作流。协议/认证/连接身份、健康、容量与请求参数在提交和执行时检查；上传后重新校验连接才发送prompt。

业务入口仍是现有任务提交程序接口，未增加用户可见按钮。仅loopback、免密ComfyUI适配器可执行；声明中的provider-api位置未实现并在提交前拒绝。Desktop原生TaskHost尚未支持，明确拒绝；Web测试属于共享链技术预检，不视为已先交付Web或替代Desktop验收。Mobile不启动实现。

## 溯源兼容与去重

沿用既有lowerCamelCase `promptHash`、`parentId`、`origins`；不新增同义大写字段、不改assetId/字节SHA、存储身份与项目版本。PromptHash对实际提交Prompt的原始UTF-8计算SHA256，不trim或改Unicode。能力衍生parentId固定为声明中的原assetId，结果节点顺序固定，预览不能冒充最终输出。

Web IndexedDB与伴随服务共用纯契约mergeAssetOrigins，Rust同规则回归：将既有canonical、既有origins、导入origins和新canonical合并；identity含job/hash/parent及Provider、model、request、connection和来源信号，重试时间戳不重复。最多保留最近200条。沿既有AI来源晋升规则保护canonical；读取旧数据不回写，旧字段仍可选。项目未知字段沿原passthrough保留，资产元数据仍服从原有严格schema；没有放宽任意字段或执行数据迁移。

## 失败、取消与回退

上传/校验未成功不调用prompt；发送后响应丢失、超时、归档不明沿原unknown语义，禁止自动换Provider或重新提交。新增能力有180秒执行边界，保留已经归档的结果；恢复只选择原任务未归档槽位，不把其他节点结果塞入空槽。取消用官方按job ID接口；旧服务器404/405仅删除对应排队项，不冒险调用全局interrupt，运行中任务需在ComfyUI确认。取消本机等待不保证旧引擎已停算。

独立关闭只拒绝新能力任务，不删除已归档资产/项目。回退需保留1.5任务读取能力；旧宿主不应执行其未知能力任务。完整程序回退前备份用户项目并沿既有版本保护，不降级覆盖新快照。

## 备选与依据

拒绝新增图像算法、硬编码Provider API、独立队列与独立溯源数据库。已有ComfyUI适配器和统一资产仓库已覆盖这些边界，本次仅适配。官方协议依据：[ComfyUI API](https://github.com/Comfy-Org/ComfyUI/blob/master/openapi.yaml)、[扩图节点](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/ImagePadForOutpaint/en.md)、[服务端按ID取消](https://github.com/Comfy-Org/ComfyUI/blob/master/server.py)（2026-10-29核对）。测试使用FixtureTransform和HTTP回执，不能证明真实算法质量或GPU可运行。

## 验收边界

分卡：[共享接线](../../changes/2026-10-29-p6-image-host/verification.md)、[扩图](../../changes/2026-10-29-p6-outpaint/verification.md)、[修复](../../changes/2026-10-29-p6-upscale/verification.md)、[分层](../../changes/2026-10-29-p6-layer-split/verification.md)、[溯源](../../changes/2026-10-29-p7-asset-lineage/verification.md)。真实GPU/Provider、Desktop GUI、独审与main合流未完成，各卡保持PARTIAL。四原文其余任务继续开放。
