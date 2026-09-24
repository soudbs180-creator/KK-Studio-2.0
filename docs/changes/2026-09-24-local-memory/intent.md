# Intent：本地长期记忆服务接入对话（TASK-MEMORY-001）

> 2026-09-24 实现边界修订：Web 与 Desktop 尚无共同写锁。为避免覆盖共享文件，
> 浏览器当前仅可只读参考授权目录，自动学习和编辑在浏览器私有 IndexedDB 或
> Desktop 进行。下方“Web 读写同一文件”是早期目标，尚未实现。

## 共享版更新（TASK-MEMORY-002，覆盖本文件隔离语义）

- 日期与提出者：2026-09-24，用户（本包内追加）。
- 用户新决策（覆盖 TASK-MEMORY-001 的"按本地记忆身份隔离"语义）：
  1. **共享方式**：本机默认共享（不做产品间身份区分；换账号/换人时用户手动清空或重置）；
  2. **存储位置**：公共共享目录 `~/.kk-memory/memory.json`（所有产品读写同一份；不上云不变）；
  3. **接入范围**：先打通 Codex（KK Studio 桌面/Web）+ 豆包（Doubao Agent 环境）；WorkBuddy 预留同一契约。
- 用户原话："一般来说每个模型只要登录来使用的现在的记忆都是一样的，现在就是能够保证这些记忆都可以共享，比如在codex保持的记忆也能在豆包使用也能在WorkBuddys打通。"
- 技术事实（探查确认）：Codex 执行器 `/config` 不暴露账号标识；Codex/豆包/WorkBuddy 账号体系互不相同，无法自动识别"同一账号"→ 采用"本机共享 + 手动清空"（用户拍板）。
- 语义变化对照：
  - 存储：`<app-data>/memory/memory.json`（隔离）→ `~/.kk-memory/memory.json`（共享）；旧文件作为一次性种子迁移。
  - 身份：namespace（每产品随机 uuid）→ 移除；记录不再带 namespace，旧文件字段读取时忽略。
  - Web：IndexedDB 私有存储 → 优先 File System Access 授权共享目录读写同一文件；不支持/未授权时降级 IndexedDB（UI 明示"仅本应用"）。
  - UI：记忆身份/重置身份 → 共享状态/授权共享目录/清空/重置共享文件。
  - Agent 侧：豆包/WorkBuddy Agent 遵循 `docs/MEMORY-CONTRACT.md` 读取/写入同一共享文件（豆包侧=Doubao Work 环境中的 Agent 通过文件系统访问）。
- 验收变化：AC-1 文案"随账号隔离"改为"本机共享（Codex/豆包/WorkBuddy）、仅存本地、不上云"；AC-4 由"不同身份互不可见"改为"本机共享生效：各产品读写同一文件，清空/重置对本机所有产品生效"；其余 AC 不变。

---

- Task ID：TASK-MEMORY-001
- 状态：READY
- 日期与提出者：2026-09-24，用户
- 请求来源：用户研究 https://github.com/zhy438/ai_group_chat 后要求"如果项目对我有帮助帮我吸取到这个能力并且整合接入"；并确认范围"也就是说本地长期记忆+单个短期记忆"。
- 用户授权范围与依据：用户明确授权"整合接入"；已确认两个产品决策（仅用户级记忆；规则+可选 Codex 辅助采集）。
- 关联账本、spec、plan：本包 spec.md / plan.md；功能卡 feat-020-memory.md 更新；账本 TASK-MEMORY-001（共享版由 TASK-MEMORY-002 记录）。

## 用户原意

- "帮我学习一下这个记忆……如果项目对我有帮助帮我吸取到这个能力并且整合接入。"
- "也就是说本地长期记忆+单个短期记忆。"
- "能够让AI了解到你的习惯，但是需要保证这个是更随账号的，不要出现记忆和别人搞串了，而且同步到云端也不要把本地的记忆上传了，和密钥账号等敏感信息一致。"
- 已确认：记忆维度=仅用户级；采集=本地规则为主 + 可选手动让 Codex 提炼。

## AI 工程转译

在 KK-Studio-2.0 现有 Codex 对话链路（FEAT-009）上补上 FEAT-020 长期记忆的真实能力：

1. **短期记忆**：Codex thread 会话已由执行器管理，不新增实现，保留现状。
2. **长期记忆（新增）**：
   - 存储：仅本地。Web 用 IndexedDB；Desktop 用 `memory/` 目录文件（新增 Tauri 命令），复用 conversations 的文件读写模式。
   - 作用域：仅用户级（user_global），记录用户偏好/习惯/约束。
   - 采集：本地规则自动抽取（消息落库后异步执行）+ 手动"让 Codex 提炼"入口（用户主动触发，允许将对话片段发送给 Codex）。
   - 检索注入：发送对话前，按词法相关性选取记忆块，插入 `prompt = KK_INSTRUCTIONS + [长期记忆] + 用户指令` 之间（执行器零修改）。
   - 管理 UI：设置 › 连接 › 记忆 从占位变为真实（开关、记忆列表、删除、身份绑定显示、手动提炼入口、本地存储说明）。
