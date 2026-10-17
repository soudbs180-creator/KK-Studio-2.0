import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import {
  createMobileAgentClient,
  AgentServiceError,
} from "../src/services/agentClient.ts";
import type {
  AgentContext,
  MobileAgentConnection,
  MobileAgentOptions,
  ToolApprovalPreview,
} from "../src/services/agentTypes.ts";
import {
  buildLocalInstruction,
  buildToolApprovalPreview,
} from "../src/services/agentProtocol.ts";
const context = (): AgentContext => ({
  requestId: "fixture-request",
  accountId: "fixture-owner",
  deviceId: "fixture-phone",
  projectId: "fixture-project",
  clientId: "fixture-client",
  threadId: "fixture-thread",
  conversationId: "fixture-conversation",
  expectedRevision: 4,
});
const conversation = {
  threadId: "fixture-thread",
  conversationId: "fixture-conversation",
  revision: 4,
  status: "ready",
};
const options = (): MobileAgentOptions => ({
  development: true,
  desktopDiagnostics: true,
  allowLoopbackHttp: true,
  timeoutMs: 500,
  credentials: { read: async () => "test-only-desktop-token" },
  localTestApproval: {
    kind: "explicit-user-approved-local-test",
    accountId: "fixture-owner",
    deviceId: "fixture-phone",
    projectId: "fixture-project",
    clientId: "fixture-client",
    expiresAt: Date.now() + 60_000,
  },
});
function json(response: ServerResponse, value: unknown) {
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify(value));
}
async function fixture(
  action: (request: IncomingMessage, response: ServerResponse) => void,
  run: (connection: MobileAgentConnection) => Promise<void>,
) {
  const server = createServer(action);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    await run({
      id: "fixture-agent",
      protocol: "kk-desktop-agent-v6",
      baseUrl: `http://127.0.0.1:${address.port}`,
      credentialRef: "fixture-desktop-vault",
    });
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}
test("production and unapproved or owner-mismatched Agent requests never connect or start desktop work", async () => {
  let requests = 0;
  await fixture(
    (_request, response) => {
      requests++;
      response.end();
    },
    async (connection) => {
      for (const extra of [
        { development: false },
        { localTestApproval: undefined },
        {
          localTestApproval: {
            ...options().localTestApproval!,
            accountId: "other-owner",
          },
        },
      ]) {
        const client = createMobileAgentClient({ ...options(), ...extra });
        await assert.rejects(
          client.submitTurn({
            connection,
            context: context(),
            prompt: "Public fixture",
          }),
          /AGENT.*UNAVAILABLE|AGENT.*APPROVAL/,
        );
      }
      await assert.rejects(
        createMobileAgentClient(options()).submitTurn({
          connection: { ...connection, baseUrl: "https://remote.example.test" },
          context: context(),
          prompt: "Public fixture",
        }),
        /AGENT.*UNAVAILABLE/,
      );
      assert.equal(requests, 0);
    },
  );
});

test("explicit local development diagnostics validate health, models and threads without claiming phone execution", async () => {
  await fixture(
    (request, response) => {
      if (request.url === "/health") {
        json(response, {
          ok: true,
          protocolVersion: 6,
          codexBusy: false,
          conversation,
        });
        return;
      }
      assert.equal(
        request.headers["x-canvas-agent-token"],
        "test-only-desktop-token",
      );
      assert.ok(!request.url?.includes("test-only-desktop-token"));
      if (request.url === "/agent/codex/models")
        json(response, {
          ok: true,
          data: [
            {
              id: "fixture-model",
              model: "fixture-model",
              displayName: "Fixture",
            },
          ],
        });
      else
        json(response, {
          ok: true,
          data: [
            { id: "fixture-thread", preview: "Public fixture", status: "idle" },
          ],
          nextCursor: null,
        });
    },
    async (connection) => {
      const client = createMobileAgentClient(options());
      assert.equal(
        (await client.health(connection)).mobileExecutionAvailable,
        false,
      );
      assert.equal(
        (await client.listModels(connection))[0].id,
        "fixture-model",
      );
      assert.equal(
        (await client.listThreads(connection))[0].id,
        "fixture-thread",
      );
    },
  );
});

