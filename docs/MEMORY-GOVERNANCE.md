# 记忆治理

更新：2026-10-09。本页是 [`MEMORY-CONTRACT.md`](MEMORY-CONTRACT.md) 的运维检查表，不替换规范契约。它把内容、位置、读取/写入规则、同步触发条件和可执行检查放在一个可审计入口。

## 内容与位置

| 项目 | 规则 | 当前证据 |
| --- | --- | --- |
| 唯一共享文件 | `~/.kk-memory/memory.json`；Windows 为 `%USERPROFILE%\\.kk-memory\\memory.json` | [`MEMORY-CONTRACT.md`](MEMORY-CONTRACT.md) §1、`src-tauri/src/main.rs` memory commands |
| 格式 | `version: 1`，records 每项最多 200 字，总数最多 10,000；指纹为归一化内容 SHA-256 | [`MEMORY-CONTRACT.md`](MEMORY-CONTRACT.md) §2、`src/features/memory/types.ts` |
| Desktop | Tauri 读写共享文件；临时文件原子替换；重置先保留 `.previous-<timestamp>.json` | `src-tauri/src/main.rs` 与 Rust memory tests |
| Web | 用户授权目录时只读共享文件；未授权使用明确标识的私有 IndexedDB；不得静默合并或迁移 | `src/features/memory/storage.ts`、memory browser tests |
| 旧文件 | `<app-data>/memory/memory.json` 仅作为一次性种子；不再作为共享权威 | `main.rs` `seed_shared_memory` |

完整文件只留在本机，不进入 localStorage、同步、日志、导出包或项目包。用户开启注入后，最多 3 条相关片段、总计最多 400 字会随当前请求发送给所选模型；这不是“完整文件不上网”的例外描述。密钥、token、代理凭据和账号资料不得进入记忆记录。

## 读取、采集与写入规则

- 记忆默认关闭。关闭时不读取、不采集、不注入。
- 只有用户原话表达的稳定偏好、习惯、约束或画像才可自动采集；一次性指令和模型自述不构成入库证据。用户主动点击 Codex 提炼时使用 `manual_codex` 来源并可查看、删除。
- 读取失败、JSON 损坏、版本不支持和校验失败都 fail closed，保留原文件，不能返回成功空态覆盖错误。
- 写入用指纹去重、长度/数量限制、锁和完整版本比较；冲突须拒绝或重读重试，不覆盖其他窗口的新内容。
- 用户当前输入优先于记忆。换账号或换人使用同一设备时，用户需主动清空或重置，防止跨人复用。
- 豆包和 WorkBuddy 原生客户端没有完成本契约适配与真实联调前，不是共享记忆消费者；登录或仓库中存在契约文件都不构成集成证据。

## 何时必须同步

下列任一变化触发同一提交或同一变更包的契约同步：

1. `MEMORY-CONTRACT.md` 的路径、schema、隐私、采集、注入、并发、迁移、重置或兼容规则变化。
2. 记忆实现改变（`src/features/memory/`、`src-tauri/src/main.rs`、`src-tauri/src/storage_paths.rs`）。
3. FEAT-020 的状态、平台声明、证据或后端化边界变化。
4. `DATA-STORAGE.md` 的记忆段落变化。
5. 相关测试、验证证据或治理门禁变化。

当契约文件相对 git base 改动时，`node scripts/governance/check-policy-sync.mjs --base <full-base-sha> [--head <full-head-sha>]` 必须确认以下集合同时出现在 diff：

| 检查项 | 必须出现 | 目的 |
| --- | --- | --- |
| 数据契约 | `docs/architecture/DATA-STORAGE.md` | 保持数据根和跨端边界一致 |
| 功能入口 | `docs/features/feat-020-memory.md`、`docs/features/features.registry.json` | 保持 FEAT-020 能力状态和证据一致 |
| 实现 | `src/features/memory/` 或 `src-tauri/src/` 中对应 memory/storage 文件 | 防止只改文档 |
| 测试 | `tests/unit/*memory*`、`tests/browser/*memory*` 或包含 memory tests 的 Tauri 源 | 覆盖失败、恢复、并发和跨端边界 |
| 治理 | `docs/MEMORY-GOVERNANCE.md` | 更新本检查矩阵和运行边界 |

缺任一项即失败。门禁比较 base/head 文件集合，不声称测试或真实外部客户端已经通过。

## 检查矩阵

| 场景 | 最低检查 | 允许的结论 |
| --- | --- | --- |
| 规范或 schema 变化 | policy-sync 门禁 + memory 单测 + `DATA-STORAGE`/FEAT-020 回读 | 可说明文件已同步；运行能力仍需同态证据 |
| 损坏/未知版本/非法记录 | Rust 与 Web storage 测试，确认原文件字节不变 | `FACT`：拒绝读取且不覆盖 |
| 并发写入/版本冲突 | Desktop 锁/CAS 与 Web 事务测试；跨应用写入需真实联调 | 未完成跨应用互斥时标 `PARTIAL` 或 `UNKNOWN` |
| 注入与隐私 | extractor/injector/service 测试，检查条数、长度、开关和秘密拦截 | 可说明请求片段边界；不能声称完整文件未离开本机以外的范围 |
| Web 授权/私有降级 | browser 同态运行证据 | 分别声明共享只读与私有 IndexedDB |
| Desktop 重启/重置 | fresh Tauri 运行证据和备份故障测试 | 可声明原子替换、备份和恢复边界 |
| 豆包/WorkBuddy | 各自适配器、真实登录会话和并发联调证据 | 没有证据就写“未接入”；不得由关键词或登录状态推断 |

相关功能卡为 [`feat-020-memory.md`](features/feat-020-memory.md)，当前状态仍由 feature registry 与任务账本分别决定。
