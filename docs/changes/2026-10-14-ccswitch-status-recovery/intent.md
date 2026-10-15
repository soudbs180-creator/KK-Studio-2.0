# 状态文案与跨存储中断恢复验证

Task: TASK-CCSWITCH-LEARN-20261014

用户请求：落实到 KK Studio，先修正两处状态文案，再补跨存储中断恢复验证，保留现有架构，保证配置和凭据不丢。

范围：供应商草稿选中和模型目录检查文案；现有 metadata/vault/cache 提交与恢复接口的故障验证。保留连接 ID、credentialRef、service、存储 key、保存顺序与原件备份；仅操作独立测试目录和唯一合成凭据。

不新增供应商架构、云同步、协议转换或生产故障开关。本任务的准备、实现和隔离测试由该用户请求授权。

来源：当前 dirty checkout 的未验收隔离快照 0b19cb00。隔离阶段不改原 checkout；通过哈希检查后仅将本任务文件回写，原 index 与其它改动保留。已有工作树超默认预算，依据 WORKTREE-LIFECYCLE 的受控例外为本任务限定 64 个工作树/60 GiB，使用锁定依赖。快照不代表 origin/main 或发布验收。

关联：[规格](spec.md) · [计划](plan.md) · [验证](verification.md) · [评审](review.md)
