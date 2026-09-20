# 数据分级

下表规定数据敏感级别和目标桌面目录，不表示所有目录中的功能都已接线。当前实际存储位置与实现范围以 [DATA-STORAGE 的实际形状](DATA-STORAGE.md#当前代码中的实际形状) 为准：创作快照目前集中在 `projects/creation-v2.json`，前端偏好/Provider 元数据仍按浏览器存储契约保存，记忆功能未上线。

| 数据                                   | 位置                                  | 敏感级别 | 规则                                                             |
| -------------------------------------- | ------------------------------------- | -------- | ---------------------------------------------------------------- |
| 主题、语言、布局                       | `localStorage` 或 `app/settings.json` | L1       | 可备份，可删除，不含身份和密钥                                   |
| provider 名称、Base URL、默认模型      | `providers/config.json`               | L1       | 只存元数据；API key 只存系统凭据库                               |
| API key、OAuth refresh token、代理凭据 | Windows Credential Manager            | L3       | 不进仓库、localStorage、项目、URL、日志                          |
| 项目图、节点、连接、版本               | `projects/`                           | L2       | schema + checksum + 原子写入；支持导出和恢复                     |
| 用户/品牌记忆                          | `memory/`                             | L2       | 显式开启、可查看、导出和删除；项目只引用版本                     |
| 会话消息                               | `conversations/`                      | L2       | 按项目隔离；日志不得复制完整提示词                               |
| 资产 Blob                              | `assets/`                             | L2       | 内容寻址；元数据与 Blob 分开                                     |
| 原生任务 journal                       | `tasks/native-host/`                  | L2       | 保存幂等身份、状态与输出引用；不含 API key；未知受理不得自动重发 |
| 模型权重                               | 外部 ComfyUI 根目录                   | L2       | 客户端只保存路径和扫描摘要，不复制进 Git                         |
| 缩略图、模型列表、临时响应             | `cache/`                              | L1       | 可随时清空，不作为事实来源                                       |
| 诊断日志                               | `logs/`                               | L1       | 脱敏、限期保留，不写请求头和密钥                                 |

Web 的项目、任务、消息和素材以 IndexedDB 为本地耐久源；localStorage 保存设置、供应商元数据、连接登记、素材集合元数据和有界创作恢复副本，sessionStorage 保存每标签页未提交草稿。偏好/元数据 key 见 `src/runtime/storage-contract.ts`，创作快照与恢复 key 见 `src/features/creation/model.ts`、`storage.ts`；完整契约见 `DATA-STORAGE.md`。Desktop 创作快照、素材原件和任务 journal 使用原生仓库。上述本地持久化不代表云保存；账号、积分和记忆页面尚未接入真实服务，必须显示 Prototype 或禁用原因。
