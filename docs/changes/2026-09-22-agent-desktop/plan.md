# Desktop Agent Implementation Plan

> 使用 executing-plans 在本会话自主执行；独立上下文完成最终预检。遵从不提交、不推送及增量回传要求。

**Goal:** 完成 Codex/Agent 清单中的 Windows 桌面托管，并重新核验旧完成项。
**Architecture:** 现有 Agent 协议不变；有版本控制的集成脚本准备隔离 vendor，Node 入口握手后运行，Tauri 管理生命周期与资源，设置页复用现有连接 store。
**Tech Stack:** Rust/Tauri 2、Node 24、React 18、TypeScript、Playwright。
**Spec:** ./spec.md

## Global Constraints

保留既有 UI 和存储身份，不提交/推送，不终止外部进程，不将凭据写入磁盘/日志/URL。源码回传基于原件 SHA 核对。外部服务不可用时保留准确边界。

## Review Focus

- 主进程启动失败/崩溃时是否残留子孙进程或误停另一实例。
- 已发 turn 的断开是否被当成安全重试。
- 打包生产依赖是否带入源码链接、秘密或错误平台二进制。
- MCP 子进程是否沿用专用 Agent 配置与正确 Codex 登录。
- 旧 Web/Desktop 证据与当前源码/产物是否对应。

## Task 1：基线和旧完成记录

- [x] 保存当前源码指纹，在隔离快照运行完整 verify（351 Node、266 browser）。
- [x] 独立核验旧源码/构建/桌面证据，登记仍有效与已过时边界。

## Task 2：资源与生命周期

- [x] 先写真实入口握手、凭据不落盘、生产打包及停止回收测试并观察失败。
- [x] 实现受控 vendor 集成、运行资源包、Node 启动握手和原生 Job Object。
- [x] Rust/Node 定向回归；异常启动、重复启动、主进程退出均有实际证据。

## Task 3：设置接线与桌面验收

- [x] 增加桌面入口及真实状态，先写 Web/模拟 IPC 回归。
- [x] 新构建 Tauri 并验证实际加载资源、启动/停止/重连/恢复；真实 Codex 操作单独记录。
- [x] 全量门禁、独立预检、清单/卡片/账本/进度更新。
- [x] 校验原件指纹后仅回传本轮增量，复核原工程运行与文件保留（integration.json记录）。
