# ADR-027：dependency-cruiser与集合棘轮

- 状态：ACCEPTED（技术决定；完整交付状态另见verification）
- 日期 / Task ID / Owner：2026-10-28 / TASK-MOD-P0 / root
- Spec / Plan：[规格](../../changes/2026-10-28-modularity-p0/spec.md)、[计划](../../changes/2026-10-28-modularity-p0/plan.md)
- 上游：[官方仓库](https://github.com/sverweij/dependency-cruiser)、[18.7.0 API](https://github.com/sverweij/dependency-cruiser/blob/v18.7.0/doc/api.md)

## 方案比较与决定

扩展手写TS导入解析器会重复成熟工具；替换现有import-boundaries会丢失现行server-only/domain保护。选择保留旧检查，以dependency-cruiser 18.7.0提供解析/解析依赖/forbidden规则，轻量层只处理集合棘轮、feature聚合环和新增同名模块。

npm元数据与安装包确认：MIT，支持Node22/24/26+；仅新增开发依赖，不进入产品bundle或Agent生产白名单。锁文件随工具加入39个依赖，并将共享开发解析依赖acorn从8.18.0升至工具要求的8.19.0；不是框架或生产依赖升级。保留许可声明，回退恢复package-lock及新增devDependency。

## 检查语义与兼容

规则和基线唯一入口见[MODULARITY](../MODULARITY.md)。R1覆盖所有外部调用者；依赖按文件边去重，不含行号。R4保存参与有向环的有向feature边，不能只检查六对互引或SCC成员数。候选基线相对Git base基线只能降低；初次生成须保证产品源文件与base一致。异常配置/内部解析失败报红。

启用tsPreCompilationDeps并加载真实tsconfig，覆盖类型导入和别名；按TypeScript的扩展名替换支持已有`.ts`引用实际`.tsx`的写法，解析失败不通过删除依赖来隐藏。规则只作用实际插件实现，不禁止宿主加载器的合法业务依赖；重复文件名规则豁免规范要求的index和声明。

旧违规不强迫P0立即搬迁，但不能新增或扩大白名单。减少条目提示维护者下调；未下调的已解决条目仍会被视为存量，故后续修复必须同步基线。检查器本身的规则变更需审查，不能声称其防止有权限的人故意改写门禁。

独审勘误：删除全局dist排除，避免产品目录名称绕过检查；R6对契约包禁止全部宿主src导入（含styles、App、domain），对domain仅允许src内本领域引用并保留两项原runtime存量。这两项均以独立RED→GREEN回归验证，不扩容基线。

## 验证、恢复与限制

tests/unit/architectureRules.test.ts覆盖合法导入、所有静态导入形式、上层/插件/框架依赖、长环/原SCC新增边、同量替换、基线扩容/损坏、bootstrap产品修改及CLI退出码。产品源不能用test-like文件名逃避扫描，新增路径识别包含重命名。新检查直接接入check-governance，因为lint不经npm governance:check。

本地P0基于c2，远端113/7分叉未整合，不能把本地检查等同Hosted保护。初次基线需独立审核；之后CI显式选PR base。回滚为revert本卡并恢复工具锁文件，原import-boundaries仍保留。真实模型eval无凭据/费用调用，本卡只做确定性场景与独立上下文复核。
