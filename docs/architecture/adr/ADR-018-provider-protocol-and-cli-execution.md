# ADR-018：显式Provider协议与CLI执行边界

- 状态：ACCEPTED（授权技术决定；实际实现和验证另读任务）。
- 日期/Task/Owner：2026-10-14 / TASK-PROTOCOL-CLI-20261014 / root。
- 来源：[intent](../../changes/2026-10-14-protocol-cli-completion/intent.md)、[spec](../../changes/2026-10-14-protocol-cli-completion/spec.md)、[plan](../../changes/2026-10-14-protocol-cli-completion/plan.md)。补充ADR-017未接协议的阶段边界。

不按品牌猜请求，也不新建多协议队列/统一代理；复用现有TaskHost与租约/CAS，profile/connection及冻结任务显式记录协议和认证。legacy省略保持Chat/APIKey。Ollama选择现有兼容SSE而非新增NDJSON引擎；Azure只支持v1部署请求，不伪装部署目录。

免密只允许本机Chat/Ollama并经TS/Native双边校验；模型发现不生成或收费，不把成功获取目录说成实际生成可用。错误、取消和未知受理语义不随协议改变。

CLI安装检测与模型测试分开，安装/登录仅用户主动动作；命令实际执行采用明确目标与受限参数，不允许任意shell。系统凭据/消费网站登录不得混用。生产Agent使用独立完整锁定npm依赖目录，当前平台Codex必须存在并通过实际无付费入口检查；保持原安装/junction不变，不以编造metadata挽救残包。
