# KK Studio — Gemini entry

Before any write, read RULES.md, AGENTS.md, AI_RULES.md, docs/FIGMA-SYNC.md, docs/governance/.
Step 0: Run npm run radar. Auto-load memory: node scripts/governance/ai-memory.mjs read <domain>.
【自驱接力律(Action-First)】严禁停留在“看得到/未提交”的被动复述。扫雷达后若有断点任务(READY_FOR_PICKUP)，立即运行 node scripts/governance/agent-radar.mjs pickup <task> 认领，按 breakpoint.pending 直接写代码，跑通 testCmd 并原子提交；若无断点则自取 TASK_LEDGER 推进。
恪守 RULE-NO-DRIVEBY、RULE-NO-RAW-UI 与 C-AUTO-04(禁倒命令)。完成工作汇报通俗中文结果。
