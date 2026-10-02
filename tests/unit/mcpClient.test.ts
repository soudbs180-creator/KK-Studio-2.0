import assert from "node:assert/strict";
import test from "node:test";
import {
  McpHttpClient,
  McpServerRegistry,
  mcpServerSchema,
  parseMcpEndpoint,
  MCP_SERVERS_STORAGE_KEY,
  type McpServerStorage,
} from "../../src/features/mcp/mcpClient.ts";

const server = {
  id: "local-tools",
  name: "Local tools",
  transport: "streamable_http" as const,
  endpoint: "http://127.0.0.1:3000/mcp",
  enabled: true,
};

class MemoryStorage implements McpServerStorage {
  values = new Map<string, string>();
  private lock: Promise<void> = Promise.resolve();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  async withExclusiveLock<T>(callback: () => T | Promise<T>): Promise<T> {
    const previous = this.lock;
    let release!: () => void;
    this.lock = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await callback();
    } finally {
      release();
    }
  }
}

class CorruptedStorage extends MemoryStorage {
  constructor() {
    super();
    this.values.set(MCP_SERVERS_STORAGE_KEY, "not-json");
  }
}

function legacyFixture(
  onRequest: (
    method: string,
    body: Record<string, unknown>,
  ) => Response | Promise<Response>,
): typeof fetch {
  return (async (_input, init) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<
      string,
      unknown
    >;
    const method = typeof body.method === "string" ? body.method : "";
    if (method === "server/discover")
      return new Response(null, { status: 404 });
    if (method === "initialize")
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: { protocolVersion: "2025-11-25" },
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    if (method === "notifications/initialized")
      return new Response(null, { status: 202 });
    return onRequest(method, body);
  }) as typeof fetch;
}

test("MCP endpoint accepts loopback HTTP and remote HTTPS only", () => {
  assert.equal(
    parseMcpEndpoint("http://localhost:3000/mcp").hostname,
    "localhost",
  );
  assert.equal(
    parseMcpEndpoint("https://mcp.example.test/mcp").protocol,
    "https:",
  );
  for (const endpoint of [
    "http://mcp.example.test/mcp",
    "https://mcp.example.test/mcp?token=secret",
    "https://user:pass@mcp.example.test/mcp#fragment",
    "file:///tmp/mcp",
  ]) {
    assert.throws(() => parseMcpEndpoint(endpoint));
    assert.equal(
      mcpServerSchema.safeParse({ ...server, endpoint }).success,
      false,
    );
  }
});

test("server registry persists endpoint metadata without credentials or session state", async () => {
  const storage = new MemoryStorage();
  const registry = new McpServerRegistry(storage);
  await registry.add(server);
  const persisted = storage.getItem(MCP_SERVERS_STORAGE_KEY) ?? "";
  assert.match(persisted, /local-tools/);
  assert.doesNotMatch(persisted, /token|session|authorization|secret/i);
  assert.deepEqual(new McpServerRegistry(storage).list(), [server]);
});

test("server registry never writes more servers than it can read back", async () => {
  const storage = new MemoryStorage();
  const registry = new McpServerRegistry(storage);
  for (let index = 0; index < 50; index += 1)
    await registry.add({ ...server, id: `local-${index}` });
  const before = storage.getItem(MCP_SERVERS_STORAGE_KEY);

  await assert.rejects(() => registry.add({ ...server, id: "local-50" }), /50/);
  assert.equal(storage.getItem(MCP_SERVERS_STORAGE_KEY), before);
  assert.equal(registry.list().length, 50);
  assert.equal(new McpServerRegistry(storage).list().length, 50);

  await registry.add({ ...server, id: "local-0", name: "更新现有服务器" });
  assert.equal(new McpServerRegistry(storage).list().length, 50);
});

test("MCP server labels reject credential-like text before persistence", async () => {
  const storage = new MemoryStorage();
  const registry = new McpServerRegistry(storage);
  assert.equal(
    mcpServerSchema.safeParse({
      ...server,
      name: "api_key: pasted-secret",
    }).success,
    false,
  );
  await assert.rejects(
    () => registry.add({ ...server, name: "Bearer abcdefghijklmnop" }),
    /MCP 名称疑似包含密钥或凭据/,
  );
  assert.equal(storage.getItem(MCP_SERVERS_STORAGE_KEY), null);
});

test("corrupted MCP persistence is reported and cannot be overwritten", async () => {
  const registry = new McpServerRegistry(new CorruptedStorage());
  assert.match(registry.persistenceWarning, /无法读取/);
  assert.equal(registry.hasCorruption, true);
  assert.equal(registry.exportRaw(), "not-json");
  await assert.rejects(() => registry.add(server), /无法读取/);
});

