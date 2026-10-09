# Spec：保留全部门禁并区分失败类别

编译、成功checker、拒绝checker三段记录elapsedMs、pid/status/signal、error的name/message/code/errno/syscall和stdout/stderr；checker在隔离marker记录实际Node executable/version及fixture阶段。不能打印环境变量/凭据/真实配置，不删除旧exe编译、不放宽10秒cmd guard或出口断言，不凭null断言ETIMEDOUT。受控缺失可执行和超时故障应仍exit1并包含实际分类；正常/明确拒绝与no fallback检查必须全部保持。源码独立审查及当前Hosted门禁另验。
