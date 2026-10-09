/**
 * Channel registry and the in-memory model index.
 *
 * The registry separates adapter code from channel configuration: one adapter
 * serves N channels that differ only by base url, credentials and capabilities.
 * The model index answers "which channels can serve kk-default" in constant time,
 * which keeps the scheduler off the database on the hot path.
 */
import type { CapabilityManifest } from "../../../domain/providerConnections.ts";
import type { ChannelAdapter, ChannelContext, ChannelKind } from "./adapter.ts";
import { noChannelAvailable } from "../errors.ts";

export interface ChannelRegistration {
  readonly id: string;
  readonly adapter: ChannelAdapter;
  readonly kind: ChannelKind;
  readonly enabled: boolean;
  /** Higher wins. Tiers give deterministic failover ordering. */
  readonly priority: number;
  /** Relative share inside a priority tier. */
  readonly weight: number;
  readonly baseUrl: string;
  readonly credentialRef?: string;
  readonly capabilities: CapabilityManifest;
  readonly modelMapping: Readonly<Record<string, string>>;
  readonly timeoutMs: number;
  readonly costLimit?: number;
  readonly unitPrice?: number;
}

export interface ChannelIndexEntry {
  readonly channelId: string;
  readonly adapter: ChannelAdapter;
  readonly kind: ChannelKind;
  readonly priority: number;
  readonly weight: number;
  readonly baseUrl: string;
  readonly credentialRef?: string;
  readonly capabilities: CapabilityManifest;
  readonly modelMapping: Readonly<Record<string, string>>;
  readonly timeoutMs: number;
  readonly costLimit?: number;
  readonly unitPrice?: number;
}

/** States mirrored from providerConnections so the index stays authoritative-free. */
export type IndexableState =
  "active" | "degraded" | "cooldown" | "quarantined" | "disabled";

export interface ModelIndexSnapshot {
  readonly registrations: readonly ChannelRegistration[];
  readonly states: ReadonlyMap<string, IndexableState>;
}

export function supportsOperation(
  capabilities: CapabilityManifest,
  operation: string,
): boolean {
  return capabilities.operations.includes(
    operation as CapabilityManifest["operations"][number],
  );
}

export class ChannelRegistry {
  readonly #adapters = new Map<string, ChannelAdapter>();
  #index: ModelIndexSnapshot = { registrations: [], states: new Map() };

  /**
   * Adapters register by provider id. Registering a duplicate provider is an
   * error rather than a silent overwrite, because the replacement would change
   * behaviour for every channel already bound to that provider.
   */
  registerAdapter(adapter: ChannelAdapter): void {
    if (this.#adapters.has(adapter.provider))
      throw new Error(`Adapter already registered: ${adapter.provider}`);
    this.#adapters.set(adapter.provider, adapter);
  }

  adapters(): ChannelAdapter[] {
    return [...this.#adapters.values()];
  }

  adapterFor(provider: string): ChannelAdapter | undefined {
    return this.#adapters.get(provider);
  }

  replace(snapshot: ModelIndexSnapshot): void {
    const ids = new Set<string>();
    for (const registration of snapshot.registrations) {
      if (ids.has(registration.id))
        throw new Error(`Duplicate channel id: ${registration.id}`);
      ids.add(registration.id);
      if (!this.#adapters.has(registration.adapter.provider))
        throw new Error(
          `Unregistered adapter: ${registration.adapter.provider} (channel ${registration.id})`,
        );
    }
    this.#index = snapshot;
  }

  snapshot(): ModelIndexSnapshot {
    return this.#index;
  }

  /**
   * Channels eligible for a model: enabled, not disabled, indexable state, and
   * declaring the requested operation. Ordering is priority descending, then
   * weight descending, then id, so the candidate list is stable and testable.
   */
  candidates(model: string, operation: string): ChannelIndexEntry[] {
    const out: ChannelIndexEntry[] = [];
    for (const registration of this.#index.registrations) {
      if (!registration.enabled) continue;
      // A channel with no recorded state is treated as active; the repository is
      // the source of truth once a state has been written for it.
      const state = this.#index.states.get(registration.id);
      if (state === "disabled" || state === "quarantined") continue;
      if (!(model in registration.modelMapping)) continue;
      if (!supportsOperation(registration.capabilities, operation)) continue;
      out.push(toEntry(registration));
    }
    return out.sort(
      (a, b) =>
        b.priority - a.priority ||
        b.weight - a.weight ||
        a.channelId.localeCompare(b.channelId),
    );
  }

  /** Resolves a registration to the context an adapter receives. */
  contextFor(channelId: string): ChannelContext | undefined {
    const registration = this.#index.registrations.find(
      (entry) => entry.id === channelId,
    );
    if (!registration) return undefined;
    return {
      channelId: registration.id,
      baseUrl: registration.baseUrl,
      capabilities: registration.capabilities,
      modelMapping: registration.modelMapping,
      timeoutMs: registration.timeoutMs,
    };
  }

  /**
   * Resolves the adapter backing an already-resolved channel. Polling needs this
   * because it targets a known channel rather than selecting among candidates.
   */
  adapterForContext(channelId: string): ChannelAdapter | undefined {
    return this.#index.registrations.find((entry) => entry.id === channelId)
      ?.adapter;
  }

  /**
   * Resolves the credential reference bound to a channel. Callers must look the
   * ref up by channel rather than reusing an id: the ref is what the vault
   * understands, and conflating the two silently reads the wrong secret.
   */
  credentialRefFor(channelId: string): string | undefined {
    return this.#index.registrations.find((entry) => entry.id === channelId)
      ?.credentialRef;
  }

  /**
   * Groups channels into priority tiers for weighted selection. Retry attempt N
   * deliberately targets a lower tier so repeated failures degrade quality of
   * service rather than retrying the same failing account.
   */
  tiers(candidates: readonly ChannelIndexEntry[]): ChannelIndexEntry[][] {
    const byPriority = new Map<number, ChannelIndexEntry[]>();
    for (const candidate of candidates) {
      const bucket = byPriority.get(candidate.priority);
      if (bucket) bucket.push(candidate);
      else byPriority.set(candidate.priority, [candidate]);
    }
    return [...byPriority.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, entries]) => entries);
  }

  /** Rejects with a normalized error so callers never see a bare throw. */
  requireCandidate(model: string, operation: string): ChannelIndexEntry {
    const found = this.candidates(model, operation);
    if (!found.length)
      throw Object.assign(new Error(noChannelAvailable(model).detail!), {
        normalized: noChannelAvailable(
          `No channel serves model ${model} for operation ${operation}`,
        ),
      });
    return found[0];
  }
}

function toEntry(registration: ChannelRegistration): ChannelIndexEntry {
  return {
    channelId: registration.id,
    adapter: registration.adapter,
    kind: registration.kind,
    priority: registration.priority,
    weight: registration.weight,
    baseUrl: registration.baseUrl,
    ...(registration.credentialRef === undefined
      ? {}
      : { credentialRef: registration.credentialRef }),
    capabilities: registration.capabilities,
    modelMapping: registration.modelMapping,
    timeoutMs: registration.timeoutMs,
    ...(registration.costLimit === undefined
      ? {}
      : { costLimit: registration.costLimit }),
    ...(registration.unitPrice === undefined
      ? {}
      : { unitPrice: registration.unitPrice }),
  };
}

export type { ModelIndexSnapshot as ModelIndex };
