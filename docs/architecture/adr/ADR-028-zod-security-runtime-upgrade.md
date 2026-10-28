# ADR-028：升级Zod运行时副本以修复资源耗尽

- 状态：ACCEPTED（技术补丁，合流/发布另验）
- 日期 / Task ID：2026-10-28 / TASK-SEC-ZOD-20261028
- 授权：用户五步清单第1项；本卡独立于P0与格式修复。ADR-026/027已由未整合P0候选占用，本卡沿用下一编号。
- 来源：[GitHub官方公告](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)，修复版本>=4.6.6，采用用户指定4.6.7。

根Zod4.5.4升级后根生产审计归零，但随包Agent的独立Zod3仍被npm audit标为同一公告。仅修根包不能视为修复客户端运行时，故同一安全任务升级两个实际副本。

不引入自制解析器、不用输入shim代替上游补丁。Agent升级涉及Zod主版本，先复现编译不兼容，再作两处最小适配：record显式字符串key schema、AnyZodObject类型替换为ZodObject；不改变工具参数、任意metadata/patch内容或错误拒绝边界。SDK的现有peer范围兼容3/4；Agent编译、206项Agent测试及根安全回归分别验证。

纯开发工具自带Zod3不混作根生产副本；不为消除所有审计项夹带工具链升级。其他Agent审计项单独登记。Desktop/Web源码补丁号2.1.45→2.1.46，Mobile2.1.43不变。版本号不是安装器或发布已更新证明。

回退：revert本卡的根/Agent包锁、两行源码兼容改动及平台版本镜像，保留原安全失败回归。上游MIT许可/声明不动，KK差异记于vendor README。当前仓库分叉与完整verify条件仍需后续独立任务解决。
