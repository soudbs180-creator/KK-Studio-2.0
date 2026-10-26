import type {
  Entry,
  RelayCandidate,
  EntryMetadata,
} from "./modelMenuEntries.ts";
import type { ChannelRegistry } from "../ai-gateway/channels/registry.ts";
import type { Scheduler } from "../ai-gateway/scheduler.ts";
import type { ModelSelection } from "./modelSelection.ts";

export type { RelayCandidate, EntryMetadata };

export interface CandidateConnectionInfo extends RelayCandidate {
  healthScore?: number;
  latencyMs?: number;
}

export interface DeduplicateRelayOptions {
  registry?: ChannelRegistry;
  current?: ModelSelection;
}

export interface DeduplicateGlobalOptions {
  registry?: ChannelRegistry;
  scheduler?: Scheduler;
  current?: ModelSelection;
  capability?: "chat" | "image";
}

function resolveRegistryInfo(
  connectionId: string,
  registry?: ChannelRegistry,
): {
  priority?: number;
  weight?: number;
  state?: "active" | "disabled" | "quarantined";
} {
  if (!registry) return {};
  const registration = registry
    .snapshot()
    .registrations.find((r) => r.id === connectionId);
  if (!registration) return {};
  const regState = registry.snapshot().states.get(connectionId);
  const state =
    regState === "disabled" || regState === "quarantined"
      ? regState
      : !registration.enabled
        ? "disabled"
        : "active";
  return {
    priority: registration.priority,
    weight: registration.weight,
    state,
  };
}

function resolveMetadataOverrides(entry: Entry): {
  priority?: number;
  weight?: number;
  state?: "active" | "disabled" | "quarantined";
  connectionName?: string;
  healthScore?: number;
  latencyMs?: number;
} {
  const meta = (entry.metadata ?? {}) as Record<string, unknown>;
  const raw = entry as unknown as Record<string, unknown>;
  const num = (key: string) =>
    typeof meta[key] === "number"
      ? (meta[key] as number)
      : typeof raw[key] === "number"
        ? (raw[key] as number)
        : undefined;

  const validState = (s: unknown): s is "active" | "disabled" | "quarantined" =>
    s === "active" || s === "disabled" || s === "quarantined";

  const state = validState(meta.state)
    ? meta.state
    : validState(raw.state)
      ? raw.state
      : undefined;

  const connectionName =
    typeof meta.connectionName === "string"
      ? meta.connectionName
      : typeof raw.connectionName === "string"
        ? raw.connectionName
        : undefined;

  return {
    priority: num("priority"),
    weight: num("weight"),
    healthScore:
      typeof meta.healthScore === "number" ? meta.healthScore : undefined,
    latencyMs: typeof meta.latencyMs === "number" ? meta.latencyMs : undefined,
    state,
    connectionName,
  };
}

/**
 * Resolves priority, weight, state and display name for a candidate connection.
 * Priority and weight are resolved using ChannelRegistry if provided,
 * falling back to metadata on the entry or entry properties.
 */
function resolveCandidateInfo(
  connectionId: string,
  entry: Entry,
  registry?: ChannelRegistry,
  scheduler?: Scheduler,
): CandidateConnectionInfo {
  const reg = resolveRegistryInfo(connectionId, registry);
  const meta = resolveMetadataOverrides(entry);

  let state: "active" | "disabled" | "quarantined" = entry.disabled
    ? "disabled"
    : (reg.state ?? "active");
  let healthScore = 100;

  if (scheduler && connectionId) {
    const health = scheduler.health();
    healthScore = health.healthScore(connectionId);
    if (!health.isAvailable(connectionId)) {
      state = "quarantined";
    }
  }

  return {
    connectionId,
    connectionName:
      meta.connectionName ??
      (entry.metadata?.connectionName as string | undefined) ??
      entry.detail?.split(" · ")[0] ??
      connectionId,
    priority: meta.priority ?? reg.priority ?? 0,
    weight: meta.weight ?? reg.weight ?? 0,
    state: meta.state ?? state,
    healthScore: meta.healthScore ?? healthScore,
    latencyMs: meta.latencyMs,
  };
}

