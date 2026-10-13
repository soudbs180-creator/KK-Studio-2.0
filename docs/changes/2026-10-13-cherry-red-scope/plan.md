# Cherry 红框融合实施计划

> 执行方式：subagent-driven-development；共用一个隔离 worktree，分配唯一文件写入者，root 负责公共接口、App 接线、治理与整合。

**Goal:** 完成红框范围可安全落地的功能接入，保留 KK 已有能力并以证据收口。

**Architecture:** 现有 Provider/TaskHost/项目持久化为主体；共享 Markdown 与分享组件，增量助手及比较契约；平台能力在原生宿主边界适配，不迁移 Electron。

**Tech Stack:** React18、TypeScript strict、Vite、Zod、现有 unified/remark、Tauri2/Rust、Node24。

**Spec:** [功能规格](spec.md)。

## Global Constraints

免费开源；不引入付费服务或许可；保留存储身份、精确模型/账号绑定、unknown 防重和原件；不修改主工作区并发 UI；固定 1421/1423 测试串行，未测不报 PASS。

## Review Focus

- 恶意 HTML/URL、未闭合流式 Markdown、大段代码与 Unicode 不破坏消息或执行脚本。
- 本地免密不能扩散至远程服务，旧配置与旧 TaskHost fingerprint 保持兼容。
- 跨会话迟到结果、取消竞态和独立比较失败不得污染其他项目/账号。
- 原生 owner 锁与子进程树生命周期一致；不误杀外部进程，不在凭据缺失时明文降级。
- 保存、运行加载、取消受理、最终成功与真实平台验收分别报告。

## Task 1 基线

- [x] 固定 HEAD、保存 dirty 边界，创建隔离 checkout 并复用依赖 junction。
- [x] typecheck 通过；初次 npm test 1031 项、1015 pass、14 skip、2 fail，失败涉及未构建 Agent dist。
- [x] 按正式 agent:build 生成运行依赖，重跑失败测试与完整 baseline；不改断言。

## Task 2 消息与分享

- [x] 先失败测试：Markdown 结构/安全/流式、剪贴板失败、Unicode 导出、URL 释放。
- [x] 新共享 renderer/share helpers 与 actions；接 ConversationMessages/AgentConversationMessages/ConversationHeader。
- [x] root 接 Header 导出与 App CSS；三通道定向 DOM/行为回归。

## Task 3 Provider、本地模型

- [x] 先失败测试：协议 endpoint/auth/discovery、loopback 免密、远程拒绝、取消/严格终止。
- [x] 扩展现有 schema/settings/adapter；维持旧默认与身份，不创建第二 registry。
- [x] Web 与 Native text 请求契约接线；本地 fixture 集成，不调用付费 API。

## Task 4 精选助手与多模型

- [x] 准备编程/图片/视频精选原创指令；自定义持久化、校验、复制/删除恢复。
- [x] root 使用现有 composer/model selector/项目消息持久化接助手，工具权限不升级。
- [x] 文本比较按每路冻结身份和状态；单路失败、总停止、迟到响应与重载恢复回归。

## Task 5 三平台/MCP/桌面体验

- [x] 共用凭据模块、平台 features/lock；manifest/node/权限和 owner/子树契约先测试后实现。
- [x] 保留 Windows JobObject 行为，增加免费平台构建 workflow；真实环境缺口独立登记。
- [x] 校准 MCP 卡及接线边界；透明能力和就绪状态按实际宿主反馈。

## Task 6 收尾

- [ ] 全量门禁完全通过：本地静态/unit/Agent/build/Rust/Native通过，完整浏览器既有5项与Hosted quality仍需收口。
- [x] 独立审查实际 diff，修复发现，不把自检标为独立审查。
- [ ] 整合到最新主工作区：并发UI/角色/模型设置仍dirty且Hosted quality未通过；已更新本任务卡片/账本/PROGRESS/验证，保留主工作区原位。
- [x] 记录来源/许可、实际工件 hash 和未测外部能力；不自动发布或宣称全部三平台验收。
