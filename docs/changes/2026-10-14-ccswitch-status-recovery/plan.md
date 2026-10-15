# 最小实施计划

Task: TASK-CCSWITCH-LEARN-20261014

1. 在独立工作树保存当前源码候选基线，运行相关保存/恢复及构建基线。
2. 浏览器新增两条行为回归，确认旧文案 RED，再只修改现有状态文案；不新增状态源。
3. Rust 用现有 CredentialVault seam 与独立子进程覆盖两个提交阶段强终止；TS 验证缓存失败后重复恢复；Desktop driver 验证原生回执后/cache 前中断。
4. 运行相关单元、Rust、生产浏览器与独立原生凭据验收；检查格式、类型、治理和版本。
5. 独立上下文复核本任务 diff；只将本任务文件与必要记录在哈希核对后整合回原 checkout，保留其它 dirty 改动及 index。

真实 Desktop 强终止已复现原生新模型提交后，重启仍读取旧 profile 缓存。最小修复仅位于现有 loadProviderConnectionsDurable 的缓存发布分支：恢复已有唯一账号的 profile，不修改生产保存事务、原生记录或 vault。Desktop/Web patch 版本由现有版本脚本递增。