test("MCP registry serializes concurrent writers without losing either entry", async () => {
  const storage = new MemoryStorage();
  const first = new McpServerRegistry(storage);
  const second = new McpServerRegistry(storage);
  await Promise.all([
    first.add({ ...server, id: "first-tab" }),
    second.add({ ...server, id: "second-tab" }),
  ]);
  const persisted = new McpServerRegistry(storage).list();
  assert.equal(persisted.length, 2);
  assert.ok(persisted.some((item) => item.id === "first-tab"));
  assert.ok(persisted.some((item) => item.id === "second-tab"));
});

test("MCP registry rebases independent instances instead of overwriting newer entries", async () => {
  const storage = new MemoryStorage();
  const seed = new McpServerRegistry(storage);
  for (let index = 0; index < 48; index += 1)
    await seed.add({ ...server, id: `seed-${index}` });

  const first = new McpServerRegistry(storage);
  const second = new McpServerRegistry(storage);
  await first.add({ ...server, id: "first-tab" });
  await second.add({ ...server, id: "second-tab" });

  const persisted = new McpServerRegistry(storage).list();
  assert.equal(persisted.length, 50);
  assert.ok(persisted.some((item) => item.id === "first-tab"));
  assert.ok(persisted.some((item) => item.id === "second-tab"));
});

test("MCP registry reports a capacity conflict instead of hiding the first writer", async () => {
  const storage = new MemoryStorage();
  const seed = new McpServerRegistry(storage);
  for (let index = 0; index < 49; index += 1)
    await seed.add({ ...server, id: `seed-${index}` });

  const first = new McpServerRegistry(storage);
  const second = new McpServerRegistry(storage);
  await first.add({ ...server, id: "first-tab" });
  await assert.rejects(
    () => second.add({ ...server, id: "second-tab" }),
    /并发冲突|最多保存 50 个/,
  );
  const persisted = new McpServerRegistry(storage).list();
  assert.ok(persisted.some((item) => item.id === "first-tab"));
  assert.ok(!persisted.some((item) => item.id === "second-tab"));
});

test("MCP registry rejects stale same-id updates and preserves the newer value", async () => {
  const storage = new MemoryStorage();
  await new McpServerRegistry(storage).add(server);
  const first = new McpServerRegistry(storage);
  const second = new McpServerRegistry(storage);
  await first.add({ ...server, name: "First tab" });
  await assert.rejects(
    () => second.add({ ...server, name: "Second tab" }),
    /并发冲突/,
  );
  assert.equal(new McpServerRegistry(storage).list()[0]?.name, "First tab");
});

test("MCP registry rejects stale deletes after another tab removes or adds the id", async () => {
  const storage = new MemoryStorage();
  await new McpServerRegistry(storage).add(server);
  const first = new McpServerRegistry(storage);
  const second = new McpServerRegistry(storage);
  await first.remove(server.id);
  await assert.rejects(() => second.remove(server.id), /并发冲突/);

  const third = new McpServerRegistry(storage);
  const fourth = new McpServerRegistry(storage);
  await third.add(server);
  await assert.rejects(() => fourth.remove(server.id), /并发冲突/);
});

test("MCP registry rejects stale adds after another tab removes the id", async () => {
  const storage = new MemoryStorage();
  await new McpServerRegistry(storage).add(server);
  const first = new McpServerRegistry(storage);
  const second = new McpServerRegistry(storage);
  await first.remove(server.id);
  await assert.rejects(
    () => second.add({ ...server, name: "復活禁止" }),
    /并发冲突/,
  );
  assert.equal(new McpServerRegistry(storage).list().length, 0);
});

test("legacy over-limit MCP persistence remains viewable, exportable, and explicitly recoverable", async () => {
  const storage = new MemoryStorage();
  const legacy = Array.from({ length: 51 }, (_, index) => ({
    ...server,
    id: `legacy-${index}`,
  }));
  const raw = JSON.stringify(legacy);
  storage.values.set(MCP_SERVERS_STORAGE_KEY, raw);

  const registry = new McpServerRegistry(storage);
  assert.equal(registry.list().length, 51);
  assert.equal(registry.hasOverflow, true);
  assert.match(registry.persistenceWarning, /51.*50/);
  assert.equal(registry.exportRaw(), raw);
  await assert.rejects(() => registry.add(server), /超过当前 50 项上限/);

  const keepIds = legacy.slice(1).map((item) => item.id);
  const recovered = await registry.recover(keepIds);
  assert.equal(recovered.length, 50);
  assert.equal(recovered[0]?.id, "legacy-1");
  assert.equal(registry.hasOverflow, false);
  assert.equal(new McpServerRegistry(storage).list().length, 50);
  await assert.rejects(
    () => registry.add({ ...server, id: "one-more" }),
    /最多保存 50 个/,
  );
});