/**
 * Deduplicates cross-relay model entries (R3 specification).
 * - Group entries by `entry.selection.model` (the upstream canonical model ID).
 * - If multiple relay entries share the same model ID:
 *   - Merge them into a single Entry with badge/detail like `中转 · ${count} 个连接可用`
 *   - Keep candidate connection IDs in metadata
 *   - Sort candidate connections by priority descending, then weight descending using `ChannelRegistry`
 *   - When selected, select the candidate with highest priority
 * - If only 1 connection serves the model, keep original provider name.
 */
export function deduplicateRelayEntries(
  entries: Entry[],
  registryOrOptions?: ChannelRegistry | DeduplicateRelayOptions,
): Entry[] {
  if (!entries.length) return [];

  const registry =
    registryOrOptions && "snapshot" in registryOrOptions
      ? registryOrOptions
      : (registryOrOptions as DeduplicateRelayOptions | undefined)?.registry;
  const current =
    registryOrOptions && !("snapshot" in registryOrOptions)
      ? (registryOrOptions as DeduplicateRelayOptions | undefined)?.current
      : undefined;

  const modelOrder: string[] = [];
  const groups = new Map<string, Entry[]>();
  const nonModelEntries: Array<{ index: number; entry: Entry }> = [];

  entries.forEach((entry, index) => {
    const modelId = entry.selection?.model;
    if (!modelId) {
      nonModelEntries.push({ index, entry });
      return;
    }
    const group = groups.get(modelId);
    if (!group) {
      groups.set(modelId, [entry]);
      modelOrder.push(modelId);
    } else {
      group.push(entry);
    }
  });

  const result: Entry[] = [];

  for (const modelId of modelOrder) {
    const group = groups.get(modelId)!;

    // If only 1 connection serves the model, keep original provider name untouched.
    if (group.length === 1) {
      result.push(group[0]);
      continue;
    }

    // Resolve candidates with priority, weight and state
    const candidates = group.map((entry) => ({
      entry,
      candidate: resolveCandidateInfo(
        entry.selection?.connectionId ?? "",
        entry,
        registry,
      ),
    }));

    // Sort candidate connections:
    // 1. Active candidates come before disabled/quarantined ones
    // 2. Priority descending (higher wins)
    // 3. Weight descending
    // 4. Connection ID ascending (deterministic tie-break)
    candidates.sort((a, b) => {
      const aActive = a.candidate.state === "active" ? 1 : 0;
      const bActive = b.candidate.state === "active" ? 1 : 0;
      if (bActive !== aActive) return bActive - aActive;

      if (b.candidate.priority !== a.candidate.priority) {
        return b.candidate.priority - a.candidate.priority;
      }
      if (b.candidate.weight !== a.candidate.weight) {
        return b.candidate.weight - a.candidate.weight;
      }
      return a.candidate.connectionId.localeCompare(b.candidate.connectionId);
    });

    const top = candidates[0];
    const rankedCandidates = candidates.map((c) => c.candidate);
    const candidateConnectionIds = rankedCandidates.map((c) => c.connectionId);

    const activeCandidates = rankedCandidates.filter(
      (c) => c.state === "active",
    );
    const allDisabledOrQuarantined = rankedCandidates.every(
      (c) => c.state === "disabled" || c.state === "quarantined",
    );

    const count =
      activeCandidates.length > 0
        ? activeCandidates.length
        : rankedCandidates.length;
    const badgeText = `中转 · ${count} 个连接可用`;

    let disabledReason: string | undefined;
    if (allDisabledOrQuarantined) {
      disabledReason = "所有可用连接已隔离或禁用，请检查设置";
    } else {
      const kindMismatch = group.every(
        (e) => e.disabled && e.disabled.startsWith("不适用于当前"),
      );
      if (kindMismatch) {
        disabledReason = top.entry.disabled;
      }
    }

    const isCurrentSelected = Boolean(
      (current &&
        current.model === modelId &&
        candidateConnectionIds.includes(current.connectionId ?? "")) ||
      group.some((e) => e.checked),
    );

    const mergedEntry: Entry = {
      ...top.entry,
      label: top.entry.label,
      detail: badgeText,
      badge: badgeText,
      disabled: disabledReason,
      checked: isCurrentSelected ? true : top.entry.checked,
      selection: top.entry.selection
        ? {
            ...top.entry.selection,
            connectionId: top.candidate.connectionId,
          }
        : undefined,
      terms: Array.from(
        new Set([
          ...group.flatMap((e) => e.terms ?? []),
          "中转",
          "API",
          modelId,
        ]),
      ),
      metadata: {
        ...(top.entry.metadata ?? {}),
        candidateConnectionIds,
        candidates: rankedCandidates,
        badgeLabel: badgeText,
        count,
      },
    };

    result.push(mergedEntry);
  }

  // If there were any non-model entries, insert them back in their original order
  if (nonModelEntries.length > 0) {
    for (const { index, entry } of nonModelEntries) {
      result.splice(index, 0, entry);
    }
  }

  return result;
}

