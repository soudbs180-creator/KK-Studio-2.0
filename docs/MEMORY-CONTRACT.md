# 共享记忆契约（MEMORY-CONTRACT）

> 这是 KK Studio 设计给本机 Agent 的共享文件契约。目前只有 KK Studio 的
> Codex 对话实现了自动采集与注入；豆包和 WorkBuddy 的原生客户端尚未接入。
> 登录这些应用不会自动赋予它们共享记忆的能力。

## 1. 文件位置（唯一权威）

- 共享记忆文件：`~/.kk-memory/memory.json`
  - Windows：`%USERPROFILE%\.kk-memory\memory.json`
  - 目录与文件不存在时由任一产品创建（首次写入前 `create_dir_all`）。
- 各产品**不得**再使用自己数据目录内的记忆文件作为主存储；隔离版旧文件
  （`<app-data>/memory/memory.json`）仅作为一次性种子迁移源，迁移后不再读写。

## 2. 文件格式（兼容 version 1，Desktop 写入 version 2）

```jsonc
{
  "version": 1,
  "namespace": "", // 隔离版遗留字段，共享模式恒为空
  "records": [
    {
      "id": "uuid",
      "content": "用户偏好日系插画风格", // ≤200 字
      "memoryType": "user_preference", // user_profile | user_preference | user_habit | user_constraint
      "confidence": 0.8, // 0~1
      "fingerprint": "sha256(归一化content)", // 去重键
      "source": "auto_rule", // auto_rule | manual_codex | manual_user
      "sourceThreadId": "可选",
      "createdAt": "ISO-8601",
      "updatedAt": "ISO-8601",
      "lastUsedAt": "可选",
      "active": true,
    },
  ],
}
```

- 解析失败或版本不在 1/2 内：**拒绝读取并保留原文件**，不覆盖、不静默清空。
- Desktop 写入使用临时文件 + 原子替换，并在写入锁内比较上次读取的完整版本；
  Web 私有 IndexedDB 在单个读写事务内比较版本。冲突时重新读取并重试，
  不覆盖其他窗口的新内容。单文件 records 上限 10000。
- 浏览器经 File System Access 授权后**只读**共享文件。它与 Desktop 尚无
  共同的跨进程写入锁，故不能写入、清空或重置共享文件；浏览器私有 IndexedDB
  记忆原样保留，退出共享视图后可继续编辑。其他产品若要写同一文件，必须
  实现兼容的互斥与版本比较协议，并完成并发验证。

## 3. Agent 读取规则（对话前参考）

- 开关未开启（产品内设置）时，任何 Agent 不得读取本文件。
- 开启时，在对话开始前读取本文件，按与当前输入的相关性（词法重叠/关键词）
  选取**最多 3 条、总长 ≤400 字**作为参考；低置信度（<0.55）或不相关内容跳过。
- 参考内容仅作为背景信息，**用户本轮明确表达的要求始终优先于记忆**；
  记忆与输入冲突时以输入为准。

## 4. Agent 写入规则

- 仅在**用户原话**表达稳定偏好/习惯/约束时自动追加记录（如"以后请用…""不要…"
  "我习惯…"）；寒暄、一次性指令不记录。
- 模型回复中的"我已记住"或"用户偏好"不能作为自动入库证据；用户主动触发的
  Codex 提炼走单独的 `manual_codex` 来源，并须可查看、删除。
- 写入前去重：`fingerprint = sha256(normalize(content))` 已存在则跳过（或更新时间戳）。
- 绝不编造用户偏好；不确定时不写。
- 单条 content ≤200 字；记录达到 10000 条后拒绝新增（不删除旧记录）。

## 5. 隐私硬约束（与密钥/账号同级）

- **完整记忆文件**只保存在本机，不进入 WebDAV 同步、localStorage、日志、
  导出包或项目包。Web 未授权共享目录时使用浏览器私有 IndexedDB，必须明示。
- 用户开启记忆后，§3 选中的最多 3 条、总长不超过 400 字的片段会随当前
  请求发送给所选模型用于本轮推理。这是功能运行所需的数据传输，不得宣传为
  "记忆内容绝不离开本机"。关闭开关时不读取、采集或注入。
- 不得发送完整记忆文件给模型作训练、批量分析或无关任务。手动"让 Codex
  提炼"仅在用户主动点击时发生，并消耗其 Codex 账号额度。
- 共享文件目录权限遵循用户本机默认；各产品不应把该文件暴露给非授权进程。

## 6. 清空与重置

- 用户可在 KK Studio 设置页"清空全部记忆"（records 置空）或"重置共享文件"。
  Desktop 重置时先复制旧文件为 `.previous-<ts>.json`，再原子写入新文件；
  写入失败时原文件仍在。Web 共享视图只读；浏览器私有记忆可清空和重置，
  但没有文件级备份。其他已接入契约的客户端重新读取后才会看到变化。
- 换账号/换人使用同一台机器时，用户应手动清空或重置，避免记忆串用。

## 7. 兼容性

- V1 在内存确定性迁移到 V2，读取不改写；Desktop 首次实际保存前备份原始 V1 字节。旧 API 以 V1 投影读写同一文件，保留 V2 元数据；未来版本拒绝覆盖。
- 本契约变更需同步更新各产品实现与文档（features.registry FEAT-020）。

## 8. 项目与会话作用域（2026-11-04）

`global` 继续使用 `memory.json`；`project:<id>` 对应 `projects/<sha256 UTF-8 id>.json`；`session:<id>` 对应 `sessions/<sha256 UTF-8 id>.json`。文件名散列允许项目/会话 JSON 身份并防止路径穿越。会话身份使用项目和聊天的组合，不能按聊天 ID 跨项目混读。Desktop 隔离数据根依旧有效。

V2 增加 `namespace`、`updatedAt`、`metadata {scope, scopeId?, createdAt, updatedAt, recordCount, description?}`，records 契约不变。`kkMemoryStore` 保存读取时的原始字符串作为 CAS 预期，null 表示文件不存在；无读取快照不得写入。锁内检查原件/预期，校验载荷，同目录临时文件 flush 后原子替换；失败保留原件与迁移备份。

权重按提供的 M4 参考方案为 session=1.0、project=0.85、global=0.70。词法相关性乘权重后排序，指纹去重；最多3条/400字符，当前输入优先。临时聊天、关闭开关或管理操作使读取失效时不注入迟到结果。显式用户偏好仍自动采集到 global。

Web 未授权时保留原有全局私有数据库身份，项目/会话V2使用独立 `kk-studio-memory-v2/namespaces` 事务；授权后从同一共享目录读取三作用域，不混入私有项目记忆。所有共享写入仍禁用。管理页选择全局、当前项目或当前会话，列表、提炼、删除、清空和重置使用选定作用域；上下文缺失的选项禁用。Desktop项目/会话重置经 `memory_reset_scoped` 在同一文件锁内备份原始字节，再原子写入空记录V2；备份不是活动命名空间，恢复需读取原件并按当前快照CAS写回。关闭、临时聊天、范围/项目/会话变化或卸载使迟到提炼失效；既已发出的模型请求不宣称撤回。当前Desktop实机与外部客户端共享仍未验收。

实现和当前验证见 [生产接线包](changes/2026-11-04-e2e-wiring/verification.md)，功能状态继续 PARTIAL；没有外部客户端共享或当前 Desktop 实机证明时不得升级。
