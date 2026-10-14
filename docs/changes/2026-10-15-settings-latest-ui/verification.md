# Verification：最新 UI 设置修复

- Task ID：TASK-SETTINGS-LATEST-20261015；记录状态：IN PROGRESS；验证：NOT_VERIFIED；交付包角色：`current`。
- 日期/时区：2026-10-15 / Asia/Shanghai；[intent](intent.md)、[spec](spec.md)、[plan](plan.md)、[review](review.md)。
- cwd：`D:/kk-studio/.worktrees/branch-consolidation-20261011`；branch：`fix/TASK-SETTINGS-LATEST-20261015`。
- Base / 开工 HEAD：`c1fae190618be3bb5a4e00208b8f4776ec8c0be5`；被验证最终 head/tree/dirty patch 指纹：待 root 冻结与回读。
- Node 24.20.0 / npm 11.19.0；Rust/浏览器/OS 与运行版本：待本次回执。
- 基线 Desktop/Web 2.1.24；候选 2.1.25。此处版本计划不证明构建或发布。

## 本次命令与证据

| 命令/检查                                                        | 时间                    | 退出码 | 结果    | 范围与限制                                                                               |
| ---------------------------------------------------------------- | ----------------------- | ------ | ------- | ---------------------------------------------------------------------------------------- |
| `git log -1 --format='%H %cs %s'`、`git status --short --branch` | 2026-10-15              | 0      | PASS    | HEAD c1fae190、正确任务分支；设置源码/测试由 root 所有，非最终候选验证                   |
| `git show c1fae190:config/platform-versions.json`                | 2026-10-15              | 0      | PASS    | 基线 Desktop/Web 2.1.24、Mobile 2.1.1                                                    |
| `rg -n` 设置几何 tokens                                          | 2026-10-15              | 0      | PASS    | 源码 tokens 1280/240/192；不是实际加载浏览器证据                                         |
| 当前 `config/platform-versions.json` 回读                        | 2026-10-15              | 0      | PASS    | Desktop/Web 已递增2.1.25，Mobile2.1.1；不是构建或发布证明                                |
| `npm run governance:check`                                       | 2026-10-15 02:05 +08:00 | 0      | PASS    | 137 tasks / 0 violations；[日志](evidence/governance-check.log)，只证明治理结构          |
| `npm run features:check`                                         | 2026-10-15 02:05 +08:00 | 0      | PASS    | 37 features / 0 violations；[日志](evidence/features-check.log)，成熟度原状态保持        |
| `npm run markdown:check`                                         | 2026-10-15 02:05 +08:00 | 0      | PASS    | 122 active files / 0 violations；[日志](evidence/markdown-check.log)，只检查当前文件目标 |
| `npm run snapshot:check` / `git diff --check`                    | 2026-10-15 02:05 +08:00 | 0      | PASS    | snapshot/lifecycle 4 documents / 0 violations；工作树diff无空白错误                      |
| Node `assert.deepEqual` 与c1fae190账本/功能状态对比              | 2026-10-15 02:05 +08:00 | 0      | PASS    | 原136条task记录逐项不变；37个feature成熟度逐项不变；只新增本task与FEAT-022关联           |
| 相关保存单元/故障注入、浏览器回归、完整 `npm run verify`         | 待运行                  | —      | NOT RUN | 由 root 保存当前源日志、失败与退出码                                                     |
| 当前 Tauri 重建/配置重启与当前 SHA 独立审查                      | 待运行                  | —      | NOT RUN | 不能借旧版本 Native 或 review 代填                                                       |

原始日志/DOM/截图、执行时间、失败与修复后结果由 root 追加本包或引用当前任务证据；不覆盖历史记录。

root 2026-10-15 报告：首轮开发回归为7 fail / 5 pass，涉及缓存原始c1源码和1项手机lazy测试竞态，已增加dialog visible等待。原始失败上下文保留在 `.tmp/latest-layout-results/`；新source使用 `.tmp/latest-layout-green/`，目录名不代表结果通过，最终日志/退出码待root归档。发现 `vite.config.ts` 的 `**/.worktrees/**` 过宽忽略使当前worktree源码不刷新，修复为内部 `resolve('.worktrees')` 并保留其他 ignored。当前失败不隐藏，根因结论与修复效果仍须新浏览器/geometry guard证明。

