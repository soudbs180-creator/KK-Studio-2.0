# 实施计划

> 使用 superpowers:executing-plans；用户已授权按当前顺序持续推进。

Goal：通过现有 Desktop 项目包入口安全恢复旧 Node 备份。
Spec：[spec.md](spec.md)。不引入新依赖、IPC 或第二套写入路径。

## 任务 1：真实格式和失败证据

- 复用 TASK-STORAGE-CLOSURE-20261109 工作树，记录 HEAD/dirty/目标指纹，扩展本任务 scope，保留其他任务222条。
- 真实 CompanionStore 生成带引用/未引用原件、origins、聊天和扩展字段的 v2/v3 fixtures（合成数据）。
- Rust 测试现有 preflight/import JSON 路径，先观察 ZIP-only 的失败，再添加安全拒绝和故障测试。
- Expected：正确 fixture 在未实现前失败；source 字节可复核。

## 任务 2：最小读适配与调用入口

- bounded strict JSON、受控路径及祖先拒链接、SHA/size/revision/metadata/references 验证，返回已有 ValidatedPackage。
- 仅在 read_and_validate 根据首个非空白字符分派；复用 existing import staging + Native migration。
- 原生 open 增加 JSON filter，save 不变；添加真实 React handler/IPC 序列测试。
- Expected：健康 v2/v3、全素材、保真、拒绝/故障回滚全过，既有 ZIP 测试不回退。

## 任务 3：验证与交付

- cargo test（全 Native）、TypeScript/typecheck/lint/全 unit、UI/tokens/rules、完整 verify 适用门禁；日志和当前源码指纹记录在容器 output/storage-transfer-20261109。
- 新鲜上下文审查实际差异（提交候选绑定 SHA 后正式审查）；P0/P1 必须修复。
- 更新功能卡、verification/review、任务/交接/memlog。桌面源码已变化，旧 df597194 安装包不能冒充新源码；后续构建/BAT 证据必须重新绑定新候选。

## Review Focus

备份不可信、源保全、未引用原件、JSON 重复字段、路径大小写/重解析、缺 provenance 的合法旧数据、未来格式、v2/v3 附加字段、文件/总量界限与原子发布失败。不得以 fixture 测试替代真实用户数据或外部验收。

## 执行裁决

- 真实 Node v2 fixture（正常 serializer 生成）同时保留 root.agentThreadId 和 chats 中同一线程，现有 Native 迁移新建第二个线程关联后拒绝。修复共享迁移根因：只有唯一、完全相同的既有 Codex 线程可复用；多个/不同来源仍拒绝。代价是共享迁移需全量原生回归，不通过删 fixture 字段或删旧聊天绕过。
- UI 验证已有 tests/browser/project-package.spec.ts，直接扩展，避免再建相同 unit harness。文件选择器过滤器属于工程入口行为，无新增布局/样式；此前当前 Figma 读取记录仍单独限定，不冒充本轮视觉验收。
- 真实备份 JSON 是按字节 SHA 绑定的测试原件，入库加 `.fixture` 后缀，测试暂存时仅还原文件名；避免格式化破坏真实 Node 字节及校验和。不改格式门禁、基线或生产文件名，Native 测试继续逐文件核验 SHA。
