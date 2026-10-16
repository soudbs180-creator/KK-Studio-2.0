import type { Entry, RelayCandidate, EntryMetadata } from "./modelMenuEntries.ts";
import type { ChannelRegistry } from "../ai-gateway/channels/registry.ts";
import type { ModelSelection } from "./modelSelection.ts";

export type { RelayCandidate, EntryMetadata };

export interface DeduplicateRelayOptions {
  registry?: ChannelRegistry;
  current?: ModelSelection;
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
): RelayCandidate {
  let priority = 0;
  let weight = 0;
  let state: "active" | "disabled" | "quarantined" = entry.disabled
    ? "disabled"
    : "active";
  let connectionName =
    (entry.metadata?.connectionName as string | undefined) ??
    entry.detail?.split(" · ")[0] ??
    connectionId;

  if (registry) {
    const registration = registry
      .snapshot()
      .registrations.find((r) => r.id === connectionId);
    if (registration) {
      priority = registration.priority;
      weight = registration.weight;
      const regState = registry.snapshot().states.get(connectionId);
      if (regState === "disabled" || regState === "quarantined") {
        state = regState;
      } else if (!registration.enabled) {
        state = "disabled";
      } else {
        state = "active";
      }
    }
  }

  const meta = (entry.metadata ?? {}) as Record<string, unknown>;
  if (typeof meta.priority === "number") {
    priority = meta.priority;
  } else if (
    typeof (entry as unknown as Record<string, unknown>).priority === "number"
  ) {
    priority = (entry as unknown as Record<string, unknown>).priority as number;
  }

  if (typeof meta.weight === "number") {
    weight = meta.weight;
  } else if (
    typeof (entry as unknown as Record<string, unknown>).weight === "number"
  ) {
    weight = (entry as unknown as Record<string, unknown>).weight as number;
  }

  if (
    meta.state === "active" ||
    meta.state === "disabled" ||
    meta.state === "quarantined"
  ) {
    state = meta.state;
  } else if (
    (entry as unknown as Record<string, unknown>).state === "active" ||
    (entry as unknown as Record<string, unknown>).state === "disabled" ||
    (entry as unknown as Record<string, unknown>).state === "quarantined"
  ) {
    state = (entry as unknown as Record<string, unknown>).state as
      | "active"
      | "disabled"
      | "quarantined";
  }

  if (typeof meta.connectionName === "string") {
    connectionName = meta.connectionName;
  } else if (
    typeof (entry as unknown as Record<string, unknown>).connectionName ===
    "string"
  ) {
    connectionName = (entry as unknown as Record<string, unknown>)
      .connectionName as string;
  }

  return {
    connectionId,
    connectionName,
    priority,
    weight,
    state,
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
