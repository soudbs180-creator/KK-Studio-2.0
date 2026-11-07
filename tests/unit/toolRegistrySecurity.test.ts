import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import {
  ToolRegistry,
  boundOutputData,
} from "../../src/features/agent/toolRegistry.ts";
import {
  SecurityHookEngine,
  createWorkspaceEscapeGuard,
  createSecretLeakGuard,
  createDestructiveCommandGuard,
} from "../../src/features/agent/preInvocation.ts";
import {
  StatuslineBroadcaster,
  formatStatuslineIPC,
  type RichStatuslinePayload,
} from "../../src/features/agent/statuslineIpc.ts";
import { MandateLifecycleManager } from "../../src/features/agent/threePhaseFlow.ts";

test("toolRegistry: registerTool, unregisterTool, listTools, and toFunctionDeclarations", () => {
  const registry = new ToolRegistry();

  const toolParamSchema = z.object({
    prompt: z.string(),
    aspectRatio: z.string().optional(),
  });

  registry.registerTool({
    name: "generate_image",
    description: "Generates an image from prompt",
    riskLevel: "sensitive",
    parameters: toolParamSchema,
    execute: (args) => ({ imageId: "img-1", prompt: args.prompt }),
  });

  assert.equal(registry.hasTool("generate_image"), true);
  assert.ok(registry.getTool("generate_image"));
  assert.equal(registry.listTools().length, 1);

  // Duplicate registration throws
  assert.throws(() => {
    registry.registerTool({
      name: "generate_image",
      description: "Duplicate",
      riskLevel: "safe",
      parameters: {},
      execute: () => ({}),
    });
  }, /already registered/);

  // Function declarations export
  const declarations = registry.toFunctionDeclarations();
  assert.equal(declarations.length, 1);
  assert.equal(declarations[0].type, "function");

  // Unregister
  assert.equal(registry.unregisterTool("generate_image"), true);
  assert.equal(registry.hasTool("generate_image"), false);
});

test("toolRegistry: boundOutputData limits oversized payloads", () => {
  // Small payload
  const small = { success: true, count: 5 };
  const smallRes = boundOutputData(small, 1024);
  assert.equal(smallRes.truncated, false);
  assert.deepEqual(smallRes.boundedData, small);

  // Giant payload (> 10KB)
  const hugeString = "X".repeat(15000);
  const hugeRes = boundOutputData(hugeString, 1024);
  assert.equal(hugeRes.truncated, true);
  assert.ok((hugeRes.boundedData as string).includes("[TRUNCATED:"));
});

test("tool registry works without Node Buffer and never invokes a settled ticket", async () => {
  const bufferDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "Buffer",
  );
  try {
    Object.defineProperty(globalThis, "Buffer", {
      value: undefined,
      configurable: true,
    });
    assert.equal(boundOutputData("中文🙂", 64).bytesOutput, 10);
  } finally {
    if (bufferDescriptor)
      Object.defineProperty(globalThis, "Buffer", bufferDescriptor);
  }
  let calls = 0;
  const registry = new ToolRegistry();
  registry.registerTool({
    name: "write",
    description: "Write",
    riskLevel: "safe",
    parameters: {},
    execute: () => ++calls,
  });
  const manager = new MandateLifecycleManager();
  const mandate = manager.issueMandate({
    authorizedBy: "User",
    allowedTools: ["write"],
    maxStepCount: 2,
  });
  const ticket = manager.createTicket(mandate.id, "worker");
  manager.completeTicket(ticket.ticketId);
  const result = await registry.invokeTool(
    "write",
    {},
    {
      callId: "settled",
      workspaceRoot: "project",
      signal: new AbortController().signal,
      mandate,
      ticket,
    },
  );
  assert.equal(result.ok, false);
  assert.equal(calls, 0);
});

