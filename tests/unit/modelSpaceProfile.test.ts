import assert from "node:assert/strict";
import test from "node:test";
import {
  createModelSpaceProfile,
  type ModelSpaceProfile,
} from "../../src/features/models/modelCatalog.ts";
import {
  calculateAutoCompactWatermark,
  buildModelCatalog,
} from "../../src/features/models/modelCatalogWindow.ts";
import {
  filterMcpToolsForModel,
  type McpTool,
} from "../../src/features/mcp/mcpClient.ts";
import {
  parseCcSwitchDeeplink,
  buildDeeplinkConnection,
  parseSeedProfiles,
  importSeedConnections,
} from "../../src/features/providers/providerConfigIO.ts";

const SAMPLE_TOOLS: readonly McpTool[] = [
  {
    name: "web_search",
    title: "Web Search",
    description: "Search web",
    inputSchema: { type: "object", properties: { query: { type: "string" } } },
  },
  {
    name: "fetch_page",
    title: "Fetch Page",
    description: "Fetch web page content",
    inputSchema: { type: "object", properties: { url: { type: "string" } } },
  },
  {
    name: "bash_exec",
    title: "Bash Execution",
    description: "Execute bash script",
    inputSchema: {
      type: "object",
      properties: { command: { type: "string" } },
    },
  },
  {
    name: "write_file",
    title: "Write File",
    description: "Write local file",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" }, content: { type: "string" } },
    },
  },
  {
    name: "generate_canvas_element",
    title: "Canvas Element",
    description: "Draw element on canvas",
    inputSchema: { type: "object", properties: { kind: { type: "string" } } },
  },
];

test("calculateAutoCompactWatermark: 75% for <=128k, 80% for >=200k", () => {
  // 32k context window -> 24k tokens (75%)
  assert.equal(calculateAutoCompactWatermark(32_000), 24_000);
  // 128k context window -> 96k tokens (75%)
  assert.equal(calculateAutoCompactWatermark(128_000), 96_000);
  // 200k context window -> 160k tokens (80%)
  assert.equal(calculateAutoCompactWatermark(200_000), 160_000);
  // 1M context window -> 800k tokens (80%)
  assert.equal(calculateAutoCompactWatermark(1_000_000), 800_000);
  // 64k -> 48k tokens (75%)
  assert.equal(calculateAutoCompactWatermark(64_000), 48_000);
  // Boundary cases: <= 0 or invalid returns 0
  assert.equal(calculateAutoCompactWatermark(0), 0);
  assert.equal(calculateAutoCompactWatermark(-1000), 0);
  assert.equal(calculateAutoCompactWatermark(Number.NaN), 0);
});

test("buildModelCatalog: dynamic watermarks calculated when requested, default null preserved", () => {
  // Default behavior retains auto_compact_token_limit: null for backward compatibility
  const defaultEntries = buildModelCatalog([
    { model: "deepseek-v4-pro[1M]" },
    { model: "claude-sonnet-4[200K]" },
  ]);
  assert.equal(defaultEntries[0].auto_compact_token_limit, null);
  assert.equal(defaultEntries[1].auto_compact_token_limit, null);

  // When autoCompact option is true, auto_compact_token_limit uses watermark calculation
  const autoCompactEntries = buildModelCatalog(
    [
      { model: "deepseek-v4-pro[1M]" },
      { model: "claude-sonnet-4[200K]" },
      { model: "gpt-4o[128k]" },
      { model: "custom-small[32k]" },
    ],
    { autoCompact: true },
  );
  assert.equal(autoCompactEntries[0].auto_compact_token_limit, 800_000);
  assert.equal(autoCompactEntries[1].auto_compact_token_limit, 160_000);
  assert.equal(autoCompactEntries[2].auto_compact_token_limit, 96_000);
  assert.equal(autoCompactEntries[3].auto_compact_token_limit, 24_000);
});

