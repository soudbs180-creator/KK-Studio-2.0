# ADR-024：服务端权威 Mid-turn Steering 与安全 Drain 边界

- 状态：ACCEPTED（设计已采纳，待进入后续实现排期；2026-10-17 追加补充条目，见文末）
- 日期 / Task ID / Owner：2026-10-17 / BACKEND-STEER-001 / root
- 来源：吸收 Octop commit `ebcdbf9` 及 `steer/coordinator.py` 机制；延续 [ADR-012](ADR-012-taskhost-text-output.md)、[ADR-016](ADR-016-agent-and-provider-recovery.md) 与 [ADR-018](ADR-018-provider-protocol-and-cli-execution.md)。

## 背景与问题

KK-Studio 在 Agent 对话与创作流式生成中，用户常需要在模型生成中途追加指令（插话/修正意图，即 mid-turn steering）或取消当前执行。当前流式管线若由前端 WebView 直接发起截断，存在三大隐患：
1. **Tool 调用破损**：若在模型输出 Tool JSON 参数的流式中间截断，会导致解析器抛出语法错误并破坏上下文；
2. **状态双源分歧**：前端自行维护停止状态与 Rust 原生 `task_host.rs` 的任务日志脱节，产生假取消或孤儿任务；
3. **审批冲突**：在敏感工具等待人类介入（HITL）确认期间，并发输入缺乏合法的暂存与准入机制。

## 决策核心：Rust 主进程权威准入 + 安全 Drain 边界

借鉴 Octop 的服务端权威设计，在 KK-Studio 单进程 Tauri 桌面架构下建立等价权威状态机，不改动现有 TaskHost 幂等契约，不新建第二队列。

### 1. 权威准入状态机（Admission State Machine）
- **队列唯一权威在 Rust 进程**：WebView 只通过 Tauri IPC 提交转向意图（`steer_submit`），Rust 端 `task_host.rs` 维护回合生命周期。
- **准入判据**：
  - 若当前 Turn 为 `IDLE`：直接作为常规 Turn 准入并启动推理；
  - 若当前 Turn 为 `BUSY`（生成中）：新意图排入准入队列，乐观绑定 `expected_turn_id`；
  - 队列深度严格限制为最多 3 条，单条 UTF-8 字符限制 $\le 4\text{ KiB}$，超限立即返回结构化拒绝原因（`QueueFull`）；
  - 重复的 `request_id` 命中幂等过滤，安全返回已排队状态。

### 2. 安全 Drain 边界（Provider Safe Checkpoint）
绝不在流式 Token 之间任意硬中断，必须严格在以下三类安全边界之一触发 Drain：
- **边界 A（Tool 批次边界）**：一个完整的 Tool Call 参数生成且执行结果回写后（首选 Drain 点）；
- **边界 B（首个输出抢占尾部）**：若模型刚输出第一个 chunk 即收到高优先级 steer，允许在 clean checkpoint 尾部安全打断；
- **边界 C（自然结束）**：纯文本回答不进行粗暴撕裂，等待文本段落正常结束触发 drain，合并上下文进入下个 Turn。

### 3. HITL 审批暂停挂起（Park with TTL）
- 当 Agent 触发破坏性操作（如删除素材、写入磁盘、调用外部 MCP）进入等待用户确认状态时，回合进入 `PAUSED_HITL`。
- 在此期间接收到的新 steering 自动进入 `PARKED` 状态，设置 30 分钟 TTL；
- 用户批准/拒绝工具后，回合恢复（`RESUMED`）并立即 Drain 挂起的 steering；若 TTL 超时，自动转为 `DISCARDED` 并向前端推送通知。

### 4. 生命周期事件与 IPC 契约
Rust 进程向前端 WebView 单向广播规范化事件集：
- `turn.started` / `turn.resumed` / `turn.ended`
- `steer.queued` / `steer.drained` / `steer.discarded` / `steer.rejected`
WebView 渲染层仅根据上述事件更新 UI 指示器与 Composer 状态，禁止在前端推测状态机转移。

## 备选方案评估与否决理由

- **否决备选 1：前端 WebView 侧维持消息队列**。前端维护队列无法感知 Rust 端原生子进程或网络连接的真实中断边界，易出现网络已发出但前端显示取消的“幽灵执行”。
- **否决备选 2：在任意 Token 处立即 kill 底层 stream**。粗暴 kill 会导致下游解析库抛出未闭合的 JSON 异常，污染上下文并破坏重试幂等性。

