import {
  assertConfigPayloadSafe,
  configPermission,
  DEFAULT_CONFIG_BUDGET,
  isConfigToolName,
  parseConfigToolInput,
  safeConfigToolResult,
  type ConfigToolName,
} from "../../domain/configTools.ts";
import type { ProviderConnection } from "../../domain/providerConnections.ts";
import { credentialId } from "../../integrations/providers/credentialVault.ts";
import {
  normalizeProviderConnection,
  mergeProviderConnection,
} from "../../integrations/providers/providerStore.ts";
import {
  providerConfigSchema,
  mergeProviderConnections,
} from "./providerConfigIO.ts";
import { connectionFingerprint } from "./providerTargetRenderers.ts";

export interface ConfigState {
  connections: ProviderConnection[];
  revision: number | null;
}
export interface ConfigSnapshot {
  id: string;
  createdAt: string;
  connections: ProviderConnection[];
}
export interface ConfigToolPorts {
  read(): Promise<ConfigState>;
  write(
    connections: ProviderConnection[],
    previous: ConfigState,
  ): Promise<void>;
  saveSnapshot(snapshot: ConfigSnapshot): Promise<void>;
  loadSnapshot(id: string): Promise<unknown>;
  capabilities(connections: ProviderConnection[]): Promise<unknown[]>;
  requestCredential(
    connection: ProviderConnection,
    signal?: AbortSignal,
  ): Promise<{ status: "provided" | "cancelled" }>;
  testConnection(
    connection: ProviderConnection,
    signal?: AbortSignal,
  ): Promise<{ ok: boolean; modelCount: number }>;
  notify(message: string, snapshotId: string): void;
  withLock?<T>(run: () => Promise<T>): Promise<T>;
}

function parseConnections(value: unknown): ProviderConnection[] {
  assertConfigPayloadSafe(value);
  const parsed = providerConfigSchema.safeParse(value);
  if (
    !parsed.success ||
    new Set(parsed.data.connections.map((item) => item.id)).size !==
      parsed.data.connections.length
  )
    throw new Error("CONFIG_INVALID");
  return parsed.data.connections.map(
    (item) =>
      JSON.parse(
        JSON.stringify(normalizeProviderConnection(item)!),
      ) as ProviderConnection,
  );
}

const leaseFields = ["activeJobs", "activeLeaseIds"] as const;
const healthFields = [
  "cooldownUntil",
  "lastHealthCheckAt",
  "healthRevision",
  "verificationStatus",
  "lastSuccessfulGenerationAt",
] as const;
export function mergeConfigRuntime(
  target: ProviderConnection,
  live: ProviderConnection,
  health = true,
): ProviderConnection {
  if (
    credentialBinding(target) !== credentialBinding(live) ||
    target.credentialRef !== live.credentialRef ||
    target.model !== live.model
  )
    return target;
  const merged = { ...target };
  for (const key of [...leaseFields, ...(health ? healthFields : [])]) {
    if (key in live) Object.assign(merged, { [key]: live[key] });
    else delete merged[key];
  }
  if (health && target.state !== "disabled" && live.state !== "disabled")
    merged.state = live.state;
  return merged;
}

function credentialBinding(connection: ProviderConnection): string {
  const endpoint = connection.baseUrl
    ? new URL(connection.baseUrl).href.replace(/\/+$/, "")
    : "";
  return JSON.stringify([
    endpoint,
    connection.protocol ?? "openai-chat",
    connection.authMode ?? "api-key",
    connection.kind,
  ]);
}

