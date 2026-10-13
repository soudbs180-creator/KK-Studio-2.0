# Cherry 红框融合实施计划

当前最近完成验收的候选为 `88740c5b23f1cf5f0896d471b4339d9db39f4b9b`，产品源码与 `cc184e59` 相同；Desktop/Web 2.1.18、Mobile 2.1.1。四个 exact-head Hosted quality/Native 运行全部 SUCCESS，独立源码补审及 Windows 原包证据审计 PASS。最后新增三平台真实原生背景读回/恢复检查尚待冻结提交和实跑。任务保持 PARTIAL，最终用户产品结果/发布范围确认仍按 BRANCH-POLICY 单列；没有合并 main、发布或更新 primary 快捷方式。primary 并发源码与暂存内容保留；不宣称原 index 原始字节跨时刻不变。

> 执行方式：subagent-driven-development；共用一个隔离 worktree，分配唯一文件写入者，root 负责公共接口、App 接线、治理与整合。

**Goal:** 完成红框范围可安全落地的功能接入，保留 KK 已有能力并以证据收口。

**Architecture:** 现有 Provider/TaskHost/项目持久化为主体；共享 Markdown 与分享组件，增量助手及比较契约；平台能力在原生宿主边界适配，不迁移 Electron。

**Tech Stack:** React18、TypeScript strict、Vite、Zod、现有 unified/remark、Tauri2/Rust、Node24。

**Spec:** [功能规格](spec.md)。

**当前执行身份：** `codex/TASK-CHERRY-RED-001-mainline`，base 为 `694a00607f6f63de1b8c43d0ebb117adf5d34f67`，首轮主线源码已冻结到 `7daeba25`；其后实际 SDK 与安装包暴露的关联问题在 2.1.18 修复中。任务保持 PARTIAL，最新证据见 [最终记录](mainline-final-status.md)。以下 DONE 只表示列出的实施或检查步骤完成，不提升整项任务或功能真实程度。

## Global Constraints

免费开源；不引入付费服务或许可；保留存储身份、精确模型/账号绑定、unknown 防重和原件；不修改主工作区并发 UI；固定 1421/1423 测试串行，未测不报 PASS。

## Review Focus

- 恶意 HTML/URL、未闭合流式 Markdown、大段代码与 Unicode 不破坏消息或执行脚本。
- 本地免密不能扩散至远程服务，旧配置与旧 TaskHost fingerprint 保持兼容。
- 跨会话迟到结果、取消竞态和独立比较失败不得污染其他项目/账号。
- 原生 owner 锁与子进程树生命周期一致；不误杀外部进程，不在凭据缺失时明文降级。
- 保存、运行加载、取消受理、最终成功与真实平台验收分别报告。

## Task 1 基线

| 步骤                                          | 状态 | 实际完成范围与剩余                                                                                                                      |
| --------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 固定 HEAD、保留 dirty 边界、创建隔离 checkout | DONE | 初始 `51fccfc7` 与后续主线 `694a0060` 分别记录；primary 原位和 index 保留。开发 junction 后已替换为锁定实体依赖，不能作为正式依赖证明。 |
| typecheck 与首次完整单测基线                  | DONE | 首次 1031 项为 1015 PASS、14 SKIP、2 FAIL，失败涉及未构建 Agent dist；失败原义保留。                                                    |
| 正式 agent:build 后重跑基线                   | DONE | 1031 项为 1017 PASS、14 SKIP、0 FAIL；未删断言。该历史基线不替代当前主线门禁。                                                          |

## Task 2 消息与分享

| 步骤                                                 | 状态 | 实际完成范围与剩余                                                                  |
| ---------------------------------------------------- | ---- | ----------------------------------------------------------------------------------- |
| Markdown、安全、流式、复制失败、Unicode/URL 故障测试 | DONE | RED/GREEN 与后续单测保留，未允许 HTML 执行或扩大 URL 协议。                         |
| 共享 renderer/share helpers/actions 接入各消息通道   | DONE | 普通、Agent、Google 使用既有消息身份和持久化链；本地复制/导出不引入公网分享。       |
| Header/CSS 接线及三通道 DOM/行为回归                 | DONE | 当前主线完整浏览器 522/522 PASS；最终 Desktop bundle 仍需新提交构建与 Native 重跑。 |

