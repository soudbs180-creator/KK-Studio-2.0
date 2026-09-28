# 平台版本管理

- 状态：现行源码版本规则；发布与上线仍需各端验收。
- 决策与范围：[ADR-008](../architecture/adr/ADR-008-platform-versions-and-local-first.md)；任务 `TASK-VERSION-001`。

## 版本源与含义

`config/platform-versions.json` 分别保存 `desktop`、`web`、`mobile`。格式固定为 `MAJOR.MINOR.PATCH`，各段是无前导零的十进制非负整数；`2.1.10` 表示第十个补丁，不增加第四段。当前三个平台从 `2.1.1` 起步。`2` 是产品代际，`1` 是较大功能阶段；普通行为修复与小功能默认增加末位。较大功能阶段增加中间位并将末位归零，产品代际改变才增加首位并重置其余两位。

桌面版本同步 `src-tauri/Cargo.toml`、本包在 `src-tauri/Cargo.lock` 的条目、`src-tauri/tauri.conf.json` 及 Tauri 运行态显示。网页版本同步根 `package.json`、`package-lock.json`、根 `VERSION` 兼容元数据与浏览器运行态显示；根 `VERSION` 只代表 Web/仓库兼容版本，不是第三个平台版本源，桌面单独递增时保持 Web 值。Mobile 目前只有规划元数据，没有可安装包，也不以窄屏网页冒充 Mobile 发布。

## 每项任务自动调配

任务作者在 intent/PR 中按**真实受影响的运行产物**记录平台：

| 变化 | 递增 |
| --- | --- |
| 仅桌面壳、Rust、桌面独有交互或数据行为 | `desktop` |
| 仅网页运行行为或网页本机服务对接 | `web` |
| 已有 Mobile 产物的独有行为 | `mobile` |
| 共享前端/领域代码改变桌面和网页实际行为 | `desktop,web`；若日后 Mobile 同样受影响，再加 `mobile` |
| 仅文档、测试、构建/部署准备且不改变应用运行产物 | 不递增；正式发布工件另按发布流程验收 |

产品优先顺序是 Desktop → Web → Mobile；顺序不要求版本数值始终相同。Web 与 Mobile 的核心契约尽量对齐，Mobile 可明确裁剪并按手机交互优化。任务作者根据实际 diff 与运行证据决定受影响平台，不等待用户报版本号；若两端代码共享但只在一端启用，要以运行链路证据说明只 bump 一端。

```powershell
npm run version:bump -- --platform desktop,web
npm run version:bump -- --platform web --kind minor
npm run version:check
```

`--kind` 默认 `patch`；命令只更新所选端和对应包元数据，检查命令已进入 `lint`/`verify`。共享代码改变两个端时一次传入两个平台，避免半套版本。版本文件不一致或输入非法时先修正源与元数据再 bump；不能跳过门禁。PR 记录各端原值/新值、实际产物及运行态验证。正式 tag、安装包、Web 部署和 Mobile 发布另遵循[分支与发布规则](BRANCH-POLICY.md)，源码版本变化不等于发布完成。
