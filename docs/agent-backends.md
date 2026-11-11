# KK Studio 主 Agent 后端选择说明（第一期）

> **文档类型**：说明文档，供**人**和 **AI** 共同阅读。回答两个问题：① 主 Agent 后端怎么选；② 为什么 `dsh-superagent` 现阶段不嵌入。
> **适用对象**：KK Studio 使用者、配置代理 AI、以及后续维护本文档的会话。
> **本期范围**：第一期。只做「从本机已有运行时里选一个可用的主 Agent + 薄兜底」，不新增重型运行时、不改动业务代码。
> **依据**（均为只读规划 / 设计产物）：`output/dispatch-board-20261109/board.md`、`output/optimize-20261109/plan.md`、`output/config-doc-20261109/kk-config-guide.md`（2026-11-09）。
> **配套文档**：需要「把文档丢给 AI、由 AI 自动完成配置」的执行模板，见 `output/config-doc-20261109/kk-config-guide.md`；本文是它的**选型说明**，不是替代品。
> **版本**：`{{DOC_VERSION}}`　**生成日期**：`{{DOC_DATE}}`

**占位符约定**：`{{NAME}}` = 运行时填入的具体值（见第 6 节）。全文**不出现任何真实密钥**；密钥一律以系统钥匙串引用 `{{KEY_CREDENTIAL_REF}}` 表示。

---

## 1. 一句话结论

- **主 Agent 按优先级选**：先本机已登录的 **Codex**，再 **WorkBuddy / CodeBuddy**、**Antigravity**，最后才是 **OpenAI 兼容 API** 或本机 **Ollama** 这类薄运行时；取「第一个探测通过」的，不是死守第一个。
- **`dsh-superagent` 本期不嵌入**：整包嵌入延后到**第三期**评估（见第 5 节）。本期它**不在**主 Agent 候选清单里。

## 2. 主 Agent 优先级（怎么选）

自上而下取第一个「已就绪且连接测试通过」者，定为 `{{MAIN_AGENT_ID}}`：

| 顺位 | 后端 | 标识 `{{MAIN_AGENT_ID}}` | 就绪条件 |
| --- | --- | --- | --- |
| 1 | Codex（本机 CLI / app-server 已登录） | `codex` | CLI 存在且登录态有效，app-server 可连通 |
| 2 | WorkBuddy / CodeBuddy（已登录） | `workbuddy-acp` | headless / ACP 通道探测通过 |
| 2 | Antigravity（已登录） | `antigravity-acp` | `-p` / `agy acp` 通道探测通过 |
| 3 | OpenAI 兼容 API（薄运行时） | `openai-compat` | `{{API_BASE_URL}}` 可达且凭据引用有效 |
| 3 | 本机 Ollama / LM Studio / llama.cpp（薄运行时） | `local-openai-compat` | `{{OLLAMA_HOST}}` 可列模型 |
| 4 | 全部不可用 | 不设 | 如实报「无可用主 Agent」+ 人工步骤，**不写成功** |

> 顺位 1–3 属于「用户手上有什么平台就接什么」；顺位 3 是**薄兜底**，只要求一个 Key 或本机已有模型，不引入新运行时。
> 顺位 2、3 中的候选按「用户已配置且探测通过的**第一个**」取用；OpenAI 兼容 / Ollama 既可作为已配置的常规连接，也可作为「无本机登录运行时」时的内置薄兜底（与 `kk-config-guide.md` 步骤 1 的优先级表一致）。
> 优先级是**首选顺位**，不是硬性绑定：Codex 能力最强但可能缺额度，额度耗尽时按第 4 节规则顺位下移（与派工板「难任务给 Codex、杂碎 / 文档给额度相对充足的 WorkBuddy / Antigravity」一致）。

## 3. 各后端对照：适用场景 / 准备什么 / 缺额度怎么换

### 3.1 总表

