# KK Studio 2.0 分阶段同步清单

目标远端：<https://github.com/soudbs180-creator/KK-Studio-2.0>
远端当前基线：`main@f00b5a43ff11e9e4025d9a29b3c78b9754775827`，默认分支 `main`。它是已有 KK Studio v1.6.1 monorepo，与本地 `main@80544af` 没有共同 Git 基线。Git fetch/push 在当前凭据下可用；匿名 GitHub REST 的 repository、branches、rulesets、pulls 返回 404，classic protection 返回 401，因此仓库可见性、写权限范围、required checks 与分支保护不能据此确认。

## 同步原则

本清单把“迁移计划同步”和“应用源码迁移”分开。第一阶段只上传可审阅的治理/计划文档；任何 `src/`、`src-tauri/`、`public/`、依赖目录、运行报告或用户数据都不随第一阶段上传。目标仓库的现有 `apps/web/`、`packages/*`、`services/*` 不被覆盖，不进行历史硬合并。

## 阶段 0：文档基线（本次候选）

远端只新增：

```text
docs/migrations/kk-studio-2.0/
├── README.md                         # 远端阅读入口与阶段门禁
├── folder-map.md                     # 目标目录与来源映射
└── gpt-6-astra/
    ├── intent.md
    ├── spec.md
    ├── plan.md
    ├── verification.md
    ├── branch-rules-audit.md
    └── pull-request.md
```

这 9 个文件不引入运行时代码、锁文件或凭据；PR 只允许上述目录。阶段 0 的目标是让远端审阅者先看到边界、规则和迁移顺序。

## 阶段 1：隔离应用骨架（后续单独 PR）

只有阶段 0 合并、目标目录与 CI 责任人确认后才准备：

```text
apps/kk-studio-2.0/
├── web/                               # 从本地 src/、public/ 筛选并适配的 Web 运行时
├── desktop/                           # 从本地 src-tauri/ 筛选的 Tauri 2 壳
└── README.md                          # 运行入口、边界、构建矩阵
```

阶段 1 不把本地根目录的 `package.json`、`node_modules`、`.tmp`、`test-results`、旧截图、构建产物或 `.env*` 复制进远端；先建立隔离 package/workspace 入口，再逐模块加入。

## 阶段 2：共享契约与测试（后续单独 PR）

```text
packages/kk-studio-2.0-shared/         # 仅抽取平台无关 DTO/schema
 tests/kk-studio-2.0/                   # 只迁移可归属的单元/契约测试
```

先验证与 v1.6.1 `packages/shared` 的命名、构建和依赖边界，再决定是否保留独立前缀或转入现有包。任何转入既有 `apps/web`、`packages/shared`、`services/api` 的操作都必须另开任务，不能在阶段 0/1 顺手混入。

## 永久排除

- API key、OAuth token、系统凭据、`.env`、用户项目/素材、localStorage/IndexedDB 导出。
- `node_modules/`、`target/`、`dist/`、`test-results/`、`.tmp/` 和浏览器 evidence。
- 无法证明属于 KK Studio 2.0 的旧 monorepo 文件、历史分支、全量截图和生成报告。
- 任何直接推送 `main`、`--force`、`--mirror` 或跨历史 `merge --allow-unrelated-histories`。

## 每阶段交付门禁

1. 从目标 `main` 建立命名分支，记录 base/head SHA。
2. 生成 manifest 并执行路径/secret/大文件扫描；人工检查白名单。
3. 运行目标仓库要求的 architecture、governance、typecheck、build 与相关测试。
4. PR base 固定为 `main`，只允许本阶段目录；不自动合并。
5. 回读远端 commit、PR、CI 和分支保护状态后，才更新 EXT-GIT；未回读不标记 DONE。