## 验证与接受条件

1. **单元状态机覆盖**：Rust 单测覆盖 admission/drain/discard/park 四类转移；
2. **Tool 完整性回归**：在中途 steer 注入测试下，验证 ToolNode 调用的参数必须完整闭合，严禁出现残缺 JSON 进入存储；
3. **TaskHost 契约兼容**：不增加额外存储库，继续复用 `task_host` 现存的 journal 与 unknown 恢复边界。

---

## 补充条目（2026-10-17）

> 本条目与 Octop commit `ebcdbf9` 的 steer 语义逐项对齐，补齐拒绝原因、HITL 边界、事件集与 UI 契约。不改变上文决策结构；实现仍待排期。

### 1. 拒绝原因枚举（细化 §1 的"结构化拒绝原因"）

| code                | 触发条件                                   | 前端处理                                      |
| ------------------- | ------------------------------------------ | --------------------------------------------- |
| `QueueFull`         | 队列已有 3 条                              | 提示"最多排队 3 条"，保留草稿                 |
| `TooLarge`          | 单条 UTF-8 超过 4 KiB                      | 提示长度上限，保留草稿                        |
| `PausedForApproval` | 回合处于 `PAUSED_HITL`，且为新提交的 steer | 提示"先处理审批"，提供 `reject_and_steer` 入口 |
| `StaleTurn`         | `expected_turn_id` 与当前回合不符          | 提示"回合已结束"，重新绑定或丢弃              |

幂等重复 `request_id` **不算拒绝**：返回已排队状态，不产生第二条队列项。

### 2. HITL 语义修订（替换 §3 第 2 段）

原文"暂停期间接收到的新 steering 自动进入 PARKED 状态"与 Octop 实际语义不一致，修订为：

- **暂停之前**已排队的 steer：进入 `PARKED`，30 分钟 TTL；审批完成后 `RESUMED` 并立即 drain；超时转 `DISCARDED` 并推送通知。
- **暂停期间**新提交的 steer：拒绝 `PausedForApproval`，不 park、不静默接受。
- 新增 `reject_and_steer` 复合操作：拒绝当前待审批工具调用 + 以新指令开启常规 Turn，作为单一原子动作（一个 IPC，Rust 侧保证两步全有或全无）。

### 3. 事件集补充（§4）

| 事件             | 触发                              | 载荷                                                             |
| ---------------- | --------------------------------- | ---------------------------------------------------------------- |
| `steer.removed`  | 用户撤回排队项 / 服务端移除失效项 | `request_id`、`reason`                                           |
| `queue.snapshot` | 订阅或重连时下发                  | 队列条数、各条 `request_id` + 预览（≤80 字）、`expected_turn_id` |

事件全集：`turn.started/resumed/ended`（3）+ `steer.queued/drained/discarded/removed/rejected`（6）+ `queue.snapshot`（1）。前端禁止本地推测队列状态，重连后以快照为准。

### 4. UI chip 契约（新增 §5）

| 动作   | 触发             | 成功信号        | 失败回退                              |
| ------ | ---------------- | --------------- | ------------------------------------- |
| commit | 草稿入队         | `steer.queued`  | `steer.rejected` → 恢复草稿，不丢文本 |
| recall | 撤回全文到输入框 | `steer.removed` | 显示错误，chip 保留                   |
| remove | 删除排队项       | `steer.removed` | 显示错误，chip 保留                   |

渲染状态：`draft`（本地）→ `queued`（服务端确认）→ `drained`（转对话记录行）/ `rejected` / `discarded`。禁止前端乐观移除，所有状态迁移以 Rust 事件帧为准。

### 5. 验证与接受条件（补充）

1. `PAUSED_HITL` 期间新 steer 返回 `PausedForApproval`，UI 出现 `reject_and_steer` 入口；
2. 暂停前已排队 steer 在 `turn.resumed` 后立即 `steer.drained`；
3. `reject_and_steer` 原子性：断网/崩溃下不出现"只拒绝未提交指令"或相反；
4. 重连后 `queue.snapshot` 与 Rust 队列逐条一致；
5. `steer.removed` 后队列计数与 chip 序号同步；
6. 幂等重复 `request_id` 不产生第二条队列项、不返回拒绝。