/** A metadata edit must never redirect a vault reference to an unapproved peer. */
function bindDraftCredentials(
  previous: ProviderConnection[],
  incoming: ProviderConnection[],
): ProviderConnection[] {
  const known = new Map<string, Set<string>>();
  for (const connection of previous) {
    const ref =
      connection.credentialRef ?? credentialId(connection.baseUrl ?? "");
    const bindings = known.get(ref) ?? new Set<string>();
    bindings.add(credentialBinding(connection));
    known.set(ref, bindings);
  }
  return incoming.map((connection) => {
    const existing = previous.find((item) => item.id === connection.id);
    const changedPeer =
      !existing ||
      credentialBinding(existing) !== credentialBinding(connection);
    const ref =
      connection.credentialRef ??
      (!changedPeer ? existing?.credentialRef : undefined);
    if (ref) {
      const bindings = known.get(ref);
      if (!bindings?.has(credentialBinding(connection)))
        throw new Error("CONFIG_CREDENTIAL_BINDING");
    }
    return ref
      ? { ...connection, credentialRef: ref }
      : changedPeer && connection.baseUrl
        ? {
            ...connection,
            credentialRef: `config-credential-${crypto.randomUUID()}`,
          }
        : connection;
  });
}
const file = (connections: ProviderConnection[]) => ({
  version: 1,
  exportedAt: "2026-11-09T00:00:00.000Z",
  connections,
});
const fingerprint = (connections: ProviderConnection[]) =>
  connectionFingerprint(JSON.stringify(connections));
export function diffConfig(
  previous: ProviderConnection[],
  next: ProviderConnection[],
) {
  const before = new Map(previous.map((item) => [item.id, item]));
  const after = new Map(next.map((item) => [item.id, item]));
  return {
    added: next.filter((item) => !before.has(item.id)).map((item) => item.id),
    removed: previous
      .filter((item) => !after.has(item.id))
      .map((item) => item.id),
    updated: next.flatMap((item) => {
      const original = before.get(item.id);
      if (!original) return [];
      const fields = [
        ...new Set([...Object.keys(original), ...Object.keys(item)]),
      ]
        .filter(
          (key) =>
            JSON.stringify(original[key as keyof ProviderConnection]) !==
            JSON.stringify(item[key as keyof ProviderConnection]),
        )
        .sort();
      return fields.length ? [{ id: item.id, fields }] : [];
    }),
  };
}

