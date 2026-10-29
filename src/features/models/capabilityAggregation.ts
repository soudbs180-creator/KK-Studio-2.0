import type { Entry, RelayCandidate } from "./modelMenuEntries.ts";
import type { ModelSelection, ModelKind } from "../../domain/modelSelection.ts";
import {
  supportsOperation,
  type ChannelRegistry,
  type ChannelIndexEntry,
} from "../ai-gateway/index.ts";
import type { Scheduler, ChannelHealthTracker } from "../ai-gateway/index.ts";
import type { ProviderConnection } from "../../domain/providerConnections.ts";
import { modelSelectionId } from "./modelSelection.ts";
import { catalogForConnection, type ModelCatalog } from "./modelCatalog.ts";
import { modelSearchTerms } from "./modelFamilies.ts";
import { searchModels } from "./modelSearch.ts";
import { getProbeMetric } from "./modelProbeStore.ts";
import {
  aggregateGlobalModelCapabilities,
  type DeduplicateGlobalOptions,
} from "./modelDeduplication.ts";

export type UserCapability = "chat" | "image";

export type ChatSubCategory =
  "main_agent" | "reasoning" | "sub_agent" | "general_chat";

export const AUTO_ROUTING_MODEL = "auto";
export const AUTO_ROUTING_LABEL = "自动调配 (Auto-Routing)";
export const AUTO_ROUTING_DETAIL =
  "系统根据服务商优先级与健康延迟自动选路，支持无感故障转移";
export const AUTO_ROUTING_BADGE = "智能调度";

export interface AggregatedCandidateConnection {
  connectionId: string;
  connectionName: string;
  channelType?: string;
  priority: number;
  weight: number;
  state: "active" | "disabled" | "quarantined";
  latencyMs?: number;
  healthScore: number;
  isAvailable: boolean;
}

export interface AggregatedModelEntry extends Entry {
  canonicalId: string;
  capability: UserCapability;
  kind: ModelKind;
  isAutoRouting?: boolean;
  subCategory?: ChatSubCategory | "image_generation";
  candidates?: RelayCandidate[];
  redundancyCount?: number;
  healthScore?: number;
  bestLatencyMs?: number;
  statusText?: string;
}

/**
 * Checks whether a model selection represents auto-routing mode.
 */
export function isAutoRouting(selection?: ModelSelection): boolean {
  if (!selection) return false;
  return (
    selection.model === AUTO_ROUTING_MODEL ||
    selection.model === "auto-routing" ||
    selection.displayName === AUTO_ROUTING_LABEL ||
    (typeof selection.displayName === "string" &&
      selection.displayName.includes("自动调配"))
  );
}

/**
 * Creates an authoritative ModelSelection object for auto-routing mode.
 */
export function createAutoRoutingSelection(
  capability: UserCapability,
): ModelSelection {
  return {
    source: "api",
    model: AUTO_ROUTING_MODEL,
    displayName: AUTO_ROUTING_LABEL,
    effectiveModel: AUTO_ROUTING_LABEL,
    kind: capability === "chat" ? "text" : "image",
  };
}

/**
 * Classifies model kind and ID into user-facing capability quadrant.
 */
export function classifyCapability(
  kind?: ModelKind,
  modelId = "",
): UserCapability {
  if (kind === "image") return "image";
  if (kind === "text") return "chat";
  const id = modelId.toLowerCase();
  if (
    id.includes("dall-e") ||
    id.includes("flux") ||
    id.includes("imagen") ||
    id.includes("stable-diffusion") ||
    id.includes("sdxl") ||
    id.includes("sd-") ||
    id.includes("comfy") ||
    id.includes("midjourney") ||
    id.includes("cogview") ||
    id.includes("kolors")
  ) {
    return "image";
  }
  return "chat";
}

/**
 * Sub-categorizes chat models into main agent, reasoning (o1/o3/R1/QwQ), sub-agent, or general.
 */
