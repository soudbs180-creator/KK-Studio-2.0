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

| 命令                                                     | 能证明什么                                                            |
| -------------------------------------------------------- | --------------------------------------------------------------------- |
| `npm run lint`                                           | ESLint、治理/架构、功能和现行 Markdown 文件链接检查；不是全部安全审查 |
| `npm run typecheck`                                      | TypeScript 类型检查                                                   |
| `npm test`                                               | 当前 Node 单测；fixture 与 live 分开                                  |
| `npm run ui:check`                                       | 静态 UI 规则；不是视觉/交互验收                                       |
| `npm run markdown:check`                                 | 现行 Markdown 相对文件目标；不检查外部网址或事实语义                  |
| `npm run format:check`                                   | package script 实际覆盖范围的格式；Markdown 格式仍需定向检查          |
| `npm run build`                                          | 当前 Web production 构建                                              |
| `npm run test:ui`                                        | 构建后运行 Playwright production preview 回归                         |
| `npm run client:check`                                   | Rust/Tauri 编译检查；不是原生运行验收                                 |
| `cargo test --manifest-path src-tauri/Cargo.toml`        | Rust 单测                                                             |
| `cargo fmt --manifest-path src-tauri/Cargo.toml --check` | Rust 格式                                                             |
| `npm run client:build -- --no-bundle`                    | Tauri release 可执行文件；不是安装/升级验收                           |
| `npm run version:check`                                  | 平台版本源与镜像文件一致性                                            |
| `npm run version:consistency`                            | 嵌套 lock、Tauri 依赖、运行时版本源和活动源码版本硬编码审计           |
| `npm run verify`                                         | package.json 定义的组合检查；不能暗示包含全部 Rust/native/live 门禁   |

以当前 `package.json`、Playwright 和 CI 配置核对上述含义。改脚本时同步本表；没有命令、依赖或真实服务时报告失败/未运行，不写预测结果。

## 代码健康棘轮与 Windows 不安全模式扫描

两个静态检查移植自 [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) 的工程实践（MIT），配置与规则在 `scripts/governance/`，入口为 `scripts/check-code-health.mjs` 与 `scripts/check-windows-footguns.mjs`。

**代码健康棘轮**（`npm run health:check`）：每个函数和文件有自己的上限——圈复杂度 ≤20、函数 ≤300 行、嵌套深度 ≤6、文件 ≤2000 行。已超标单元取其在 base 修订上的实测值为上限，只许变小；新单元必须达标。base 默认为 HEAD 与 `origin/main` 的 merge-base（CI 用 `GOVERNANCE_BASE` 指定），只评变化的文件；解析失败按度量缺口失败，不读作"无发现"。`npm run health:check -- --report` 输出全库存量清单。行内豁免写在违规行或上一行的真实注释里：`// health: allow <RULE> -- 理由`。总开关 `ENFORCEMENT`（blocking/advisory/off）从 `origin/main` 的配置读取，分支不能自我放宽；若基线尚未存在配置，按 fail-closed 回退为 blocking，不能把首个引入分支声称为 advisory；配置进入主线后再由维护者决定是否保持 advisory 或改 blocking。

**Windows 不安全模式扫描**（`npm run footguns:check`）：规则表在 `scripts/governance/footgun-rules.mjs`，覆盖硬编码 POSIX 临时目录、硬编码用户目录、shebang 启动 node、无确认递归删除、生成 Windows 脚本未用 CRLF、schtasks 引号、OneDrive 已知文件夹假设、单反斜杠路径字面量、curl/irm 管道进 shell。只扫变化文件，`--all` 出全库清单；总开关 `FOOTGUNS_ENFORCEMENT` 同为 advisory。

GitHub Actions 统一固定到 commit SHA 并附版本注释；新增 action 时同样处理，不用可变 tag。

健康与 footgun 开关按完整变量名独立读取。`--report` 与 `--all` 只输出当前工作区清单，不接受 `--base`/`--head`；不支持的组合返回工具错误 2，普通 diff 检查使用指定 revision 的文件内容。固定 action SHA 时同时核对该 SHA 的输入契约；Rust toolchain action 必须显式传入 `toolchain: stable`。

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

历史证据保留，追加新的运行结果或勘误。若现有测试工具会写入固定证据路径，运行前必须保护旧输出并在专门测试任务中改为独立结果目录；reporter、截图和测试本身如需修改，应在明确范围的任务中审查，不借文档整理改写历史证据。需要留档的结果应连同 SHA、命令、时间和结论复制到新的 `docs/evidence/<task-date>/`，不得自动改写已有日期目录，也不得修改旧次数/hash 制造成功。

治理脚本的历史输出检查比较指定 `GOVERNANCE_BASE`（默认 `origin/main`）与当前文件：未改动的旧测试只保留缺口，发生改动的文件必须使用独立输出路径。基线引用不存在时先 fetch 正确基线，不能为修复基线读取错误去改产品测试。该检查不是完整证据保护系统；CI 中继承的报告文件也必须核对本次实际运行时间和结果，不能因 artifact 存在就认定它是新证据。

检查后的新增提交使旧 review 对新 SHA 失效，需再次审查。测试结果保留原 SHA 归属，对新 SHA 执行适用复验；影响构建的变动必须重新生成 Web/Tauri 产物。合并后验证最新主线的实际结果，不以两个分支分别通过替代合并后的检查。

## 故障、恢复和交接

验证失败时先复现、归因、最小修复，再重跑受影响检查；不要禁用有效检查、放宽断言或增加重试掩盖问题。额外缺陷入账，不未经说明扩张任务。没有真实凭据、ComfyUI/GPU 或 live eval 预算时，只继续可完成的本地工作，外部验收标 NOT RUN/NOT VERIFIED。

完成或中断前更新 change package、任务账本、PROJECT_STATE/AI_HANDOFF 的适用部分和 PROGRESS。恢复时重新读当前 SHA、worktree、端口/进程和文档，确认哪些旧 review/证据已失效。不要凭聊天中的“之前通过”继续发布。