| 后端 | 适用场景 | 用户需要准备什么 | 凭据形态 | 缺额度 / 不可用时换到 |
| --- | --- | --- | --- | --- |
| **Codex** | 跨模块架构、MCP / Agent 运行时、安全边界、难状态机、疑难推理与规划（`text.plan`） | 本机安装并**登录** Codex CLI；确认 app-server 可用（`{{CODEX_CLI_PATH}}`、`{{CODEX_LOGIN_STATE}}`） | 登录态，**不需要 Key** | 顺位下移到 WorkBuddy / Antigravity；再不行走薄兜底 |
| **WorkBuddy / CodeBuddy** | 文档、清单、只读复核、文案、简单小改、规划辅助；额度相对充足 | 本机**登录**对应 CLI；headless `-p` / ACP `--acp` 可用（`{{WORKBUDDY_CLI_PATH}}`、`{{WORKBUDDY_MODE}}`） | 登录态，**不需要 Key** | 切 Antigravity 或薄兜底 |
| **Antigravity** | 零碎任务、测试起草、证据收集、清单化；额度相对充足 | 本机**登录** Antigravity CLI；`-p` / `agy acp` 可用（`{{ANTIGRAVITY_CLI_PATH}}`、`{{ANTIGRAVITY_MODE}}`） | 登录态，**不需要 Key** | 切薄兜底 |
| **OpenAI 兼容 API（薄运行时）** | 没有任何本机登录运行时时的兜底；需要稳定、按量付费的通道 | `{{API_BASE_URL}}` + 一个 Key（**经弹窗进系统钥匙串**），配置里只记 `{{KEY_CREDENTIAL_REF}}` | 钥匙串引用，**不写明文** | 切本机 Ollama；或如实报缺 Key |
| **本机 Ollama / LM Studio（薄运行时）** | 离线、隐私优先、不想用 Key；本机已有模型时零成本兜底 | 本机已安装并已拉取模型（`{{OLLAMA_HOST}}`，如 `http://127.0.0.1:11434/v1`；`{{OLLAMA_MODEL_ID}}`） | **通常不需要 Key，不弹框** | 全部不可用时按顺位 4 处理 |

> 说明：表中「登录态 / 不需要 Key」指这些后端靠本机 CLI 登录态工作，用户只需事先登录；**只有 OpenAI 兼容 API 这类通道才需要 Key**，且 Key 不进入文档、日志、聊天或配置文件。
> 探测方式（`{{*_CLI_PATH}} -p`、`--acp`、`列模型接口` 等）是**探测思路**：宿主配置工具就绪后可自动化；未就绪时由人或 AI 手工探测并标注「手工 / 未核验」，**不得假定工具已存在、不得伪造连接成功**（`plan.md` 记「本机 Ollama 自动探测」尚属推测、未运行验证）。

### 3.2 缺额度 / 探测失败时怎么换（统一规则）

| 情况 | 处理 |
| --- | --- |
| 429 / 额度耗尽 | 把该通道标 `exhausted` / `cooldown`（`{{QUOTA_REMAINING}}`、`{{COOLDOWN_UNTIL}}`），写回额度状态，给一条**非阻塞**通知：「xx 额度用尽，已改走 yy」 |
| 切换主 Agent | 属 **L2**：需用户**确认一次**，可按 `{{REMEMBER_CHOICE_TTL}}` 记住选择，之后不再重复问 |
| 连接测试失败 | 该连接标「不健康」，给失败原因与人工替代步骤，不标「通过」、不静默启用 |
| 弹框被取消 | 该连接标 `unavailable`，不反复弹、不留半配置 |
| 全部候选不可用 | 主 Agent 只说明缺什么 + 提示补 Key / 换模型 / 人工步骤；**不硬扛、不伪造生成结果、不写「配置成功」** |

## 4. 可执行步骤（人 / AI 照做）

1. **先探测，后决定**（先本机已装平台：不花钱、不联网；再云端）。逐项记录 `available | unavailable` + 原因；本步**不读取、不回显任何密钥**。
2. **按第 2 节优先级**取自上而下第一个「探测通过」者，写入 `{{MAIN_AGENT_ID}}`，并能复述选择理由。
3. **需要 Key 才弹框**：仅 OpenAI 兼容 API 等通道，走「弹窗 → 系统钥匙串」，弹框只返回 `provided | cancelled`；配置产物只记 `{{KEY_CREDENTIAL_REF}}`。本地 Ollama / ComfyUI 通常不需要 Key，不弹框。
4. **连接测试**：能列出模型，或一次 1 token 请求往返成功，才算通过；失败标注「手工探测」及原因。
5. **切换主 Agent 走 L2 确认一次**（可记住选择）。
6. **额度耗尽**按 3.2 顺位下移并通知；**切换事件留痕**。
7. **全部不可用**时输出「无可用主 Agent + 人工步骤」，不写成功。
8. **自检**：`{{MAIN_AGENT_ID}}` 与优先级一致；无可用平台时输出的是「无可用主 Agent」而不是「配置成功」；全文 grep 不到任何密钥明文。

