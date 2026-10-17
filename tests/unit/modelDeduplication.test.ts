import assert from "node:assert/strict";
import test from "node:test";
import { deduplicateRelayEntries } from "../../src/features/models/modelDeduplication.ts";
import {
  ChannelRegistry,
  type ChannelRegistration,
} from "../../src/features/ai-gateway/channels/registry.ts";
import { doubaoAdapter } from "../../src/features/ai-gateway/channels/doubao.ts";
import type { CapabilityManifest } from "../../src/domain/providerConnections.ts";
import type { Entry } from "../../src/features/models/modelMenuEntries.ts";

const defaultCapabilities: CapabilityManifest = {
  operations: ["chat", "generate"],
  modalities: ["text"],
  async: false,
};

function createChannel(
  id: string,
  overrides: Partial<ChannelRegistration> = {},
): ChannelRegistration {
  return {
    id,
    adapter: doubaoAdapter,
    kind: "official_api",
    enabled: true,
    priority: 100,
    weight: 10,
    baseUrl: "https://api.example.com",
    capabilities: defaultCapabilities,
    modelMapping: { "gpt-4o": "gpt-4o-upstream" },
    timeoutMs: 30000,
    ...overrides,
  };
}

test("2 relay connections with same model are merged into 1 row", () => {
  const entries: Entry[] = [
    {
      id: "r1",
      label: "GPT-4o",
      detail: "Relay Alpha",
      selection: {
        source: "api",
        connectionId: "conn-relay-1",
        model: "gpt-4o",
        kind: "text",
      },
    },
    {
      id: "r2",
      label: "GPT-4o",
      detail: "Relay Beta",
      selection: {
        source: "api",
        connectionId: "conn-relay-2",
        model: "gpt-4o",
        kind: "text",
      },
    },
  ];

  const merged = deduplicateRelayEntries(entries);

  assert.equal(
    merged.length,
    1,
    "Two relay entries with same model must merge into 1 row",
  );
  assert.equal(merged[0].label, "GPT-4o");
  assert.equal(merged[0].selection?.model, "gpt-4o");
});

test("candidate count badge is displayed", () => {
  const entries: Entry[] = [
    {
      id: "r1",
      label: "GPT-4o",
      detail: "Relay Alpha",
      selection: {
        source: "api",
        connectionId: "conn-1",
        model: "gpt-4o",
        kind: "text",
      },
    },
    {
      id: "r2",
      label: "GPT-4o",
      detail: "Relay Beta",
      selection: {
        source: "api",
        connectionId: "conn-2",
        model: "gpt-4o",
        kind: "text",
      },
    },
  ];

  const [row] = deduplicateRelayEntries(entries);

  assert.equal(row.detail, "中转 · 2 个连接可用");
  assert.equal(row.badge, "中转 · 2 个连接可用");
  assert.deepEqual(row.metadata?.candidateConnectionIds, ["conn-1", "conn-2"]);
  assert.equal(row.metadata?.count, 2);

  // Also verify with 3 connections
  const threeEntries: Entry[] = [
    ...entries,
    {
      id: "r3",
      label: "GPT-4o",
      detail: "Relay Gamma",
      selection: {
        source: "api",
        connectionId: "conn-3",
        model: "gpt-4o",
        kind: "text",
      },
    },
  ];
  const [threeRow] = deduplicateRelayEntries(threeEntries);
  assert.equal(threeRow.detail, "中转 · 3 个连接可用");
  assert.equal(threeRow.metadata?.candidateConnectionIds?.length, 3);
});

test("highest priority connection is selected", () => {
  // Case A: Using ChannelRegistry to rank candidates
  const registry = new ChannelRegistry();
  registry.registerAdapter(doubaoAdapter);
  registry.replace({
    registrations: [
      createChannel("conn-low", { priority: 50, weight: 10 }),
      createChannel("conn-high", { priority: 200, weight: 10 }),
      createChannel("conn-mid", { priority: 100, weight: 10 }),
    ],
    states: new Map(),
  });

  const entriesWithRegistry: Entry[] = [
    {
      id: "entry-low",
      label: "GPT-4o",
      selection: {
        source: "api",
        connectionId: "conn-low",
        model: "gpt-4o",
        kind: "text",
      },
    },
    {
      id: "entry-high",
      label: "GPT-4o",
      selection: {
        source: "api",
        connectionId: "conn-high",
        model: "gpt-4o",
        kind: "text",
      },
    },
    {
      id: "entry-mid",
      label: "GPT-4o",
      selection: {
        source: "api",
        connectionId: "conn-mid",
        model: "gpt-4o",
        kind: "text",
      },
    },
  ];

  const [mergedWithRegistry] = deduplicateRelayEntries(
    entriesWithRegistry,
    registry,
  );
  assert.equal(
    mergedWithRegistry.selection?.connectionId,
    "conn-high",
    "Candidate with highest priority in ChannelRegistry must be selected",
  );
  assert.deepEqual(
    mergedWithRegistry.metadata?.candidateConnectionIds,
    ["conn-high", "conn-mid", "conn-low"],
    "Candidate IDs must be ordered by priority descending",
  );

  // Case B: Tie breaking by weight descending
  const registryTieBreak = new ChannelRegistry();
  registryTieBreak.registerAdapter(doubaoAdapter);
  registryTieBreak.replace({
    registrations: [
      createChannel("conn-light", { priority: 100, weight: 20 }),
      createChannel("conn-heavy", { priority: 100, weight: 80 }),
    ],
    states: new Map(),
  });

  const entriesTieBreak: Entry[] = [
    {
      id: "e1",
      label: "GPT-4o",
      selection: {
        source: "api",
        connectionId: "conn-light",
        model: "gpt-4o",
        kind: "text",
      },
    },
    {
      id: "e2",
      label: "GPT-4o",
      selection: {
        source: "api",
        connectionId: "conn-heavy",
        model: "gpt-4o",
        kind: "text",
      },
    },
  ];

  const [mergedTieBreak] = deduplicateRelayEntries(
    entriesTieBreak,
    registryTieBreak,
  );
  assert.equal(
    mergedTieBreak.selection?.connectionId,
    "conn-heavy",
    "Candidate with higher weight must be selected when priorities tie",
  );

  // Case C: Using entry metadata priority
  const entriesWithMeta: Entry[] = [
    {
      id: "e-p10",
      label: "Claude 3.5 Sonnet",
      selection: {
        source: "api",
        connectionId: "c-10",
        model: "claude-3-5-sonnet",
        kind: "text",
      },
      metadata: { priority: 10, weight: 5 },
    },
    {
      id: "e-p99",
      label: "Claude 3.5 Sonnet",
      selection: {
        source: "api",
        connectionId: "c-99",
        model: "claude-3-5-sonnet",
        kind: "text",
      },
      metadata: { priority: 99, weight: 5 },
    },
  ];

  const [mergedMeta] = deduplicateRelayEntries(entriesWithMeta);
  assert.equal(mergedMeta.selection?.connectionId, "c-99");
});

