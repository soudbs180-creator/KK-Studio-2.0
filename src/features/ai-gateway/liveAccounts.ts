import type { ProviderConnection } from "../../domain/providerConnections.ts";
import {
  rankAccounts,
  type RoutedAccount,
  type RoutingMode,
} from "../../domain/routingGroups.ts";
import { readProviderConnections } from "../../integrations/providers/providerStore.ts";
import { readGatewayPreferences } from "./gatewayPreferences.ts";

export function accountsFromConnections(
  connections: readonly ProviderConnection[],
  now = Date.now(),
): RoutedAccount[] {
  return connections.map((connection, index) => ({
    id: connection.id,
    priority: connection.priority ?? index,
    remaining:
      connection.state === "disabled" || connection.state === "quarantined"
        ? 0
        : Math.max(
            1,
            connection.concurrencyLimit - (connection.activeJobs ?? 0),
          ),
    used: connection.activeJobs ?? 0,
    resetAt: connection.cooldownUntil ?? now + 3_600_000,
    healthy:
      (connection.state === "active" || connection.state === "degraded") &&
      (connection.cooldownUntil ?? 0) <= now,
    periodHours: 1,
  }));
}

export interface TextRouteTarget {
  providerBaseUrl: string;
  credentialRef?: string;
  protocol?: ProviderConnection["protocol"];
  authMode?: ProviderConnection["authMode"];
  model: string;
}

/** Rank saved connections for a text request. A single match keeps the caller route. */
export function textRoutePlan(input: TextRouteTarget): TextRouteTarget[] {
  const prefs = readGatewayPreferences();
  const original = [input];
  if (!prefs || typeof window === "undefined") return original;
  const matched = readProviderConnections().filter(
    (connection) =>
      connection.model === input.model &&
      (connection.state === "active" || connection.state === "degraded") &&
      Boolean(connection.baseUrl),
  );
  if (matched.length < 2) return original;
  const ids = rankAccounts(
    prefs.mode,
    accountsFromConnections(matched),
    Date.now(),
    prefs.cursor,
  );
  const ordered = ids
    .map((id) => matched.find((connection) => connection.id === id))
    .filter((connection): connection is ProviderConnection =>
      Boolean(connection),
    );
  if (!ordered.length) return original;
  return ordered.map((connection) => ({
    providerBaseUrl: connection.baseUrl ?? input.providerBaseUrl,
    credentialRef: connection.credentialRef ?? input.credentialRef,
    protocol: connection.protocol ?? input.protocol,
    authMode: connection.authMode ?? input.authMode,
    model: connection.model ?? input.model,
  }));
}

export function rankedConnectionIds(
  connections: readonly ProviderConnection[],
  mode: RoutingMode,
  cursor = 0,
  now = Date.now(),
): string[] {
  return rankAccounts(
    mode,
    accountsFromConnections(connections, now),
    now,
    cursor,
  );
}
