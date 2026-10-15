# 主线对齐与旧成果收敛（阶段 0 收口）

时间：2026-10-15。统一开发入口：`codex/TASK-KK-UNIFIED-20261015`（工作区 `D:/kk-studio/.worktrees/TASK-KK-UNIFIED-20261015`）。承接 [coordination-pause.md](../../../TASK-GOV-PHASE0/docs/changes/2026-10-15-unified-execution/coordination-pause.md)。

## 1. 主线对齐（已完成）

| 引用 | 对齐前 | 对齐后 |
|---|---|---|
| 本地 `main` | `1d8ae2a0` / VERSION 2.1.13 / 落后 origin 128 | **`d95e4c44` / 2.1.34 / 0 落后 0 领先** |
| 主仓 `D:/kk-studio/KK-Studio-2.0` | 检出 `codex/ui-redesign-20261011` @ `51fccfc7` / 2.1.24 / 256 项脏 | **检出 `main` @ `d95e4c44` / 2.1.34 / 工作区干净** |

执行方式与安全网：

1. `git branch backup/pre-main-align-20261015 main`（保全对齐前的 `1d8ae2a0`）。
2. `git fetch origin main` 复核后 `git reset --hard origin/main`。
3. 主仓切换：`git checkout -f main`。切换前已将全部在途改动导出到 `D:/kk-studio/.verification/2026-10-15-main-align-preserve/`（`tracked-dirty.patch` 906,047 字节 / 196 个已跟踪文件；`untracked/` 307 个文件 / 16MB；`status.txt`、`HEAD.txt`）。
4. 删除临时 worktree `D:/kk-studio/.worktrees/merge-ui-main`（仅占用 main 槽位、内容已在 main 中），`git worktree prune` 并清除残留目录。
5. 逐项删除主仓残留 56 个未跟踪项，删除前逐条校验外部保全副本存在（未保全项数 = 0）。

`node_modules`（179 个顶层条目）在全过程中未被触碰，全程未执行任何 `npm ci` / `npm install`。

### 被判定为「不保留」的本地 main 独有内容

| 文件 | 判定依据 |
|---|---|
| `src/components/GenerationOptions.tsx` | origin/main 无此文件；`git grep` 零引用；能力由 `src/features/nodes/ImageModelParameters.tsx` + `useImageModelCapabilities.ts` 承接 |
| `src/components/StartAddPicker.tsx` | 同上；能力由重写后的 `StartModelPicker.tsx` + `ModelPickerMenu.tsx` 承接 |
| `docs/governance/worktree-reclamation*.json`（20 个） | 一次性回收执行记录，属运行产物而非事实源 |

`codex/ui-redesign-20261011`（`51fccfc7`，含 139 个主线未含的 commit、其中 58 个触及 src/tests）**未删除**，仍在分支列表中可随时检出；仅主仓检出点迁移到 main。

## 2. 旧成果去重承接（已核对，未重复开发）

| 旧候选 | commit | 在 origin/main | 处置 |
|---|---|---|---|
| PR61 治理交接 | `3a992597` | 是 | 主线已承接，不重做 |
| PR62 GDI/测试输出保护 | `492abad4` | 是 | 主线已承接，不重做 |
| PR63 首页恢复 | `d95e4c44` | 是（HEAD） | 当前基线，不重做 |
| 依赖防复发 RED 候选 | `cefd55dd` | 否 | **已承接测试文件**至统一入口 |
| 加载期 RED 候选 | `9d4a005` | 否 | **已承接测试文件**至统一入口 |
| 图片压缩 | `970d0b5e` | 否 | 待按新媒体要求修订后择优，见 §4 |
| 响应式 | `baa117af` `f22f2b68` `3b294c12` `2ea7639f` `68d46984` | 否 | 待去重承接 |
| Canvas 分组 | `5ac9e84f` | 否 | 待去重承接 |
| 本机服务恢复 | `004e7149` | 否 | 待去重承接 |

## 3. 未完成缺口：按原任务 ID 承接，未当作通过

沿用 `TASK-VERIFY-DEPS-20261015` 与 `TASK-HOME-LOAD-DRAFT-20261015`，不新建任务。

### 3.1 TASK-VERIFY-DEPS-20261015 — 已由统一入口修复，13/13 转绿

交接的 `cefd55dd` 是 7 用例版本。核对发现统一入口分支上已有更强的推进（`tests/unit/desktopDependencySafety.test.ts` 展开为 13 个测试，覆盖 linked 依赖 root/package/scope、越界依赖路径、lockfile 异常、真实桌面 CLI、默认 builder 修复路径）。因此**不采纳旧 7 用例版本**（ cherry-pick 会造成回退），改以分支 HEAD 的强版本为准实跑：