> 每一步「先读后写、先快照」（`{{SNAPSHOT_ID_0}}`）、「未通过不进下一步」；宿主配置工具未就绪时按降级列手工执行，结果标注「手工 / 未核验」。完整降级规则见 `kk-config-guide.md` 附录 C。

## 5. `dsh-superagent` 为什么本期不嵌入

- **它是什么**：`dsh-superagent` 是 GitHub 仓库级编码代理的 DSH 插件 / 研究原型，**不是**「填一个 Key 就能聊」的通用运行时；其模型层思想可以借鉴。
- **本期（第一期）结论**：**不嵌入整包、不配置、不登记**。主 Agent 候选清单里不含它，不为它申请 Key，配置产物与模型池里也不出现它。
- **延后到第三期**：整包 / sidecar 的 go/no-go 放到**第三期**评估（派工板 `ph3-3.7-dsh-sidecar` 做 go/no-go、`ph3-3.8-dsh-probe` 仅在 go 时做探针与证据）。在 go/no-go 之前，是否启用 DSH sidecar 属待定 `{{TBD_DSH_SIDECAR}}`，本步不配置。
- **本期影响**：本期主 Agent 只从「本机已登录运行时 + 薄兜底」里选，范围更小、落地更快；第三期是否引入，按评估结果另行决策。

## 6. 占位符与密钥红线

**常用占位符**（值由环境探测或用户口述填入，最终产物不得残留）：

| 占位符 | 含义 |
| --- | --- |
| `{{MAIN_AGENT_ID}}` | 选定的主 Agent 标识 |
| `{{DOC_VERSION}}` / `{{DOC_DATE}}` | 文档版本 / 生成日期 |
| `{{CODEX_CLI_PATH}}` / `{{CODEX_LOGIN_STATE}}` | Codex CLI 路径 / 登录态 |
| `{{WORKBUDDY_CLI_PATH}}` / `{{WORKBUDDY_MODE}}` | WorkBuddy CLI 路径 / 通道模式 |
| `{{ANTIGRAVITY_CLI_PATH}}` / `{{ANTIGRAVITY_MODE}}` | Antigravity CLI 路径 / 通道模式 |
| `{{API_BASE_URL}}` | OpenAI 兼容端点 |
| `{{KEY_CREDENTIAL_REF}}` | 系统钥匙串**引用 id**（不是密钥） |
| `{{OLLAMA_HOST}}` / `{{OLLAMA_MODEL_ID}}` | 本地模型端点 / 模型 id |
| `{{QUOTA_REMAINING}}` / `{{COOLDOWN_UNTIL}}` | 剩余额度 / 冷却截止时间 |
| `{{REMEMBER_CHOICE_TTL}}` | 记住「切换主 Agent」选择的时长 |
| `{{SNAPSHOT_ID_0}}` / `{{TBD_DSH_SIDECAR}}` | 写前快照 / 第三期 DSH 待定项 |

**红线**：

- 密钥只走「弹窗 → 系统钥匙串」一条路径；**从不**进入文档、日志、聊天、MCP 返回值或配置文件。
- 配置产物只存 `credentialRef`，**不含密钥明文**；`{{API_KEY}}` 类明文占位符**刻意不设**。
- 读取 / 回显密钥属 L3，永远拒绝。

## 7. 验收自检

- [ ] 简体中文、表格与步骤可直接照做。
- [ ] 写清主 Agent 优先级（Codex / WorkBuddy / Antigravity / OpenAI 兼容 / Ollama 薄运行时）。
- [ ] 写清 `dsh-superagent` 延后到第三期、本期不嵌入整包。
- [ ] 每种后端都列出适用场景、缺额度怎么换、用户需要准备什么。
- [ ] 全文只有占位符，无任何真实密钥。
- [ ] 与 `kk-config-guide.md` 的优先级、权限分级（L2 切换主 Agent）、密钥红线口径一致。

## 8. 边界与依据

- 本文是**选型说明**，不是「把文档丢给 AI 自动配置」的执行模板；实际配置以 `kk-config-guide.md` 与宿主已就绪能力为准。
- 依据文件均为 2026-11-09 的只读规划 / 设计产物；本文**未运行应用、未做运行验证**，探测方式属探测思路，宿主工具就绪后可自动化。
- 本文不改任何业务代码、不改分支、不 commit / push。
