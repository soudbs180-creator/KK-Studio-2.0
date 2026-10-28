# 仓库目录与文件生命周期

- docId: REPO_LAYOUT
- status: current
- updatedAt: 2026-10-28
- source: 用户四文档补篇B1–B8；TASK-ORG-1
- supersededBy: null

本文件承接仓库整理规则。架构依赖/命名唯一入口为[MODULARITY](MODULARITY.md)，工作树与数据安全遵循[AGENTS](../../AGENTS.md)，证据迁移与实现进度见[四文档总清单](../changes/2026-10-28-modularity-p0/four-document-coverage.md)。ORG-2门禁已在任务树候选接入，尚未主线合流；规则存在不代表存量已清理。

## 仓库与容器分工

正式仓库在容器的KK-Studio-2.0目录；任务树按[工作树生命周期](../engineering/WORKTREE-LIFECYCLE.md)复用。产品不得依赖本机容器绝对路径。

| 内容 | 位置 | 边界 |
| --- | --- | --- |
| 入口与工程配置 | 仓库根 | README/AGENTS/AI_RULES/DESIGN及兼容入口、CHANGELOG/CONTRIBUTING/RELEASE、VERSION、index.html、锁文件和已有工程配置；新增根文件须在docs/README登记用途 |
| 跨端类型/schema/Port | packages/creation-contracts | 平台无关并可版本化；不放UI、网络或存储实现 |
| 业务与宿主代码 | src/domain、features、integrations、components、runtime、styles | 各层职责及命名按MODULARITY；切片公开入口index.ts；不放旧副本或备份 |
| 原生与独立Mobile | src-tauri、mobile | 保留各自工程边界；Mobile只经共享契约，不导入宿主src |
| 外部改造源码 | vendor | 上游固定SHA、许可、补丁清单与同步步骤必须可追溯，详见下节 |
| 运行静态素材 | public/design/figma、public/fixtures/demo | Figma导出/演示夹具，不能装运行截图或日志 |
| 编辑设计资产 | design | 插件源与预览工程，设计真值仍为当前Figma |
| 工程脚本/配置 | scripts/已有域目录、config | 新脚本进入子目录，治理脚本scripts/governance；不批量移动已有根check脚本 |
| 测试/夹具 | tests/对应层、tests/fixtures | 单测平铺tests/unit；大于100KiB夹具登记用途；运行产物不入库 |
| 部署与工具配置 | deploy、.github、.githooks、.cursor等现有工具目录 | 不混入产品业务和凭据 |
| 外部参考工程/二进制 | 容器references、references/assets | 不复制进主工程或output冒充运行证据 |
| 外部文档/调研 | 容器docs/05-references | 按competitive/research/api-specs/audits-archive/historical-plans分类，不建立第二套现行规则 |
| 日志/验证产物 | 容器output/主题-日期 | 日志归output/logs/主题-日期，辅助脚本output/scripts；output根不平铺裸文件 |
| 调试中间文件 | 容器或任务树.tmp | 已忽略；清理前仍核对归属，不批量清空他人的目录 |
| 构建/分享缓存 | dist、releases、node_modules、test-results、原生target | 生成物不入Git；分享包按已有白名单，不携带开发依赖/恢复数据 |

receipt.json、start-kk-studio.bat、verify-kk-studio.cmd有真实引用，保留。TEST_READY.md、TEST_INFRA.md只是ORG-3候选，零字面引用或文件名不构成删除依据。docs/reference与docs/superpowers须逐份内容比对和修复引用后再决定，不整体盲迁。

## vendor与文件命名

每个受维护vendor子目录应有UPSTREAM.md，列上游地址、固定提交SHA、许可证、KK补丁与同步/验证步骤。找不到的上游身份写UNKNOWN并追踪，不能猜SHA。保留LICENSE、作者声明和源码注释，不静默覆盖上游。vendor独立依赖/生成物不混入根检查或分享产物；同步经新任务对照补丁和回归。替代退役遵守[弃用清单](DEPRECATIONS.md)。本卡不声称各vendor已补齐该文件。

目录/模块名沿用MODULARITY词表。新证据文件名使用ASCII且无空格；旧名称不为整齐批量改动。根文件/落位门禁见下节ORG-2，同名业务模块沿用R8；不能把.gitignore当作已跟踪文件的删除或门禁。

## 文档唯一入口与生命周期

