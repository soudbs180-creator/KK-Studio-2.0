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

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

class CorruptedStorage extends MemoryStorage {
  constructor() {
    super();
    this.values.set(MCP_SERVERS_STORAGE_KEY, "not-json");
  }
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

test("server registry persists endpoint metadata without credentials or session state", () => {
  const storage = new MemoryStorage();
  const registry = new McpServerRegistry(storage);
  registry.add(server);
  const persisted = storage.getItem(MCP_SERVERS_STORAGE_KEY) ?? "";
  assert.match(persisted, /local-tools/);
  assert.doesNotMatch(persisted, /token|session|authorization|secret/i);
  assert.deepEqual(new McpServerRegistry(storage).list(), [server]);
});

test("corrupted MCP persistence is reported and cannot be overwritten", () => {
  const registry = new McpServerRegistry(new CorruptedStorage());
  assert.match(registry.persistenceWarning, /无法读取/);
  assert.throws(() => registry.add(server), /无法读取/);
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
    assert.equal(calls[0].method, "initialize");
    assert.equal(calls[1].method, "notifications/initialized");
    assert.equal(calls[2].headers.get("MCP-Session-Id"), "fixture-session");
    assert.equal(calls[2].headers.get("MCP-Protocol-Version"), "2025-11-25");
    assert.equal(calls[3].headers.get("MCP-Session-Id"), "fixture-session");
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