export function classifyChatSubCategory(
  modelId: string,
  modelName = "",
): ChatSubCategory {
  const combined = `${modelId} ${modelName}`.toLowerCase();
  if (
    combined.includes("o1") ||
    combined.includes("o3") ||
    combined.includes("r1") ||
    combined.includes("qwq") ||
    combined.includes("reason") ||
    combined.includes("thinking") ||
    combined.includes("deepseek-reasoner") ||
    combined.includes("deepseek-r1")
  ) {
    return "reasoning";
  }
  if (
    combined.includes("codex 主") ||
    combined.includes("default") ||
    combined.includes("main agent")
  ) {
    return "main_agent";
  }
  if (
    combined.includes("mini") ||
    combined.includes("flash") ||
    combined.includes("haiku") ||
    combined.includes("sub-agent") ||
    combined.includes("subagent") ||
    combined.includes("fast") ||
    combined.includes("nano") ||
    combined.includes("lite")
  ) {
    return "sub_agent";
  }
  return "general_chat";
}

export interface AutoRoutingOptions {
  capability: UserCapability;
  scheduler?: Scheduler;
  registry?: ChannelRegistry;
  healthTracker?: ChannelHealthTracker;
  connections?: ProviderConnection[];
  targetModel?: string;
  now?: () => number;
}

export interface AutoRoutingResolution {
  connectionId?: string;
  model: string;
  channel?: ChannelIndexEntry;
  providerName?: string;
  source: "api" | "codex" | "default";
}

/**
 * Delegates auto-routing to ai-gateway/scheduler.ts.
 * Selects the optimal channel based on provider priority and health status.
 */
export function resolveAutoRoutingChannel(
  options: AutoRoutingOptions,
): AutoRoutingResolution {
  const {
    capability,
    scheduler,
    registry,
    healthTracker,
    connections,
    targetModel,
  } = options;
  const operation = capability === "chat" ? "chat" : "generate";
  const health = scheduler?.health() ?? healthTracker;

  // 1. If Scheduler and ChannelRegistry are available, use prioritized scheduler tiers
  if (registry) {
    const defaultModel =
      targetModel || (capability === "chat" ? "gpt-4o" : "dall-e-3");

    // Try candidates for targetModel first, then fallback to any channel declaring operation
    let candidates = registry.candidates(defaultModel, operation);
    if (!candidates.length) {
      const allRegs = registry
        .snapshot()
        .registrations.filter(
          (r) =>
            r.enabled &&
            supportsOperation(r.capabilities, operation) &&
            registry.snapshot().states.get(r.id) !== "disabled" &&
            registry.snapshot().states.get(r.id) !== "quarantined",
        );
      candidates = allRegs.map((r) => ({
        channelId: r.id,
        adapter: r.adapter,
        kind: r.kind,
        priority: r.priority,
        weight: r.weight,
        baseUrl: r.baseUrl,
        credentialRef: r.credentialRef,
        capabilities: r.capabilities,
        modelMapping: r.modelMapping,
        timeoutMs: r.timeoutMs,
      }));
    }

    if (candidates.length > 0) {
      // Filter out unavailable channels if health tracker is present
      const available = health
        ? candidates.filter((c) => health.isAvailable(c.channelId))
        : candidates;

      const pool = available.length > 0 ? available : candidates;
      const tiers = registry.tiers(pool);
      if (tiers.length > 0 && tiers[0].length > 0) {
        // Pick best candidate in top tier: highest health score, then highest weight
        const topTier = [...tiers[0]].sort((a, b) => {
          const scoreA = health ? health.healthScore(a.channelId) : 100;
          const scoreB = health ? health.healthScore(b.channelId) : 100;
          if (scoreB !== scoreA) return scoreB - scoreA;
          return b.weight - a.weight;
        });
        const best = topTier[0];
        const resolvedModel =
          best.modelMapping[defaultModel] ??
          Object.keys(best.modelMapping)[0] ??
          defaultModel;
        return {
          connectionId: best.channelId,
          model: resolvedModel,
          channel: best,
          providerName: best.adapter.provider,
          source: "api",
        };
      }
    }
  }

  // 2. If provider connections are provided from application state
  if (connections && connections.length > 0) {
    const matching = connections.filter((conn) => {
      if (conn.state === "disabled" || conn.state === "quarantined")
        return false;
      if (health && !health.isAvailable(conn.id)) return false;
      const caps = conn.capabilities;
      if (!caps) return true;
      if (capability === "chat") {
        return (
          caps.operations?.includes("chat") || caps.modalities?.includes("text")
        );
      }
      return (
        caps.operations?.includes("generate") ||
        caps.modalities?.includes("image")
      );
    });

    if (matching.length > 0) {
      // Sort by probe latency, priority, and health revision
      matching.sort((a, b) => {
        const probeA = getProbeMetric(a.id);
        const probeB = getProbeMetric(b.id);
        const latA = probeA ? probeA.latencyMs : 9999;
        const latB = probeB ? probeB.latencyMs : 9999;
        if (Math.abs(latA - latB) > 50) return latA - latB;
        return (b.priority ?? 0) - (a.priority ?? 0);
      });
      const best = matching[0];
      return {
        connectionId: best.id,
        model:
          best.model ||
          (capability === "chat" ? "chat-default" : "image-default"),
        providerName: best.displayName,
        source: "api",
      };
    }
  }

  // 3. Graceful fallback
  if (capability === "image") {
    return {
      source: "codex",
      model: "",
      providerName: "Codex 内置生图",
    };
  }
  return {
    source: "default",
    model: "",
    providerName: "Codex 账号默认",
  };
}