export function createConfigToolHost(ports: ConfigToolPorts) {
  let queue: Promise<unknown> = Promise.resolve();
  async function execute(
    name: string,
    raw: unknown,
    signal?: AbortSignal,
  ): Promise<Record<string, unknown>> {
    if (!isConfigToolName(name)) throw new Error("CONFIG_UNKNOWN_TOOL");
    const input = parseConfigToolInput(name, raw);
    async function run() {
      signal?.throwIfAborted();
      const read = await ports.read();
      const current: ConfigState = {
        ...read,
        connections: parseConnections(file(read.connections)),
      };
      const version = fingerprint(current.connections);
      if (name === "kk_config_get")
        return {
          version,
          connections: current.connections,
          capabilities: await ports.capabilities(current.connections),
          health: current.connections.map((item) => ({
            connectionId: item.id,
            state: item.state,
            lastCheckedAt: item.lastHealthCheckAt ?? null,
            source: "saved-metadata",
          })),
          budget: DEFAULT_CONFIG_BUDGET,
        };
      if (name === "kk_capability_status")
        return { capabilities: await ports.capabilities(current.connections) };
      if (name === "kk_credential_request" || name === "kk_connection_test") {
        const connection = current.connections.find(
          (item) => item.id === input.connectionId,
        );
        if (!connection) throw new Error("CONFIG_CONNECTION_NOT_FOUND");
        if (name === "kk_credential_request")
          return await ports.requestCredential(connection, signal);
        try {
          return {
            connectionId: connection.id,
            ...(await ports.testConnection(connection, signal)),
          };
        } catch {
          return {
            connectionId: connection.id,
            ok: false,
            modelCount: 0,
            code: signal?.aborted ? "cancelled" : "connection_failed",
          };
        }
      }
      let next: ProviderConnection[];
      if (name === "kk_config_rollback") {
        const snapshot = await ports.loadSnapshot(String(input.snapshotId));
        if (
          !snapshot ||
          typeof snapshot !== "object" ||
          (snapshot as ConfigSnapshot).id !== input.snapshotId
        )
          throw new Error("CONFIG_SNAPSHOT_NOT_FOUND");
        next = parseConnections(file((snapshot as ConfigSnapshot).connections));
        if (next.some((item) => item.activeJobs || item.activeLeaseIds?.length))
          throw new Error("CONFIG_SNAPSHOT_BUSY");
        next = parseConnections(
          file(
            next.map((item) => {
              const live = current.connections.find(
                (connection) => connection.id === item.id,
              );
              return live ? mergeConfigRuntime(item, live) : item;
            }),
          ),
        );
      } else {
        try {
          next = parseConnections(
            file(
              mergeProviderConnections(
                current.connections,
                bindDraftCredentials(
                  current.connections,
                  parseConnections(input.draft),
                ).map((connection) => {
                  const previous = current.connections.find(
                    (item) => item.id === connection.id,
                  );
                  const updated = mergeProviderConnection(
                    connection,
                    current.connections,
                  ).find((item) => item.id === connection.id)!;
                  if (!previous) {
                    delete updated.activeJobs;
                    delete updated.activeLeaseIds;
                    updated.verificationStatus = "unverified";
                    delete updated.lastSuccessfulGenerationAt;
                  } else if (
                    connection.state === "disabled" ||
                    previous.state === "disabled"
                  )
                    updated.state = connection.state;
                  return updated;
                }),
                "replace",
              ),
            ),
          );
        } catch (error) {
          const code =
            error instanceof Error &&
            error.message === "CONFIG_CREDENTIAL_BINDING"
              ? error.message
              : "CONFIG_INVALID";
          if (name === "kk_config_propose")
            return { valid: false, errors: [code], version };
          // eslint-disable-next-line preserve-caught-error -- 故意丢弃原始错误，避免密钥/上游原文外泄
          throw new Error(code);
        }
      }
      const diff = diffConfig(current.connections, next);
      if (name === "kk_config_propose")
        return {
          valid: true,
          version,
          diff,
          permission: configPermission("config.write"),
        };
      if (input.expectedVersion !== version) throw new Error("CONFIG_STALE");
      if (
        current.connections.some(
          (item) => item.activeJobs || item.activeLeaseIds?.length,
        )
      )
        throw new Error("CONFIG_BUSY");
      const snapshot: ConfigSnapshot = {
        id: `config-${crypto.randomUUID()}`,
        createdAt: new Date().toISOString(),
        connections: structuredClone(current.connections),
      };
      await ports.saveSnapshot(snapshot);
      signal?.throwIfAborted();
      try {
        await ports.write(next, current);
      } catch {
        return {
          status: "uncertain",
          code: "CONFIG_WRITE_FAILED",
          snapshotId: snapshot.id,
          permission: "L1",
          message: "写入未能确认，请重新读取配置；原配置快照已保留",
        };
      }
      ports.notify("已修改，可撤销", snapshot.id);
      return {
        status: name === "kk_config_apply" ? "applied" : "restored",
        version: fingerprint(next),
        diff,
        snapshotId: snapshot.id,
        permission: configPermission("config.write"),
        message: "已修改，可撤销",
      };
    }
    try {
      const result =
        name === "kk_config_apply" || name === "kk_config_rollback"
          ? await (queue = queue.then(
              () => (ports.withLock ? ports.withLock(run) : run()),
              () => (ports.withLock ? ports.withLock(run) : run()),
            ))
          : await run();
      return safeConfigToolResult(name as ConfigToolName, result);
    } catch (error) {
      if (error instanceof Error && /^CONFIG_[A-Z_]+$/.test(error.message))
        throw error;
      // eslint-disable-next-line preserve-caught-error -- 故意丢弃原始错误，避免密钥/上游原文外泄
      throw new Error(signal?.aborted ? "CONFIG_CANCELLED" : "CONFIG_FAILED");
    }
  }
  return { execute };
}
