# TASK-MOD-P0 规格与复核裁定

## 目标和范围

保留已有 `import-boundaries.mjs`，用 dependency-cruiser 获取 TypeScript 依赖图并执行架构规则。新门禁必须由 `scripts/check-governance.mjs` 调用，因为 lint 直接调用该脚本。P0 不改 `src/`、`packages/`、vendor 产品源文件和功能注册表结构。

## 复核裁定

- R1 覆盖所有切片外调用者（含 App/components/integrations），不只 feature→feature。基线使用唯一的规范化 `from => resolved-to`；420次引用对应405条唯一文件边，行号不进入身份。
- R3 当前是10条，不是外部文档中的8条；遗漏的是两个 models/modelCatalog 引用。基线以本卡实际解析结果为准。
- R4 的6对双向边不是完整循环检测。将 feature 图中所有参与有向环的边纳入基线，覆盖三节点长环及同一强连通分量中新边；外部复核得到一个8切片/16条内部边的分量，工具差异另行说明。
- R6 保留现有 domain→runtime 两处特许，记录存量，不改产品代码。
- R7 的插件指实际第三方插件源 `vendor/canvas-plugins/<plugin>/src`，不指宿主加载器或 SDK/host。
- R8 只约束新增业务源码的同名模块；豁免必须重复的 index 入口与环境声明，以及测试、变更文档。domain/schema 与 feature/逻辑配对须在文件头互指。
- 依赖集合相对候选基线只能减少；候选基线还须相对 Git base 的基线只能减少，防止同时加违规和白名单。初次建立基线时产品源文件必须与所选 base 一致。
- P3a 等待 P2（详细方案优先），P3f 等待 OPT-201；与 OPT-* 使用同一设计和依赖图。
- Vite 开发为1421，Playwright生产预览为1423；不更改现有端口契约。
- 小改文档豁免按 AI_RULES；本卡改变跨模块治理边界，使用完整交付包。
- 外部依赖版本、安全公告、协议版本为待复验数据，不据此夹带升级。dependency-cruiser 18.7.0 已从 npm 元数据核实为 MIT，支持当前 Node24；唯一生产锁文件保持不变更业务依赖意图。
- Ruling: 以本地c2为任务基线，远端分叉单独记录 — 用户指定文档审计的正是本地实现；成本是本卡暂不能直接提交为仅含P0的origin/main PR。

## 验收

1. 真实临时文件夹具证明合法导入通过，R1/R2/R3/R4/R5/R6/R7/R8的新增违规失败。
2. 覆盖type-only、import type query、re-export、动态字面量、require、别名与TS后缀；未知/损坏配置、未解析内部依赖不能假绿。
3. 新增长环、原SCC新增环边、同数量替换违规、基线扩容、基线损坏均报错；合法削减通过并提示更新。
4. `typecheck`、`lint`、`npm test`、Markdown/索引、治理、故障注入通过；合流前跑完整verify，保留所有失败证据。
5. 原主checkout dirty文件哈希不变，产品代码diff为空；独立审查与合流/发布状态分别报告。

回退：revert本卡提交，恢复lockfile和governance接入；产品数据无迁移。