## Task 3 Provider、本地模型

| 步骤                                                      | 状态    | 实际完成范围与剩余                                                                                                                         |
| --------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 协议 endpoint/auth/discovery、loopback/远程边界及取消测试 | DONE    | 当前 Node/Rust 与浏览器覆盖；免密只允许明确 loopback 文本服务。                                                                            |
| 扩展原 schema/settings/adapter 并保留旧身份               | DONE    | 无第二 registry；保存失败保持 unverified，账号、credentialRef、任务身份保留。                                                              |
| Web/Native 文本集成和真实本地服务验收                     | PARTIAL | fixture 已验证；旧 `f8ead4fa` 有真实 Ollama Native 证据。当前主线 fresh Native、真实 LM Studio/其他供应商仍 NOT VERIFIED，不调用付费 API。 |

## Task 4 精选助手与多模型

| 步骤                                        | 状态    | 实际完成范围与剩余                                                                               |
| ------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| 精选原创指令及自定义校验/复制/删除恢复      | DONE    | 少量常用助手和 3000 字符限制已接入，不以助手数量替代能力验收。                                   |
| 用现有 composer/model selector/快照接入助手 | DONE    | 当前源码/浏览器回归已验证，不升级工具权限，不冒充图片或视频真实生成。                            |
| 比较各路身份、失败/停止/迟到/恢复回归       | PARTIAL | 当前单测及完整浏览器通过；旧 dirty Native 六组含双模型链路。当前不可变主线 Native 重跑尚未完成。 |

## Task 5 三平台/MCP/桌面体验

| 步骤                                               | 状态    | 实际完成范围与剩余                                                                                                            |
| -------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 共用凭据、manifest/node/权限、owner/子树实现与测试 | DONE    | 当前 Windows Rust 154/154 PASS；测试驱动与默认发行 feature 分开，输入/HEAD/EXE hash 必须匹配。                                |
| Windows JobObject 与免费三平台构建/发行验收        | PARTIAL | 旧 81c 三平台 no-bundle 构建通过；旧 0e77 失败保留。当前默认 macOS/Linux 包与三平台 Hosted/安装实际结果须在冻结新提交后取得。 |
| MCP/透明能力与平台就绪边界校准                     | PARTIAL | 卡片/源码及旧 Windows 透明 fixture 有证据；真实第三方 MCP、当前三 OS GUI/安装及最终透底体验仍 NOT VERIFIED。                  |

## Task 6 收尾

| 步骤                                      | 状态         | 实际完成范围与剩余                                                                                                                                                                                           |
| ----------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 当前 dirty 主线的本地完整 verify 与 Rust  | DONE         | verify exit 0：1127 unit（1113 PASS、14 SKIP）、174 Agent（172 PASS、2 SKIP）、522 browser 全 PASS、development 四步 PASS、UI 237/0；Rust fmt/test 154/154 PASS。App 仍有两项 advisory，未调低阈值或加豁免。 |
| 冻结最终提交并完成 Native/Hosted/工件门禁 | NOT VERIFIED | 未提交源码被 Native build guard 正确拒绝；须以新 head 重建默认发行与测试驱动，再回读三平台 CI、安装/包收据及 Delivery。                                                                                      |
| 独立审查实际 diff 并修复发现              | PARTIAL      | 旧 015f/81c 与后续旧源码审查只覆盖各自 SHA。主线承接、最终构建脚本和包装增量仍需 fresh context、base/head 绑定复审。                                                                                         |
| 主线承接、治理与 primary 整合             | PARTIAL      | 已在最新 main 派生的隔离分支承接；125 原任务保留并追加 Cherry 为第 126 项 PARTIAL。primary 的 111 项捕获中 100 同、11 后续变化、0 缺，未覆盖其依赖变更，未声称 primary 或 main 已集成。                      |
| 来源/许可、hash、历史失败与外部能力记录   | DONE         | 原始日志按字节归档；旧 `f8/688/0e77/windows-fixed-head` 均保留身份和边界。最终用户产品验收、真实第三方接口及发布仍 NOT VERIFIED。                                                                            |

