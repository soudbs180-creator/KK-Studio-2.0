# ADR-009：账号级图片模型能力声明

- 日期：2026-10-08；状态：Accepted for TASK-MODEL-001（授权范围内的 AI 技术决策）。
- [Spec](../../changes/2026-10-08-model-capabilities/spec.md) · [Verification](../../changes/2026-10-08-model-capabilities/verification.md)。

## 背景与选择

现有模型目录已匹配 connection id/baseUrl/credentialRef，并保存 exact ID、用途和尺寸。连接级能力适用于接入协议，不足以表示同账号中每个型号的差别。模型名推测或第二套全局目录均会混淆账号权限。

沿用同一个 `kk-studio:model-catalog:v1`，为 CatalogModel 加可选 `image` 白名单：generate/edit/inpaint/outpaint 布尔值、maxReferences（0..64）、maxGenerationCount（1..64）。服务报告扩展为 capabilities.image；人工声明沿用 source=manual，刷新保留。缺失/非法字段是未知，false/0 保留。写入也归一化，未知属性和秘密字段不持久化。

resolver 按精确账号和模型合并：provider 禁止优先，参考图上限取小值。未知旧 generate/edit 保留连接兼容；新增 inpaint/outpaint 不能从通用 BYOK 默认宣称已支持。本阶段这两项只存声明，不执行。

`maxGenerationCount` 限制一次新 KK 任务的输出数量；现有 ProviderConnection.maxOutputs 是一次 HTTP n 上限，维持既有请求分块契约。这两个概念分开命名，避免把旧大批量任务误判为非法。

MC-001 复核后明确参考图计数沿用真实附件的 assetId 去重契约，原图与 incoming 共用原件不重复占额度；UI 和提交消费同一纯函数。未归档、非图片与悬空引用不被去重隐藏，仍拒绝提交。

## 兼容、失败与回滚

字段 additive，无 key/schema 身份迁移，不改项目、素材、队列或 native IPC 格式。旧版本忽略新字段。换地址/凭据身份使旧声明失效；不同账号同名型号互不授权。写失败显示错误，不变为成功；已保存的超限参数保留并显式要求调整。回滚代码后原项目仍可打开，新目录属性可由旧 reader 忽略。

## 不选方案

不复制外部项目产品源码/目录，不以 family/alias/model 后缀扩权，不把声明直接标成真实服务 verified，不新增全局状态库，也不在本阶段开放缺少 mask 协议的按钮。
