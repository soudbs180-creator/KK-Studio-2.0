import { isTauri } from "@tauri-apps/api/core";
import { assertConfigPayloadSafe } from "../../domain/configTools.ts";
import {
  isConnectionReady,
  type ProviderConnection,
} from "../../domain/providerConnections.ts";
import { providerNeedsKey } from "../../domain/providerProtocol.ts";
import { checkModelProvider } from "../../integrations/modelProvider.ts";
import { credentialId } from "../../integrations/providers/credentialVault.ts";
import { withProviderStoreLock } from "../../integrations/providers/connectionCoordination.ts";
import {
  isDesktopProviderDurable,
  loadProviderConnectionsDurableSnapshot,
  persistProviderConnectionsDurable,
  readProviderConnections,
  writeProviderConnections,
  PROVIDER_CONNECTIONS_STORAGE_KEY,
} from "../../integrations/providers/providerStore.ts";
import {
  createImageCapabilityRegistry,
  inpaintCapabilityManifest,
} from "../capabilities/index.ts";
import { nativeComfyRuntime } from "../comfyui/index.ts";
import {
  createConfigToolHost,
  mergeConfigRuntime,
  type ConfigSnapshot,
} from "./configAgent.ts";

export const CONFIG_CREDENTIAL_EVENT = "kk:credential-request";
export const CONFIG_CHANGED_EVENT = "kk:config-changed";
export const CONFIG_SNAPSHOTS_KEY = `${PROVIDER_CONNECTIONS_STORAGE_KEY}:ai-snapshots:v1`;
export interface ConfigCredentialRequest {
  connectionId: string;
  credentialRef: string;
  signal?: AbortSignal;
  respond(status: "provided" | "cancelled"): void;
}

/** Dialog ownership uses preventDefault; without a UI owner this fails closed. */
export function requestConfigCredential(
  connection: ProviderConnection,
  signal?: AbortSignal,
  target: EventTarget = window,
): Promise<{ status: "provided" | "cancelled" }> {
  if (signal?.aborted) return Promise.resolve({ status: "cancelled" });
  return new Promise((resolve) => {
    let completed = false;
    const finish = (status: "provided" | "cancelled") => {
      if (completed) return;
      completed = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
      resolve({ status: status === "provided" ? "provided" : "cancelled" });
    };
    const cancel = () => finish("cancelled");
    // shortcut: 25s fits the 30s tool deadline; extend both when the dialog is integrated.
    const timer = setTimeout(cancel, 25_000);
    signal?.addEventListener("abort", cancel, { once: true });
    const detail: ConfigCredentialRequest = {
      connectionId: connection.id,
      credentialRef:
        connection.credentialRef ?? credentialId(connection.baseUrl ?? ""),
      signal,
      respond: finish,
    };
    if (
      target.dispatchEvent(
        new CustomEvent(CONFIG_CREDENTIAL_EVENT, { cancelable: true, detail }),
      )
    )
      cancel();
  });
}

export async function configuredCapabilityStatus(
  connections: ProviderConnection[],
) {
  const registry = createImageCapabilityRegistry();
  const registered = [...registry.list(), inpaintCapabilityManifest];
  const reports = registered.map((manifest) => {
    const candidates = [...manifest.adapters].sort(
      (a, b) => b.priority - a.priority || a.id.localeCompare(b.id),
    );
    // Availability here is saved configuration, never a fabricated live probe.
    const available = connections.filter(
      (item) =>
        isConnectionReady(item) &&
        item.capabilities.modalities.includes("image"),
    );
    const configured = candidates.find((adapter) =>
      available.some((item) =>
        adapter.kind === "comfyui"
          ? item.kind === "local_comfyui"
          : item.kind !== "local_comfyui",
      ),
    );
    return {
      capability: manifest.id,
      adapter: configured?.id ?? null,
      status: configured ? "configured" : "unavailable",
      liveStatus: "unknown",
      reason: configured
        ? "按已配置连接与注册优先级选择；实际任务仍需工作流、模型能力和执行上下文校验"
        : "没有匹配的已启用连接",
      candidates: candidates.map((item) => ({
        id: item.id,
        priority: item.priority,
      })),
      source: "registry-config",
    };
  });
  const known = new Set(reports.map((item) => item.capability));
  for (const connection of connections.filter((item) =>
    isConnectionReady(item),
  ))
    for (const modality of connection.capabilities.modalities)
      for (const operation of connection.capabilities.operations) {
        const capability = `${modality}.${operation}`;
        if (known.has(capability)) continue;
        known.add(capability);
        reports.push({
          capability,
          adapter: null,
          status: "configured",
          liveStatus: "unknown",
          reason:
            "连接声明支持此能力；未登记统一执行适配器，不能确认当前任务路由",
          candidates: [],
          source: "connection-manifest",
        });
      }
  return reports;
}