```
node --test tests/unit/desktopDependencySafety.test.ts
# tests 13 / # pass 13 / # fail 0   exit=0
```

转绿原因是统一入口已有三个前置修复，不是测试被改弱：

- `314ac750` fix(TASK-VERIFY-DEPS-20261015): guard desktop preparation before callbacks
- `11e991bf` fix(TASK-VERIFY-DEPS-20261015): reject linked dependency ancestors
- `5705fc73` fix(TASK-VERIFY-DEPS-20261015): preserve cached desktop launch

**但仍不算关闭**：交接明确「构建准备自定义回调的入口防护缺口尚未修复」，且原始依赖字节与事故期间影响仍为 **UNKNOWN**，37 个独立目录中 26 匹配 / 10 不符 / 1 package-lock 与 lock UU 不可比、41 根缺失。任务保持 **PARTIAL**，不得因 13/13 绿标记 DONE。

### 3.2 TASK-HOME-LOAD-DRAFT-20261015 — 8 RED 复现，确认为主线既有真实缺陷

分支 HEAD 原有的 6 个用例（queued flush / acknowledged revision / 已持久 revision / unmount 前 drain / 原生失败重试 / 卸载后订阅释放）全部保持 PASS，说明承接是**增量叠加而非替换**。新增的 8 个加载期用例全部 RED，与交接记录一致：

```
node --test tests/unit/creationSaveQueue.test.ts
# tests 14 / # pass 6 / # fail 8   exit=1
```

| # | 用例 |
|---|---|
| 7 | loading prompt edits preserve stored settings and unseen attachments through durable flush |
| 8 | an explicit default approval choice during loading overrides only that stored field |
| 9 | loading model edits keep the selected route together and preserve untouched privacy |
| 10 | loading attachment addition keeps an unseen saved reference |
| 11 | loading attachment removal keeps an unseen saved reference |
| 12 | input during asynchronous reconciliation survives the earlier captured draft |
| 13 | unmount invalidates a reconciliation that already passed the first read check |
| 14 | an explicit loading edit is preserved even if the saved timestamp is ahead |

**根因**（`src/features/creation/useCreationStorage.ts` 的 `read()`，第 81–104 行）：读取完成后仅在 `dirty.current` 为真时进入合并分支，且该分支只按 `updatedAt` 合并 `homeDraft` 一个字段（第 90–93 行），prompt、attachments、settings、审批默认值、model route 等加载期显式编辑一律被已存快照覆盖。交接所述「读取期默认 1 覆盖保存 4 的独立缺陷仍在」在此得到代码级确认。

**反向证伪**：`git show origin/main:src/features/creation/useCreationStorage.ts` 与统一入口当前实现逐行相同（`readSequence` 位于第 40/61/67/114 行，`dirty.current` 分支位于第 81 行）。即这 8 个 RED 在**纯主线 d95e4c44 上同样存在**，不是统一入口引入的回归，也没有被任何既有提交掩盖。任务保持 **PARTIAL**。

## 4. 尚未处理、需后续决策的事项

| 项 | 事实 | 状态 |
|---|---|---|
| 旧压缩候选行为冲突 | `970d0b5e` 含 100MiB 输入上限与动图拒绝，与最新「大文件按目标准备、不沿统一小门槛、动图选帧」要求冲突 | **未接纳**，待按最新要求修订后只取符合部分 |
| `codex/ui-redesign-20261011` | 139 个主线未含 commit（58 个触及 src/tests） | 未删除，未承接，等待去重判定 |
| worktree / 分支收敛 | 对齐后 114 个 worktree；重复 HEAD 组仍存（`435ed365`×4、`694a0060`×3、`51fccfc7`×3 等） | 未动。本轮只删了占用 main 槽位的 1 个 |
| 各 ATELIER 系列工作区脏改动 | 合计 891 / 898 / 14 项，含把 GitHub Actions 由 pinned SHA 改回 `@v4` 的违规 | 未动，未回退 |
| `test-results/` 125MB、`.tmp/` 30MB | 已被 gitignore，跟踪数 0 | 未清理 |
| 日常客户端 | 仍是旧 EXE，未替换、未重启 | 未动，隔离验证结论不代填日常客户端 |
| 真实 Provider / 付费授权 / 云配额 | 未验证 | 未验证 |

## 5. 共享 junction 约束（生效中）

`D:/kk-studio/.worktrees/TASK-KK-UNIFIED-20261015/node_modules` 是指向 `D:/kk-studio/KK-Studio-2.0/node_modules` 的符号链接。本轮全程未在该工作区执行 `npm ci`、`npm install` 或任何依赖安装/清理命令。

新增依赖必须走 `package.json` + `package-lock.json` 的显式评审流程，并在主仓实体目录执行安装后由 junction 自动生效；**严禁**在 junction 上裸跑安装命令。相关防护测试见 §3.1。