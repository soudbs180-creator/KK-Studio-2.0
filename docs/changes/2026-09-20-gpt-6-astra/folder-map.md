# KK Studio 2.0 目录映射（阶段规划）

| 本地 KK Studio 2.0 来源         | 远端候选目录                     | 当前阶段 | 规则                                                  |
| ------------------------------- | -------------------------------- | -------- | ----------------------------------------------------- |
| `src/`                          | `apps/kk-studio-2.0/web/`        | 阶段 1   | 只迁移经过依赖审查的 Web 源码，不覆盖既有 `apps/web/` |
| `public/`                       | `apps/kk-studio-2.0/web/public/` | 阶段 1   | 只迁移被源码引用的静态资源                            |
| `src-tauri/`                    | `apps/kk-studio-2.0/desktop/`    | 阶段 1   | 只迁移 Tauri 命令、schema 和配置，排除 `target/`      |
| `src/domain/` 中平台无关契约    | `packages/kk-studio-2.0-shared/` | 阶段 2   | 先和 v1.6.1 `packages/shared` 做命名/依赖冲突审查     |
| `tests/unit/`、`tests/browser/` | `tests/kk-studio-2.0/`           | 阶段 2   | 按模块迁移，不复制整套报告与截图                      |
| `docs/` 中本次迁移记录          | `docs/migrations/kk-studio-2.0/` | 阶段 0   | 只同步计划、规则审计、验证和映射                      |

阶段 0 不创建应用目录，避免在远端形成空壳运行时；阶段 1/2 需独立 PR、manifest、CI 和回滚方案。`config/`、锁文件、部署文件和 CI workflow 暂不映射，待目标 monorepo 负责人确认所有权后单独处理。