export function createBrowserConfigToolHost() {
  function snapshots(): ConfigSnapshot[] {
    const raw = window.localStorage.getItem(CONFIG_SNAPSHOTS_KEY);
    const records: unknown = raw === null ? [] : JSON.parse(raw);
    if (!Array.isArray(records)) throw new Error("CONFIG_SNAPSHOT_INVALID");
    for (const record of records) {
      assertConfigPayloadSafe(record);
      if (
        !record ||
        typeof record.id !== "string" ||
        !Array.isArray(record.connections)
      )
        throw new Error("CONFIG_SNAPSHOT_INVALID");
    }
    return records;
  }
  return createConfigToolHost({
    read: async () => {
      const native = await loadProviderConnectionsDurableSnapshot();
      const cached = readProviderConnections();
      return {
        connections:
          native?.connections?.map((connection) => {
            const metadata = { ...connection };
            // Native metadata is not the browser's live reservation registry.
            delete metadata.activeJobs;
            delete metadata.activeLeaseIds;
            const live = cached.find((item) => item.id === connection.id);
            return live
              ? mergeConfigRuntime(
                  metadata,
                  live,
                  (live.healthRevision ?? 0) >= (metadata.healthRevision ?? 0),
                )
              : metadata;
          }) ?? cached,
        revision: native?.revision ?? null,
      };
    },
    write: async (connections, previous) => {
      if (isDesktopProviderDurable())
        await persistProviderConnectionsDurable(connections, {
          expectedRevision: previous.revision,
          publishCache: false,
        });
      else if (
        JSON.stringify(readProviderConnections()) !==
        JSON.stringify(previous.connections)
      )
        throw new Error("CONFIG_STALE");
      if (!writeProviderConnections(connections))
        throw new Error("CONFIG_CACHE_FAILED");
    },
    saveSnapshot: async (snapshot) => {
      assertConfigPayloadSafe(snapshot);
      window.localStorage.setItem(
        CONFIG_SNAPSHOTS_KEY,
        JSON.stringify([...snapshots(), snapshot]),
      );
    },
    loadSnapshot: async (id) => snapshots().find((item) => item.id === id),
    capabilities: configuredCapabilityStatus,
    requestCredential: (connection, signal) =>
      requestConfigCredential(connection, signal),
    testConnection: async (connection, signal) => {
      if (!connection.baseUrl) return { ok: false, modelCount: 0 };
      if (connection.kind === "local_comfyui") {
        if (isTauri())
          return {
            ok: (await nativeComfyRuntime.status(connection.baseUrl)).ready,
            modelCount: 0,
          };
        const response = await fetch(
          `${connection.baseUrl.replace(/\/+$/, "")}/system_stats`,
          {
            signal: signal
              ? AbortSignal.any([signal, AbortSignal.timeout(5000)])
              : AbortSignal.timeout(5000),
          },
        );
        return { ok: response.ok, modelCount: 0 };
      }
      if (
        !isTauri() &&
        providerNeedsKey({
          baseUrl: connection.baseUrl,
          authMode: connection.authMode,
        })
      )
        return {
          ok: false,
          modelCount: 0,
          code: "desktop_credentials_required",
        };
      const deadline = signal
        ? AbortSignal.any([signal, AbortSignal.timeout(5000)])
        : AbortSignal.timeout(5000);
      const models = await checkModelProvider(
        connection.baseUrl,
        "",
        deadline,
        {
          credentialRef:
            connection.credentialRef ?? credentialId(connection.baseUrl),
          protocol: connection.protocol,
          authMode: connection.authMode,
        },
      );
      return { ok: true, modelCount: models.length };
    },
    notify: (message, snapshotId) => {
      window.dispatchEvent(
        new CustomEvent(CONFIG_CHANGED_EVENT, {
          detail: { message, snapshotId },
        }),
      );
    },
    withLock: (run) =>
      withProviderStoreLock(
        isDesktopProviderDurable() || Boolean(window.navigator?.locks),
        async () => {
          const locks = window.navigator?.locks;
          if (!locks?.request || !locks.query)
            throw new Error("CONFIG_COORDINATION_UNAVAILABLE");
          // Share providerSubmission's lease critical section without pruning its records.
          return locks.request(
            "kk-studio:provider-registry-leases",
            { mode: "exclusive", signal: AbortSignal.timeout(10_000) },
            async () => {
              const occupied = (await locks.query()).held?.some((item) =>
                item.name?.startsWith("kk-studio:provider-slot:"),
              );
              if (
                occupied ||
                readProviderConnections().some(
                  (item) => item.activeJobs || item.activeLeaseIds?.length,
                )
              )
                throw new Error("CONFIG_BUSY");
              return run();
            },
          );
        },
      ),
  });
}
