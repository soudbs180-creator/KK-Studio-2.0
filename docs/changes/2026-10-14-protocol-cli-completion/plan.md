# Protocol and CLI Implementation Plan

> Agent执行方按task执行；root是主worktree唯一writer，子代理只读或工程外补丁，补丁由root审阅后应用。

**Goal:** 把2.1.21未接协议/CLI接入既有执行链，同时保留资料与实际控件尺寸。
**Architecture:** domain的协议/认证字段与请求builder；现有TaskHost、租约和CAS执行；Native只读discovery与受限CLI操作，共享UI按屏幕布局消费token。
**Tech Stack:** 既有React/TypeScript/Zod/Node24/Tauri2/Rust，无新增产品依赖。
**Spec:** [spec](spec.md)。

## Global Constraints

存储v1/identifier/credentialRef保留；不修改外来dirty/index、不reset/clean、无paid自动测试、不运行登录、不引入不安全proxy。Desktop→Web→NativeMobile保持；手机本轮为响应式Web。1421/1423 strict，只有拥有进程可关闭。新版本从唯一platform版本源递增。

## Review Focus

旧字段缺省与协议/认证更改后的任务冻结；remote免密与redirect/DNS；终态/工具/中断不能成功；CLI部分安装/version假阳性和配置读错丢失；真实缩放/触摸命中与手机导航回焦。

## Tasks

- [x] 协议domain与保存：先RED覆盖legacy、5协议、loopback-none/remote拒绝；实现profile/connection、registry与保存、preset/字段；保持旧key。
- [x] 任务冻结/持久化：model、snapshotCodec、imageTaskCommand、submission binding、App/native请求、creation/project-package Native白名单；旧请求fingerprint保持；protocol变更不能改投、roundtrip无损回归通过。TaskWorkbench的URL仅用于现有审批，不新增协议路由。
- [x] TS/Rust文本路由：对应payload/header及boundedSSE；Native discovery与main IPC；本地HTTP实际API合约、取消/截断/HTTP分类回归通过，窗口内结果重载另读交付回执。
- [x] CLI与生产包：受限操作、完整依赖和3个无付费入口已实现；安装/登录owned-process fixture、读取失败和负缓存已通过。真实随包CLI无付费检测、桥夹具以及官方新构建/便携运行通过；真人安装/登录仍独立验收。
- [x] UI：手机缩放控件、字号/尺寸和导航层级已实现，7个production场景通过；完整551场景与原生22/便携23项通过，保留fixed panels及upload世界坐标。
- [x] 交付：完整verify/Rust/官方新EXE+Native/portable实际验收；独立当前SHA review；同功能体积记录，账本/PROGRESS/Current/Handoff；提交、源码/Web/portable/recovery增量与哈希。

最终产品da6141e6与文档增量按verification及工程外current-release/validation逐字节绑定；本机交付不等于Hosted、签名、真人账号或Native Mobile完成。
