# KK-Studio 桌面发布与升级验证清单（RELEASE-CHECKLIST）

- **状态**：生效规约（吸纳 Octop R3 绿色便携三原则）
- **关联任务**：`REL` / `T7`（Desktop 可用版本及安装恢复验收）
- **硬约束**：学语义不换桌面壳（保持 Tauri 2）；壳不私自联网静默下载代码；数据不回滚、版本禁降级。

---

## 0. 核心原则：升级三原则（Upgrade Triad）

1. **原则一：先备份后迁移（Backup-First Migration）**
   任何破坏性数据版本升级前，必须在本地安全存储区对现有快照及 SQLite/JSON 存储做不可变冷备份，禁止在未完成备份前执行 in-place 结构重写。
2. **原则二：严禁运行时降级（No Downgrades Allowed）**
   新版客户端一旦完成数据迁移，旧版可执行程序严禁再次启动该数据目录。连接池与存储入口强制执行**版本水位断言（Watermark Assertion）**，若检测到代码版本低于数据库版本直接阻断并提示，防止损坏数据。
3. **原则三：运行时版本强锁定（Self-Contained Runtime Locking）**
   Tauri 桌面壳、Canvas Agent 随包运行时与前端 Web 静态资源严格锁定为同一 Release 版本，禁止壳在运行时静默联网拉取异构组件。

---

## 1. 发布前体检清单（Pre-Release Health Gate）

在构建 Release 产物前，发布负责人必须在干净的 worktree 中完成以下五道核验：

- [ ] **[C-01] 锁文件与版本号一致性**：
  * `package.json` 中的 `version` 与 `config/platform-versions.json`、`src-tauri/Cargo.toml` 完全一致；
  * 执行 `npm run version:consistency` 通过。
- [ ] **[C-02] Ship Bar 全绿**：
  * 完整执行 `npm run verify`，十道流水线 100% 通过（0 警告、0 错误）。
- [ ] **[C-03] 随包 Agent 运行时打标**：
  * 执行 `npm run agent:package`，确保随包运行时仅包含 `runtime-manifest.json` 白名单依赖，严禁带入本地凭据或调试模块。
- [ ] **[C-04] 安装包离线完整性校验**：
  * 编译安装包后执行 `npm run client:installer:verify`；
  * 生成对应的 SHA256 校验和清单，记录进发布回执文件（`releases/<version>/receipt.json`）。
- [ ] **[C-05] 敏感资产与凭据清零**：
  * 检查打包目录，严禁明文含有 `.env`、API Key、本地 SQLite 运行期实例或恢复归档。

---

## 2. 升级流程与数据保护规约（Upgrade & Data Safety）

当用户执行跨大版本或结构变更升级时，桌面应用遵循以下确定性步骤：

```
[启动新版本] → [检测 Schema 水位] → [触发快照一致性备份] → [执行原子迁移] → [更新水位元数据] → [进入主界面]
                                     ↓ (若备份失败)
                                 [中止升级，提示磁盘空间/权限]
```

1. **备份落点**：
   * 创作快照与全局数据备份于 `%APPDATA%\kk-studio\backups\<previous-version>-<timestamp>\`；
   * 共享记忆文件备份至 `~/.kk-memory/backups/memory.<timestamp>.bak`。
2. **迁移原子性**：
   * 迁移操作必须在事务内执行；
   * 若迁移中断，利用刚生成的备份直接回滚原状，保留失败错误日志，不残留半迁移坏数据。
3. **回滚限制**：
   * 软件回滚必须伴随数据还原；若用户主动降级可执行文件，必须提示其必须从对应版本的备份目录还原数据，禁止旧二进制直接读取新数据。

---

## 3. 验收标准与归档

- 发布 PR 必须包含：
  1. 本 Checklist 逐项打勾核验回执；
  2. 安装包 SHA256 签名回执；
  3. 全量 `npm run verify` 终端日志证据。