docs/README是唯一索引；architecture放架构/ADR，engineering放工程流程，governance放项目状态和任务，features放功能卡，changes/日期-任务放交付记录，templates放模板，archive/年月放退役历史。现有UI系列保持原位置，只按UI_INDEX路由，不新增并行UI规范。功能看板与任务视图由对应脚本生成，不手改。

| 类别 | 标记与处理 |
| --- | --- |
| 现行规范 | status=current、docId、updatedAt、source、supersededBy；只在一处定义规则，其他文档链接 |
| 已取代 | 原位标superseded并指向替代；新规范合入时同步旧入口和索引 |
| 历史归档 | status=archived；保留原始失败/截图/时间含义，不拿旧证据断言当前状态 |
| 遗留兼容代码 | @deprecated、替代入口、到期任务与移除条件，登记DEPRECATIONS；不能把旧整段实现注释掉永久留存 |
| 参考资料 | 归容器参考区域；有当前引用时先解决引用，不直接移走 |
| 生成物 | 标注来源和生成命令；不手改生成结果或把它当独立真源 |
| 用户运行数据 | 按数据存储/记忆契约，永不入Git；不因文件整理改key或删除项目/原图/对话/凭据 |

历史变更纠错使用勘误和替代证据，不重写旧结论。退役顺序为新文档合流→旧文档superseded/索引指向新文档→至少一个发布周期后按任务归档→链接检查。缺少发布时间/替代验收时保留原件，不用日历日期强行删除。

## 迁移与证据保护

先登记候选，检索源码、脚本、CI、测试、包命令、功能registry、任务账本、现行文档与历史链接；相对链接和动态拼接引用另列。候选不是可删结论；用户数据/活动运行输入保留。修改一次一个类别，整理提交与功能提交分离。

E1摘要、结论JSON和关键小图留仓；E2原始日志/截图/录屏等可在已授权任务中外置到容器output，先复制并校验字节、大小、sha256，再维护manifest及原引用，验证恢复后才从任务树迁出。E3删除另作有依据的候选处理，本卡不执行。迁移后保留历史结论与可验证的查找路径，feature/delivery门禁不因外置而放宽。

tracked字节、docs字节、图/日志数量、根文件数、交付缺件和refs/R1–R8/B11指标均应记录前后。外置不会缩小Git历史；改写历史没有授权，禁止执行。REPO-LAYOUT建立、ignore加固、证据已复制、ORG-5试点验收和ORG-6实际减少体积是五种不同结果。

## ORG-2 自动检查与存量棘轮

治理入口调用scripts/governance/check-repo-layout.mjs，因此governance:check及lint/verify覆盖下表。config/repo-layout-rules.json保存根文件白名单；新增根文件须同时登记白名单与文档用途并接受提交审查。config/repo-layout-baseline.json保存Git来源及640条初始违规，不是允许新增同类问题的全局豁免。

| 规则 | 拦截条件 |
| --- | --- |
| ROOT | 根文件不在白名单；初始26个存量文件保留 |
| TYPE | log/gz/webm/tsbuildinfo/bak/orig/tmp进入跟踪集合 |
| IMAGE | docs下PNG/JPEG/WebP/GIF/SVG/AVIF/BMP/ICO超过200KiB；已有超限图片不得扩大字节数 |
| LOCATION | test.ts不在tests或独立mobile/tests；Markdown不在docs或根白名单；src下bak/old/orig备份 |
| NAME | 路径含非ASCII、空白或控制字符；不批量改名历史路径 |

vendor一级子目录UPSTREAM.md按本文件明确要求允许，其他vendor文档仍受落位规则；这一例外解决补篇B6.3与B11的直接冲突。索引/元数据分别沿用doc-index/snapshot，不再复制实现。

检查读取工作树内已跟踪和未忽略新文件，强行add的忽略文件仍会被拦截。基线按规则+路径做集合对比，禁止等数换项/扩大图片上限；首次接入从选定Git base树核实原有违规，不能顺手加入新豁免。无法读取配置或base即失败。修复存量后按输出提示移除对应基线项，已移除项不能再加入。

初始候选中IMAGE=271、TYPE=219、NAME=118、LOCATION=32、ROOT=0，共640条规则命中，可能同一文件多次命中；不是640个独立文件，也不是已修复数量。实施、故障注入和整合边界见[ORG-2验证](../changes/2026-10-28-repo-layout-guard/verification.md)。