test("MCP auto negotiation uses modern discover and keeps modern calls sessionless", async () => {
  const calls: Array<{ method?: string; headers: Headers }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input, init) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as {
      method?: string;
      id?: number;
    };
    const headers = new Headers(init?.headers);
    calls.push({ method: body.method, headers });
    if (body.method === "server/discover")
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: {
            protocolVersions: ["2026-07-28"],
            serverInfo: { name: "modern", version: "1.0.0" },
          },
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    if (body.method === "tools/list")
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: {
            tools: [{ name: "modern_tool", inputSchema: { type: "object" } }],
          },
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    if (body.method === "tools/call")
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: { content: [{ type: "text", text: "modern-ok" }] },
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    return new Response(null, { status: 404 });
  }) as typeof fetch;
  try {
    const client = new McpHttpClient(server);
    assert.deepEqual(
      (await client.connect()).map((tool) => tool.name),
      ["modern_tool"],
    );
    assert.equal(calls[0]?.method, "server/discover");
    assert.equal(calls[0]?.headers.get("MCP-Protocol-Version"), "2026-07-28");
    assert.equal(calls[1]?.headers.get("MCP-Protocol-Version"), "2026-07-28");
    assert.equal(calls[1]?.headers.has("MCP-Session-Id"), false);
    assert.deepEqual(await client.callTool("modern_tool", {}, true), {
      content: [{ type: "text", text: "modern-ok" }],
    });
    await client.disconnect();
    assert.equal(
      calls.some((call) => call.method === "DELETE"),
      false,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("MCP auto negotiation falls back to legacy only when discovery is unsupported", async () => {
  const methods: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input, init) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as {
      method?: string;
      id?: number;
    };
    methods.push(body.method ?? "");
    if (body.method === "server/discover")
      return new Response(null, { status: 404 });
    if (body.method === "initialize")
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: { protocolVersion: "2025-11-25" },
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "MCP-Session-Id": "legacy-session",
          },
        },
      );
    if (body.method === "notifications/initialized")
      return new Response(null, { status: 202 });
    if (body.method === "tools/list")
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: { tools: [] },
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    return new Response(null, { status: 404 });
  }) as typeof fetch;
  try {
    await new McpHttpClient(server).connect();
    assert.deepEqual(methods.slice(0, 3), [
      "server/discover",
      "initialize",
      "notifications/initialized",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("MCP discovery authentication and service failures never masquerade as legacy support", async () => {
  const originalFetch = globalThis.fetch;
  for (const status of [401, 403, 500]) {
    globalThis.fetch = (async () =>
      new Response(null, { status })) as typeof fetch;
    try {
      await assert.rejects(
        () => new McpHttpClient(server).connect(),
        new RegExp(`HTTP ${status}`),
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
});

test("MCP auto negotiation fails closed on a malformed successful discovery response", async () => {
  const methods: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input, init) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as {
      method?: string;
      id?: number;
    };
    methods.push(body.method ?? "");
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: body.id,
        result: { serverInfo: { name: "missing-version" } },
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;
  try {
    await assert.rejects(
      () => new McpHttpClient(server).connect(),
      /未声明 2026-07-28 支持/,
    );
    assert.deepEqual(methods, ["server/discover"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("MCP discovery errors mentioning unsupported auth never fall back to legacy", async () => {
  const methods: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input, init) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as {
      method?: string;
      id?: number;
    };
    methods.push(body.method ?? "");
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: body.id,
        error: { code: -32001, message: "unsupported authentication" },
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;
  try {
    await assert.rejects(
      () => new McpHttpClient(server).connect(),
      /现代协议发现失败：unsupported authentication/,
    );
    assert.deepEqual(methods, ["server/discover"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Streamable HTTP performs initialize, initialized, paginated tools/list, and SSE parsing", async () => {
  const calls: Array<{ method?: string; headers: Headers; id?: number }> = [];
  const originalFetch = globalThis.fetch;
  let listCall = 0;
  globalThis.fetch = (async (_input, init) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as {
      method?: string;
      id?: number;
      params?: { cursor?: string };
    };
    calls.push({
      method: body.method,
      headers: new Headers(init?.headers),
      id: body.id,
    });
    if (body.method === "initialize") {
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: {
            protocolVersion: "2025-11-25",
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: "fixture", version: "1.0.0" },
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "MCP-Session-Id": "fixture-session",
          },
        },
      );
    }
    if (body.method === "notifications/initialized")
      return new Response(null, { status: 202 });
    if (body.method === "tools/list") {
      listCall += 1;
      const payload = {
        jsonrpc: "2.0",
        id: body.id,
        result:
          listCall === 1
            ? {
                tools: [
                  {
                    name: "read_canvas",
                    description: "Read canvas metadata",
                    inputSchema: { type: "object", properties: {} },
                  },
                ],
                nextCursor: "page-2",
              }
            : {
                tools: [
                  {
                    name: "inspect_asset",
                    title: "Inspect Asset",
                    inputSchema: { type: "object", required: ["assetId"] },
                  },
                ],
              },
      };
      return new Response(
        `event: message\ndata: ${JSON.stringify(payload)}\n\n`,
        {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        },
      );
    }
    if (body.method === "tools/call") {
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: { content: [{ type: "text", text: "ok" }] },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    return new Response(null, { status: 404 });
  }) as typeof fetch;
  try {
    const client = new McpHttpClient(server);
    const tools = await client.connect();
    assert.deepEqual(
      tools.map((tool) => tool.name),
      ["read_canvas", "inspect_asset"],
    );
    assert.equal(calls[0].method, "server/discover");
    assert.equal(calls[1].method, "initialize");
    assert.equal(calls[2].method, "notifications/initialized");
    assert.equal(calls[3].headers.get("MCP-Session-Id"), "fixture-session");
    assert.equal(calls[3].headers.get("MCP-Protocol-Version"), "2025-11-25");
    assert.equal(calls[4].headers.get("MCP-Session-Id"), "fixture-session");
    assert.equal(
      await client.callTool("read_canvas", {}, false).catch(() => "confirm"),
      "confirm",
    );
    assert.deepEqual(await client.callTool("read_canvas", {}, true), {
      content: [{ type: "text", text: "ok" }],
    });
    await client.disconnect();
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("unknown MCP tool and malformed tool list fail closed", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input, init) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as {
      id?: number;
      method?: string;
    };
    if (body.method === "server/discover")
      return new Response(null, { status: 404 });
    if (body.method === "initialize")
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: { protocolVersion: "2025-11-25" },
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    if (body.method === "notifications/initialized")
      return new Response(null, { status: 202 });
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: body.id,
        result: { tools: [{ name: "bad" }] },
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;
  try {
    await assert.rejects(
      () => new McpHttpClient(server).connect(),
      /工具列表格式无效/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("MCP request timeout and caller cancellation abort safely", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input, init) =>
    new Promise<Response>((_, reject) => {
      init?.signal?.addEventListener("abort", () =>
        reject(init.signal?.reason ?? new Error("aborted")),
      );
    })) as typeof fetch;
  try {
    await assert.rejects(
      () => new McpHttpClient(server, { timeoutMs: 5 }).connect(),
      /超时/,
    );
    const controller = new AbortController();
    controller.abort(new Error("caller cancelled"));
    await assert.rejects(
      () =>
        new McpHttpClient(server, { timeoutMs: 50 }).connect(controller.signal),
      /caller cancelled/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("MCP response size limit rejects bodies larger than 2 MB", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = legacyFixture(
    () =>
      new Response("x".repeat(2 * 1024 * 1024 + 1), {
        headers: { "Content-Type": "application/json" },
      }),
  );
  try {
    await assert.rejects(
      () => new McpHttpClient(server).connect(),
      /超过 2 MB/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("MCP tool discovery rejects more than 500 tools", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = legacyFixture((method, body) => {
    if (method !== "tools/list") return new Response(null, { status: 404 });
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: body.id,
        result: {
          tools: Array.from({ length: 501 }, (_, index) => ({
            name: `tool-${index}`,
            inputSchema: { type: "object" },
          })),
        },
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  });
  try {
    await assert.rejects(
      () => new McpHttpClient(server).connect(),
      /超过 500 个限制/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("MCP tool pagination rejects repeated cursors and more than 32 pages", async () => {
  const originalFetch = globalThis.fetch;
  let repeatedCalls = 0;
  globalThis.fetch = legacyFixture((method, body) => {
    if (method !== "tools/list") return new Response(null, { status: 404 });
    repeatedCalls += 1;
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: body.id,
        result: { tools: [], nextCursor: "same-cursor" },
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  });
  try {
    await assert.rejects(
      () => new McpHttpClient(server).connect(),
      /分页游标重复/,
    );
    assert.equal(repeatedCalls, 2);

    let pageCalls = 0;
    globalThis.fetch = legacyFixture((method, body) => {
      if (method !== "tools/list") return new Response(null, { status: 404 });
      pageCalls += 1;
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: { tools: [], nextCursor: `page-${pageCalls}` },
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    });
    await assert.rejects(
      () => new McpHttpClient(server).connect(),
      /超过 32 页限制/,
    );
    assert.equal(pageCalls, 32);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
