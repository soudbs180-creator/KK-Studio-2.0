import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { createComfyUiClient } from "../src/services/comfyClient.ts";
import { createMobileAgentClient } from "../src/services/agentClient.ts";
import { readAgentStream } from "../src/services/agentProtocol.ts";
import type {
  ComfyConnection,
  ComfySubmissionReceipt,
  ComfyImageOutput,
} from "../src/services/comfyTypes.ts";

test("Comfy captures connection, receipt and output across history/queue, original and health vault awaits", async () => {
  for (const operation of ["poll", "download", "health"] as const) {
    const calls: { origin: string; path: string; authorization?: string }[] =
      [];
    const connection: ComfyConnection = {
      id: "stable",
      protocol: "comfyui",
      baseUrl: "http://127.0.0.1:8100",
      credentialRef: "stable-vault",
    };
    const promptId = randomUUID();
    const receipt: ComfySubmissionReceipt = {
      identity: {
        submissionId: randomUUID(),
        projectId: "stable-project",
        connectionId: connection.id,
        baseUrl: connection.baseUrl,
        workflowRevision: 1,
        workflow: {},
        capturedAt: Date.now(),
      },
      promptId,
      promptIdConfirmed: true,
      submissionState: "submitted",
    };
    const output: ComfyImageOutput = {
      index: 0,
      nodeId: "node",
      promptId,
      connectionId: connection.id,
      filename: "stable.png",
      subfolder: "",
      type: "output",
    };
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
      "base64",
    );
    const client = createComfyUiClient({
      allowLoopbackHttp: true,
      credentials: {
        read: async (ref) => {
          assert.equal(ref, "stable-vault");
          connection.id = "edited";
          connection.baseUrl = "http://127.0.0.1:8200";
          connection.credentialRef = "edited-vault";
          receipt.promptId = randomUUID();
          receipt.identity.projectId = "edited-project";
          output.filename = "edited.png";
          output.index = 99;
          return "PUBLIC-TEST-ONLY";
        },
      },
      fetch: (async (url, init) => {
        const target = new URL(String(url));
        calls.push({
          origin: target.origin,
          path: target.pathname + target.search,
          authorization: (init?.headers as Record<string, string>)
            .authorization,
        });
        if (target.pathname.startsWith("/history/"))
          return new Response("{}", {
            headers: { "content-type": "application/json" },
          });
        if (target.pathname === "/queue")
          return Response.json({
            queue_running: [],
            queue_pending: [[0, promptId]],
          });
        if (target.pathname === "/view")
          return new Response(png, {
            headers: { "content-type": "image/png" },
          });
        return Response.json({ system: {}, devices: [] });
      }) as typeof fetch,
    });
    if (operation === "poll") {
      const result = await client.pollPrompt(connection, receipt);
      assert.equal(result.status, "queued");
      assert.equal(result.receipt.promptId, promptId);
      assert.equal(result.receipt.identity.projectId, "stable-project");
      assert.deepEqual(
        calls.map((call) => call.path),
        [`/history/${promptId}`, "/queue"],
      );
    } else if (operation === "download") {
      const result = await client.downloadOriginal(connection, receipt, output);
      assert.equal(result.filename, "stable.png");
      assert.equal(result.index, 0);
      assert.equal(result.promptId, promptId);
      assert.equal(
        calls[0].path,
        "/view?filename=stable.png&subfolder=&type=output",
      );
    } else
      assert.equal((await client.health(connection)).connectionId, "stable");
    assert.ok(
      calls.every(
        (call) =>
          call.origin === "http://127.0.0.1:8100" &&
          call.authorization === "Bearer PUBLIC-TEST-ONLY",
      ),
    );
  }
});

