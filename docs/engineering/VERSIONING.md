# 平台版本管理

- 状态：现行源码版本规则；发布与上线仍需各端验收。
- 决策与范围：[ADR-008](../architecture/adr/ADR-008-platform-versions-and-local-first.md)；任务 `TASK-VERSION-001`。

## 版本源与含义

`config/platform-versions.json` 分别保存 `desktop`、`web`、`mobile`。格式固定为 `MAJOR.MINOR.PATCH`，各段是无前导零的十进制非负整数；`2.1.10` 表示第十个补丁，不增加第四段。当前三个平台从 `2.1.1` 起步。`2` 是产品代际，`1` 是较大功能阶段；普通行为修复与小功能默认增加末位。较大功能阶段增加中间位并将末位归零，产品代际改变才增加首位并重置其余两位。

桌面版本同步 `src-tauri/Cargo.toml`、本包在 `src-tauri/Cargo.lock` 的条目、`src-tauri/tauri.conf.json` 及 Tauri 运行态显示。网页版本同步根 `package.json`、`package-lock.json`、根 `VERSION` 兼容元数据与浏览器运行态显示；根 `VERSION` 只代表 Web/仓库兼容版本，不是第三个平台版本源，桌面单独递增时保持 Web 值。Mobile 独立工程存在时同步 `mobile/package.json`、相邻lock根版本及 `mobile/app.json`；工程尚不存在的规划fixture仍只校验规划值。独立手机Web构建、原生安装包与实体设备接受分别记录，不能以版本号或网页冒充原生发布。

## 每项任务自动调配

任务作者在 intent/PR 中按**真实受影响的运行产物**记录平台：

| 变化                                            | 递增                                                   |
| ----------------------------------------------- | ------------------------------------------------------ |
| 仅桌面壳、Rust、桌面独有交互或数据行为          | `desktop`                                              |
| 仅网页运行行为或网页本机服务对接                | `web`                                                  |
| 已有 Mobile 产物的独有行为                      | `mobile`                                               |
| 共享前端/领域代码改变桌面和网页实际行为         | `desktop,web`；若日后 Mobile 同样受影响，再加 `mobile` |
| 仅文档、测试、构建/部署准备且不改变应用运行产物 | 不递增；正式发布工件另按发布流程验收                   |

产品优先顺序是 Desktop → Web → Mobile；顺序不要求版本数值始终相同。Web 与 Mobile 的核心契约尽量对齐，Mobile 可明确裁剪并按手机交互优化。任务作者根据实际 diff 与运行证据决定受影响平台，不等待用户报版本号；若两端代码共享但只在一端启用，要以运行链路证据说明只 bump 一端。

```powershell
npm run version:bump -- --platform desktop,web
npm run version:bump -- --platform web --kind minor
npm run version:check
```

`--kind` 默认 `patch`；命令只更新所选端和对应包元数据，检查命令已进入 `lint`/`verify`。共享代码改变两个端时一次传入两个平台，避免半套版本。版本文件不一致或输入非法时先修正源与元数据再 bump；不能跳过门禁。PR 记录各端原值/新值、实际产物及运行态验证。正式 tag、安装包、Web 部署和 Mobile 发布另遵循[分支与发布规则](BRANCH-POLICY.md)，源码版本变化不等于发布完成。

## 一致性审计与更新顺序

`config/platform-versions.json` 是唯一产品版本源；`VERSION`、根 `package.json`/`package-lock.json`、Tauri manifest、Cargo lock 和 Tauri 配置都是可检查的镜像，不能单独手改。供应商包、插件包和 Agent 包有自己的版本空间，只要求各自 `package.json` 与相邻 lock 的根条目一致，不得把它们误当成 KK Studio 产品版本。

提交前运行：

```powershell
npm run version:check
npm run version:consistency
```

`version:consistency` 还会检查根 Tauri 依赖是否有锁定版本、所有嵌套 workspace lock 是否与包元数据一致，并扫描活动源码中疑似硬编码的应用版本。硬编码结果是警告，必须在 PR 中说明是产品版本、协议/schema 版本还是第三方包版本；`version` 字段为 `1`/`2` 的存储协议不能通过改产品版本解决兼容性。

源码合入后，构建机必须从目标 commit 的干净 checkout 执行 `npm ci`、版本门禁和对应平台构建。桌面启动器再用源码内容指纹、依赖锁定结果、EXE SHA-256 和 build receipt 校验；时间戳只能用于诊断，不能作为“最新”唯一依据。收据缺失、输入 hash 不一致、缓存/依赖漂移或构建失败时拒绝启动旧 EXE。发布物的 receipt 必须记录 commit、tree、平台版本和文件 hash；其他环境只接受带 receipt 的不可变 tag/commit 工件，不能从旧快捷方式、旧 worktree 或“文件修改时间较新”推断已更新。

推荐的跨环境更新顺序是：`fetch` → 核对目标 commit/tag 与分支 → 干净 checkout → `npm ci` → 运行两个版本门禁 → 构建 → 生成并校验 receipt → 发布不可变工件 → 目标环境安装后回读版本、commit/hash 和实际进程路径。任一步失败都保留旧版本并报告失败原因，不能静默回退到旧包继续运行。

仓库的 `.github/workflows/windows-release.yml` 只响应不可变 `vMAJOR.MINOR.PATCH` tag。它先确认 tag 与 `config/platform-versions.json` 的 Desktop 版本相等，再从该 tag 的干净 checkout 安装锁定依赖、构建 NSIS 安装器、生成 receipt，并把 `installer-<commit>` 上传为带 SHA 的 CI 工件。工件生成后可用 `npm run client:installer:verify` 校验安装器；安装到目标环境后再用 `npm run client:installed:verify` 校验已安装文件。workflow 尚未在本轮远端 tag 上执行，不能把本地检查当成发布成功。
