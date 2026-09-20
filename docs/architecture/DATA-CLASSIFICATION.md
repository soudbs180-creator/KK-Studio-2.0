# 数据分级

| 数据 | 位置 | 敏感级别 | 规则 |
| --- | --- | --- | --- |
| 主题、语言、布局 | `localStorage` 或 `app/settings.json` | L1 | 可备份，可删除，不含身份和密钥 |
| provider 名称、Base URL、默认模型 | `providers/config.json` | L1 | 只存元数据；API key 只存系统凭据库 |
| API key、OAuth refresh token、代理凭据 | Windows Credential Manager | L3 | 不进仓库、localStorage、项目、URL、日志 |
| 项目图、节点、连接、版本 | `projects/` | L2 | schema + checksum + 原子写入；支持导出和恢复 |
| 用户/品牌记忆 | `memory/` | L2 | 显式开启、可查看、导出和删除；项目只引用版本 |
| 会话消息 | `conversations/` | L2 | 按项目隔离；日志不得复制完整提示词 |
| 资产 Blob | `assets/` | L2 | 内容寻址；元数据与 Blob 分开 |
| 模型权重 | 外部 ComfyUI 根目录 | L2 | 客户端只保存路径和扫描摘要，不复制进 Git |
| 缩略图、模型列表、临时响应 | `cache/` | L1 | 可随时清空，不作为事实来源 |
| 诊断日志 | `logs/` | L1 | 脱敏、限期保留，不写请求头和密钥 |

浏览器当前只有两个非敏感 key，详见 `src/runtime/storage-contract.ts`。账号、积分和记忆页面尚未接入持久化服务，必须显示 Prototype 或禁用原因。
