# Verification：功能体系与图片参数后端化样板

- Task ID：FEATURE-SYSTEM、BACKEND-IMAGE-PARAMS
- 日期：2026-09-21
- 分支/工作区：`chore/TASK-CONSOLIDATE-200` / `D:/kk-studio/KK-Studio-2.0`
- 提交状态：**未 commit、未 push**（按用户要求，全部改动留在工作区）

## 验证环境

- Node v24.20.0（`D:\tools\node-v24.20.0-win-x64`）、cargo 1.97.1、Windows。
- 验证均在唯一工程 `D:/kk-studio/KK-Studio-2.0` 工作区执行。

## 命令与结果

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| 功能门禁 | `node scripts/check-features.mjs` | `Features: 28 features, 0 violations.`，exit 0 |
| 看板生成 | `node scripts/check-features.mjs --write` | 生成 `docs/features/README.md`，复检 exit 0 |
| 类型检查 | `npm run typecheck` | exit 0 |
| 前端单测 | `npm test`（node --test tests/unit/*.test.ts） | **212 通过 / 0 失败**（整合基线 201 + 图片参数 7 + 功能登记册 4） |
| 浏览器回归 | `npm run test:ui`（Playwright/Edge，含构建） | **200 通过 / 0 失败**（首轮 198/2，2 项窄屏 Skill 弹层回归修复后全绿，见下节） |
| 生产构建 | `npm run build`（tsc -b && vite build） | exit 0，`dist/assets/index-*.js 674.07 kB`（>500kB 为既有 chunk 提示，非新增错误） |
| Rust 编译 | `cargo check --manifest-path src-tauri/Cargo.toml` | exit 0；仅 5 条既有 dead-code 警告（asset_io，未改动文件） |
| Rust 单测 | `cargo test --manifest-path src-tauri/Cargo.toml --bin kk-studio` | **65 通过 / 0 失败**，含新增 `image_size_validation_matches_pixel_shape` |
| 新代码 lint | `eslint scripts/check-features.mjs scripts/features/registry.mjs src/domain/imageParameters.ts tests/unit/imageParameters.test.ts --max-warnings 0` | exit 0 |
| 格式 | `prettier --write` 作用于全部新增/改动文件 | 已按仓库风格格式化 |

## BACKEND-IMAGE-PARAMS 透传链路核对

- 唯一映射源 `src/domain/imageParameters.ts`：`自适应`→不传 size；1K/2K/4K→长边 1024/2048/4096；按比例定向，短边 8px 吸附并夹在 256–4096，输出 `WxH`；非法输入返回 undefined。
- Web：`App.tsx` 画布提交时由节点 `parameters.ratio/quality` 计算 `imageSize` → `CreateProjectInput.imageSize` → `appendImageTask` 写入任务（快照归一化校验 `^\d{2,5}x\d{2,5}$`）→ `generateImages` → `requestImageChunk`，JSON body 与 multipart 均在 size 存在时附带。
- Desktop：`NativeTaskHostRequest.size` → Tauri IPC → Rust `TaskHostRequest.size`（camelCase，`#[serde(default)]`）→ `perform` 中 JSON payload 与 multipart 同样条件附带；`validate_request` 增加尺寸形状校验（两段 256–4096 数字）。
- 单测 `tests/unit/imageParameters.test.ts` 覆盖自适应、方形、横竖屏、8px 吸附、非法比例、极值 clamp、空白容错。
- UI：`CreationParameters.tsx` 图片侧改为“会随本次生成发送”，视频侧明确“尚未接入、暂不发送”。

## FEATURE-SYSTEM 交付核对

- 28 张功能卡片 + `features.registry.json` + 生成看板 + `_feature-template.md` + `BACKEND-ROADMAP.md`。
- 门禁 `features:check` 已并入 `npm run lint` 与 `verify`：校验卡片固定章节、代码/测试路径存在、任务 ID 在账本、非 REAL 必须挂开放任务、磁盘卡片均已登记、看板与 registry 一致。
- 账本新增 8 个任务（FEATURE-SYSTEM、BACKEND-IMAGE-PARAMS、BACKEND-TEXT-NODE、BACKEND-MEDIA-001、BACKEND-MCP-AUTO、BACKEND-PLATFORM、BACKEND-ASTRA-001、UI-SKILL-POPOVER-001），共 46 个任务，`TASK_LEDGER.md` 由 `governance:write` 重生成。
- AGENTS.md、AI_RULES.md、SPEC_BASELINE.md 已加入功能体系入口、状态口径与新功能流程。

## 仍未验证（如实记录，不冒充完成）

- 未用真实供应商 Key 发起付费出图（EXT-PROVIDER 外部凭据/额度）；size 参数的供应商侧接受情况以真实返回为准，不支持时返回供应商真实错误。
- Desktop WebView2 下提交/取消/重启恢复的运行态证据仍属 T5 缺口；本轮 Rust 侧验证到 `cargo check/test` 与代码透传，未做 Tauri 实机 HTTP 录制。
- 参数弹层文案变化未补浏览器截图（纯文案，无结构/样式变化）；如需要可在 Wave 1 浏览器回归中一并补。

## 附带修复：内置 Skill 合入后的首页窄屏回归（UI-SKILL-POPOVER-001）

- 起因：全量 `test:ui` 首轮发现 2 个失败，定位为 HEAD `cf344dd` 合入内置 Skill（TASK-CAP-001）后遗留，与本轮功能体系/图片参数改动无关：
  1. `creation-flow.spec.ts` 仍断言 Skill 弹层局部空态“没有可用”，与已生效的新契约（首次打开即提供内置 Skill，`catalog-pages.spec.ts` 已覆盖）矛盾——按新契约更新断言为内置 Skill“镜头规划助手”可见、“浏览 Skill 目录”仍进入目录页。
  2. ≤620px 堆叠底栏中，弹层向上展开会覆盖创作提示词，外部点击无法关闭；直接改为向下展开又会遮挡同级触发按钮。修复：≤620px 媒体块中把四类弹层（Skill/插件/模型/模式）的定位锚点上移到整个 `.start-composer-footer`，统一在底栏下方展开；Skill 列表加 `max-height:150px` 内部滚动。
- 几何实测（390×844，Edge）：修复后 Skill 弹层 y=638、模型弹层 y=638，与提示词（y=267–379）及各触发按钮均无重叠。
- 验证：两个定向用例文件 16/16 通过；修复后全量 Playwright **200/200 通过**（首轮为 198 通过、2 失败）。

## 最终全量验证汇总（2026-09-21）

| 检查 | 结果 |
| --- | --- |
| `npm run lint`（eslint + governance + features 门禁） | 0 违规 |
| `npm run typecheck` | 通过 |
| `npm test` | 212/212 |
| `npm run ui:check` | 129 文件 0 违规 |
| `npm run format:check` | 通过 |
| `npm run build` | 通过（仅既有 chunk 体积提示） |
| `npm run test:ui`（Playwright/Edge） | 200/200 |
| `cargo check` / `cargo test --bin kk-studio` | 通过 / 65/65 |
| `features:check` / `governance:check` | 28 功能 0 违规 / 46 任务 0 违规 |

## 结论

- FEATURE-SYSTEM：门禁、看板、卡片、规则入口、账本与路线图齐备并通过自动化检查，PASS。
- BACKEND-IMAGE-PARAMS：Web 与 Desktop 两条请求路径的 size 透传代码接通，TS/Rust 单测、typecheck、build、cargo check/test 全过；真实付费出图与桌面实机 HTTP 验收按外部依赖另计，代码链路本身 PASS。