当前门禁与收据见 [验证记录](verification.md)、[主线承接](mainline-integration.md)、[Native 边界](native-runtime-closeout.md) 和 [审查](review.md)。后续结果只追加实际新证据，不将历史失败修改为 PASS。

## Fresh 预检后的执行更新

上表的完整 verify DONE 表示前轮 1127/174/522 实际执行完成；之后 MR001–MR003、默认包和 runtime receipt 已有新增修改，最新完整 verify 正在重跑，尚不填 PASS。

| 增量步骤                                                  | 状态         | 当前证据与继续条件                                                                                                                                                                    |
| --------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MR001 authenticated Anthropic 浏览器头                    | DONE         | RED 头为 null，增加官方 SDK 对应 true header、none 不改；providerProtocols 全文件 24/24 PASS，fresh dirty finding 关闭。                                                              |
| MR002 完整目录身份与 manual 继承围栏                      | DONE         | id/base/ref/protocol/auth；legacy undefined 默认兼容，null/非法/remote-none 拒绝；GREEN 14/14、作者相关 76/76、reviewer 独立组合 38/38。RED 14 项10 FAIL仅当轮 stdout，没有虚构 log。 |
| MR003 迟到失败健康围栏                                    | PARTIAL      | 真实 browser RED active→quarantined；两个失败分支补 healthUnchanged，六项新场景及旧 429/403 回归共21/21、零重试 PASS；最终 fresh exact-head 复核待冻结。                              |
| 默认 Mac/Linux 包实现与校验器                             | DONE         | workflow + package-portability 实施完成，self-test 9/9；默认 feature app/dmg/AppImage/deb，默认包不含 driver，push/PR paths 覆盖实际输入。                                            |
| 四种 actual package 与 Native Agent 资源回执              | NOT VERIFIED | receipt/runtimeManifestHash 和 target hash guard 已接入；实际四种包、默认启动及新 head Native 必须 Hosted 实跑，不能用 self-test 替代。                                               |
| 修复后完整 verify、冻结提交、Hosted/Delivery/正式独立审查 | NOT VERIFIED | root 正在重跑完整门禁；App 当前3246/395 vs base3241/388两项 advisory，未放宽阈值。回收真实结果后冻结 head，再构建与审查。                                                             |

已保存定向输出及来源见 [verification](verification.md) 的本轮增量表；最终用户产品验收和 primary 后续依赖保护继续保持原边界。

## 2.1.18 实际验收收尾依赖

1. SDK真实RED→MCP最小协议修复；Linux原包资源mismatch→正式producer保护（两作者文件独占，源码已释放）。
2. Mac根URL、Windows真实8.3物理身份修复；版本/原命令入口与小report上传接线。
3. 同一候选完整verify/Rust/格式/类型/health/footguns；冻结新提交，正式independent exact-SHA review。
4. 当前默认release/optional driver/NSIS重建并分别核hash；真实SDK1.30/SDK2服务器、Ollama、Native与安装验证；实际三平台Hosted和原包验收。
5. 回写实际proof/许可/feature/ledger/PR；用户最终产品验收之后才决定main合并或DONE。

本次新增helper/测试/source guards不能替代第四步实跑，旧失败、不同source SHA与产物回执各自保留。

## 最新步骤验收覆盖

Task1–6的代码接入、基线保护、源码审查、浏览器/原生/真实Ollama/两个官方MCP SDK及三平台默认包/安装检查已有实际证据，见最终记录。历史表的待验状态保留执行当时边界；本次新增Native背景读回/恢复断言须新exact-SHA三平台验证及补审，之后才完成全部技术步骤。最终用户产品结果/发布范围确认仍为外部验收条件，整项任务不得提前标DONE。
