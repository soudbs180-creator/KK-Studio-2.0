import assert from "node:assert/strict";
import test from "node:test";
import {
  parseAgentUsage,
  isAgentQuotaExhausted,
} from "../../src/features/agent/agentUsage.ts";
test("额度优先使用多个 bucket，usedPercent 转为剩余且未知不当零", () => {
  const parsed = parseAgentUsage({
    rateLimits: { primary: { usedPercent: 100 } },
    rateLimitsByLimitId: {
      codex: {
        primary: { usedPercent: 81, windowDurationMins: 300, resetsAt: 100 },
        secondary: null,
      },
      extra: {
        primary: { usedPercent: null },
        secondary: { usedPercent: 105 },
      },
    },
  });
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].remaining, 19);
  assert.equal(parsed[0].resetsAt, 100);
  assert.equal(parsed[1].remaining, 0);
  assert.deepEqual(parseAgentUsage({}), []);
});
test("已过期额度和其他模型的 bucket 不会阻止默认 Codex", () => {
  assert.equal(
    isAgentQuotaExhausted([
      { id: "other:primary", label: "other", remaining: 0 },
    ]),
    false,
  );
  assert.equal(
    isAgentQuotaExhausted(
      [{ id: "codex:primary", label: "Codex", remaining: 0, resetsAt: 1 }],
      2000,
    ),
    false,
  );
  assert.equal(
    isAgentQuotaExhausted(
      [{ id: "codex:primary", label: "Codex", remaining: 0, resetsAt: 3 }],
      2000,
    ),
    true,
  );
});
