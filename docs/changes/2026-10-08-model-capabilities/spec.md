# Spec：账号级图片模型能力

- Task ID：TASK-MODEL-001；状态：READY；日期：2026-10-08。
- 基线：origin/main@21d121d；[Intent](intent.md)、[Plan](plan.md)、[ADR-009](../../architecture/adr/ADR-009-image-model-capabilities.md)。
- UI 规则唯一入口：[UI_INDEX](../../UI_INDEX.md)；设置页沿用现有 detail 表单及语义 tokens，图片菜单沿用共享控件。

## 目录契约

`CatalogModel.image` 可选，白名单为 `generate/edit/inpaint/outpaint?: boolean`、`maxReferences?: integer 0..64`、`maxGenerationCount?: integer 1..64`。缺失/无效值保持未知，false 和零不能被默认值替代。

模型列表的可选扩展从 `data[].capabilities.image` 解析；标准 `/models` 缺失此字段正常。用途、尺寸和 exact route ID 保持原协议。读、写、服务报告均使用同一白名单，不保存额外属性或密钥。保留 `source=reported/manual`；刷新同一身份目录保留手动声明。

唯一匹配键为 connection id + baseUrl + credentialRef + 完整模型 id；别名、型号后缀不能授权能力。同 ID、不同账号禁止互借；无明确账号时只可匹配唯一候选；Codex 不消费 API 声明。

## 解析与执行

`resolveImageModelCapabilities` 返回每种操作 `unknown/supported/unsupported`、参考图有效上限和可选任务生成数量上限。连接不允许的操作始终 unsupported；模型不能扩大连接权限。模型未声明的 generate/edit 允许原兼容流程，inpaint/outpaint 不因连接的宽泛默认列表推断为 supported。

参考图上限取连接/模型声明中较小值；编辑明确不支持时为零。已归档源图算一张参考图，画布新增参考图可用上限扣除源图。一次任务输出上限只用模型 `maxGenerationCount`，连接 `maxOutputs` 保持现有每次 HTTP 语义，大批量旧任务和既有分块行为不改变。

`assertSubmissionConnection` 是初始检查、租约复查与原生提交前共同入口：参考图时检查 edit，无参考图检查 generate，并校验 outputCount。`prepareImageTask` 的显式账号、自动选择、绑定账号均带数量；App 在 Web 租约和 Desktop native 调用前复查。明确限制不会绕过到新账号。

UI 用三态下拉框和可留空的数字输入填写声明，原表单的保存/刷新/失败反馈保持；切模型和账号重置编辑草稿。设置显示声明来源，未实现的蒙版/扩图用说明表示状态，不新增可执行按钮。参数菜单显示实际有效能力/限制；超限的旧参数保留并要求用户重新选择，不静默更改已保存任务。

## 生命周期与平台

新增字段是 additive，旧目录和旧项目无需迁移；目录写失败显示错误，不报成功；取消编辑和离线均无需外部请求。普通生成的取消、受理 unknown、幂等、结果归档沿用现有队列，不修改存储快照和 Rust IPC schema。

Desktop 与 Web 共用目录/前端校验，分别用新 production bundle 和 fresh Tauri 取证。Web 刷新后内存凭据需重新输入是原有行为；验证不会把目录持久化等同凭据保存。Mobile 仅窄屏 Web 验证，无原生能力声明。

## 验收映射

| AC | 证据 |
| --- | --- |
| AC-1/2 | 解析、恢复、精确账号匹配、手动刷新保留、无秘密写入单测；浏览器刷新/切换 |
| AC-3 | 同一门禁的旧兼容/false/zero/限额、租约迟到修改；真实组件请求拦截计数为零 |
| AC-4 | 设置与节点参数、生成数量、参考图限制；Web 390/1099/1920 和 Tauri 生产运行证据 |
| AC-5 | npm run verify、client:check；独立 review 绑定 base/head；原 checkout clean |

## 非范围

实际 mask/outpaint 请求、画笔、图层、视频/音频/3D、provider 私有协议、远端发布、迁移凭据及付费实测不在本阶段。目录声明不是 provider 真实服务认证。