test("approved local Agent stream captures turn and tool preview, resolves only known approval and confirms terminal separately", async () => {
  let eventResponse: ServerResponse | undefined;
  let turns = 0;
  await fixture(
    (request, response) => {
      if (request.url === "/health") {
        json(response, {
          ok: true,
          protocolVersion: 6,
          codexBusy: false,
          conversation,
        });
        return;
      }
      if (request.url?.startsWith("/events?")) {
        assert.ok(!request.url.includes("token="));
        eventResponse = response;
        response.writeHead(200, { "content-type": "text/event-stream" });
        response.write(
          `event: hello\ndata: ${JSON.stringify({ protocolVersion: 6, clientId: "fixture-client", conversation, pendingApprovals: [] })}\n\n`,
        );
        return;
      }
      if (request.url === "/agent/codex/turn") {
        turns++;
        json(response, { ok: true, threadId: "fixture-thread" });
        eventResponse?.write(
          `event: agent_event\ndata: ${JSON.stringify({ type: "turn.started", threadId: "fixture-thread", turnId: "fixture-turn" })}\n\nevent: codex_approval\ndata: ${JSON.stringify({ requestId: "fixture-approval", threadId: "fixture-thread", turnId: "fixture-turn", method: "item/commandExecution/requestApproval", command: "echo fixture", reason: "Fixture only" })}\n\n`,
        );
        return;
      }
      if (request.url === "/agent/codex/approval") {
        json(response, { ok: true });
        eventResponse?.write(
          `event: agent_event\ndata: ${JSON.stringify({ type: "item.completed", threadId: "fixture-thread", turnId: "fixture-turn", item: { id: "assistant-final", type: "agent_message", text: "Fixture completed." } })}\n\n`,
        );
        eventResponse?.end(
          `event: agent_event\ndata: ${JSON.stringify({ type: "turn.completed", status: "completed", threadId: "fixture-thread", turnId: "fixture-turn" })}\n\n`,
        );
        return;
      }
      response.writeHead(404);
      response.end();
    },
    async (connection) => {
      const client = createMobileAgentClient(options());
      const captured = context();
      let hello!: () => void;
      const ready = new Promise<void>((resolve) => {
        hello = resolve;
      });
      let approve!: (preview: ToolApprovalPreview) => void;
      const previewPromise = new Promise<ToolApprovalPreview>((resolve) => {
        approve = resolve;
      });
      const assistantMessages: string[] = [];
      const events = client.events(connection, captured, (event) => {
        if (event.kind === "hello") hello();
        if (event.kind === "approval") approve(event.preview);
        if (event.kind === "message" && event.role === "assistant")
          assistantMessages.push(event.text);
      });
      await ready;
      const accepted = await client.submitTurn({
        connection,
        context: captured,
        prompt: "Public fixture prompt",
        model: "fixture-model",
      });
      assert.equal(accepted.submissionState, "submitted");
      const preview = await previewPromise;
      assert.equal(preview.command, "echo fixture");
      assert.equal(preview.context.turnId, "fixture-turn");
      await assert.rejects(
        client.resolveApproval({
          connection,
          preview: { ...preview, requestId: "unknown-approval" },
          decision: "accept",
          userConfirmed: true,
        }),
        /APPROVAL/,
      );
      assert.equal(
        (
          await client.resolveApproval({
            connection,
            preview,
            decision: "accept",
            userConfirmed: true,
          })
        ).resolved,
        true,
      );
      const terminal = await events;
      assert.equal(terminal.submissionState, "terminal");
      assert.equal(terminal.turnId, "fixture-turn");
      assert.equal(terminal.status, "succeeded");
      assert.deepEqual(assistantMessages, ["Fixture completed."]);
      await assert.rejects(
        client.submitTurn({
          connection,
          context: captured,
          prompt: "Public fixture prompt",
        }),
        /SUBMISSION_ALREADY_STARTED/,
      );
      assert.equal(turns, 1);
    },
  );
});

test("local Agent approval is captured at construction and cannot be granted later by mutating options", async () => {
  await fixture(
    (_request, response) => response.end(),
    async (connection) => {
      const configured = options();
      configured.localTestApproval = undefined;
      const service = createMobileAgentClient(configured);
      configured.localTestApproval = options().localTestApproval;
      await assert.rejects(
        service.submitTurn({
          connection,
          context: context(),
          prompt: "Public fixture",
        }),
        /LOCAL_AGENT_TEST_APPROVAL_REQUIRED/,
      );
    },
  );
});

test("only one event connection can reserve the same diagnostic client even before hello arrives", async () => {
  let requests = 0;
  await fixture(
    (_request, response) => {
      requests++;
      response.writeHead(200, { "content-type": "text/event-stream" });
      response.write(": waiting\n\n");
    },
    async (connection) => {
      const service = createMobileAgentClient(options());
      const controller = new AbortController();
      const first = service
        .events(connection, context(), () => undefined, controller.signal)
        .catch((error) => error);
      try {
        await assert.rejects(
          service.events(
            connection,
            { ...context(), requestId: "other-fixture-request" },
            () => undefined,
          ),
          /AGENT_EVENT_CONNECTION_ALREADY_OPEN/,
        );
      } finally {
        controller.abort();
        await first;
      }
      assert.ok(requests <= 1);
    },
  );
});