test("createModelSpaceProfile: correctly configures per-model capability spaces", () => {
  const profile = createModelSpaceProfile({
    modelId: "deepseek-r1[1M]",
    mcpToolWhitelist: ["web_search", "fetch_page"],
    defaultReasoningEffort: "high",
    defaultTemperature: 0.6,
  });

  assert.equal(profile.modelId, "deepseek-r1");
  assert.equal(profile.contextWindow, 1_000_000);
  assert.equal(profile.maxContextWindow, 1_000_000);
  assert.equal(profile.autoCompactWatermark, 800_000);
  assert.deepEqual(profile.mcpToolWhitelist, ["web_search", "fetch_page"]);
  assert.equal(profile.defaultReasoningEffort, "high");
  assert.equal(profile.defaultTemperature, 0.6);
});

test("filterMcpToolsForModel: filters by explicit tool whitelist and blacklist", () => {
  const spaceWithWhitelist: ModelSpaceProfile = {
    modelId: "gpt-4o",
    contextWindow: 128_000,
    maxContextWindow: 128_000,
    autoCompactWatermark: 96_000,
    mcpToolWhitelist: ["web_search", "fetch_page"],
  };

  const filteredWhitelist = filterMcpToolsForModel(
    SAMPLE_TOOLS,
    spaceWithWhitelist,
  );
  assert.deepEqual(
    filteredWhitelist.map((t) => t.name),
    ["web_search", "fetch_page"],
  );

  const spaceWithBlacklist: ModelSpaceProfile = {
    modelId: "gpt-4o",
    contextWindow: 128_000,
    maxContextWindow: 128_000,
    autoCompactWatermark: 96_000,
    mcpToolBlacklist: ["bash_exec", "write_file"],
  };

  const filteredBlacklist = filterMcpToolsForModel(
    SAMPLE_TOOLS,
    spaceWithBlacklist,
  );
  assert.deepEqual(
    filteredBlacklist.map((t) => t.name),
    ["web_search", "fetch_page", "generate_canvas_element"],
  );
});

test("filterMcpToolsForModel: isolates image models from shell, terminal and filesystem MCP tools", () => {
  // FLUX image model should not receive bash/exec or file manipulation tools
  const filteredFlux = filterMcpToolsForModel(SAMPLE_TOOLS, {
    modelId: "black-forest-labs/FLUX.1-schnell",
    modelKind: "image",
  });

  assert.deepEqual(
    filteredFlux.map((t) => t.name),
    ["web_search", "fetch_page", "generate_canvas_element"],
  );
  assert.equal(
    filteredFlux.some((t) => t.name === "bash_exec" || t.name === "write_file"),
    false,
  );

  // Text models retain developer tools if not blacklisted
  const filteredCode = filterMcpToolsForModel(SAMPLE_TOOLS, {
    modelId: "deepseek-coder",
    modelKind: "text",
  });
  assert.equal(filteredCode.length, SAMPLE_TOOLS.length);
});

test("filterMcpToolsForModel: blocks run_bash, shell, eval, terminal, exec for sdxl and stabilityai models", () => {
  const diverseTools: readonly McpTool[] = [
    { name: "web_search", inputSchema: {} },
    { name: "read_file", inputSchema: {} },
    { name: "image_enhance", inputSchema: {} },
    { name: "run_bash", inputSchema: {} },
    { name: "shell", inputSchema: {} },
    { name: "eval", inputSchema: {} },
    { name: "terminal", inputSchema: {} },
    { name: "exec", inputSchema: {} },
    { name: "write_file", inputSchema: {} },
    { name: "delete_file", inputSchema: {} },
    { name: "bash_exec", inputSchema: {} },
  ];

  const imageModelCandidates = [
    "stabilityai/sdxl-turbo",
    "stabilityai/stable-diffusion-3.5",
    "sdxl-base",
    "midjourney-v6",
    "cogview-4",
    "imagen-3",
  ];

  for (const modelId of imageModelCandidates) {
    const filtered = filterMcpToolsForModel(diverseTools, modelId);
    const names = filtered.map((t) => t.name);

    // Non-developer tools must be preserved
    assert.ok(
      names.includes("web_search"),
      `${modelId} should keep web_search`,
    );
    assert.ok(names.includes("read_file"), `${modelId} should keep read_file`);
    assert.ok(
      names.includes("image_enhance"),
      `${modelId} should keep image_enhance`,
    );

    // Dangerous developer tools must be removed
    const banned = [
      "run_bash",
      "shell",
      "eval",
      "terminal",
      "exec",
      "write_file",
      "delete_file",
      "bash_exec",
    ];
    for (const toolName of banned) {
      assert.equal(
        names.includes(toolName),
        false,
        `${modelId} must not receive ${toolName}`,
      );
    }
  }

  // Pure text/chat model should retain all tools
  const textFiltered = filterMcpToolsForModel(diverseTools, "deepseek-r1");
  assert.equal(textFiltered.length, diverseTools.length);
});