/**
 * Deduplicates models across ALL channels (Official, Relay, OAuth, Local, CLI) by capability.
 * - Group entries by upstream canonical model ID.
 * - If multiple providers serve the same model:
 *   - Merges into 1 entry showing top connection and multi-channel redundancy info.
 *   - Ranks candidates by:
 *     1. Active state (active before disabled/quarantined)
 *     2. Health score (from Scheduler ChannelHealthTracker)
 *     3. Latency (faster latency wins)
 *     4. Priority (higher priority wins)
 *     5. Weight (higher weight wins)
 *   - Disables row only if ALL candidate connections are disabled or quarantined.
 *   - Selects the candidate with highest health and priority.
 * - If only 1 connection serves the model, preserves provider details.
 */
export function aggregateGlobalModelCapabilities(
  entries: Entry[],
  options?: DeduplicateGlobalOptions,
): Entry[] {
  if (!entries.length) return [];

  const registry = options?.registry;
  const scheduler = options?.scheduler;
  const current = options?.current;

  const modelOrder: string[] = [];
  const groups = new Map<string, Entry[]>();
  const nonModelEntries: Array<{ index: number; entry: Entry }> = [];

  entries.forEach((entry, index) => {
    // If it's an auto-routing entry, do not group with standard models
    if (entry.metadata?.isAutoRouting || entry.selection?.model === "auto") {
      nonModelEntries.push({ index, entry });
      return;
    }

    const modelId = entry.selection?.model;
    if (!modelId) {
      nonModelEntries.push({ index, entry });
      return;
    }

    const group = groups.get(modelId);
    if (!group) {
      groups.set(modelId, [entry]);
      modelOrder.push(modelId);
    } else {
      group.push(entry);
    }
  });

  const result: Entry[] = [];

  for (const modelId of modelOrder) {
    const group = groups.get(modelId)!;

    // Single connection entry: enrich metadata
    if (group.length === 1) {
      const single = group[0];
      const candidate = resolveCandidateInfo(
        single.selection?.connectionId ?? "",
        single,
        registry,
        scheduler,
      );
      result.push({
        ...single,
        metadata: {
          ...(single.metadata ?? {}),
          candidateConnectionIds: [candidate.connectionId],
          candidates: [candidate],
          count: 1,
          redundancyCount: 1,
          healthScore: candidate.healthScore,
          bestLatencyMs: candidate.latencyMs,
        },
      });
      continue;
    }

    // Multiple connections serving the same model: resolve candidates
    const candidates = group.map((entry) => ({
      entry,
      candidate: resolveCandidateInfo(
        entry.selection?.connectionId ?? "",
        entry,
        registry,
        scheduler,
      ),
    }));

    // Rank candidates:
    // 1. Active state before disabled/quarantined
    // 2. Health score descending
    // 3. Latency ascending (when available)
    // 4. Priority descending
    // 5. Weight descending
    // 6. Connection ID ascending
    candidates.sort((a, b) => {
      const aActive = a.candidate.state === "active" ? 1 : 0;
      const bActive = b.candidate.state === "active" ? 1 : 0;
      if (bActive !== aActive) return bActive - aActive;

      const healthA = a.candidate.healthScore ?? 100;
      const healthB = b.candidate.healthScore ?? 100;
      if (healthB !== healthA) return healthB - healthA;

      if (b.candidate.priority !== a.candidate.priority) {
        return b.candidate.priority - a.candidate.priority;
      }

      const latA = a.candidate.latencyMs;
      const latB = b.candidate.latencyMs;
      if (latA !== undefined && latB !== undefined && latA !== latB) {
        return latA - latB;
      }

      if (b.candidate.weight !== a.candidate.weight) {
        return b.candidate.weight - a.candidate.weight;
      }
      return a.candidate.connectionId.localeCompare(b.candidate.connectionId);
    });

    const top = candidates[0];
    const rankedCandidates = candidates.map((c) => c.candidate);
    const candidateConnectionIds = rankedCandidates.map((c) => c.connectionId);

    const activeCandidates = rankedCandidates.filter(
      (c) => c.state === "active",
    );
    const allDisabledOrQuarantined = rankedCandidates.every(
      (c) => c.state === "disabled" || c.state === "quarantined",
    );

    const count =
      activeCandidates.length > 0
        ? activeCandidates.length
        : rankedCandidates.length;

    const topLatency = top.candidate.latencyMs;
    const badgeText = `共 ${count} 个渠道可用`;
    const detailText =
      topLatency !== undefined
        ? `${top.candidate.connectionName} · ${topLatency}ms | 备用: ${count - 1} 个渠道`
        : `${top.candidate.connectionName} | 共 ${count} 个渠道可用`;

    let disabledReason: string | undefined;
    if (allDisabledOrQuarantined) {
      disabledReason = "所有可用连接已隔离或禁用，请检查设置";
    } else {
      const kindMismatch = group.every(
        (e) => e.disabled && e.disabled.startsWith("不适用于当前"),
      );
      if (kindMismatch) {
        disabledReason = top.entry.disabled;
      }
    }

    const isCurrentSelected = Boolean(
      (current &&
        current.model === modelId &&
        candidateConnectionIds.includes(current.connectionId ?? "")) ||
      group.some((e) => e.checked),
    );

    const mergedEntry: Entry = {
      ...top.entry,
      label: top.entry.label,
      detail: detailText,
      badge: badgeText,
      disabled: disabledReason,
      checked: isCurrentSelected ? true : top.entry.checked,
      selection: top.entry.selection
        ? {
            ...top.entry.selection,
            connectionId: top.candidate.connectionId,
          }
        : undefined,
      terms: Array.from(
        new Set([
          ...group.flatMap((e) => e.terms ?? []),
          "API",
          modelId,
          ...rankedCandidates.map((c) => c.connectionName ?? ""),
        ]),
      ),
      metadata: {
        ...(top.entry.metadata ?? {}),
        candidateConnectionIds,
        candidates: rankedCandidates,
        badgeLabel: badgeText,
        count,
        redundancyCount: count,
        healthScore: top.candidate.healthScore,
        bestLatencyMs: top.candidate.latencyMs,
      },
    };

    result.push(mergedEntry);
  }

  // Restore non-model entries in their original positions
  if (nonModelEntries.length > 0) {
    for (const { index, entry } of nonModelEntries) {
      result.splice(index, 0, entry);
    }
  }

  return result;
}
