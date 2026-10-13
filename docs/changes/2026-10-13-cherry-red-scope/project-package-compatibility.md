# 原生项目包的助手与文本任务兼容

- Task：TASK-CHERRY-RED-001；日期：2026-10-13。
- 范围：修复助手草稿、比较文本任务和既有完成输出索引的 `.kkproject` 导出/预检/恢复阻断。
- 实施上下文：隔离 Cherry worktree；本记录写入前 HEAD 为 `28ca643de37924aff97e8811ca1dd8bfceb86722`，本项源码仍未提交。并发前端整合另由 root 负责，不把本项测试称为整个组合已验收。
- 文件：[既有项目包严格验证](../../../src-tauri/src/project_package_snapshot.rs)、[现有项目包 Rust 测试模块](../../../src-tauri/src/project_package.rs)。未修改 Cargo、依赖、App、TaskHost、正常快照存储或权限契约。

## 根因和修复

`export_package` 在发布目标文件前调用 `validate_entries`，后者调用现有 `snapshot_schema::validate`。正常快照保存接受新增字段，严格项目包白名单却没有同步，故选择助手或提交比较任务后，真实导出返回 `corrupt: 项目快照无效`。普通前端 normalizer 单测不能覆盖此原生链路。

仅扩展已有 package-only 验证器，没有创建第二套项目库或整体 snapshot schema。采用[现有前端读取契约](../../../src/features/creation/model.ts)的以下范围，所有字段保持可选，旧项目仍可读取：

| 字段                                         | 保持和拒绝规则                                                                                                              |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 草稿 `providerConnectionId`                  | 最多 120 个 UTF-16 code units，保留既有账号身份                                                                             |
| 草稿 `assistantId`                           | `assistant-` 加 1–140 个 ASCII 字母、数字、下划线或连字符                                                                   |
| 草稿 `conversationRoutes`                    | 最多三路；每路仅 `connectionId`/`modelId`，分别最多 160/120 个 UTF-16 code units                                            |
| 任务 `providerProtocol` / `providerAuthMode` | 仅既有三个协议及 `api_key`/`none`；免密仍限本机回环文本任务。图片任务现有合法协议/API 认证元数据可保留                      |
| 任务轮次/用户消息 ID、消息 `roundId`         | 非空，最多 160 个 UTF-16 code units                                                                                         |
| 任务 `conversationMessages`                  | 仅文本任务，1–32 条，仅 `role`/`content`，角色为 user/assistant/system，总内容最多 64 KiB UTF-8 bytes；不增加权限或工具字段 |
| 输出 `text`                                  | 最多 32768 个 UTF-8 bytes，保留文本结果和流式草稿                                                                           |
| 既有 `completedOutputIndices`                | 非空、最多 64 项，0–63 的整数，严格递增且无重复；拒绝会被前端去重/排序/删除的有损输入                                       |

上下文非空判断使用 JavaScript `String.trim` 的空白集合。实际 Node 探测确认 BOM 会被 trim，NEL 不会；新增原生校验与此一致，不使用 Rust `trim` 产生差异。原先未知字段和递归 credential-key 拒绝、校验和、目标目录保护及原子发布均保留。已按 `CreationTask` / `CreationTaskOutput` 定义核对字段，本项补齐上述实际遗漏，没有泛化接受其他未知字段。

## RED → GREEN 实跑

运行器：本机 Windows Rust，所有包测试使用合成数据、独立临时源目录和另一个临时恢复目录；不读取用户 AppData、不请求 Provider、不调用系统 vault。

1. 仅添加往返测试、尚未改生产验证时，助手/比较/UTF 边界三项全部在 `export_package` 报 `corrupt: 项目快照无效`，结果 `0 passed; 3 failed`，exit 1。
2. 追加完成输出索引和图片协议元数据测试，各独立实跑 `0 passed; 1 failed`，同样在真实导出阶段失败，exit 1。
3. 校准 JavaScript 空白前，NEL 往返测试实跑失败；修正后 NEL 保留、纯 BOM 上下文拒绝。
4. 最终新增 8 项通过：真实 export → preflight → 独立数据根 import → 仓库重开；逐项比对完整快照、source bytes、校验和和素材原件。包含混合旧项目、三协议、loopback none、合法图片元数据、64 KiB/32 条上下文和 32768-byte 结果边界。
5. 拒绝测试覆盖无效助手 ID、超限 UTF-16 身份、超三路、未知权限字段、无效协议/认证、远程免密、非文本比较、空白/超限/工具上下文、超限文本结果、空/重复/乱序/越界/小数完成索引。失败导出不创建目标，源文件 bytes 不变。
6. 对真实已导出 archive 注入 credential/permission 字段并重算校验和；实际 preflight 和 import 都拒绝，恢复目标未创建。不是只测试内部 helper，也未以校验和错误冒充 schema/secret 拒绝。

实跑命令和结果：

```text
cargo test --manifest-path src-tauri/Cargo.toml --bin kk-studio --no-default-features --locked project_package::tests::cherry -- --test-threads=1
8 passed; 0 failed; 0 ignored; 138 filtered out; exit 0

cargo test --manifest-path src-tauri/Cargo.toml --bin kk-studio --no-default-features --locked project_package::tests -- --test-threads=1
18 passed; 0 failed; 0 ignored; 127 filtered out; exit 0
此轮发生在增加第八项空白回归之前；随后完整 Rust 覆盖最终 19 项项目包 tests。

cargo test --manifest-path src-tauri/Cargo.toml --no-default-features --locked -- --test-threads=1
146 passed; 0 failed; 0 ignored; 0 filtered out; exit 0

cargo fmt --manifest-path src-tauri/Cargo.toml --check
exit 0

git diff --check -- src-tauri/src/project_package_snapshot.rs src-tauri/src/project_package.rs
exit 0
```

保留五条已有 dead-code warnings：`asset_io::{original_exists,temporary,sync_parent,atomic_write}`、`task_host::tests::fail_at`，没有修改或屏蔽。

## 生产构建与证据边界

本项随后实际运行 `cargo check --manifest-path src-tauri/Cargo.toml --locked`，exit 1：并发前端构建期间 `tauri::generate_context!()` 在 `main.rs:1707` 引用的 `dist/assets/index-CzVpTtXN.css` 不存在。没有修改产物或启动旧包；root 在稳定组合前端 build 后重跑生产检查。该失败不写成 PASS。

最终两个源码文件 SHA256（实际 bytes，包含现有换行）：

```text
src-tauri/src/project_package_snapshot.rs
A1EF62E19E2FB6D35AEA7714C0E85347FE7A2C56AD8BD508F5E4D0B3C7DDC0E9
src-tauri/src/project_package.rs
1D408551FB5EB7DF3526FE38352C02C6546F7E4D66720D38EA4760A46ECC4EC7
```

本项是受限原生兼容修复；没有提交、push、独立最终审核、GUI、安装/签名或真实 Provider 验收。原始 RED/GREEN stdout 保存在本 chat 工具执行记录，未创建额外日志文件；最终组合的持久证据与 SHA 绑定由 root 收口。相关总体验证与历史边界仍见[原验证记录](verification.md)。