export interface AggregateCapabilityOptions {
  capability: UserCapability;
  connections?: ProviderConnection[];
  catalogs?: ModelCatalog[];
  agentModels?: Array<{ id: string; model?: string; displayName?: string }>;
  agentStatus?: string;
  current?: ModelSelection;
  registry?: ChannelRegistry;
  scheduler?: Scheduler;
  includeAutoRouting?: boolean;
  query?: string;
}

/** Helper to collect account/Codex entries for the active capability */
function buildAccountCapabilityEntries(
  capability: UserCapability,
  agentModels: Array<{ id: string; model?: string; displayName?: string }>,
  agentStatus: string,
): Entry[] {
  if (capability === "chat") {
    const list: Entry[] = [
      {
        id: "default:main-agent",
        label: "默认 · Codex 主 Agent",
        detail: "使用账号默认模型，负责规划与调用工具",
        selection: { source: "default", model: "", kind: "text" },
        disabled: agentStatus !== "connected" ? "请先连接 Codex" : undefined,
        terms: ["Codex", "主 Agent", "默认", "default", "规划"],
        metadata: {
          subCategory: "main_agent",
          connectionName: "Codex 账号",
          priority: 150,
        },
      },
    ];

    for (const m of agentModels) {
      const modelId = m.model || m.id;
      const subCat = classifyChatSubCategory(modelId, m.displayName);
      list.push({
        id: `codex:${modelId}`,
        label: m.displayName || modelId,
        detail: "Codex · 已登录账号",
        selection: {
          source: "codex",
          model: modelId,
          kind: "text",
          displayName: m.displayName || modelId,
        },
        disabled: agentStatus !== "connected" ? "请先连接 Codex" : undefined,
        terms: ["Codex", modelId, m.displayName || "", subCat],
        metadata: {
          subCategory: subCat,
          connectionName: "Codex 账号",
          priority: subCat === "reasoning" ? 120 : 100,
        },
      });
    }
    return list;
  }

  return [
    {
      id: "codex:image-generator",
      label: "Codex 内置生图",
      detail: "ChatGPT 账号 · 内置生图",
      selection: {
        source: "codex",
        model: "",
        kind: "image",
        displayName: "Codex 内置生图",
        effectiveModel: "Codex 内置生图",
      },
      disabled: agentStatus !== "connected" ? "请先连接 Codex" : undefined,
      terms: ["Codex", "生图", "ChatGPT", "image"],
      metadata: {
        connectionName: "Codex 账号",
        priority: 100,
      },
    },
  ];
}

