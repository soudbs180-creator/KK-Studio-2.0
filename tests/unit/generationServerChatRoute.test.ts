import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Server } from "node:http";
import type { CapabilityManifest } from "../../src/domain/providerConnections.ts";
import type { ChannelAdapter } from "../../src/features/ai-gateway/channels/adapter.ts";
import { doubaoAdapter } from "../../src/features/ai-gateway/channels/doubao.ts";
import { ChannelRegistry } from "../../src/features/ai-gateway/channels/registry.ts";
import { Scheduler } from "../../src/features/ai-gateway/scheduler.ts";
import { PrivateAssetStore } from "../../src/features/generation-server/assets.ts";
import {
  createGenerationServer,
  tokenAuthenticator,
} from "../../src/features/generation-server/http.ts";
import { GenerationRepository } from "../../src/features/generation-server/repository.ts";
import { PersistentGenerationWorker } from "../../src/features/generation-server/worker.ts";

const capabilities: CapabilityManifest = {
  modalities: ["text"],
  operations: ["generate"],
  maxOutputs: 1,
  async: false,
};

async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}

function createChatServer(withChat = true) {
  const repository = new GenerationRepository(":memory:");
  const assets = new PrivateAssetStore(
    join(mkdtempSync(join(tmpdir(), "kk-chat-route-")), "objects"),
  );
  const worker = new PersistentGenerationWorker(repository, assets, () => {
    throw new Error("worker is not used by this route test");
  });
  const adapter: ChannelAdapter = {
    ...doubaoAdapter,
    provider: "route-test",
    async submit(_context, _input, request) {
      assert.equal(await request.resolveSecret(), "route-secret");
      return {
        kind: "inline",
        assetBase64: Buffer.from("route answer", "utf8").toString("base64"),
        mime: "text/plain",
      };
    },
  };
  const registry = new ChannelRegistry();
  registry.registerAdapter(adapter);
  registry.replace({
    registrations: [
      {
        id: "route-chat",
        adapter,
        kind: "official_api",
        enabled: true,
        priority: 100,
        weight: 10,
        baseUrl: "https://example.invalid",
        credentialRef: "conn.chat",
        capabilities,
        modelMapping: { "kk-default": "ep-route-test" },
        timeoutMs: 1_000,
      },
    ],
    states: new Map(),
  });
  const scheduler = new Scheduler(registry, {
    random: () => 0,
    now: () => 1_700_000_000_000,
  });
  const server = createGenerationServer({
    repository,
    assets,
    worker,
    authenticate: tokenAuthenticator([
      { token: "route-token", principal: { ownerId: "alice" } },
    ]),
    webhookSecret: async () => undefined,
    ...(withChat
      ? {
          chat: {
            scheduler,
            resolveSecret: async (ref?: string) =>
              ref === "conn.chat" ? "route-secret" : undefined,
          },
        }
      : {}),
  });
  return { server, repository, worker };
}

test("chat route validates auth and idempotency before dispatching", async () => {
  const { server, repository, worker } = createChatServer();
  const url = await listen(server);
  const request = (headers: Record<string, string>, body?: unknown) =>
    fetch(`${url}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  try {
    assert.equal(
      (
        await request(
          { Authorization: "Bearer route-token" },
          {
            model: "kk-default",
            messages: [{ role: "user", content: "hello" }],
          },
        )
      ).status,
      400,
    );
    const response = await request(
      {
        Authorization: "Bearer route-token",
        "Idempotency-Key": "route-idem",
      },
      { model: "kk-default", messages: [{ role: "user", content: "hello" }] },
    );
    assert.equal(response.status, 200);
    const completion = (await response.json()) as {
      object: string;
      choices: Array<{ message: { content: string } }>;
      kk_meta: { channelId: string };
    };
    assert.equal(completion.object, "chat.completion");
    assert.equal(completion.choices[0]?.message.content, "route answer");
    assert.equal(completion.kk_meta.channelId, "route-chat");
    assert.equal(
      (
        await request(
          { "Idempotency-Key": "route-idem" },
          {
            model: "kk-default",
            messages: [{ role: "user", content: "hello" }],
          },
        )
      ).status,
      401,
    );
  } finally {
    await worker.stop();
    await close(server);
    repository.close();
  }
});

test("chat route stays disabled when no gateway dependency is injected", async () => {
  const { server, repository, worker } = createChatServer(false);
  const url = await listen(server);
  try {
    const response = await fetch(`${url}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: "Bearer route-token",
        "Content-Type": "application/json",
        "Idempotency-Key": "route-disabled",
      },
      body: JSON.stringify({
        model: "kk-default",
        messages: [{ role: "user", content: "hello" }],
      }),
    });
    assert.equal(response.status, 404);
  } finally {
    await worker.stop();
    await close(server);
    repository.close();
  }
});
