# AI 共享思维中枢（BMAD-Inspired Agent Shared Mind）

> 本目录是 KK Studio 面向所有协作 AI（Antigravity、Cursor、Claude Code、WorkBuddy、Codex 等）设立的**跨平台共享思维中枢与工作记忆库**。
> 参考行业前沿的 [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) 架构，彻底将「AI 辅助开发的思维链」与「最终用户的体验偏好记忆」解耦。

---

## 1. 核心定位与原则

1. **唯一公共黑板**：
   无论哪个 AI 接入项目（不管是命令行 Claude Code、IDE 插件 Cursor、还是后台自治 Agent），进入工作区的第一件事都是到这里**读取上下文与前任思考**；完成或交接任务前，必须在此**留下思维留痕**。
2. **纯增量与事实记录（Append-Only & Fact-Based）**：
   记录客观推演、踩坑规避、已核验事实和被否决的方案，严禁凭空编造。
3. **平台中立（IDE-Agnostic）**：
   不依赖任何单一厂商的私有记忆格式，采用纯 Markdown 标准组织，任何 Agent 均具备原生读写能力。

---

## 2. 目录结构

* [`memlog.md`](memlog.md)：**核心追加流（Working Memory）**。最新的思维链记录、决策脉络、已核验事实与交接待办。
* `archive/`：历史思维链归档（按日保存，防止单个日志过大）。
  * [`2026-10-27.md`](archive/2026-10-27.md)：Figma 复刻一致性审计基建思维链（历史留存）。
* `AI_KNOWLEDGE_BASE.md`（规划中）：跨 Agent 的环境硬核事实与避坑手册（如 PowerShell 管道行为、Windows UAC 边界等）。

---

## 3. 标准记录模板（BMAD 规范）

每次任务交接或重大决策时，在 `memlog.md` 顶部或按日追加以下标准块：

```markdown
## [YYYY-MM-DD HH:mm] 任务标识 (如 TASK-XXX)
- **执行 Agent**：<工具名与模型，例如 Cursor / Claude 3.5 Sonnet / Antigravity>
- **核心意图与决策**：<用户核心诉求、本次决定的方案及理由>
- **已核验关键事实**：<通过命令、源码或网络验证过的真实事实，列出文件与输出>
- **否决的替代方案 (Why Not)**：<为什么不采用方案 B、踩了什么坑，防止后来的 AI 重蹈覆辙>
- **自查纠偏过程**：<自身发现并修正的笔误、类型错误或规则偏差>
- **验证结论**：<执行了哪些测试与门禁，结果如何>
- **移交待办 (Handoff)**：<留给下一个接力 AI 的明确动作与检查点>
```
