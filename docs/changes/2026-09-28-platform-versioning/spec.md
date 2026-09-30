# Spec：三端独立版本与本地数据目标

- Task ID：TASK-VERSION-001
- 状态：READY
- 基线：`origin/main@065bcbf`；当前 `package.json`、Cargo 与 Tauri 都是 2.1.0，`src/runtime/appInfo.ts` 只读 package 版本。

## 版本契约

`config/platform-versions.json` 是三端版本源，字段 `desktop`、`web`、`mobile` 均为无前导零的 `MAJOR.MINOR.PATCH`。本次都设为 2.1.1；`2.1.10` 的末位是十，不增加第四段。桌面包元数据（Cargo.toml、Cargo.lock 中本包、tauri.conf.json）等于 desktop；package.json/lock 根版本与根 `VERSION` 兼容元数据等于 web；UI 在 Tauri 取 desktop、Web 取 web。根 `VERSION` 是 Web/仓库兼容字段，不代表独立桌面或 Mobile 版本。Mobile 尚无可发布二进制，只有规划版本，不把响应式 Web 叫 Mobile 包。

`version:bump -- --platform <desktop|web|mobile[,..]> [--kind patch|minor|major]` 只改变指定端。默认 patch +1；minor/major 按 SemVer 把较低位归零。脚本更新对应包元数据，`version:check` 在 CI 检查格式与跨文件一致性。共享代码若改变两个运行产物，任务作者应给两个端都 bump；仅文档/测试/部署准备不 bump。用户无需逐次提供数字；发布标签与真实上线只在通过各端验收后创建。

## 产品与数据边界

交付优先级 Desktop → Web → Mobile；同一核心功能共享契约，Mobile 做明确的能力子集。Desktop 可离线免登录且可选择登录；Web 与 Mobile 的目标是登录后使用。Web 的目标持久层是安装在用户设备上的本机伴随服务，浏览器只承担 UI/有界临时缓存；Mobile 目标为设备本地持久层。账号身份不等于项目数据已上云。当前 Web IndexedDB、演示账号和无 Mobile 包仍是现状，改造与无损迁移属于后续任务。

## 验收映射

| Intent AC | 检查 |
| --- | --- |
| AC-1 | 版本配置、Web production 与 Tauri release 显示/包元数据 |
| AC-2 | bump/check 单测和 2.1.9→2.1.10 回归 |
| AC-3 | `docs/engineering/VERSIONING.md`、AGENTS/账本与 PR 流程 |
| AC-4 | ADR、DATA-STORAGE、FEAT-017/028 与任务状态 |

## 失败与兼容

不更改本地存储 key、Tauri identifier、项目包 schema 或用户文件路径。版本文件不一致时检查失败，bump 输入非法时不写半套版本。真实安装/更新检查服务尚未接线，不因显示版本改变而宣称自动更新可用。