test("tool registry cancellation settles immediately and propagates to the executor", async () => {
  const registry = new ToolRegistry();
  let executorSignal: AbortSignal | undefined;
  let entered!: () => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  registry.registerTool({
    name: "wait",
    description: "Wait",
    riskLevel: "safe",
    parameters: {},
    timeoutMs: 1000,
    execute: (_args, context) => {
      executorSignal = context.signal;
      entered();
      return new Promise(() => {});
    },
  });
  const controller = new AbortController();
  const pending = registry.invokeTool(
    "wait",
    {},
    {
      callId: "cancelled",
      workspaceRoot: "project",
      signal: controller.signal,
    },
  );
  await started;
  controller.abort();
  const result = await pending;
  assert.equal(result.error?.code, "ABORTED");
  assert.equal(executorSignal?.aborted, true);
  assert.ok(
    result.durationMs < 500,
    "cancel must not wait for the tool timeout",
  );
});

test("toolRegistry: invokeTool enforces parameters, mandates, and timeouts", async () => {
  const registry = new ToolRegistry();
  const schema = z.object({
    count: z.number().min(1),
  });

  registry.registerTool({
    name: "batch_render",
    description: "Renders batch items",
    riskLevel: "safe",
    parameters: schema,
    execute: (args) => ({ rendered: args.count }),
  });

  registry.registerTool({
    name: "slow_tool",
    description: "Takes too long",
    riskLevel: "safe",
    timeoutMs: 50,
    parameters: {},
    execute: async () => {
      await new Promise((r) => setTimeout(r, 200));
      return { done: true };
    },
  });

  const mandateManager = new MandateLifecycleManager();
  const mandate = mandateManager.issueMandate({
    authorizedBy: "Router",
    allowedTools: ["batch_render"],
    maxStepCount: 1,
  });
  const ticket = mandateManager.createTicket(mandate.id, "worker-1");

  // 1. Success execution
  const res1 = await registry.invokeTool(
    "batch_render",
    { count: 3 },
    {
      callId: "c-1",
      workspaceRoot: "D:/kk-studio",
      signal: new AbortController().signal,
      mandate,
      ticket,
    },
  );
  assert.equal(res1.ok, true);
  assert.deepEqual(res1.data, { rendered: 3 });
  assert.equal(ticket.stepsUsed, 1);

  // 2. Step budget exhausted on next call
  const res2 = await registry.invokeTool(
    "batch_render",
    { count: 1 },
    {
      callId: "c-2",
      workspaceRoot: "D:/kk-studio",
      signal: new AbortController().signal,
      mandate,
      ticket,
    },
  );
  assert.equal(res2.ok, false);
  assert.equal(res2.error?.code, "MANDATE_STEP_BUDGET_EXHAUSTED");
  assert.equal(ticket.status, "blocked");

  // 3. Unauthorized tool
  const res3 = await registry.invokeTool(
    "slow_tool",
    {},
    {
      callId: "c-3",
      workspaceRoot: "D:/kk-studio",
      signal: new AbortController().signal,
      mandate,
      ticket,
    },
  );
  assert.equal(res3.ok, false);
  assert.equal(res3.error?.code, "MANDATE_TOOL_NOT_PERMITTED");

  // 4. Schema validation failure
  const res4 = await registry.invokeTool(
    "batch_render",
    { count: -5 },
    {
      callId: "c-4",
      workspaceRoot: "D:/kk-studio",
      signal: new AbortController().signal,
    },
  );
  assert.equal(res4.ok, false);
  assert.equal(res4.error?.code, "INVALID_ARGUMENTS");

  // 5. Tool timeout
  const res5 = await registry.invokeTool(
    "slow_tool",
    {},
    {
      callId: "c-5",
      workspaceRoot: "D:/kk-studio",
      signal: new AbortController().signal,
    },
  );
  assert.equal(res5.ok, false);
  assert.equal(res5.error?.code, "TIMEOUT");
});

test("security: SecurityHookEngine short-circuits on first rejection", () => {
  const engine = new SecurityHookEngine();
  let thirdHookCalled = false;

  engine.addHook(() => ({ allow: true }));
  engine.addHook((tool) => {
    if (tool === "forbidden_tool") {
      return { allow: false, reason: "Forbidden by policy" };
    }
    return { allow: true };
  });
  engine.addHook(() => {
    thirdHookCalled = true;
    return { allow: true };
  });

  const ok = engine.evaluate("safe_tool", {});
  assert.equal(ok.allow, true);
  assert.equal(thirdHookCalled, true);

  thirdHookCalled = false;
  const blocked = engine.evaluate("forbidden_tool", {});
  assert.equal(blocked.allow, false);
  assert.equal(blocked.reason, "Forbidden by policy");
  assert.equal(thirdHookCalled, false);
});

