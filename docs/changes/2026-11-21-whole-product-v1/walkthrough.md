# Desktop 整包 V1 用户走查单

- Task ID：TASK-WHOLE-V1-20261121
- 用途：你亲手验收；全部必选项勾选且 UI 过关，才可在 verification 记「终验通过」
- 环境：**唯一日常 Desktop 入口**（禁止 `.tmp` 候选、旧 `Local\KK Studio`、旧 `target/release`）

## 唯一合法入口（2026-11-22 起）

| 项 | 值 |
| --- | --- |
| 启动方式 | 桌面快捷方式「KK Design」，或 `%LocalAppData%\Programs\KK Design\kk-studio.exe` |
| 绝对路径 | `C:\Users\Administrator\AppData\Local\Programs\KK Design\kk-studio.exe` |
| 产品 / 文件版本 | ProductName **KK Design** · FileVersion **2.1.88**（日常最新；不是源码声明的 2.1.43） |
| EXE mtime | 2026-11-22T21:44:12+08:00 |
| EXE SHA256 | `49B68581F5ABB835EE7CDC60C82285AE5CD552DE83F691AB474E559138B40A30` |
| 禁止启动 | `.tmp/whole-v1-desktop/`、`%LocalAppData%\KK Studio\kk-studio.exe`、`target/release`、过渡仓 `KK-Studio-2.0`、任意历史 quarantine / sandbox 候选包 |

旧误用候选已移入 `D:/KK Design/.tmp/quarantine-old-desktop-20261122-214658/`，不得再拷回启动。

## 环境记录（开始前填）

| 项 | 填写 |
| --- | --- |
| 启动方式（快捷方式/EXE 路径） | 日常：`C:\Users\Administrator\AppData\Local\Programs\KK Design\kk-studio.exe`（桌面「KK Design」） |
| 显示版本 / 构建日期 | 应用应显示 KK Design；安装包 FileVersion **2.1.88**；mtime 2026-11-22 21:44 |
| 源码或安装包身份（知则填 SHA/hash） | EXE SHA256 `49B68581F5ABB835EE7CDC60C82285AE5CD552DE83F691AB474E559138B40A30` |
| 文本通道（如 Codex / 某 API） | |
| 图片通道 | |
| 数据目录是否日常资料（是/隔离） | 默认日常 `%APPDATA%\kk-studio`；若需隔离另建绝对路径 `--data-dir`，勿用已废弃 `.tmp/whole-v1-desktop` 入口 |

## 必选：主路径

| # | 步骤 | 通过 | 备注（失败现象） |
| --- | --- | --- | --- |
| 1 | 能启动进入主界面 | ☐ | |
| 2 | 创建或打开一个项目 | ☐ | |
| 3 | 连接或 Key 状态可见；异常时有原因 | ☐ | |
| 4 | 一次文本：有加载，有结果或可理解错误 | ☐ | |
| 5 | 一次图片：结果出现在画布或素材 | ☐ | |
| 6 | 取消或失败至少一次，提示可理解 | ☐ | |
| 7 | 完全退出后重开：项目与结果还在 | ☐ | |

## 必选：UI / 交互（主路径相关）

| # | 检查 | 通过 | 备注 |
| --- | --- | --- | --- |
| U1 | 主路径无死按钮（不能点的有原因） | ☐ | |
| U2 | 加载/成功/失败状态能看懂 | ☐ | |
| U3 | 设置里与连接相关的保存/错误可用 | ☐ | |
| U4 | 侧栏/导航能进出项目，无死路 | ☐ | |
| U5 | 账号/积分/视频等演示未当成「已真实完成」 | ☐ | |

## 可选抽查（不挡 V1，坏了记缺陷）

| # | 检查 | 通过/跳过 | 备注 |
| --- | --- | --- | --- |
| O1 | 画布基本编辑（已 REAL） | ☐ / 跳过 | |
| O2 | 素材预览（已 REAL） | ☐ / 跳过 | |
| O3 | 图片对比/喜欢标签 | ☐ / 跳过 | |

## 结论

| 项 | 值 |
| --- | --- |
| 日期 | |
| 必选主路径 | 全部通过 / 未通过 |
| 必选 UI | 全部通过 / 未通过 |
| 验收人 | |
| 一句话结论 | 通过并钉基线 / 不通过（只修缺陷，不开新模块） |

未通过时：只把失败行写成缺陷列表，交回 AI 按 [plan.md](plan.md) P0 队列修；**不要**顺便开 Mobile/发布/新功能。
