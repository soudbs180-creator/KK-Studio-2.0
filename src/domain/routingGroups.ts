/** Magpie-style routing groups. Pure ordering, no network. */

export type RoutingMode = "smart" | "order" | "rotate" | "usage" | "pace";

export interface RoutedAccount {
  id: string;
  priority: number;
  remaining: number;
  used: number;
  resetAt: number;
  healthy: boolean;
  periodHours: number;
}

export interface RoutingRequest {
  mode: RoutingMode;
  cursor?: number;
  quotas?: Readonly<
    Record<
      string,
      { remaining: number; used: number; resetAt: number; periodHours: number }
    >
  >;
}

const MODES: RoutingMode[] = ["smart", "order", "rotate", "usage", "pace"];

export function isRoutingMode(value: string): value is RoutingMode {
  return (MODES as string[]).includes(value);
}

function hoursLeft(account: RoutedAccount, now: number): number {
  return Math.max(account.periodHours, (account.resetAt - now) / 3_600_000);
}

/** Closest quota reset among accounts that still have balance comes first. */
export function rankAccounts(
  mode: RoutingMode,
  accounts: readonly RoutedAccount[],
  now: number,
  cursor = 0,
): string[] {
  const live = accounts.filter(
    (account) => account.healthy && account.remaining > 0,
  );
  const pool = live.length
    ? live
    : accounts.filter((account) => account.healthy);
  if (mode === "order")
    return [...pool].sort((a, b) => a.priority - b.priority).map((a) => a.id);
  if (mode === "rotate") {
    if (!pool.length) return [];
    const start = ((cursor % pool.length) + pool.length) % pool.length;
    return pool.map((_, index) => pool[(start + index) % pool.length]!.id);
  }
  if (mode === "usage")
    return [...pool]
      .sort((a, b) => a.used - b.used || a.priority - b.priority)
      .map((a) => a.id);
  if (mode === "pace")
    return [...pool]
      .sort(
        (a, b) =>
          b.remaining / hoursLeft(b, now) - a.remaining / hoursLeft(a, now),
      )
      .map((a) => a.id);
  return [...pool]
    .filter((account) => account.remaining > 0)
    .sort((a, b) => a.resetAt - b.resetAt || b.remaining - a.remaining)
    .map((a) => a.id);
}

export function routeIntent(prompt: string): "simple" | "complex" {
  const text = prompt.trim();
  if (text.length > 280) return "complex";
  if (/(分镜|画布|视频|生图|导演|蓝图|重构|多步骤)/u.test(text))
    return "complex";
  if (/\b(storyboard|canvas|video|render|refactor)\b/i.test(text))
    return "complex";
  return "simple";
}

export function orderByRouting<
  T extends { id: string; priority: number; weight: number },
>(
  entries: readonly T[],
  routing: RoutingRequest | undefined,
  now: number,
): T[] {
  if (!routing) return [...entries];
  const ranked = rankAccounts(
    routing.mode,
    entries.map((entry, index) => {
      const quota = routing.quotas?.[entry.id];
      return {
        id: entry.id,
        priority: entry.priority || index,
        remaining: quota?.remaining ?? Math.max(entry.weight, 1),
        used: quota?.used ?? 0,
        resetAt: quota?.resetAt ?? now + 3_600_000,
        healthy: true,
        periodHours: quota?.periodHours ?? 1,
      };
    }),
    now,
    routing.cursor ?? 0,
  );
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const ordered = ranked
    .map((id) => byId.get(id))
    .filter((entry): entry is T => Boolean(entry));
  for (const entry of entries)
    if (!ordered.includes(entry)) ordered.push(entry);
  return ordered;
}