test("security: createWorkspaceEscapeGuard intercepts path traversal and system files", () => {
  const guard = createWorkspaceEscapeGuard({
    workspaceRoot: "D:/kk-studio/KK-Studio-2.0",
    allowedExtraRoots: ["D:/kk-studio/references"],
  });

  // Valid workspace file
  const res1 = guard("read_file", {
    path: "D:/kk-studio/KK-Studio-2.0/src/index.ts",
  });
  assert.equal(res1.allow, true);

  // Valid extra root
  const res2 = guard("read_file", { path: "D:/kk-studio/references/model.ts" });
  assert.equal(res2.allow, true);

  // Path traversal tokens (..)
  const res3 = guard("read_file", { path: "../../secret.env" });
  assert.equal(res3.allow, false);
  assert.match(res3.reason ?? "", /traversal/);

  // Sensitive paths (.ssh, /etc/passwd, .aws)
  const res4 = guard("read_file", { target: "/Users/admin/.ssh/id_rsa" });
  assert.equal(res4.allow, false);
  assert.match(res4.reason ?? "", /sensitive/);

  const res5 = guard("read_file", { file: "/etc/passwd" });
  assert.equal(res5.allow, false);

  // Absolute path outside workspace
  const res6 = guard("write_file", {
    target: "C:/Windows/System32/drivers/etc/hosts",
  });
  assert.equal(res6.allow, false);
});

test("security: createSecretLeakGuard detects credentials in tool arguments", () => {
  const guard = createSecretLeakGuard();

  // Safe parameters
  const res1 = guard("compile_prompt", { text: "A futuristic city in rain" });
  assert.equal(res1.allow, true);

  // OpenAI / Anthropic API Key leak
  const res2 = guard("compile_prompt", {
    prompt: "use key sk-ant-api03-12345678901234567890123456789012",
  });
  assert.equal(res2.allow, false);
  assert.match(res2.reason ?? "", /credential leakage/i);

  // GitHub token leak
  const res3 = guard("git_push", {
    token: "ghp_123456789012345678901234567890123456",
  });
  assert.equal(res3.allow, false);

  // Private key leak
  const res4 = guard("run_agent", {
    key: "-----BEGIN RSA PRIVATE KEY-----\nMIIE...",
  });
  assert.equal(res4.allow, false);
});

test("security: createDestructiveCommandGuard intercepts catastrophic terminal commands", () => {
  const guard = createDestructiveCommandGuard();

  // Safe command
  const res1 = guard("system_exec", { cmd: "git status" });
  assert.equal(res1.allow, true);

  // Destructive rm -rf /
  const res2 = guard("system_exec", { cmd: "rm -rf /" });
  assert.equal(res2.allow, false);
  assert.match(res2.reason ?? "", /prohibited/i);

  // Destructive Windows rmdir /s /q
  const res3 = guard("powershell", { command: "rmdir /s /q C:\\" });
  assert.equal(res3.allow, false);

  // Destructive Windows rmdir with additional flags in various positions
  assert.equal(guard("cmd", { cmd: "rmdir /s /q /a C:\\" }).allow, false);
  assert.equal(guard("cmd", { cmd: "rmdir /a /s /q C:\\" }).allow, false);
  assert.equal(guard("cmd", { cmd: "rmdir /s /a /q C:\\" }).allow, false);

  // Destructive rm with trailing flags and options
  assert.equal(guard("bash", { cmd: "rm -rf -v /" }).allow, false);
  assert.equal(guard("bash", { cmd: "rm -r -f -v /" }).allow, false);
  assert.equal(
    guard("bash", { cmd: "rm -rf --no-preserve-root /" }).allow,
    false,
  );
  assert.equal(guard("bash", { cmd: "rm -f -r -v /" }).allow, false);

  // Raw format
  const res4 = guard("run_command", { script: "format C:" });
  assert.equal(res4.allow, false);

  // Fork bomb
  const res5 = guard("bash", { cmd: ":(){ :|:& };:" });
  assert.equal(res5.allow, false);
});

