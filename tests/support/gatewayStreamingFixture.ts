// Real production Gateway components with only owned synthetic loopback upstreams.
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { randomUUID } from "node:crypto";
import { EventEmitter, once } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";
import { doubaoAdapter } from "../../src/features/ai-gateway/channels/doubao.ts";
import { ChannelRegistry } from "../../src/features/ai-gateway/channels/registry.ts";
import { Scheduler } from "../../src/features/ai-gateway/scheduler.ts";
import { GenerationRepository } from "../../src/features/generation-server/repository.ts";
import { PrivateAssetStore } from "../../src/features/generation-server/assets.ts";
import { PersistentGenerationWorker } from "../../src/features/generation-server/worker.ts";
import {
  createGenerationServer,
  tokenAuthenticator,
} from "../../src/features/generation-server/http.ts";

const evidence = path.resolve(
  ".tmp",
  "task-gateway-stream-20261018",
  `integration-${randomUUID()}`,
);
await fs.mkdir(evidence, { recursive: true });
export const canary = "synthetic-local-provider-canary-no-real-key";
const appToken = "synthetic-local-application-token";
const capabilities = {
  modalities: ["text" as const],
  operations: ["chat" as const],
  maxOutputs: 1,
  async: false,
};
type Mode =
  | "gate"
  | "hang"
  | "content_filter"
  | "refusal"
  | "post-error"
  | "stop-truncate"
  | "pre503"
  | "pre-error"
  | "partial-usage"
  | "heartbeat"
  | "pre-timeout"
  | "json";

export function deferred<T = void>() {
  let done = false;
  let complete!: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    complete = resolve;
  });
  return {
    promise,
    resolve(value?: T) {
      if (!done) {
        done = true;
        complete(value as T);
      }
    },
    get released() {
      return done;
    },
  };
}
export async function bounded<T>(
  promise: Promise<T>,
  label: string,
  ms = 5000,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(label)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
async function listenOwned(server: Server): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = (server.address() as { port: number }).port;
  assert(![1421, 1423].includes(port));
  return `http://127.0.0.1:${port}`;
}
export async function captureWire(response: Response) {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let text = "";
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      text += decoder.decode(next.value, { stream: true });
    }
    text += decoder.decode();
    return { text, complete: true };
  } catch {
    return { text, complete: false };
  } finally {
    reader.releaseLock();
  }
}

