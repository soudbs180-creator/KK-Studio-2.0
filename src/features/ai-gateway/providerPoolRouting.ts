/**
 * Provider-pool routing helpers inspired by Codex++ product behavior.
 * Implementation is original KK code; do not copy AGPL sources.
 */
import { z } from "zod";

export const modelRouteRefSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("bare"), model: z.string().min(1).max(200) }),
  z.object({
    kind: z.literal("provider"),
    providerId: z.string().min(1).max(120),
    model: z.string().min(1).max(200),
  }),
  z.object({
    kind: z.literal("group"),
    groupId: z.string().min(1).max(120),
  }),
]);
export type ModelRouteRef = z.infer<typeof modelRouteRefSchema>;

export const routeStrategySchema = z.enum([
  "sequential",
  "round-robin",
  "weighted",
  "quota-first",
  "speed-first",
  "manual",
]);
export type RouteStrategy = z.infer<typeof routeStrategySchema>;

export const routeGroupMemberSchema = z
  .object({
    channelId: z.string().min(1).max(120),
    model: z.string().min(1).max(200),
    weight: z.number().int().min(0).max(10_000).default(100),
    remainingQuota: z.number().nonnegative().nullable().default(null),
    avgFirstTokenMs: z.number().nonnegative().nullable().default(null),
  })
  .strict();
export type RouteGroupMember = z.infer<typeof routeGroupMemberSchema>;

export const routeGroupSchema = z
  .object({
    id: z.string().min(1).max(120),
    strategy: routeStrategySchema,
    members: z.array(routeGroupMemberSchema).min(1).max(64),
    manualChannelId: z.string().min(1).max(120).optional(),
  })
  .strict();
export type RouteGroup = z.infer<typeof routeGroupSchema>;

export const credentialKeyStateSchema = z
  .object({
    keyId: z.string().min(1).max(120),
    credentialRef: z.string().min(1).max(200),
    cooldownUntilMs: z.number().int().nonnegative().default(0),
    quarantined: z.boolean().default(false),
    consecutiveFailures: z.number().int().nonnegative().default(0),
  })
  .strict();
export type CredentialKeyState = z.infer<typeof credentialKeyStateSchema>;

/** Parse bare / provider/model / group/id selectors. */
export function parseModelRouteRef(raw: string): ModelRouteRef {
  const value = z.string().trim().min(1).max(240).parse(raw);
  if (value.startsWith("group/")) {
    const groupId = value.slice("group/".length).trim();
    if (!groupId) throw new Error("空的路由组 id");
    return modelRouteRefSchema.parse({ kind: "group", groupId });
  }
  const slash = value.indexOf("/");
  if (slash > 0) {
    return modelRouteRefSchema.parse({
      kind: "provider",
      providerId: value.slice(0, slash),
      model: value.slice(slash + 1),
    });
  }
  return modelRouteRefSchema.parse({ kind: "bare", model: value });
}

export function orderGroupMembers(
  groupValue: RouteGroup,
  options: { nowMs: number; roundRobinCursor?: number; random?: () => number },
): RouteGroupMember[] {
  const group = routeGroupSchema.parse(groupValue);
  const members = [...group.members];
  switch (group.strategy) {
    case "manual": {
      const pick =
        members.find((item) => item.channelId === group.manualChannelId) ??
        members[0]!;
      return [pick];
    }
    case "quota-first":
      return members.sort(
        (a, b) => (b.remainingQuota ?? 0) - (a.remainingQuota ?? 0),
      );
    case "speed-first":
      return members.sort((a, b) => {
        const left = a.avgFirstTokenMs ?? Number.POSITIVE_INFINITY;
        const right = b.avgFirstTokenMs ?? Number.POSITIVE_INFINITY;
        return left - right;
      });
    case "weighted": {
      const random = options.random ?? Math.random;
      const total = members.reduce(
        (sum, item) => sum + Math.max(item.weight, 0) + 10,
        0,
      );
      let cursor = random() * total;
      const ordered: RouteGroupMember[] = [];
      const pool = [...members];
      while (pool.length) {
        let walk = cursor;
        let index = 0;
        for (; index < pool.length; index += 1) {
          walk -= Math.max(pool[index]!.weight, 0) + 10;
          if (walk <= 0) break;
        }
        const pick = pool.splice(Math.min(index, pool.length - 1), 1)[0]!;
        ordered.push(pick);
        cursor = random() * Math.max(
          pool.reduce((sum, item) => sum + Math.max(item.weight, 0) + 10, 0),
          1,
        );
      }
      return ordered;
    }
    case "round-robin": {
      const start =
        ((options.roundRobinCursor ?? 0) % members.length) + members.length;
      return members.map((_, index) => members[(start + index) % members.length]!);
    }
    case "sequential":
    default:
      return members;
  }
}

/**
 * Pick the next usable credential key. Sticky sessions keep the same key until
 * cooldown/quarantine forces a move (Codex++-style cache-friendly default).
 */
export function selectCredentialKey(input: {
  keys: readonly CredentialKeyState[];
  nowMs: number;
  stickyKeyId?: string | null;
  rotateEveryRequest?: boolean;
  lastKeyId?: string | null;
}): CredentialKeyState | null {
  const keys = z.array(credentialKeyStateSchema).min(1).parse(input.keys);
  const available = keys.filter(
    (key) => !key.quarantined && key.cooldownUntilMs <= input.nowMs,
  );
  if (!available.length) return null;

  if (!input.rotateEveryRequest && input.stickyKeyId) {
    const sticky = available.find((key) => key.keyId === input.stickyKeyId);
    if (sticky) return sticky;
  }

  if (input.rotateEveryRequest && input.lastKeyId) {
    const index = available.findIndex((key) => key.keyId === input.lastKeyId);
    if (index >= 0) return available[(index + 1) % available.length]!;
  }

  return available[0]!;
}

export function applyKeyFailure(
  key: CredentialKeyState,
  options: {
    nowMs: number;
    cooldownMs?: number;
    quarantineThreshold?: number;
  },
): CredentialKeyState {
  const threshold = options.quarantineThreshold ?? 5;
  const failures = key.consecutiveFailures + 1;
  const backoff = Math.min(2 ** failures * 1000, 30 * 60 * 1000);
  return credentialKeyStateSchema.parse({
    ...key,
    consecutiveFailures: failures,
    cooldownUntilMs: options.nowMs + (options.cooldownMs ?? backoff),
    quarantined: failures >= threshold,
  });
}

export function applyKeySuccess(key: CredentialKeyState): CredentialKeyState {
  return credentialKeyStateSchema.parse({
    ...key,
    consecutiveFailures: 0,
    cooldownUntilMs: 0,
    quarantined: false,
  });
}

/** Channel priority for the four product channels (lower runs first). */
export const pickerChannelPriority = {
  local: 10,
  account: 20,
  official: 30,
  relay: 40,
} as const;

export function comparePickerChannels(
  left: keyof typeof pickerChannelPriority,
  right: keyof typeof pickerChannelPriority,
): number {
  return pickerChannelPriority[left] - pickerChannelPriority[right];
}