test("statuslineIpc: StatuslineBroadcaster pub/sub and ANSI formatting", () => {
  const broadcaster = new StatuslineBroadcaster();
  const received: RichStatuslinePayload[] = [];

  const unsubscribe = broadcaster.subscribe((payload) => {
    received.push(payload);
  });

  const payload: RichStatuslinePayload = {
    type: "rich_statusline",
    agent: "Planner",
    state: "working",
    progress: 75,
    step: 3,
    totalSteps: 4,
    currentTool: "plan_get_stage_status",
    durationMs: 450,
    sandboxEnabled: true,
    artifactCount: 2,
    taskCount: 1,
    modelDisplayName: "claude-3-7-sonnet",
    timestamp: Date.now(),
  };

  broadcaster.broadcast(payload);
  assert.equal(received.length, 1);
  assert.equal(received[0].agent, "Planner");
  assert.equal(received[0].progress, 75);

  // Unsubscribe stops delivery
  unsubscribe();
  broadcaster.broadcast(payload);
  assert.equal(received.length, 1);

  // ANSI line formatting
  const ansiLine = broadcaster.formatAnsiStatusline(payload);
  assert.ok(ansiLine.includes("[WORKING]"));
  assert.ok(ansiLine.includes("Planner"));
  assert.ok(ansiLine.includes("75%"));
  assert.ok(ansiLine.includes("(3/4)"));
  assert.ok(ansiLine.includes("tool:plan_get_stage_status"));

  // Canonical formatStatuslineIPC
  const json = formatStatuslineIPC({
    agent: "TestAgent",
    step: 5,
    totalSteps: 10,
    durationMs: 120,
  });
  assert.ok(json.includes('"agent":"TestAgent"'));
  assert.ok(json.includes('"progress":50'));
});

test("toolRegistry: expired mandate token is rejected and blocks ticket", async () => {
  const registry = new ToolRegistry();
  let executed = false;
  registry.registerTool({
    name: "test_tool",
    description: "test",
    riskLevel: "safe",
    parameters: {},
    execute: () => {
      executed = true;
      return { ok: true };
    },
  });

  const mandateManager = new MandateLifecycleManager();
  const mandate = mandateManager.issueMandate({
    authorizedBy: "Router",
    allowedTools: ["test_tool"],
    maxStepCount: 5,
    ttlMs: -500, // Expired in the past
  });
  const ticket = mandateManager.createTicket(mandate.id, "worker-exp");

  const res = await registry.invokeTool(
    "test_tool",
    {},
    {
      callId: "c-exp",
      workspaceRoot: "D:/kk-studio",
      signal: new AbortController().signal,
      mandate,
      ticket,
    },
  );

  assert.equal(res.ok, false);
  assert.equal(executed, false);
  assert.equal(res.error?.code, "MANDATE_EXPIRED");
  assert.equal(ticket.status, "blocked");
  assert.match(
    ticket.blockedReason ?? "",
    /Mandate authorization token has expired/,
  );
});

test("toolRegistry: failing tool execution consumes step budget preventing infinite loops", async () => {
  const registry = new ToolRegistry();
  registry.registerTool({
    name: "failing_tool",
    description: "failing",
    riskLevel: "safe",
    parameters: {},
    execute: () => {
      throw new Error("Simulated failure");
    },
  });

  const mandateManager = new MandateLifecycleManager();
  const mandate = mandateManager.issueMandate({
    authorizedBy: "Router",
    allowedTools: ["failing_tool"],
    maxStepCount: 2,
  });
  const ticket = mandateManager.createTicket(mandate.id, "worker-fail");

  // Attempt 1: fails, stepsUsed becomes 1
  const res1 = await registry.invokeTool(
    "failing_tool",
    {},
    {
      callId: "c-f1",
      workspaceRoot: "D:/kk-studio",
      signal: new AbortController().signal,
      mandate,
      ticket,
    },
  );
  assert.equal(res1.ok, false);
  assert.equal(ticket.stepsUsed, 1);

  // Attempt 2: fails, stepsUsed becomes 2
  const res2 = await registry.invokeTool(
    "failing_tool",
    {},
    {
      callId: "c-f2",
      workspaceRoot: "D:/kk-studio",
      signal: new AbortController().signal,
      mandate,
      ticket,
    },
  );
  assert.equal(res2.ok, false);
  assert.equal(ticket.stepsUsed, 2);

  // Attempt 3: step budget exhausted -> blocked before execution
  const res3 = await registry.invokeTool(
    "failing_tool",
    {},
    {
      callId: "c-f3",
      workspaceRoot: "D:/kk-studio",
      signal: new AbortController().signal,
      mandate,
      ticket,
    },
  );
  assert.equal(res3.ok, false);
  assert.equal(res3.error?.code, "MANDATE_STEP_BUDGET_EXHAUSTED");
  assert.equal(ticket.status, "blocked");
  assert.equal(ticket.stepsUsed, 2);
});