test("v6 terminal success requires completed meaningful assistant output and cumulative replay is not appended twice", async () => {
  const context = {
    requestId: "request",
    accountId: "owner",
    deviceId: "device",
    projectId: "project",
    clientId: "client",
    threadId: "thread",
    conversationId: "conversation",
    expectedRevision: 1,
    turnId: "turn",
  };
  const event = (type: string, value: unknown) =>
    `event: ${type}\ndata: ${JSON.stringify(value)}\n\n`;
  const hello = event("hello", {
    protocolVersion: 6,
    clientId: context.clientId,
    conversation: {
      threadId: "thread",
      conversationId: "conversation",
      revision: 1,
      status: "ready",
    },
  });
  const terminal = event("agent_event", {
    type: "turn.completed",
    status: "completed",
    thread_id: "thread",
    turn_id: "turn",
  });
  const item = (type: string, item: object, extra = {}) =>
    event("agent_event", {
      type,
      thread_id: "thread",
      turn_id: "turn",
      item: { id: "answer", type: "agent_message", ...item },
      ...extra,
    });
  const parse = (body: string, messages: string[] = []) =>
    readAgentStream(
      new Response(hello + body + terminal, {
        headers: { "content-type": "text/event-stream" },
      }),
      context,
      (value) => {
        if (value.kind === "message") messages.push(value.text);
      },
      new AbortController().signal,
      () => undefined,
      () => true,
    );
  await assert.rejects(parse(""), /AGENT_ASSISTANT_OUTPUT_INCOMPLETE/);
  await assert.rejects(
    parse(item("item.updated", { delta: "unfinished" })),
    /AGENT_ASSISTANT_OUTPUT_INCOMPLETE/,
  );
  await assert.rejects(
    parse(item("item.completed", { text: "   " })),
    /AGENT_ASSISTANT_OUTPUT_INCOMPLETE/,
  );
  const messages: string[] = [];
  const result = await parse(
    item("item.started", { text: "" }) +
      item("item.updated", { delta: "Hello " }) +
      item(
        "item.updated",
        { text: "Hello ", delta: "Hello " },
        { replayed: true },
      ) +
      item("item.updated", { delta: "world" }) +
      item("item.completed", { text: "Hello world" }) +
      item("item.completed", { text: "Hello world" }, { replayed: true }),
    messages,
  );
  assert.equal(result.status, "succeeded");
  assert.deepEqual(messages, ["Hello ", "Hello world"]);
  await assert.rejects(
    parse(
      event("conversation_changed", {
        threadId: "other-thread",
        conversationId: "other",
        revision: 2,
        status: "ready",
      }),
    ),
    /AGENT_CONTEXT_CHANGED/,
  );
});

test("Comfy cancel keeps the accepted origin and its credential while connection is edited during vault read", async () => {
  const recorded: { target: string; authorization?: string; path?: string }[] =
    [];
  const servers = ["accepted-origin", "edited-origin"].map((target) =>
    createServer((request, response) => {
      recorded.push({
        target,
        authorization: request.headers.authorization,
        path: request.url,
      });
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ cancelled: true }));
    }),
  );
  await Promise.all(
    servers.map(
      (server) =>
        new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve)),
    ),
  );
  const urls = servers.map((server) => {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    return `http://127.0.0.1:${address.port}`;
  });
  let entered!: () => void;
  const waiting = new Promise<void>((resolve) => (entered = resolve));
  let release!: () => void;
  const ready = new Promise<void>((resolve) => (release = resolve));
  const connection = {
    id: "accepted-connection",
    protocol: "comfyui" as const,
    baseUrl: urls[0],
    credentialRef: "accepted-secret-ref",
  };
  const promptId = randomUUID();
  const receipt = {
    identity: {
      submissionId: randomUUID(),
      projectId: "project-one",
      connectionId: connection.id,
      baseUrl: urls[0],
      workflowRevision: 1,
      workflow: {},
      capturedAt: Date.now(),
    },
    promptId,
    promptIdConfirmed: true,
    submissionState: "submitted" as const,
  };
  const client = createComfyUiClient({
    allowLoopbackHttp: true,
    timeoutMs: 1000,
    credentials: {
      read: async (reference) => {
        assert.equal(reference, "accepted-secret-ref");
        entered();
        await ready;
        return "PUBLIC-TEST-ONLY-ACCEPTED-ORIGIN-SECRET";
      },
    },
  });
  try {
    const cancel = client.requestCancel(connection, receipt);
    await waiting;
    connection.id = "edited-connection";
    connection.baseUrl = urls[1];
    connection.credentialRef = "edited-secret-ref";
    release();
    await cancel;
    assert.deepEqual(recorded, [
      {
        target: "accepted-origin",
        authorization: "Bearer PUBLIC-TEST-ONLY-ACCEPTED-ORIGIN-SECRET",
        path: `/api/jobs/${promptId}/cancel`,
      },
    ]);
  } finally {
    for (const server of servers) server.closeAllConnections();
    await Promise.all(
      servers.map(
        (server) =>
          new Promise<void>((resolve) => server.close(() => resolve())),
      ),
    );
  }
});

