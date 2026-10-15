# 用户契约

Task: TASK-CCSWITCH-LEARN-20261014

- 选择 B 供编辑而未保存时，持久配置仍为 A；列表标为“正在编辑”，提示保存后生效。
- 模型目录成功只显示“模型列表已获取”及模型数量，不修改生成验证状态。
- metadata 后、vault 后和原生提交后/cache 发布前中断，必须保留完整主配置、既有备份及相应旧/新凭据，不生成成功回执、不通过重复恢复重写密钥。
- 同 revision 的竞争保存只允许一个胜者；失败者不触碰 vault，最终配置与胜者凭据一致。
- 原生提交后/cache 前中断，重启须恢复已有选中账号的 provider/baseUrl/model/connectionId。缺失或损坏的 profile、已移除账号、重复 ID、歧义及缺少必要字段不得自动选择其它账号；publishCache:false 不改两份缓存。恢复不写原生配置或凭据，也不覆盖已打开的未保存 React 草稿。
- 秘密不进入 metadata、备份、页面缓存或证据；真实 vault 验证只使用本任务唯一合成引用。
- 当前事务不能保证 metadata 与系统 vault 跨存储崩溃原子性。中途提交须保持可重读，不假称全部回滚；物理断电与真实收费 Provider 不在本次证明范围。

现有架构边界依据：[ADR-016](../../architecture/adr/ADR-016-agent-and-provider-recovery.md)。
