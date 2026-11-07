# TASK-SEC-ZOD-20261028 规格

[官方公告](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)已核实：影响版本<4.6.6，首个修复4.6.6；指定4.6.7属于修复范围，npm元数据与MIT许可已核实。

升级根直接生产依赖及对应lock为4.6.7。共享Desktop/Web运行时受影响，按版本源脚本递增补丁号；Mobile及vendor Agent自己的Zod3不能未经兼容验证顺手大版本升级。分别盘点实际锁定副本，不声称其他包自动消除公告。

实际审计确认Agent独立Zod3同样命中本公告，因此同卡处理该运行时副本。先验证SDK peer兼容范围与所有zod调用，再升级并修复两处编译API差异；Agent206项测试和metadata/patch行为回归通过才接受。具体决定见[ADR-034](../../architecture/adr/ADR-034-zod-security-runtime-upgrade.md)。

用小型受控超长数组夹具验证：超出max限制时不能读取/校验元素；同时确认界内正确值接受、错误值拒绝。该用例旧4.5.4必须失败、新4.6.7通过，不做耗尽宿主内存的压力攻击。

typecheck/lint/npm test/build及版本一致性通过；完整verify已有18项历史格式失败由独立TASK-MOD-GATE-FORMAT承接。当前main与origin/main分叉113/7，合入按实际PR/当前门禁推进，不强推或覆盖dirty主仓。回退：revert本卡提交及lock/版本镜像，保留原失败证据。
