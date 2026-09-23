export interface AgentUsageWindow {
  id: string;
  label: string;
  remaining: number;
  minutes?: number;
  resetsAt?: number;
}
type Window = {
  usedPercent?: number | null;
  windowDurationMins?: number | null;
  resetsAt?: number | null;
};
type Bucket = {
  limitName?: string | null;
  primary?: Window | null;
  secondary?: Window | null;
};
export function parseAgentUsage(payload: {
  rateLimitsByLimitId?: Record<string, Bucket> | null;
  rateLimits?: Bucket | null;
}): AgentUsageWindow[] {
  const buckets =
    payload.rateLimitsByLimitId &&
    Object.keys(payload.rateLimitsByLimitId).length
      ? payload.rateLimitsByLimitId
      : payload.rateLimits
        ? { codex: payload.rateLimits }
        : {};
  return Object.entries(buckets).flatMap(([id, bucket]) =>
    (["primary", "secondary"] as const).flatMap((key) => {
      const window = bucket[key];
      if (
        typeof window?.usedPercent !== "number" ||
        !Number.isFinite(window.usedPercent)
      )
        return [];
      const minutes =
        typeof window.windowDurationMins === "number"
          ? window.windowDurationMins
          : undefined;
      return [
        {
          id: id + ":" + key,
          label:
            (bucket.limitName || id) +
            " · " +
            (minutes === 300
              ? "5 小时"
              : minutes === 10080
                ? "每周"
                : minutes
                  ? minutes + " 分钟"
                  : key === "primary"
                    ? "当前周期"
                    : "长期周期"),
          remaining: Math.max(0, Math.min(100, 100 - window.usedPercent)),
          minutes,
          resetsAt:
            typeof window.resetsAt === "number" ? window.resetsAt : undefined,
        },
      ];
    }),
  );
}

/** Only the shared Codex bucket can block all models; other buckets may be model-specific. */
export function isAgentQuotaExhausted(
  windows: AgentUsageWindow[],
  now = Date.now(),
): boolean {
  return windows.some(
    (window) =>
      window.id.startsWith("codex:") &&
      window.remaining === 0 &&
      (!window.resetsAt || window.resetsAt * 1000 > now),
  );
}
