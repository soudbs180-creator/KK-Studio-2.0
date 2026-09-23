# 文本任务与规则门禁独立预检

日期：2026-09-22。结论：**dirty-diff preflight PASS**（已审范围无未关闭 blocker）。正式已提交 SHA 绑定 review、GitHub 审批、用户产品验收、发布授权：NOT VERIFIED/未执行。

Base/HEAD 均为 cf344ddcdf039c6e62aeb9c65106e2a2339c0bb4，本轮实现尚未提交。实际文件身份见 source-manifest.json；原有无关 dirty 改动不在评审结论内。未 commit/push。

## 审查身份与范围

- Self-review：root，检查intent/spec/plan、真实diff、持久化、取消/未知受理、跨项目晚返回、文本大小、旧图片兼容及规则冲突。
- 独立只读 AI：collaboration agent `/root/text_review`，独立上下文、仅读当前规则/计划/实际代码与baseline，无写权限使用、未参与实现。工具未提供可核实模型版本。
- 覆盖本轮TS文本链、Rust TaskHost/text SSE、UI结果编辑、恢复、规则validator/测试；新增runtime脚本的断言和报告经复核。检查不等于整个产品零缺陷。

## Finding 闭环

| ID | 严重度 | 问题与修复 | 状态与证据 |
| --- | --- | --- | --- |
| TXT-R1 | P1 | WebView重载丢失浏览器lease释放回调，后续生成卡在并发满；Desktop改由原生jobs按凭据管理有界并发 | CLOSED；容量1、生成中刷新、取消与后续生成实机通过 |
| TXT-R2 | P1 | 原生event:error/tool/refusal可在已收到片段后伪装成功；严格拒绝错误事件、非文本增量与非SSE响应 | CLOSED；Rust先失败再通过 |
| TXT-R3 | P1 | await后来源/任务已变仍可能提交；在持久化后和发送前重读当前状态 | CLOSED；删除来源期间延迟hash的浏览器回归零请求 |
| TXT-R4 | P1 | 7,500字输入超出4,000字快照上限；输入UI/validation统一4,000；长输出编辑只改result，不写prompt，保存校验32 KiB | CLOSED；输入单测、长文案真实保存/刷新 |
| TXT-R5 | P1 | 恢复重写用户编辑过的生成结果；仅补缺失结果，保留现有标题/正文 | CLOSED；先红后绿单测、Desktop编辑后刷新 |
| RULE-01 | P2 | 无证据REAL、历史字符串状态匹配、OBSOLETE算开放任务、畸形字段崩溃/路径越界 | CLOSED；隔离fixtures8项与真实登记28/0 |
| RULE-02 | P2 | 功能卡误称只读生成物、验证不足只能Prototype与PARTIAL矛盾、Wave1/Wave2依赖混用、旧聊天能力误述 | CLOSED；现行规则/卡片/roadmap与ledger勘误 |

## 独立复核证据

独立agent重新执行31项相关Node单测、17项TaskHost Rust测试和features28/0，全部通过；复查runtime脚本中的同一POST重连、原生并发、编辑保留、取消、无浏览器lease断言。完整root验证为227 Node/210 Browser/74 Rust，见verification。Cargo保留既有5项dead_code警告。

## 明确未覆盖

- 实际付费Provider兼容/额度、第三方MCP/ComfyUI、完整原生进程崩溃/重启/断电恢复与health统一仍属对应开放任务；本轮实际Desktop验收的是WebView重载及当前进程内任务执行。
- 未改动的图片size映射/其他模态、Figma完整视觉验收、Hosted CI/branch protection/PR合并/安装包发布不由本预检背书。
- 门禁验证结构、文件和引用；证据语义、新鲜度、实际产品能力需要独立审查，空文件或静态规则不能证明真实能力。