3. **账号隔离**：记忆以 namespace（本地记忆身份键）分区，默认关闭、显式开启；设置页显示绑定身份并提供重置；不同 namespace 互不可见。执行器当前不暴露稳定账号 id，真实账号 id 派生留给 FEAT-017 身份体系上线后升级（本包如实标注边界）。
4. **隐私**：记忆绝不进入 WebDAV 同步、localStorage、日志、导出包、项目包；与密钥/账号同级的本地私有数据处理。

## 目标与非目标

- 预期结果：用户开启记忆后，Codex 对话能参考历史偏好回答；设置页可查看/删除记忆；记忆仅存本地且按身份隔离。
- 包含范围：记忆 Schema、Web/Desktop 双端存储、规则采集、Codex 辅助采集、检索注入、设置页 UI、单元与浏览器测试、文档/账本/功能卡更新。
- 明确不包含：多模型群聊编排（ai_group_chat 的 Agent 群聊部分）；品牌级/项目级记忆；记忆云同步/导出；真实账号 id 绑定（依赖 FEAT-017）；短期上下文压缩移植（Codex thread 已承担）。
- 受影响平台/模块：Web + Desktop 前端（src/features/memory 新模块、src/features/agent/agentConnection.ts、src/components/settings/ConnectionSettings.tsx）、src-tauri（新增 memory 读写命令与路径）、docs（feat-020、DATA-STORAGE、PROJECT_STATE、PROGRESS）。
- 已有实现和规范来源：feat-009-conversation.md、feat-020-memory.md、DATA-STORAGE.md、ai_group_chat 记忆模块（外部参考，MIT）。

## 验收条件

| ID   | 用户可观察结果                                                                | 技术证据/检查                                                             | 适用平台      |
| ---- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------- |
| AC-1 | 设置 › 连接 › 记忆 可开启/关闭，说明"记忆仅存本地、随账号隔离"                | 设置页渲染真实控件；单元测试覆盖开关状态机                                | Web + Desktop |
| AC-2 | 开启后对话中表达偏好（如"以后请用日系插画风格"），后续对话 Codex 能引用该偏好 | 规则抽取产生记忆记录；注入的 prompt 含 [长期记忆] 块；浏览器/单测证据     | Web + Desktop |
| AC-3 | 记忆可查看列表、删除单条/清空                                                 | 存储层 list/delete 单测 + 设置页 UI 测试                                  | Web + Desktop |
| AC-4 | 换"记忆身份"（重置）后旧记忆不可见，不与其他身份串号                          | namespace 分区单测：不同 namespace 互不可见                               | Web + Desktop |
| AC-5 | 手动"让 Codex 提炼记忆"按钮生成记忆条目                                       | 点击后调用 Codex 并解析「记忆：」行入库；测试覆盖解析                     | Web + Desktop |
| AC-6 | 记忆不上云：WebDAV 同步、localStorage、日志、导出包均不含记忆内容             | 代码审计 + 单测断言 memory 模块不 import sync；记忆 key 不在 localStorage | Web + Desktop |
| AC-7 | 关闭记忆开关后不再注入、不再采集                                              | 注入/采集函数受开关门控的单元测试                                         | Web + Desktop |

## 假设、风险和决策

- FACT：Codex 执行器 `/config` 仅返回 url/hasToken，不暴露稳定账号 id；Tauri 已有 conversations/index.json 读写模式（src-tauri/src/main.rs read_conversations）；对话 prompt 由 KK_INSTRUCTIONS + 用户指令组装（agentConnection.ts:757-764）。
- INFERENCE：本地规则采集的召回率有限，用手动 Codex 提炼补充；词法检索在记忆量小时足够。
- UNKNOWN：Codex 登录账号切换无法自动感知（执行器无账号标识）→ 用"记忆身份"（namespace + 用户显式重置）隔离；FEAT-017 上线后可升级为账号 id 派生，本包如实标注。
- AI 自主决定的技术事项及理由：存储 Schema、规则关键词表、检索打分、注入格式均参考 ai_group_chat 简化实现；Desktop 复用 conversations 文件读写模式而非引入 SQLite。
- 必须由用户决定的产品语义/范围事项：已确认（仅用户级；规则+可选 Codex 辅助）。无剩余阻塞项。
- 外部条件、费用或不可逆动作及已有授权：手动 Codex 提炼消耗 Codex 账号额度，属于用户主动触发；记忆清除为本地可逆操作（删除前可导出？本期不提供导出，删除需确认）。
- 不在本次范围的问题与账本 ID：品牌/项目记忆（FEAT-020 后续）、账号 id 派生（FEAT-017）、云同步（FEAT-019）。