test("Agent diagnostic parser exposes real v6 assistant item events before terminal success", async () => {
  const context = {
    requestId: "negative-request",
    accountId: "test-owner",
    deviceId: "test-device",
    projectId: "test-project",
    clientId: "test-client",
    threadId: "test-thread",
    conversationId: "test-conversation",
    expectedRevision: 1,
    turnId: "test-turn",
  };
  const conversation = {
    threadId: context.threadId,
    conversationId: context.conversationId,
    revision: 1,
    status: "ready",
  };
  const event = (type: string, value: unknown) =>
    `event: ${type}\ndata: ${JSON.stringify(value)}\n\n`;
  const response = new Response(
    event("hello", {
      protocolVersion: 6,
      clientId: context.clientId,
      conversation,
    }) +
      event("agent_event", {
        type: "item.updated",
        threadId: context.threadId,
        turnId: context.turnId,
        sourceClientId: context.clientId,
        item: {
          id: "test-assistant-item",
          type: "agent_message",
          text: "Actual v6 assistant output.",
          delta: "Actual v6 assistant output.",
        },
      }) +
      event("agent_event", {
        type: "item.completed",
        threadId: context.threadId,
        turnId: context.turnId,
        sourceClientId: context.clientId,
        item: {
          id: "test-assistant-item",
          type: "agent_message",
          text: "Actual v6 assistant output.",
        },
      }) +
      event("agent_event", {
        type: "turn.completed",
        status: "completed",
        threadId: context.threadId,
        turnId: context.turnId,
        sourceClientId: context.clientId,
      }),
    { headers: { "content-type": "text/event-stream" } },
  );
  const messages: string[] = [];
  const terminal = await readAgentStream(
    response,
    context,
    (value) => {
      if (value.kind === "message" && value.role === "assistant")
        messages.push(value.text);
    },
    new AbortController().signal,
    () => undefined,
    () => true,
  );
  assert.equal(terminal.status, "succeeded");
  assert.ok(
    messages.includes("Actual v6 assistant output."),
    "real v6 generated assistant text reaches the consumer",
  );
});

test("Agent approval does not execute after the explicit local authorization expires during health check", async () => {
  const context = {
    requestId: "negative-request",
    accountId: "test-owner",
    deviceId: "test-device",
    projectId: "test-project",
    clientId: "test-client",
    threadId: "test-thread",
    conversationId: "test-conversation",
    expectedRevision: 1,
    turnId: "test-turn",
  };
  const conversation = {
    threadId: context.threadId,
    conversationId: context.conversationId,
    revision: 1,
    status: "ready",
  };
  let approvals = 0;
  let streamResponse: import("node:http").ServerResponse | undefined;
  let healthEntered!: () => void;
  const waiting = new Promise<void>((resolve) => (healthEntered = resolve));
  let releaseHealth!: () => void;
  const ready = new Promise<void>((resolve) => (releaseHealth = resolve));
  const server = createServer((request, response) => {
    if (request.url?.startsWith("/events")) {
      streamResponse = response;
      response.writeHead(200, { "content-type": "text/event-stream" });
      response.write(
        `event: hello\ndata: ${JSON.stringify({ protocolVersion: 6, clientId: context.clientId, conversation })}\n\nevent: codex_approval\ndata: ${JSON.stringify({ requestId: "negative-approval", method: "item/commandExecution/requestApproval", threadId: context.threadId, turnId: context.turnId, command: "echo public-negative-fixture" })}\n\n`,
      );
    } else if (request.url === "/health") {
      healthEntered();
      void ready.then(() => {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            ok: true,
            protocolVersion: 6,
            codexBusy: false,
            conversation,
          }),
        );
      });
    } else if (request.url === "/agent/codex/approval") {
      approvals++;
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: true }));
    } else {
      response.writeHead(404);
      response.end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const connection = {
    id: "test-agent",
    protocol: "kk-desktop-agent-v6" as const,
    baseUrl: `http://127.0.0.1:${address.port}`,
    credentialRef: "test-credential",
  };
  const expiry = Date.now() + 150;
  const client = createMobileAgentClient({
    development: true,
    desktopDiagnostics: true,
    allowLoopbackHttp: true,
    timeoutMs: 1000,
    credentials: { read: async () => "PUBLIC-TEST-ONLY-AGENT-SECRET" },
    localTestApproval: {
      kind: "explicit-user-approved-local-test",
      ...context,
      expiresAt: expiry,
    },
  });
  let previewReady!: (
    value: import("../src/services/agentTypes.ts").ToolApprovalPreview,
  ) => void;
  const preview = new Promise<
    import("../src/services/agentTypes.ts").ToolApprovalPreview
  >((resolve) => (previewReady = resolve));
  const controller = new AbortController();
  const events = client
    .events(
      connection,
      context,
      (event) => {
        if (event.kind === "approval") previewReady(event.preview);
      },
      controller.signal,
    )
    .catch((error) => error);
  try {
    const approval = client.resolveApproval({
      connection,
      preview: await preview,
      decision: "accept",
      userConfirmed: true,
    });
    await waiting;
    await new Promise((resolve) =>
      setTimeout(resolve, Math.max(1, expiry - Date.now() + 30)),
    );
    releaseHealth();
    const result = await approval.then(
      (value) => value,
      (error) => error,
    );
    assert.equal(
      approvals,
      0,
      "no tool approval POST after the local authorization expiry",
    );
    assert.match(String(result), /LOCAL_AGENT_TEST_APPROVAL_REQUIRED/);
  } finally {
    releaseHealth();
    controller.abort();
    await events;
    streamResponse?.destroy();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