已直接读取工程外本次证据：

- `D:/kk-studio/.analysis/settings-ui-latest-20261015/runtime-baseline.json`：绑定sourceHead c1fae190、version2.1.24、`http://127.0.0.1:1421/`、development、`src/main.tsx`；实际panel为1280×800，nav列为240px与1038px。对应原图为同目录 `latest-ui-baseline.png`。
- `D:/kk-studio/.analysis/settings-ui-latest-20261015/defects-before.json`：长名称场景内容宽度/scroll为1423px，超出1280px外壳；反馈矩形y576–620与底部分类栏y547–631重叠。此为修复前失败，不能填入AC成功栏。

这些基线资料证明本次选中了最新2.1.24及其实际缺陷；2.1.25修复效果另取当前source与产物证据。

## 验收覆盖

| AC   | 本次观察                                                              | 状态         |
| ---- | --------------------------------------------------------------------- | ------------ |
| AC-1 | 基线2.1.24的Git/runtime/DOM已确认；本次2.1.25刷新与geometry guard待证 | NOT VERIFIED |
| AC-2 | 长文案/窄屏/短屏溢出、提示遮挡、控件命中与截图待证                    | NOT VERIFIED |
| AC-3 | 模型列表/详情、busy、取消、返回/关闭与失败反馈待证                    | NOT VERIFIED |
| AC-4 | 合成旧配置/写失败保护、重载及 Desktop 凭据重启保留待证                | NOT VERIFIED |
| AC-5 | 当前完整门禁、独立 SHA review、primary/index 保护最终回读待证         | NOT VERIFIED |

## UI 与运行态记录（待证）

- 启动命令/cwd/进程、URL/端口：root 另记；development 固定 1421，production preview 固定 1423，Tauri release 另记。
- 预期源码入口链：`main.tsx → App.tsx → settings modal → SettingsPanel → 当前分区 / ModelProviderSettings / Provider 组件`；实际加载链待浏览器核对。
- `data-runtime-mode` / `data-runtime-entry` / `index.html script`、当前 bundle hash、EXE hash/receipt 与 profile：NOT VERIFIED。
- 视口：390/1099/1920 及实际失败的短屏/长文案；保存、失败、busy、取消、Escape、回焦、回退与重载均待证。
- 原始 DOM/computed style/元素几何、实际命中、同状态截图路径：NOT VERIFIED；本次沿用用户当前设计，旧 Figma/旧图仅未被覆盖规则的溯源。

## 自查与真实性边界

- 本次实现和回归由 root 继续完成；本包建立不等于实现通过。
- isolated fixture/合成资料只证明相应本地路径；不外推日常真实资料、系统凭据、真人 CLI/账号、Provider 或付费账单。
- Desktop 当前重建/重启、Hosted CI、签名安装器、实体手机与用户视觉验收各自待证；Mobile 2.1.1 仍规划。
- 未对 primary dirty/index、用户配置、秘密或历史证据作写入；最终保护证据由 root 回读。
- 独立 review 待冻结源码 SHA；dirty 预检和作者自审均不能改名为正式独立 PASS。

## 基线勘误

2026-10-15：用户指出此前误启动旧 UI。primary `51fccfc7879cf90f7caaf3ae8e10af4d97a2aa2c` 与修复 `428a3a2de741a963ce491a49878e50698b14eecd` 属错误基线，其任何旧 PASS 仅保留原版本/范围含义。本次从最新 UI `c1fae190` 重做源和运行验证；已有 2.1.24 验收不能覆盖 2.1.25 的新差异。

结论保持 IN_PROGRESS / NOT_VERIFIED，用户产品验收、合并和发布未发生。新 SHA、配置或构建变化后，按实际影响重新验证。
