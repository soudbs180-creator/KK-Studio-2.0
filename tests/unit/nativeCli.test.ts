import test from "node:test";
import assert from "node:assert/strict";
import {
  cliOperationSchema,
  cliPending,
} from "../../src/integrations/nativeCli.ts";

test("terminal-opened remains pending and never reports authentication success", () => {
  const value = {
    operationId: "fixture-operation",
    tool: "codex",
    action: "login",
    phase: "terminal-opened",
    pid: 123,
    message: "终端已打开，登录状态待验证",
  };
  assert.equal(cliPending(cliOperationSchema.parse(value)), true);
  for (const phase of ["completed", "failed", "cancelled"])
    assert.equal(
      cliPending(cliOperationSchema.parse({ ...value, phase })),
      false,
    );
  for (const phase of ["logged-in", "unknown-success"])
    assert.equal(
      cliOperationSchema.safeParse({ ...value, phase }).success,
      false,
    );
  assert.equal(
    cliOperationSchema.safeParse({ ...value, tool: "arbitrary-shell" }).success,
    false,
  );
});