test("local Agent text instructions distinguish roles and Skill instructions from executable tools", () => {
  const text = buildLocalInstruction(
    {
      kind: "role",
      id: "writer",
      name: "Writer",
      instruction: "Write clearly.",
    },
    [
      {
        kind: "skill-instruction",
        id: "outline",
        name: "Outline",
        instruction: "Use an outline.",
        enabled: true,
      },
      {
        kind: "skill-instruction",
        id: "disabled",
        name: "Disabled",
        instruction: "Do not add this.",
        enabled: false,
      },
    ],
  );
  assert.equal(text, "Write clearly.\n\nUse an outline.");
  assert.throws(
    () =>
      buildToolApprovalPreview(
        { ...context(), turnId: "fixture-turn" },
        {
          requestId: "fixture-approval",
          threadId: "other-thread",
          turnId: "fixture-turn",
          method: "item/commandExecution/requestApproval",
          command: "echo fixture",
        },
      ),
    /APPROVAL_SCOPE/,
  );
  assert.throws(
    () =>
      buildToolApprovalPreview(
        { ...context(), turnId: "fixture-turn" },
        {
          requestId: "fixture-approval",
          threadId: "fixture-thread",
          turnId: "fixture-turn",
          method: "item/commandExecution/requestApproval",
          command: "Authorization: Bearer test-only-secret",
        },
      ),
    /APPROVAL_SECRET/,
  );
});

test("accepted Agent disconnect retains scoped receipt, while stream deadline retains actual turn id and unsafe cancellation never posts", async () => {
  let requests = 0;
  let paid = 0;
  let eventResponse: ServerResponse | undefined;
  await fixture(
    (request, response) => {
      requests++;
      if (request.url === "/health") {
        json(response, {
          ok: true,
          protocolVersion: 6,
          codexBusy: false,
          conversation,
        });
        return;
      }
      if (request.url?.startsWith("/events?")) {
        eventResponse = response;
        response.writeHead(200, { "content-type": "text/event-stream" });
        response.write(
          `event: hello\ndata: ${JSON.stringify({ protocolVersion: 6, clientId: "fixture-client", conversation })}\n\n`,
        );
        return;
      }
      paid++;
      eventResponse?.write(
        `event: agent_event\ndata: ${JSON.stringify({ type: "turn.started", threadId: "fixture-thread", turnId: "known-fixture-turn" })}\n\n`,
      );
      response.destroy();
    },
    async (connection) => {
      const service = createMobileAgentClient({ ...options(), timeoutMs: 150 });
      let hello!: () => void;
      const ready = new Promise<void>((resolve) => {
        hello = resolve;
      });
      const eventError = service
        .events(connection, context(), (event) => {
          if (event.kind === "hello") hello();
        })
        .catch((error) => error);
      await ready;
      await assert.rejects(
        service.submitTurn({
          connection,
          context: context(),
          prompt: "Public fixture",
        }),
        (error) => {
          assert.ok(error instanceof AgentServiceError);
          assert.equal(error.submissionState, "unknown");
          assert.equal(
            error.agentReceipt?.context.projectId,
            "fixture-project",
          );
          return true;
        },
      );
      const lost = await eventError;
      assert.ok(lost instanceof AgentServiceError);
      assert.equal(lost.agentReceipt?.turnId, "known-fixture-turn");
      await assert.rejects(
        service.submitTurn({
          connection,
          context: context(),
          prompt: "Public fixture",
        }),
        /SUBMISSION_ALREADY_STARTED/,
      );
      const beforeCancel = requests;
      await assert.rejects(
        service.requestCancel(connection, lost.agentReceipt!),
        /SAFE_TURN_CANCEL_UNAVAILABLE/,
      );
      assert.equal(requests, beforeCancel);
      assert.equal(paid, 1);
    },
  );
});

test("Agent replay before this request is submitted cannot become its terminal success", async () => {
  await fixture(
    (_request, response) => {
      response.writeHead(200, { "content-type": "text/event-stream" });
      response.end(
        `event: hello\ndata: ${JSON.stringify({ protocolVersion: 6, clientId: "fixture-client", conversation })}\n\nevent: agent_event\ndata: ${JSON.stringify({ type: "turn.started", threadId: "fixture-thread", turnId: "previous-turn", replayed: true })}\n\nevent: agent_event\ndata: ${JSON.stringify({ type: "turn.completed", status: "completed", threadId: "fixture-thread", turnId: "previous-turn", replayed: true })}\n\n`,
      );
    },
    async (connection) => {
      const seen: string[] = [];
      await assert.rejects(
        createMobileAgentClient(options()).events(
          connection,
          context(),
          (event) => seen.push(event.kind),
        ),
        /AGENT_EVENT_STREAM_INTERRUPTED/,
      );
      assert.deepEqual(seen, ["hello"]);
    },
  );
});

test("known failed Agent turn exposes its actual terminal status in its receipt", async () => {
  await fixture(
    (_request, response) => {
      response.writeHead(200, { "content-type": "text/event-stream" });
      response.end(
        `event: hello\ndata: ${JSON.stringify({ protocolVersion: 6, clientId: "fixture-client", conversation })}\n\nevent: agent_event\ndata: ${JSON.stringify({ type: "turn.completed", status: "failed", threadId: "fixture-thread", turnId: "known-failed-turn" })}\n\n`,
      );
    },
    async (connection) => {
      const result = await createMobileAgentClient(options()).events(
        connection,
        { ...context(), turnId: "known-failed-turn" },
        () => undefined,
      );
      assert.equal("status" in result ? result.status : undefined, "failed");
    },
  );
});