export async function fixture(
  mode: Mode,
  options: { timeoutMs?: number | { a: number; b: number } } = {},
) {
  const timeoutFor = (id: string) =>
    typeof options.timeoutMs === "number"
      ? options.timeoutMs
      : (options.timeoutMs?.[id === "a" ? "a" : "b"] ?? 5000);
  const runDir = path.join(evidence, `run-${randomUUID()}`);
  await fs.mkdir(runDir);
  const firstRequest = deferred(),
    firstDelta = deferred(),
    stopWritten = deferred(),
    releaseFinish = deferred(),
    upstreamAborted = deferred();
  const requests: Array<{
    channel: string;
    stream: boolean;
    includeUsage: boolean;
    authMatchesSynthetic: boolean;
  }> = [];
  const secretRefs: string[] = [];
  const events: string[] = [];
  const observations = new EventEmitter();
  let forcedFixtureClose = false;
  const upstream = createServer((req, res) => {
    void (async () => {
      res.on("close", () => {
        if (!res.writableEnded) {
          events.push("upstream-aborted");
          upstreamAborted.resolve();
        }
      });
      const chunks: Buffer[] = [];
      for await (const bytes of req) chunks.push(Buffer.from(bytes));
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
        stream?: boolean;
        stream_options?: { include_usage?: boolean };
      };
      const channel = req.url?.startsWith("/b/") ? "b" : "a";
      requests.push({
        channel,
        stream: body.stream === true,
        includeUsage: body.stream_options?.include_usage === true,
        authMatchesSynthetic: req.headers.authorization === `Bearer ${canary}`,
      });
      observations.emit("request");
      firstRequest.resolve();
      if (mode === "pre-error" || (mode === "pre503" && channel === "a")) {
        res.writeHead(503, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            error: {
              message:
                mode === "pre-error"
                  ? canary
                  : "synthetic temporary upstream failure",
            },
          }),
        );
        return;
      }
      const answer = mode === "pre503" ? "fallback success" : "json success";
      if ((mode === "json" || mode === "pre503") && !body.stream) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            choices: [{ message: { content: answer } }],
            usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 },
          }),
        );
        return;
      }
      if (mode === "hang") {
        await releaseFinish.promise;
        if (!res.destroyed) {
          res.writeHead(200, { "content-type": "application/json" });
          res.end(
            JSON.stringify({
              choices: [
                { message: { content: "released synthetic response" } },
              ],
            }),
          );
        }
        return;
      }
      res.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
      });
      res.flushHeaders();
      if (mode === "heartbeat" || (mode === "pre-timeout" && channel === "a")) {
        res.write(": synthetic heartbeat\r\n\r\n");
        await releaseFinish.promise;
        if (!res.destroyed) res.end();
        return;
      }
      const frame = (
        delta: Record<string, unknown>,
        finish: string | null = null,
      ) =>
        res.write(
          `data: ${JSON.stringify({ choices: [{ index: 0, delta, finish_reason: finish }] })}\r\n\r\n`,
        );
      if (mode === "content_filter") {
        frame({}, "content_filter");
        res.end("data: [DONE]\r\n\r\n");
        return;
      }
      if (mode === "refusal") {
        frame({ refusal: "synthetic policy refusal" }, "stop");
        res.end("data: [DONE]\r\n\r\n");
        return;
      }
      if (mode === "pre503" || mode === "pre-timeout" || mode === "json") {
        frame({ content: answer });
        frame({}, "stop");
        res.end("data: [DONE]\r\n\r\n");
        return;
      }
      frame({ role: "assistant" });
      await new Promise<void>((resolve) => {
        res.write(
          `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: "你" }, finish_reason: null }] })}\r\n\r\n`,
          () => resolve(),
        );
      });
      firstDelta.resolve();
      events.push("first-upstream-delta-flushed");
      if (mode === "stop-truncate") {
        frame({}, "stop");
        stopWritten.resolve();
      }
      await releaseFinish.promise;
      if (res.destroyed) return;
      if (mode === "post-error") {
        res.end(
          `data: ${JSON.stringify({ error: { message: canary, code: "server_error" } })}\r\n\r\n`,
        );
        return;
      }
      if (mode === "stop-truncate") {
        res.end();
        return;
      }
      frame({ content: "好" });
      frame({}, "stop");
      res.write(
        `data: ${JSON.stringify({ choices: [], usage: mode === "partial-usage" ? { total_tokens: 5 } : { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 } })}\r\n\r\n`,
      );
      res.end("data: [DONE]\r\n\r\n");
    })().catch(() => {
      events.push("owned-upstream-handler-error");
      res.destroy();
    });
  });
  const upstreamUrl = await listenOwned(upstream);
  const registry = new ChannelRegistry();
  registry.registerAdapter(doubaoAdapter);
  registry.replace({
    registrations: ["a", "b"].map((id, index) => ({
      id,
      adapter: doubaoAdapter,
      kind: "official_api" as const,
      enabled: true,
      priority: 100 - index * 10,
      weight: 10,
      baseUrl: `${upstreamUrl}/${id}`,
      credentialRef: `synthetic-${id}`,
      capabilities,
      modelMapping: { "kk-default": "ep-synthetic-local" },
      timeoutMs: timeoutFor(id),
    })),
    states: new Map(),
  });
  const scheduler = new Scheduler(registry, {
    random: () => 0,
    now: () => 1000,
  });
  const resolveSecret = async (ref?: string) => {
    secretRefs.push(ref ?? "missing");
    return canary;
  };
  const repository = new GenerationRepository(":memory:");
  const assets = new PrivateAssetStore(path.join(runDir, "assets"));
  const worker = new PersistentGenerationWorker(repository, assets, () => {
    throw new Error("No persistent worker/provider is allowed in this fixture");
  });
  const gateway = createGenerationServer({
    repository,
    assets,
    worker,
    authenticate: tokenAuthenticator([
      { token: appToken, principal: { ownerId: "synthetic-owner" } },
    ]),
    webhookSecret: async () => undefined,
    chat: { scheduler, resolveSecret },
  });
  const gatewayUrl = await listenOwned(gateway);
  async function closeOwned(server: Server) {
    const closed = new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    server.closeIdleConnections();
    const timer = setTimeout(() => {
      forcedFixtureClose = true;
      server.closeAllConnections();
    }, 600);
    try {
      await bounded(closed, "owned fixture close did not finish", 2500);
    } finally {
      clearTimeout(timer);
    }
  }
  return {
    mode,
    gateway,
    setMode(next: Mode) {
      mode = next;
    },
    async requestCount(count: number) {
      while (requests.length < count) await once(observations, "request");
    },
    firstRequest,
    firstDelta,
    stopWritten,
    releaseFinish,
    upstreamAborted,
    requests,
    secretRefs,
    scheduler,
    resolveSecret,
    context: {
      channelId: "a",
      baseUrl: `${upstreamUrl}/a`,
      capabilities,
      modelMapping: { "kk-default": "ep-synthetic-local" },
      timeoutMs: timeoutFor("a"),
    },
    request(signal?: AbortSignal, stream = true) {
      return fetch(`${gatewayUrl}/v1/chat/completions`, {
        method: "POST",
        signal,
        headers: {
          authorization: `Bearer ${appToken}`,
          "content-type": "application/json",
          "idempotency-key": `synthetic-${randomUUID()}`,
        },
        body: JSON.stringify({
          model: "kk-default",
          messages: [{ role: "user", content: "synthetic local-only prompt" }],
          stream,
        }),
      });
    },
    dispatch(signal: AbortSignal, sessionId?: string) {
      const request = {
        model: "kk-default",
        operation: "chat",
        input: {
          model: "kk-default",
          operation: "chat" as const,
          prompt: "synthetic local-only prompt",
          attachments: [],
        },
        idempotencyKey: `synthetic-${randomUUID()}`,
        resolveSecret,
        signal,
        ...(sessionId ? { sessionId } : {}),
        onTextDelta: async () => undefined,
      };
      return scheduler.dispatch(request);
    },
    async close() {
      releaseFinish.resolve();
      await worker.stop();
      try {
        await Promise.all([closeOwned(gateway), closeOwned(upstream)]);
      } finally {
        repository.close();
        await fs.writeFile(
          path.join(runDir, "fixture-receipt.json"),
          JSON.stringify(
            {
              mode,
              upstreamUrl,
              gatewayUrl,
              requests,
              secretRefs,
              events,
              releaseFinish: releaseFinish.released,
              forcedFixtureClose,
              realProviderRequests: false,
              nativeStarted: false,
            },
            null,
            2,
          ) + "\n",
          { flag: "wx" },
        );
      }
    },
  };
}

export function observeBackpressure(
  f: Awaited<ReturnType<typeof fixture>>,
  onFalse?: () => void,
) {
  const firstFalse = deferred(),
    settled = deferred();
  const fences: boolean[] = [];
  let drains = 0,
    streamStarted = () => false;
  const dispatch = f.scheduler.dispatch.bind(f.scheduler);
  f.scheduler.dispatch = (request) => {
    streamStarted = request.streamStarted ?? (() => false);
    const pending = dispatch(request);
    void pending.then(
      () => settled.resolve(),
      () => settled.resolve(),
    );
    return pending;
  };
  f.gateway.on("request", (_req, res) => {
    const write = res.write;
    res.on("drain", () => {
      drains += 1;
    });
    // Observe the real result; no write/drain result or production response is mocked.
    res.write = ((...args: Parameters<typeof res.write>) => {
      const accepted = Reflect.apply(write, res, args) as boolean;
      if (!accepted) {
        fences.push(streamStarted());
        firstFalse.resolve();
        onFalse?.();
      }
      return accepted;
    }) as typeof res.write;
  });
  return {
    firstFalse,
    settled,
    fences,
    get drains() {
      return drains;
    },
  };
}
