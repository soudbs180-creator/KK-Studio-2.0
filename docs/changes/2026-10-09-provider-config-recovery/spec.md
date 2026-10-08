# Spec：保留用户配置并安全处理当前选择

- 合法含注释、带引号/空白的表头按TOML语义识别，同一kk_*表只出现一次；非受管内容与换行保留，重复应用幂等。字符串内的#、表头样文本和多行值不应被误认为注释或section。
- 没有显式active时保留用户默认选择；若请求删除仍被根model_provider引用的受管provider，明确拒绝并要求显式选择有效连接，不能猜测切换或生成悬空配置。显式active必须在patch内。
- 无效输入、合并冲突或未通过验证时，config/catalog原件及目录不写入；catalog在合并与凭据检查成功后才落盘。正常旧连接、模型窗口/catalog、CLI apply/check与安全边界保持。
- 使用锁定的TOML解析器校验输入/结果并读取配置语义，原文仍按行局部合并；不把全文重新序列化。新增依赖不升级其他包，按现有Agent白名单打包。
- 局部RED→GREEN、独立参考TOML解析、CLI真实隔离文件、全量verify、Agent build/package与delivery、独立精确head review、实际托管门禁与main回归分别验证。
