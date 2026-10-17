import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type ServerResponse } from "node:http";
import { createMobileAgentClient } from "../src/services/agentClient.ts";
import type {
  AgentApprovalInput,
  ToolApprovalPreview,
} from "../src/services/agentTypes.ts";

test("Agent approval revalidates after vault await and captures mutable input before any wait", async () => {
  for (const scenario of [
    "vault-expired",
    "stream-closed",
    "input-edited",
  ] as const) {
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
    const conversation = {
      threadId: "thread",
      conversationId: "conversation",
      revision: 1,
      status: "ready",
    };
    const posts: unknown[] = [];
    let stream: ServerResponse | undefined;
    const server = createServer((request, response) => {
      if (request.url?.startsWith("/events")) {
        stream = response;
        response.writeHead(200, { "content-type": "text/event-stream" });
        response.write(
          `event: hello\ndata: ${JSON.stringify({ protocolVersion: 6, clientId: "client", conversation })}\n\nevent: codex_approval\ndata: ${JSON.stringify({ requestId: "approval", method: "item/commandExecution/requestApproval", threadId: "thread", turnId: "turn", command: "echo public-fixture" })}\n\n`,
        );
      } else if (request.url === "/health") {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            ok: true,
            protocolVersion: 6,
            codexBusy: false,
            conversation,
          }),
        );
      } else if (request.url === "/agent/codex/approval") {
        let body = "";
        request.setEncoding("utf8");
        request.on("data", (chunk) => (body += chunk));
        request.on("end", () => {
          posts.push(JSON.parse(body));
          response.writeHead(200, { "content-type": "application/json" });
          response.end('{"ok":true}');
        });
      } else {
        response.writeHead(404);
        response.end();
      }
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const connection = {
      id: "agent",
      protocol: "kk-desktop-agent-v6" as const,
      baseUrl: `http://127.0.0.1:${address.port}`,
      credentialRef: "fixture-vault",
    };
    const expiry = Date.now() + (scenario === "vault-expired" ? 180 : 10000);
    let entered!: () => void;
    const waiting = new Promise<void>((resolve) => (entered = resolve));
    let release!: () => void;
    const ready = new Promise<void>((resolve) => (release = resolve));
    let reads = 0;
    const client = createMobileAgentClient({
      development: true,
      desktopDiagnostics: true,
      allowLoopbackHttp: true,
      timeoutMs: 1000,
      localTestApproval: {
        kind: "explicit-user-approved-local-test",
        ...context,
        expiresAt: expiry,
      },
      credentials: {
        read: async (ref) => {
          assert.equal(ref, "fixture-vault");
          if (++reads === 2) {
            entered();
            await ready;
          }
          return "PUBLIC-TEST-ONLY";
        },
      },
    });
    let previewReady!: (value: ToolApprovalPreview) => void;
    const preview = new Promise<ToolApprovalPreview>(
      (resolve) => (previewReady = resolve),
    );
    const controller = new AbortController();
    const events = client
      .events(
        connection,
        context,
        (value) => {
          if (value.kind === "approval") previewReady(value.preview);
        },
        controller.signal,
      )
      .catch((error) => error);
    try {
      const input: AgentApprovalInput = {
        connection,
        preview: JSON.parse(JSON.stringify(await preview)),
        decision: "accept",
        userConfirmed: true,
      };
      const result = client.resolveApproval(input).then(
        (value) => value,
        (error) => error,
      );
      await waiting;
      if (scenario === "vault-expired")
        await new Promise((resolve) =>
          setTimeout(resolve, Math.max(1, expiry - Date.now() + 20)),
        );
      if (scenario === "stream-closed") {
        controller.abort();
        await events;
      }
      if (scenario === "input-edited") {
        input.decision = "decline";
        input.preview.requestId = "edited";
        input.preview.context.accountId = "other-owner";
        connection.baseUrl = "http://127.0.0.1:1";
        connection.credentialRef = "edited-vault";
      }
      release();
      const value = await result;
      if (scenario === "input-edited") {
        assert.deepEqual(value, { resolved: true });
        assert.deepEqual(posts, [
          { requestId: "approval", decision: "accept" },
        ]);
      } else {
        assert.equal(posts.length, 0);
        assert.match(
          String(value),
          scenario === "vault-expired"
            ? /LOCAL_AGENT_TEST_APPROVAL_REQUIRED/
            : /AGENT_APPROVAL_UNKNOWN_OR_CHANGED/,
        );
      }
    } finally {
      release();
      controller.abort();
      await events;
      stream?.destroy();
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }
});
