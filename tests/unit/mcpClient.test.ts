import assert from "node:assert/strict";
import test from "node:test";
import { appVersion } from "../../src/runtime/appInfo.ts";
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

async function withDefaultBrowserStorage(
  storage: MemoryStorage,
  locks: unknown,
  callback: () => Promise<void>,
): Promise<void> {
  const windowDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "window",
  );
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator",
  );
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: storage },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { locks },
  });
  try {
    await callback();
  } finally {
    if (windowDescriptor)
      Object.defineProperty(globalThis, "window", windowDescriptor);
    else Reflect.deleteProperty(globalThis, "window");
    if (navigatorDescriptor)
      Object.defineProperty(globalThis, "navigator", navigatorDescriptor);
    else Reflect.deleteProperty(globalThis, "navigator");
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

test("default browser MCP storage delegates all mutations to the same exclusive Web Lock", async () => {
  const storage = new MemoryStorage();
  const requests: { name: string; mode: string }[] = [];
  const locks = {
    request<T>(
      name: string,
      options: { mode: string },
      callback: () => T | Promise<T>,
    ): Promise<T> {
      requests.push({ name, mode: options.mode });
      return storage.withExclusiveLock(callback);
    },
  };
  await withDefaultBrowserStorage(storage, locks, async () => {
    const first = new McpServerRegistry();
    const second = new McpServerRegistry();
    await Promise.all([
      first.add({ ...server, id: "first-tab" }),
      second.add({ ...server, id: "second-tab" }),
    ]);
    await new McpServerRegistry().remove("first-tab");
    assert.deepEqual(
      new McpServerRegistry().list().map((item) => item.id),
      ["second-tab"],
    );
    assert.deepEqual(
      requests,
      Array.from({ length: 3 }, () => ({
        name: "kk-studio:mcp-server-registry",
        mode: "exclusive",
      })),
    );
  });
});

test("default browser MCP storage rejects mutations without Web Locks and preserves readable export", async () => {
  const storage = new MemoryStorage();
  const raw = JSON.stringify([server]);
  storage.setItem(MCP_SERVERS_STORAGE_KEY, raw);
  await withDefaultBrowserStorage(storage, undefined, async () => {
    const first = new McpServerRegistry();
    const second = new McpServerRegistry();
    assert.deepEqual(first.list(), [server]);
    assert.equal(first.isReadOnly, true);
    assert.match(first.persistenceWarning, /暂为只读/);
    await assert.rejects(() => first.add({ ...server, id: "new" }), /只读/);
    await assert.rejects(() => second.remove(server.id), /只读/);
    await assert.rejects(() => first.recover([server.id]), /只读/);
    assert.equal(first.exportRaw(), raw);
    assert.equal(storage.getItem(MCP_SERVERS_STORAGE_KEY), raw);

    const overflowStorage = new MemoryStorage();
    overflowStorage.setItem(
      MCP_SERVERS_STORAGE_KEY,
      JSON.stringify(
        Array.from({ length: 51 }, (_, index) => ({
          ...server,
          id: `overflow-${index}`,
        })),
      ),
    );
    await withDefaultBrowserStorage(overflowStorage, undefined, async () => {
      const overflow = new McpServerRegistry();
      assert.match(overflow.persistenceWarning, /超过当前 50 项上限.*只读/);
      await assert.rejects(() => overflow.recover([]), /只读/);
    });
  });
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
  const calls: Array<{
    method?: string;
    headers: Headers;
    params?: Record<string, unknown>;
  }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input, init) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as {
      method?: string;
      id?: number;
      params?: Record<string, unknown>;
    };
    const headers = new Headers(init?.headers);
    calls.push({ method: body.method, headers, params: body.params });
    if (body.method === "server/discover")
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: {
            supportedVersions: ["2026-07-28"],
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
    for (const call of calls) {
      assert.deepEqual(call.params?._meta, {
        "io.modelcontextprotocol/protocolVersion": "2026-07-28",
        "io.modelcontextprotocol/clientInfo": {
          name: "kk-studio",
          version: appVersion,
        },
        "io.modelcontextprotocol/clientCapabilities": {},
      });
      assert.equal(call.headers.get("MCP-Protocol-Version"), "2026-07-28");
      assert.equal(call.headers.has("MCP-Session-Id"), false);
      assert.equal(call.headers.get("Mcp-Method"), call.method);
      assert.equal(
        call.headers.get("Mcp-Name"),
        call.method === "tools/call" ? "modern_tool" : null,
      );
    }
    assert.equal(calls.at(-1)?.params?.name, "modern_tool");
    assert.deepEqual(calls.at(-1)?.params?.arguments, {});
    assert.equal(
      calls.some((call) => call.method === "DELETE"),
      false,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("MCP modern tool-name headers preserve Unicode, whitespace and sentinel values without header injection", async () => {
  const originalFetch = globalThis.fetch;
  const names = [
    "plain_tool",
    "中文工具",
    " leading",
    "trailing ",
    "line\r\nbreak",
    "=?base64?YQ==?=",
  ];
  const calls: Array<{ name: string; header: string | null }> = [];
  globalThis.fetch = (async (_input, init) => {
    const body = JSON.parse(String(init?.body ?? "{}"));
    let result: unknown = { supportedVersions: ["2026-07-28"] };
    if (body.method === "tools/list")
      result = {
        tools: names.map((name) => ({ name, inputSchema: { type: "object" } })),
      };
    if (body.method === "tools/call") {
      const headers = new Headers(init?.headers);
      calls.push({ name: body.params.name, header: headers.get("Mcp-Name") });
      assert.equal(headers.has("Injected"), false);
      result = { content: [{ type: "text", text: "ok" }] };
    }
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", id: body.id, result }),
      { headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;
  try {
    const client = new McpHttpClient(server);
    await client.connect();
    for (const name of names) await client.callTool(name, {}, true);
    assert.equal(calls[0].header, "plain_tool");
    for (const call of calls.slice(1)) {
      assert.match(call.header ?? "", /^=\?base64\?[A-Za-z0-9+/=]+\?=$/);
      assert.equal(
        Buffer.from(call.header!.slice(9, -2), "base64").toString("utf8"),
        call.name,
      );
    }
    await client.disconnect();
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("MCP modern mirrors valid x-mcp-header declarations from exact body paths and rejects wrong primitive values", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ arguments: Record<string, unknown>; headers: Headers }> =
    [];
  globalThis.fetch = (async (_input, init) => {
    const body = JSON.parse(String(init?.body ?? "{}"));
    let result: unknown = { supportedVersions: ["2026-07-28"] };
    if (body.method === "tools/list")
      result = {
        tools: [
          {
            name: "header_tool",
            inputSchema: {
              type: "object",
              properties: {
                region: { type: "string", "x-mcp-header": "Region" },
                count: { type: "integer", "x-mcp-header": "Count" },
                enabled: { type: "boolean", "x-mcp-header": "Enabled" },
                nested: {
                  type: "object",
                  properties: {
                    greeting: { type: "string", "x-mcp-header": "Greeting" },
                  },
                },
                auth: { type: "string", "x-mcp-header": "Authorization" },
              },
            },
          },
        ],
      };
    if (body.method === "tools/call") {
      calls.push({
        arguments: body.params.arguments,
        headers: new Headers(init?.headers),
      });
      result = { content: [{ type: "text", text: "ok" }] };
    }
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", id: body.id, result }),
      { headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;
  try {
    const client = new McpHttpClient(server);
    await client.connect();
    const args = {
      region: " padded ",
      count: Number.MAX_SAFE_INTEGER,
      enabled: false,
      nested: { greeting: "Hello, 世界\r\n" },
      auth: "synthetic-value",
      unrelated: "unchanged",
    };
    await client.callTool("header_tool", args, true);
    assert.deepEqual(calls[0].arguments, args);
    assert.equal(
      calls[0].headers.get("Mcp-Param-Count"),
      String(Number.MAX_SAFE_INTEGER),
    );
    assert.equal(calls[0].headers.get("Mcp-Param-Enabled"), "false");
    assert.equal(
      calls[0].headers.get("Mcp-Param-Region"),
      "=?base64?IHBhZGRlZCA=?=",
    );
    const greeting = calls[0].headers.get("Mcp-Param-Greeting")!;
    assert.equal(
      Buffer.from(greeting.slice(9, -2), "base64").toString("utf8"),
      args.nested.greeting,
    );
    assert.equal(calls[0].headers.get("Authorization"), null);
    assert.equal(calls[0].headers.get("Mcp-Param-Authorization"), args.auth);
    assert.equal(calls[0].headers.get("Mcp-Param-unrelated"), null);
    await client.callTool("header_tool", { region: null }, true);
    assert.equal(
      [...calls[1].headers.keys()].some((key) => key.startsWith("mcp-param-")),
      false,
    );
    for (const invalid of [
      { region: {} },
      { count: 1.5 },
      { count: Number.MAX_SAFE_INTEGER + 1 },
      { count: "2" },
      { enabled: 1 },
    ]) {
      await assert.rejects(
        () => client.callTool("header_tool", invalid, true),
        /MCP.*参数/,
      );
      assert.equal(
        calls.length,
        2,
        "Invalid primitive arguments must not reach the server",
      );
    }
    const longValue = "界".repeat(50_000);
    await client.callTool("header_tool", { region: longValue }, true);
    const longHeader = calls[2].headers.get("Mcp-Param-Region")!;
    assert.equal(calls[2].arguments.region, longValue);
    assert.equal(
      Buffer.from(longHeader.slice(9, -2), "base64").toString("utf8"),
      longValue,
    );
    await client.disconnect();
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("MCP modern excludes invalid header-annotated schemas while legacy retains its original tools and headers", async () => {
  const originalFetch = globalThis.fetch;
  const annotation = { type: "string", "x-mcp-header": "Region" };
  const invalid = [
    { properties: { region: { type: "string", "x-mcp-header": true } } },
    ...["", "Region\r\nInjected", "Bad:Name", "中文"].map((name) => ({
      properties: { region: { type: "string", "x-mcp-header": name } },
    })),
    ...["number", "object", "array", undefined].map((type) => ({
      properties: { region: { type, "x-mcp-header": "Region" } },
    })),
    {
      properties: {
        a: annotation,
        b: { type: "string", "x-mcp-header": "rEGION" },
      },
    },
    annotation,
    ...["anyOf", "oneOf", "allOf", "prefixItems"].map((keyword) => ({
      [keyword]: [{ properties: { region: annotation } }],
    })),
    ...[
      "not",
      "if",
      "then",
      "else",
      "items",
      "contains",
      "additionalProperties",
      "propertyNames",
    ].map((keyword) => ({ [keyword]: { properties: { region: annotation } } })),
    ...["$defs", "definitions", "patternProperties", "dependentSchemas"].map(
      (keyword) => ({
        [keyword]: { definition: { properties: { region: annotation } } },
      }),
    ),
  ];
  const tools = [
    {
      name: "valid_header",
      inputSchema: { type: "object", properties: { region: annotation } },
    },
    ...invalid.map((inputSchema, index) => ({
      name: `invalid_${index}`,
      inputSchema,
    })),
  ];
  for (const protocolMode of ["modern", "legacy"] as const) {
    const legacy = legacyFixture(() => new Response(null, { status: 404 }));
    globalThis.fetch = (async (input, init) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      if (
        body.method === "initialize" ||
        body.method === "notifications/initialized"
      )
        return legacy(input, init);
      const result =
        body.method === "server/discover"
          ? { supportedVersions: ["2026-07-28"] }
          : body.method === "tools/list"
            ? { tools }
            : { content: [{ type: "text", text: "ok" }] };
      if (body.method === "tools/call" && protocolMode === "legacy") {
        const headers = new Headers(init?.headers);
        assert.equal(
          [...headers.keys()].some((key) => key.startsWith("mcp-param-")),
          false,
        );
        assert.equal(headers.has("Mcp-Method"), false);
      }
      return new Response(
        JSON.stringify({ jsonrpc: "2.0", id: body.id, result }),
        { headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;
    try {
      const client = new McpHttpClient(server, { protocolMode });
      const discovered = await client.connect();
      assert.deepEqual(
        discovered.map((tool) => tool.name),
        protocolMode === "modern"
          ? ["valid_header"]
          : tools.map((tool) => tool.name),
      );
      if (protocolMode === "modern")
        await assert.rejects(
          () => client.callTool("invalid_0", {}, true),
          /未被发现/,
        );
      else await client.callTool("invalid_0", { region: "value" }, true);
      await client.disconnect();
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
});

test("MCP legacy fallback preserves original headers, payload and redirect/credential boundaries", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{
    method?: string;
    headers: Headers;
    params?: Record<string, unknown>;
  }> = [];
  const legacy = legacyFixture(
    (method, body) =>
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: method === "tools/list" ? { tools: [] } : {},
        }),
        { headers: { "Content-Type": "application/json" } },
      ),
  );
  globalThis.fetch = (async (input, init) => {
    const body = JSON.parse(String(init?.body ?? "{}"));
    calls.push({
      method: body.method,
      headers: new Headers(init?.headers),
      params: body.params,
    });
    assert.equal(init?.credentials, "omit");
    assert.equal(init?.redirect, "error");
    return legacy(input, init);
  }) as typeof fetch;
  try {
    const client = new McpHttpClient(server);
    await client.connect();
    for (const call of calls.slice(1)) {
      assert.equal(call.params?._meta, undefined);
      assert.equal(call.headers.has("Mcp-Method"), false);
      assert.equal(call.headers.has("Mcp-Name"), false);
      assert.equal(
        call.headers.get("MCP-Protocol-Version"),
        call.method === "initialize" ? null : "2025-11-25",
      );
      assert.equal(
        call.headers.get("Accept"),
        "application/json, text/event-stream",
      );
    }
    assert.deepEqual(calls[1].params, {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "kk-studio", version: appVersion },
    });
    await client.disconnect();
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("MCP malformed HTTP discovery bodies fail closed without legacy retries", async () => {
  const originalFetch = globalThis.fetch;
  for (const [status, body, contentType] of [
    [200, "not-json", "application/json"],
    [204, null, "application/json"],
    [400, "not-json", "application/json"],
    [
      400,
      JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32000,
          message: "Bad Request: No valid session ID provided",
        },
      }),
      "text/html",
    ],
  ] as const) {
    const methods: string[] = [];
    globalThis.fetch = (async (_input, init) => {
      methods.push(JSON.parse(String(init?.body ?? "{}")).method);
      return new Response(body, {
        status,
        headers: { "Content-Type": contentType },
      });
    }) as typeof fetch;
    try {
      await assert.rejects(() => new McpHttpClient(server).connect());
      assert.deepEqual(methods, ["server/discover"]);
    } finally {
      globalThis.fetch = originalFetch;
    }
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
  for (const status of [401, 403, 429, 500, 501, 502, 503]) {
    const methods: string[] = [];
    globalThis.fetch = (async (_input, init) => {
      methods.push(JSON.parse(String(init?.body ?? "{}")).method);
      return new Response(null, { status });
    }) as typeof fetch;
    try {
      await assert.rejects(
        () => new McpHttpClient(server).connect(),
        new RegExp(`HTTP ${status}`),
      );
      assert.deepEqual(methods, ["server/discover"]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
});

test("MCP auto recognizes SDK legacy transport 400 without accepting null-id RPC results", async () => {
  const originalFetch = globalThis.fetch;
  const messages = [
    "Bad Request: No valid session ID provided",
    "Bad Request: Server not initialized",
    "Bad Request: Mcp-Session-Id header is required",
    "Bad Request: Unsupported protocol version: 2026-07-28 (supported versions: 2025-11-25, 2025-06-18, 2025-03-26, 2024-11-05, 2024-10-07)",
  ];
  for (const message of messages) {
    const methods: string[] = [];
    const legacy = legacyFixture((method, body) => {
      if (method === "tools/list")
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: body.id,
            result: {
              tools: [{ name: "sdk_echo", inputSchema: { type: "object" } }],
            },
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      return new Response(null, { status: 404 });
    });
    globalThis.fetch = (async (input, init) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      methods.push(body.method);
      if (body.method === "server/discover")
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: null,
            error: { code: -32000, message },
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      return legacy(input, init);
    }) as typeof fetch;
    try {
      const client = new McpHttpClient(server);
      assert.deepEqual(
        (await client.connect()).map((tool) => tool.name),
        ["sdk_echo"],
      );
      assert.deepEqual(methods, [
        "server/discover",
        "initialize",
        "notifications/initialized",
        "tools/list",
      ]);
      assert.equal(client.isConnected, true);
      await client.disconnect();
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
});

test("MCP structured unsupported-version offers select only the available legacy revision without retry loops", async () => {
  const originalFetch = globalThis.fetch;
  const cases = [
    {
      supported: ["2025-11-25", "2025-06-18"],
      requested: "2026-07-28",
      accepted: true,
    },
    { supported: ["2025-06-18"], requested: "2026-07-28", accepted: false },
    {
      supported: ["2026-07-28", "2025-11-25"],
      requested: "2026-07-28",
      accepted: false,
    },
    {
      supported: ["2027-01-01", "2025-11-25"],
      requested: "2026-07-28",
      accepted: false,
    },
    { supported: ["2025-11-25"], requested: "wrong-version", accepted: false },
  ];
  for (const item of cases) {
    const methods: string[] = [];
    const legacy = legacyFixture(
      (_method, body) =>
        new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: body.id,
            result: { tools: [] },
          }),
          { headers: { "Content-Type": "application/json" } },
        ),
    );
    globalThis.fetch = (async (input, init) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      methods.push(body.method);
      if (body.method === "server/discover")
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: null,
            error: {
              code: -32022,
              message: "Unsupported protocol version",
              data: { requested: item.requested, supported: item.supported },
            },
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      return legacy(input, init);
    }) as typeof fetch;
    try {
      const client = new McpHttpClient(server);
      if (item.accepted) {
        await client.connect();
        assert.deepEqual(methods, [
          "server/discover",
          "initialize",
          "notifications/initialized",
          "tools/list",
        ]);
        await client.disconnect();
      } else {
        await assert.rejects(() => client.connect());
        assert.deepEqual(methods, ["server/discover"]);
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
});

test("MCP transport 400 still rejects auth, modern protocol errors and unrelated RPC IDs", async () => {
  const originalFetch = globalThis.fetch;
  const cases = [
    {
      id: null,
      error: { code: -32001, message: "unsupported authentication" },
    },
    { id: null, error: { code: -32000, message: "Database unavailable" } },
    ...[-32020, -32021, -32022].map((code) => ({
      id: null,
      error: { code, message: "Modern request rejected" },
    })),
    { id: null, result: { protocolVersions: ["2026-07-28"] } },
    {
      id: "unrelated",
      error: {
        code: -32000,
        message: "Bad Request: No valid session ID provided",
      },
    },
    { id: "unrelated", error: { code: -32601, message: "Method not found" } },
    {
      id: null,
      error: {
        code: -32000,
        message: "Bad Request: No valid session ID provided",
      },
      result: {},
    },
  ];
  for (const shape of cases) {
    const methods: string[] = [];
    globalThis.fetch = (async (_input, init) => {
      methods.push(JSON.parse(String(init?.body ?? "{}")).method);
      return new Response(JSON.stringify({ jsonrpc: "2.0", ...shape }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;
    try {
      await assert.rejects(
        () => new McpHttpClient(server).connect(),
        /HTTP 400/,
      );
      assert.deepEqual(methods, ["server/discover"]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
});

test("MCP pinned modern and successful null-id replies never initialize a legacy session", async () => {
  const originalFetch = globalThis.fetch;
  for (const [status, protocolMode] of [
    [400, "modern"],
    [200, "auto"],
  ] as const) {
    const methods: string[] = [];
    globalThis.fetch = (async (_input, init) => {
      methods.push(JSON.parse(String(init?.body ?? "{}")).method);
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32000,
            message: "Bad Request: No valid session ID provided",
          },
        }),
        { status, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;
    try {
      await assert.rejects(() =>
        new McpHttpClient(server, { protocolMode }).connect(),
      );
      assert.deepEqual(methods, ["server/discover"]);
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