test("security: preInvocation guards block traversal and injection bypass vectors", () => {
  const guard = createWorkspaceEscapeGuard({
    workspaceRoot: "D:/kk-studio/KK-Studio-2.0",
  });

  // Uppercase URL-encoded traversal (%2E%2E)
  const upperRes = guard("read_file", { path: "%2E%2E/secret.env" });
  assert.equal(upperRes.allow, false);
  assert.match(upperRes.reason ?? "", /traversal/i);

  // URL-encoded null-byte (%00)
  const nullByteRes = guard("read_file", { path: "avatar.png%00.php" });
  assert.equal(nullByteRes.allow, false);
  assert.match(nullByteRes.reason ?? "", /traversal/i);
});

test("security: preInvocation destructive guard blocks multi-slash del, reordered rmdir, powershell flags, and split rm", () => {
  const guard = createDestructiveCommandGuard();

  // Multi-flag del
  assert.equal(guard("cmd", { cmd: "del /f /s /q C:\\" }).allow, false);
  assert.equal(guard("cmd", { cmd: "del /fsq C:\\" }).allow, false);

  // Reordered rmdir
  assert.equal(guard("cmd", { cmd: "rmdir /q /s C:\\" }).allow, false);
  assert.equal(guard("cmd", { cmd: "rmdir /s /q C:\\" }).allow, false);

  // Reordered PowerShell
  assert.equal(
    guard("powershell", { cmd: "Remove-Item -Force -Recurse C:\\" }).allow,
    false,
  );
  assert.equal(
    guard("powershell", { cmd: "Remove-Item -Recurse -Force C:\\" }).allow,
    false,
  );

  // Split rm
  assert.equal(guard("bash", { cmd: "rm -r -f /" }).allow, false);
  assert.equal(guard("bash", { cmd: "rm -f -r /" }).allow, false);

  // Benign commands allowed
  assert.equal(guard("cmd", { cmd: "del test.log" }).allow, true);
  assert.equal(guard("bash", { cmd: "rm -f file.txt" }).allow, true);
});

test("security: preInvocation secret guard intercepts Bearer JWTs, PEM certificates, and fine-grained GitHub PATs", () => {
  const guard = createSecretLeakGuard();

  // Bearer JWT
  const bearerRes = guard("http_fetch", {
    headers: {
      Authorization:
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkbWluIn0.c2VjcmV0X3NpZ25hdHVyZQ",
    },
  });
  assert.equal(bearerRes.allow, false);
  assert.match(bearerRes.reason ?? "", /Bearer/i);

  // PEM Certificate
  const certRes = guard("tls", {
    cert: "-----BEGIN CERTIFICATE-----\nMIIEkjCCA3qgAwIBAgIQCgFBStOuibEEdCXTBZoOSTANBgkqhkiG9w0BAQsFADBh\n-----END CERTIFICATE-----",
  });
  assert.equal(certRes.allow, false);
  assert.match(certRes.reason ?? "", /Certificate/i);

  // Fine-grained GitHub PAT and 40-char ghp_
  const patRes = guard("git", {
    token:
      "github_pat_11AAAAAAA_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  });
  assert.equal(patRes.allow, false);

  const ghp40Res = guard("git", {
    token: "ghp_" + "a".repeat(40),
  });
  assert.equal(ghp40Res.allow, false);
});