test("single connection entry is untouched", () => {
  const singleEntry: Entry = {
    id: "single-direct",
    label: "Claude 3.5 Sonnet",
    detail: "Anthropic 官方 · 旗舰模型",
    selection: {
      source: "api",
      connectionId: "conn-official-anthropic",
      model: "claude-3-5-sonnet",
      kind: "text",
    },
    terms: ["Anthropic", "Claude"],
  };

  const result = deduplicateRelayEntries([singleEntry]);

  assert.equal(result.length, 1);
  assert.equal(
    result[0],
    singleEntry,
    "Single connection entry must be returned untouched",
  );
  assert.equal(
    result[0].detail,
    "Anthropic 官方 · 旗舰模型",
    "Original provider name/detail preserved",
  );
  assert.equal(result[0].selection?.connectionId, "conn-official-anthropic");
});

test("preserves active candidates and handles disabled/quarantined connections", () => {
  const registry = new ChannelRegistry();
  registry.registerAdapter(doubaoAdapter);
  registry.replace({
    registrations: [
      createChannel("conn-quarantined", { priority: 200 }),
      createChannel("conn-active", { priority: 100 }),
    ],
    states: new Map([["conn-quarantined", "quarantined"]]),
  });

  const entries: Entry[] = [
    {
      id: "e1",
      label: "FLUX Schnell",
      selection: {
        source: "api",
        connectionId: "conn-quarantined",
        model: "flux-schnell",
        kind: "image",
      },
    },
    {
      id: "e2",
      label: "FLUX Schnell",
      selection: {
        source: "api",
        connectionId: "conn-active",
        model: "flux-schnell",
        kind: "image",
      },
    },
  ];

  const [row] = deduplicateRelayEntries(entries, registry);
  assert.equal(
    row.selection?.connectionId,
    "conn-active",
    "Active connection preferred over quarantined higher priority",
  );
  assert.equal(row.detail, "中转 · 1 个连接可用");
  assert.equal(row.disabled, undefined);
});

test("marks row disabled if all candidate connections are disabled or quarantined", () => {
  const entries: Entry[] = [
    {
      id: "e1",
      label: "FLUX Schnell",
      selection: {
        source: "api",
        connectionId: "conn-1",
        model: "flux-schnell",
        kind: "image",
      },
      metadata: { state: "quarantined" },
    },
    {
      id: "e2",
      label: "FLUX Schnell",
      selection: {
        source: "api",
        connectionId: "conn-2",
        model: "flux-schnell",
        kind: "image",
      },
      metadata: { state: "disabled" },
    },
  ];

  const [row] = deduplicateRelayEntries(entries);
  assert.equal(row.disabled, "所有可用连接已隔离或禁用，请检查设置");
});

test("mixed list with multiple models merges duplicates and preserves singles in order", () => {
  const entries: Entry[] = [
    {
      id: "r1-gpt",
      label: "GPT-4o",
      detail: "Relay 1",
      selection: {
        source: "api",
        connectionId: "c1",
        model: "gpt-4o",
        kind: "text",
      },
    },
    {
      id: "single-gemini",
      label: "Gemini 1.5 Pro",
      detail: "Google 官方",
      selection: {
        source: "api",
        connectionId: "google-direct",
        model: "gemini-1.5-pro",
        kind: "text",
      },
    },
    {
      id: "r2-gpt",
      label: "GPT-4o",
      detail: "Relay 2",
      selection: {
        source: "api",
        connectionId: "c2",
        model: "gpt-4o",
        kind: "text",
      },
    },
  ];

  const result = deduplicateRelayEntries(entries);
  assert.equal(result.length, 2);
  assert.equal(result[0].selection?.model, "gpt-4o");
  assert.equal(result[0].detail, "中转 · 2 个连接可用");
  assert.equal(result[1].selection?.model, "gemini-1.5-pro");
  assert.equal(result[1].detail, "Google 官方");
});
