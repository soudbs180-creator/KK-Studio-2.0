import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { invoke } from "@tauri-apps/api/core";
import { configToolNames } from "../../src/domain/configTools.ts";
import { providerConnectionSchema } from "../../src/domain/providerConnections.ts";
import { configConnectionFields } from "../../src/domain/configTools.ts";
import {
  CONFIG_CREDENTIAL_EVENT,
} from "../../src/features/providers/configAgentRuntime.ts";
import { createAgentHost } from "../../src/features/agent/agentHost.ts";
import { DEFAULT_LOCAL_CONNECTION } from "../../src/domain/providerConnections.ts";
import { createAgentApi } from "../../src/features/agent/agentApi.ts";

test(
  "real MCP / HTTP / SSE configuration roundtrip never carries the popup key",
  { timeout: 30_000 },
  async (t) => {
    const root = fileURLToPath(new URL("../../", import.meta.url));
    assert.deepEqual(
      [...configConnectionFields].sort(),
      Object.keys(providerConnectionSchema.shape).sort(),
    );
    const agent = path.join(root, "vendor/canvas-agent");
    const require = createRequire(path.join(agent, "package.json"));
    const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
    const {
      StdioClientTransport,
    } = require("@modelcontextprotocol/sdk/client/stdio.js");
    const temp = await mkdtemp(path.join(os.tmpdir(), "kk-config-roundtrip-"));
    const fake = "sk-FAKE-CONFIG-END-TO-END-1234567890";
    const events: string[] = [],
      returns: unknown[] = [],
      nativeCommands: string[] = [];
    const credentials = new Map<string, string>(),
      storage = new Map<string, string>();
    const original = Object.getOwnPropertyDescriptor(globalThis, "window");
    const originalTauri = Object.getOwnPropertyDescriptor(
      globalThis,
      "isTauri",
    );
    Object.defineProperty(globalThis, "isTauri", {
      configurable: true,
      value: true,
    });
    let revision = 1,
      probeFails = false;
    let connections = [
      {
        ...DEFAULT_LOCAL_CONNECTION,
        id: "fixture-provider",
        kind: "user_byok" as const,
        provider: "Fixture",
        displayName: "Fixture",
        baseUrl: "https://provider.invalid/v1",
        credentialRef: "fixture-vault-ref",
        model: "before",
        protocol: "openai-chat" as const,
        authMode: "api-key" as const,
      },
    ];
    const initial = structuredClone(connections);
    const target = Object.assign(new EventTarget(), {
      location: { protocol: "tauri:", hostname: "localhost" },
      navigator: {
        locks: {
          query: async () => ({ held: [] }),
          request: async (
            _name: unknown,
            _options: unknown,
            run: () => unknown,
          ) => run(),
        },
      },
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
      __TAURI_INTERNALS__: {
        invoke: async (command: string, args: Record<string, unknown> = {}) => {
          nativeCommands.push(command);
          if (command === "read_provider_config")
            return {
              status: "loaded",
              revision,
              connections: structuredClone(connections),
            };
          if (command === "write_provider_config") {
            assert.equal(args.expectedRevision, revision);
            connections = structuredClone(args.connections as typeof connections);
            return ++revision;
          }
          if (command === "credential_set") {
            credentials.set(args.providerId as string, args.secret as string);
            return true;
          }
          if (command === "provider_models_fetch") {
            assert.equal(args.secret, null);
            assert.ok(credentials.has(args.credentialRef as string));
            if (probeFails) throw new Error(fake);
            return ["fixture-model", fake];
          }
          if (
            [
              "provider_models_prepare",
              "provider_models_cancel",
              "provider_models_release",
            ].includes(command)
          )
            return;
          throw new Error("Unexpected native command: " + command);
        },
      },
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: target,
    });
    target.addEventListener(CONFIG_CREDENTIAL_EVENT, (event) => {
      event.preventDefault();
      const detail = (event as CustomEvent).detail;
      events.push(JSON.stringify({ event: CONFIG_CREDENTIAL_EVENT, detail }));
      void invoke("credential_set", {
        providerId: detail.credentialRef,
        secret: fake,
      }).then(() => detail.respond("provided"));
    });
    let stdout = "",
      stderr = "",
      mcpStderr = "";
    const env = {
      ...process.env,
      KK_AGENT_CONFIG_DIR: temp,
      KK_AGENT_DESKTOP: "1",
      CANVAS_AGENT_TOKEN: "config-test-connection-token",
      PORT: "0",
    };
    const child = spawn(
      process.execPath,
      [path.join(agent, "dist/index.js"), "--debug"],
      { cwd: agent, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
    );
    const closed = once(child, "close");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined = undefined;
    let client:
      | {
          close(): Promise<void>;
          connect(transport: unknown): Promise<void>;
          listTools(): Promise<{ tools: Array<{ name: string }> }>;
          callTool(args: {
            name: string;
            arguments?: Record<string, unknown>;
          }): Promise<{ isError?: boolean; content: Array<{ text: string }> }>;
        }
      | undefined = undefined;
    t.after(async () => {
      await reader?.cancel().catch(() => undefined);
      await client?.close();
      child.kill();
      await closed;
      const logDir = path.join(temp, "logs");
      let fileLogs = "";
      for (const name of await readdir(logDir).catch(() => []))
        fileLogs += await readFile(path.join(logDir, name), "utf8");
      const evidence = {
        events,
        returns,
        nativeCommands,
        logs: stdout + stderr + mcpStderr + fileLogs,
      };
      if (process.env.KK_CONFIG_TEST_EVIDENCE) {
        await mkdir(process.env.KK_CONFIG_TEST_EVIDENCE, { recursive: true });
        await writeFile(
          path.join(
            process.env.KK_CONFIG_TEST_EVIDENCE,
            "roundtrip-evidence.json",
          ),
          JSON.stringify(evidence, null, 2),
        );
      }
      assert.ok(
        !JSON.stringify(evidence).includes(fake),
        "Fake popup key must not appear in events, MCP returns or logs",
      );
      if (original) Object.defineProperty(globalThis, "window", original);
      else Reflect.deleteProperty(globalThis, "window");
      if (originalTauri)
        Object.defineProperty(globalThis, "isTauri", originalTauri);
      else Reflect.deleteProperty(globalThis, "isTauri");
      await rm(temp, { recursive: true, force: true });
    });
    const deadline = Date.now() + 7000;
    while (
      !stdout.match(/Local URL: (http:\/\/127\.0\.0\.1:\d+)/) &&
      Date.now() < deadline
    )
      await new Promise((resolve) => setTimeout(resolve, 20));
    const base = stdout.match(/Local URL: (http:\/\/127\.0\.0\.1:\d+)/)?.[1];
    assert.ok(base, "HTTP child must be listening");
    const headers = {
      "content-type": "application/json",
      "x-canvas-agent-token": env.CANVAS_AGENT_TOKEN,
    };
    const scope = {
      projectId: "config-project",
      chatId: "config-chat",
      epoch: "config-epoch",
    };
    const stream = await fetch(
      `${base}/events?clientId=config-ui&scope=${encodeURIComponent(JSON.stringify(scope))}`,
      { headers },
    );
    assert.equal(stream.status, 200);
    reader = stream.body!.getReader();
  const host = createAgentHost({
    getProject:()=>undefined,
    commit:()=>assert.fail("configuration tools must not mutate project data"),
    generate:async()=>assert.fail("configuration tools must not submit generation"),
  });
    const api = createAgentApi({
      endpoint: base,
      token: env.CANVAS_AGENT_TOKEN,
      clientId: "config-ui",
      scope,
    });
  await api.postState(null);
    let hostFailure: unknown;
    let rejectHost!: (error: unknown) => void;
    const failedHost = new Promise<never>((_resolve, reject) => {
      rejectHost = reject;
    });
    void failedHost.catch(() => undefined);
    const pump = (async () => {
      let buffered = "";
      try {
        while (true) {
          const chunk = await reader!.read();
          if (chunk.done) break;
          buffered += new TextDecoder().decode(chunk.value);
          let boundary: number;
          while ((boundary = buffered.indexOf("\n\n")) >= 0) {
            const frame = buffered.slice(0, boundary);
            buffered = buffered.slice(boundary + 2);
            if (!frame.startsWith("event: tool_call\n")) continue;
            const event = JSON.parse(frame.split("\ndata: ")[1]);
            events.push(JSON.stringify(event));
          const result = await host.executeConfigTool(event.name, event.input);
            await api.postToolResult({
              requestId: event.requestId,
              threadId: event.threadId,
              turnId: event.turnId,
              result,
            });
          }
        }
      } catch (error) {
        hostFailure = error;
        rejectHost(error);
      }
    })();
    void pump;
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [path.join(agent, "dist/index.js"), "mcp", "--debug"],
      env,
      stderr: "pipe",
    });
    transport.stderr?.on("data", (chunk: Buffer) => {
      mcpStderr += chunk;
    });
    client = new Client({ name: "kk-config-integration", version: "1" });
    await client.connect(transport);
    const listed = await client.listTools();
    for (const name of configToolNames)
      assert.ok(
        listed.tools.some((item: { name: string }) => item.name === name),
        name,
      );
    async function call(name: string, args: Record<string, unknown> = {}) {
      const result = await Promise.race([
        client.callTool({ name, arguments: args }),
        failedHost,
      ]);
      returns.push(result);
      assert.equal(result.isError, undefined, JSON.stringify(result));
      return JSON.parse(result.content[0].text);
    }
    const current = await call("kk_config_get");
    assert.equal(current.connections[0].model, "before");
    const draft = {
      version: 1,
      exportedAt: "2026-11-09T00:00:00.000Z",
      connections: [{ ...connections[0], model: "after" }],
    };
    const proposed = await call("kk_config_propose", { draft });
    assert.equal(proposed.valid, true);
    assert.deepEqual(
      await call("kk_credential_request", { connectionId: "fixture-provider" }),
      { status: "provided" },
    );
    assert.deepEqual([...credentials.values()], [fake]);
    assert.equal(
      (await call("kk_connection_test", { connectionId: "fixture-provider" }))
        .modelCount,
      2,
    );
    probeFails = true;
    const failed = await call("kk_connection_test", {
      connectionId: "fixture-provider",
    });
    assert.equal(failed.ok, false);
    assert.equal(failed.code, "connection_failed");
    const applied = await call("kk_config_apply", {
      draft,
      expectedVersion: proposed.version,
    });
    assert.equal(applied.status, "applied");
    assert.equal(connections[0].model, "after");
    const restored = await call("kk_config_rollback", {
      snapshotId: applied.snapshotId,
      expectedVersion: applied.version,
    });
    assert.equal(restored.status, "restored");
    assert.deepEqual(connections, initial);
    assert.ok(Array.isArray((await call("kk_capability_status")).capabilities));
    const count = events.length;
    const rejected = await client.callTool({
      name: "kk_config_propose",
      arguments: { draft: { ...draft, apiKey: fake } },
    });
    returns.push(rejected);
    assert.equal(rejected.isError, true);
    assert.equal(events.length, count);
    assert.equal(nativeCommands.includes("credential_get"), false);
    assert.equal(hostFailure, undefined);
    assert.ok(
      !JSON.stringify({ events, returns, stdout, stderr, mcpStderr }).includes(
        fake,
      ),
    );
  },
);