test("parseCcSwitchDeeplink: parses standard CC Switch import deeplinks correctly", () => {
  const deeplink =
    "ccswitch://v1/import?resource=provider&app=codex&name=DeepSeek%20Official&endpoint=https%3A%2F%2Fapi.deepseek.com%2Fv1&model=deepseek-chat&apiKey=sk-1234567890abcdef1234";

  const payload = parseCcSwitchDeeplink(deeplink);
  assert.equal(payload.name, "DeepSeek Official");
  assert.equal(payload.endpoint, "https://api.deepseek.com/v1");
  assert.equal(payload.model, "deepseek-chat");
  assert.equal(payload.apiKey, "sk-1234567890abcdef1234");
  assert.equal(payload.app, "codex");
  assert.equal(payload.resource, "provider");

  // Rejects invalid schemes and paths
  assert.throws(() => parseCcSwitchDeeplink("https://api.deepseek.com"));
  assert.throws(() =>
    parseCcSwitchDeeplink("ccswitch://v2/import?endpoint=https://x.com"),
  );
  assert.throws(() => parseCcSwitchDeeplink("ccswitch://v1/import"));
  assert.throws(() => parseCcSwitchDeeplink(""));
});

test("buildDeeplinkConnection: isolates apiKey and strictly guards credentialRef against secret leakage", () => {
  const payload = parseCcSwitchDeeplink(
    "ccswitch://v1/import?name=Moonshot&endpoint=https%3A%2F%2Fapi.moonshot.cn%2Fv1&model=moonshot-v1-32k&apiKey=sk-secretKeyMaterial123456",
  );

  // Calling with opaque credentialRef
  const result = buildDeeplinkConnection(payload, {
    credentialRef: "cred-vault-ref-001",
  });

  assert.equal(result.rawApiKey, "sk-secretKeyMaterial123456");
  assert.equal(result.connection.credentialRef, "cred-vault-ref-001");
  assert.equal(result.connection.provider, "Moonshot");
  assert.equal(result.connection.model, "moonshot-v1-32k");

  // Connection serialization must NEVER contain the raw API key
  const connectionJson = JSON.stringify(result.connection);
  assert.equal(connectionJson.includes("sk-secretKeyMaterial123456"), false);

  // Attempting to inject raw secret into credentialRef must be blocked
  assert.throws(() =>
    buildDeeplinkConnection(payload, {
      credentialRef: "sk-raw-secret-key-attempt",
    }),
  );
  assert.throws(() =>
    buildDeeplinkConnection(payload, {
      credentialRef: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abcdefgh",
    }),
  );
});

test("parseSeedProfiles & importSeedConnections: bulk imports multiple seeds without collision", () => {
  const rawSeeds = [
    {
      name: "硅基流动",
      baseUrl: "https://api.siliconflow.cn/v1",
      model: "deepseek-ai/DeepSeek-V3",
    },
    {
      name: "智谱 GLM",
      endpoint: "https://open.bigmodel.cn/api/paas/v4",
      model: "glm-4-plus",
    },
  ];

  const profiles = parseSeedProfiles(rawSeeds);
  assert.equal(profiles.length, 2);
  assert.equal(profiles[0].name, "硅基流动");
  assert.equal(profiles[1].baseUrl, "https://open.bigmodel.cn/api/paas/v4");

  const connections = importSeedConnections(profiles);
  assert.equal(connections.length, 2);
  assert.notEqual(connections[0].id, connections[1].id);
  assert.equal(connections[0].state, "active");
});
