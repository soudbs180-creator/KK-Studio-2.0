# 开发与验证

## 环境与开工

使用 Node 24、npm 和 package-lock.json；新 checkout/worktree 用 `npm ci` 安装锁定依赖。不要借用另一 worktree 的 node_modules，也不要自动升级依赖或写入另一包管理器锁文件。运行命令前确认 cwd 是当前 task worktree。

```powershell
git status --short --branch
git rev-parse HEAD
git worktree list
git remote -v
node --version
npm ci
```

先读 AGENTS、治理入口、相关 change package 和真实实现；记录基线 lint/typecheck/相关测试结果，已有失败写 PRE-EXISTING FAILURE 并定位所属任务，不能把它们隐藏或改成 PASS。不要改动别的 worktree/index 或用户原件。

普通已授权任务依 [SDLC.md](SDLC.md) 自主完成 intent/spec/plan、实现、验证、独立 review 和文档收口。需求转译遵循 [PROMPTING.md](PROMPTING.md)；分支与合并操作以 [BRANCH-POLICY.md](BRANCH-POLICY.md) 及真实远端配置为准，不从旧 master 文档猜测。

## 命令与证明范围

| 命令                                                     | 能证明什么                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------- |
| `npm run lint`                                           | ESLint 与已配置治理/架构检查；不是全部安全审查                      |
| `npm run typecheck`                                      | TypeScript 类型检查                                                 |
| `npm test`                                               | 当前 Node 单测；fixture 与 live 分开                                |
| `npm run ui:check`                                       | 静态 UI 规则；不是视觉/交互验收                                     |
| `npm run format:check`                                   | package script 实际覆盖范围的格式；Markdown 另行检查                |
| `npm run build`                                          | 当前 Web production 构建                                            |
| `npm run test:ui`                                        | 构建后运行 Playwright production preview 回归                       |
| `npm run client:check`                                   | Rust/Tauri 编译检查；不是原生运行验收                               |
| `cargo test --manifest-path src-tauri/Cargo.toml`        | Rust 单测                                                           |
| `cargo fmt --manifest-path src-tauri/Cargo.toml --check` | Rust 格式                                                           |
| `npm run client:build -- --no-bundle`                    | Tauri release 可执行文件；不是安装/升级验收                         |
| `npm run verify`                                         | package.json 定义的组合检查；不能暗示包含全部 Rust/native/live 门禁 |

以当前 `package.json`、Playwright 和 CI 配置核对上述含义。改脚本时同步本表；没有命令、依赖或真实服务时报告失败/未运行，不写预测结果。

修改期间运行与影响相关的定向检查。交付前执行仓库要求的 `npm run verify`，涉及 Desktop/Rust 时加对应检查、构建和原生运行；安装/升级、数据恢复和真实外部服务按验收计划额外执行。文档修改需检查当前 Markdown 文件格式、链接及治理一致性；专用校验不替代仓库要求的交付检查。

## UI 的三个实际运行入口

| 入口             | 启动命令                                                                              | 必记证据                                                        |
| ---------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Vite development | `npm run dev -- --host 127.0.0.1 --port 1421 --strictPort`                            | `http://127.0.0.1:1421/`、/src/main.tsx、route/import 链        |
| Vite preview     | 先 `npm run build`，再 `npm run preview -- --host 127.0.0.1 --port 1423 --strictPort` | `http://127.0.0.1:1423/`、实际 /assets/index-*.js               |
| Tauri release    | 先 `npm run client:build -- --no-bundle`，启动当前工作树生成的 executable             | tauri.localhost、前端 bundle、EXE hash、平台/profile/数据根目录 |

启动前检查端口/进程所属 worktree。端口被占用不能自动换端口或误杀另一任务；协调串行运行，并记录无法运行的原因。Playwright 会启动自己的 1423 preview，按当前配置避免手动占用该端口。

记录 `data-runtime-mode`、`data-runtime-entry`、当前 route、源码 import 链、样式加载顺序、computed style、视口及同状态截图。功能、Figma 视觉、工程补充状态和 Desktop 专属能力分别验收。源码影响产物后必须重建实际加载的 dist/release；原来的快捷方式可能仍指向另一份 EXE。

使用隔离的测试项目、数据目录和浏览器/WebView profile 验证失败、损坏和恢复；未经授权不得对真实用户数据注入破坏。

## 验证与证据保存

按 [verification 模板](../templates/verification.md) 记录执行时间、cwd、branch、base/head SHA、dirty 状态（若有）/差异指纹、工具版本、命令、退出码、实际结果和日志位置。源码 tree、Web bundle、Tauri EXE 与部署目标分别记录，不能仅有一个“版本号”。

给每条验收条件关联测试或证据；N/A 要说明适用性，失败要保留首次失败与修复后结果。明确已验证、本地 fixture、Prototype、部分完成和未验证边界；本地持久化不等于云端，静态 HTTP 200 不等于端到端业务成功。

历史证据保留，追加新的运行结果或勘误。若现有测试工具会写入固定证据路径，运行前必须保护旧输出并在专门测试任务中改为独立结果目录；本规则任务不修改既有 reporter、截图、测试或历史证据。需要留档的结果应连同 SHA、命令、时间和结论复制到新的 `docs/evidence/<task-date>/`，不得自动改写已有日期目录，也不得修改旧次数/hash 制造成功。

检查后的新增提交使旧 review 对新 SHA 失效，需再次审查。测试结果保留原 SHA 归属，对新 SHA 执行适用复验；影响构建的变动必须重新生成 Web/Tauri 产物。合并后验证最新主线的实际结果，不以两个分支分别通过替代合并后的检查。

## 故障、恢复和交接

验证失败时先复现、归因、最小修复，再重跑受影响检查；不要禁用有效检查、放宽断言或增加重试掩盖问题。额外缺陷入账，不未经说明扩张任务。没有真实凭据、ComfyUI/GPU 或 live eval 预算时，只继续可完成的本地工作，外部验收标 NOT RUN/NOT VERIFIED。

完成或中断前更新 change package、任务账本、PROJECT_STATE/AI_HANDOFF 的适用部分和 PROGRESS。恢复时重新读当前 SHA、worktree、端口/进程和文档，确认哪些旧 review/证据已失效。不要凭聊天中的“之前通过”继续发布。