function buildConnectionCapabilityEntries(
  capability: UserCapability,
  connections: ProviderConnection[],
  catalogs?: ModelCatalog[],
): Entry[] {
  const list: Entry[] = [];

  for (const connection of connections) {
    if (connection.kind === "user_oauth_local") continue;

    const catalog = catalogForConnection(connection, catalogs);
    for (const model of catalog) {
      const modelCap = classifyCapability(model.kind, model.id);
      if (modelCap !== capability) continue;

      let disabledReason: string | undefined;
      if (
        connection.state === "disabled" ||
        connection.state === "quarantined"
      ) {
        disabledReason = "连接已禁用或隔离，请检查设置";
      }

      const probe =
        getProbeMetric(connection.id, model.id) ??
        getProbeMetric(connection.id);
      const subCat =
        capability === "chat"
          ? classifyChatSubCategory(model.id)
          : "image_generation";

      const latencyInfo = probe ? `${probe.latencyMs}ms` : undefined;
      const detailParts = [
        connection.displayName,
        latencyInfo ? `延迟 ${latencyInfo}` : undefined,
        subCat === "reasoning" ? "深度推理" : undefined,
      ].filter(Boolean);

      list.push({
        id: `api:${connection.id}:${model.id}`,
        label: model.id,
        detail: detailParts.join(" · "),
        disabled: disabledReason,
        selection: {
          source: "api",
          model: model.id,
          connectionId: connection.id,
          kind: model.kind,
          displayName: model.id,
        },
        terms: [
          connection.displayName,
          model.id,
          subCat,
          ...modelSearchTerms(model),
        ],
        metadata: {
          connectionId: connection.id,
          connectionName: connection.displayName,
          priority: connection.priority ?? 50,
          weight: 10,
          state:
            connection.state === "disabled"
              ? "disabled"
              : connection.state === "quarantined"
                ? "quarantined"
                : "active",
          latencyMs: probe?.latencyMs,
          subCategory: subCat,
        },
      });
    }
  }

  return list;
}

function sortCapabilityEntries(entries: Entry[]): void {
  const rank = (meta: Record<string, unknown>) => {
    if (meta.subCategory === "main_agent") return 4;
    if (meta.subCategory === "reasoning") return 3;
    if (meta.subCategory === "sub_agent") return 2;
    return 1;
  };

  entries.sort((a, b) => {
    const metaA = (a.metadata ?? {}) as Record<string, unknown>;
    const metaB = (b.metadata ?? {}) as Record<string, unknown>;
    const rankDiff = rank(metaB) - rank(metaA);
    if (rankDiff !== 0) return rankDiff;

    const aDis = Boolean(a.disabled);
    const bDis = Boolean(b.disabled);
    if (aDis !== bDis) return aDis ? 1 : -1;

    return a.label.localeCompare(b.label);
  });
}

/**
 * Aggregates all models across providers by user capability quadrant.
 * Returns entries ready for ModelPickerMenu, beginning with 自动调配 (Auto-Routing).
 */
export function aggregateCapabilityEntries(
  options: AggregateCapabilityOptions,
): Entry[] {
  const {
    capability,
    connections = [],
    catalogs,
    agentModels = [],
    agentStatus = "disconnected",
    current,
    registry,
    scheduler,
    includeAutoRouting = true,
    query = "",
  } = options;

  const rawEntries: Entry[] = [
    ...buildAccountCapabilityEntries(capability, agentModels, agentStatus),
    ...buildConnectionCapabilityEntries(capability, connections, catalogs),
  ];

  // Deduplicate across providers using global deduplication
  const dedupOptions: DeduplicateGlobalOptions = {
    registry,
    scheduler,
    current,
    capability,
  };
  const deduplicated = aggregateGlobalModelCapabilities(
    rawEntries,
    dedupOptions,
  );
  sortCapabilityEntries(deduplicated);

  // 5. Build Auto-Routing entry at index 0
  const result: Entry[] = [];
  if (includeAutoRouting) {
    const autoSelection = createAutoRoutingSelection(capability);
    const isAutoSelected = isAutoRouting(current);
    const autoEntry: Entry = {
      id: modelSelectionId(autoSelection),
      label: AUTO_ROUTING_LABEL,
      detail: AUTO_ROUTING_DETAIL,
      badge: AUTO_ROUTING_BADGE,
      selection: autoSelection,
      checked: isAutoSelected,
      terms: [
        "自动调配",
        "auto",
        "routing",
        "智能调度",
        capability === "chat" ? "对话" : "图像",
      ],
      metadata: {
        isAutoRouting: true,
        capability,
        priority: 9999,
        healthScore: 100,
      },
    };
    result.push(autoEntry);
  }

  // 6. Append deduplicated capability models
  result.push(...deduplicated);

  // 7. Filter with search query if provided
  if (query.trim()) {
    const filtered = searchModels(
      result.map((item) => ({
        ...item,
        terms: [...(item.terms ?? []), item.detail ?? "", item.badge ?? ""],
      })),
      query,
    );
    return filtered.map((f) => f.item);
  }

  return result;
}
