# P8 Implementation Plan

> For agentic workers: superpowers:executing-plans；用户禁止子代理，本代理连续执行。

**Goal:** 保持App视图/状态语义，把现有装配责任移至src/app，准备受控合流。
**Architecture:** 复用原七组装配闭包与现有Port；仅移动并给外部依赖明确类型，CSS/lazy加载仍由App管理。
**Tech Stack:** TypeScript/React/Tauri与已安装测试工具，无新增依赖。
**Spec:** 本目录spec.md；执行规范§17。

## Global Constraints
不修改JSX/样式、存储key/数据格式，不把fixture当REAL；复用已有树，保留主仓dirty。main合流是本轮授权，push/发布与真实计费不执行。独审不能由自检冒充。

## Review Focus
effect依赖与稳定ref捕获；React StrictMode卸载/重挂；只读加载/迟到保存；同sid/多桥清理；iframe与现有功能开关保持。

## Task 1: 保全与基线
- [x] 保全主仓dirty字节、patch、索引对象清单，列出合流重叠路径。
- [x] 保存7927 AST/JSX/CSS及限定浏览器同态基线。
- [x] 为装配迁移写接口/清理回归，先见RED；旧业务回归不删断言。

## Task 2: 装配hook迁移
- [x] 新增src/app/useAppSkills.ts、useHomeModelConfig.ts、useAppAgentState.ts、useActiveProjectConversation.ts、useAppTaskCoordination.ts、useAppSettings.ts、useAppAgentBridge.ts；沿用App调用顺序。
- [x] 调整App及conversationSubmitScope测试源码入口；AST比对、类型/lint/全单元、构建与浏览器同态。
- [ ] 版本53、台账、总覆盖、状态与交付文档同步；提交源码候选。

## Task 3: 合流门
- [ ] 跑完整verify等价阶段（串行固定1423，workers1/retry0）、明确所有失败及归属。
- [ ] 当前SHA独立review/CI；缺失不能自称通过。
- [ ] 所有适用门满足后，保留dirty patch并合main，复核原文件、重跑受影响检查；否则给出具体阻断与可审阅候选，不重置/clean主仓。

执行记录：初始main c2a0228a，HEAD79275961，main落后23提交；主仓有未提交Figma审计，保全清单/重叠见工程外merge-preflight.json。P8原总表是未实施，不把上一轮2378单元作为完整verify证明。

2026-10-29实施记录：35函数/12桥语句/2effect与JSX同态；同版本固定输入、软件Edge四图/DOM一致。App2002→1546；主仓21文件保全。原Codex四失败发生在P8前后，门禁修复单列。用户禁止子代理；独审仍NOT_VERIFIED。

## 2026-10-29 合流门续修

用户已明确授权一次只读独立评审，替代此前禁止子代理的限制；仅审查，不授权桌面控制。既有评审已完成c2a0228a→78beb7a9范围，后续提交须补审。

本次只修交付底座：根清单显式声明契约已使用的semver7.8.5及其类型7.8.0；补桌面指纹遗漏的契约TS/受控清单，同时排除本地安装与日志、保留链接拒绝；transpiler的types.ts按实际OpenAI/Anthropic协议职责更名protocolTypes.ts并同步全部内部引用，公开index出口不变。不改产品UI/协议/数据，不扩展依赖能力；构建/安装准备按VERSIONING不递增产品版本。

验证：隔离干净npm ci根/Mobile及双方类型检查；指纹先RED后GREEN，修改/新增/删除/安装噪声/链接边界；快速三门禁和构建；新提交SHA只读补审。原全量浏览器流程停在447/901，无最终退出，按INTERRUPTED保留证据；108失败需要分类修复，不把339项通过当整体验收。

## TASK-MOD-CHAT-DELIVERY（2.1.57）

完整浏览器真实失败续修：已成功且通过画布校验的文本结果复用appendChatTaskReply，按task.originChatId回到原聊天；无原聊天/已删请求不新造聊天，不改当前草稿，不重复回复。另修离线首次打开/切换聊天时，disconnected Agent store尚未投影本地消息：syncProject只读桥接消息，不发网络、不写项目、不改变连接状态；已连接链仍沿用原epoch/归属保护。这是数据状态修复，无JSX/CSS/交互设计变化，无需修改Figma。

真实publisher新增五种归属/删除/重复回归，Agent实际host新增离线A→B→home只读回归，先RED后GREEN。桌面/Web实际行为变化，按VERSIONING递增56→57，Mobile43不变。75项定向通过；快速三门禁、构建和原两文件浏览器随后取证；未解决的旧界面/菜单前置及治理分支顺序另留开放。

## TASK-MOD-MODEL-DRAFT（2.1.58）

模型目录每次读取生成新对象，依赖对象身份的effect会将未保存草稿重置。以当前账号/模型/已保存元数据内容签名判断是否需重载，内容不变的通知不回写表单；真实切换或元数据变化仍同步。仅数据同步条件变化，无JSX/CSS/设计或新交互；保存locator按同一现行操作“保存此模型参数声明”更名，保留所有持久内容断言。浏览器先在supported→unknown真实RED，修复后原草稿和保存断言GREEN；中间旧按钮定位失败保留。

目录拉取另有开放缺陷，暂不改旧目录触发测试：M3规格明确测速/目录分开，但按钮仍承诺刷新且FRONTEND-SPEC保留JSON验证条款；须先核当前Figma。独立目录解析把image/unknown改text、接受{}空列表，缺取消/迟到/目标归属复核；下一步复用现有checkModelProvider严格发现链，保留原安全断言，不以放宽测试关闭。没有合流或启用新增能力。
