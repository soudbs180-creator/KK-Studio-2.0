import {
  isConnectionReady,
  type ProviderConnection,
} from "../../domain/providerConnections.ts";
import {
  readProviderConnections,
  releaseProviderLease,
  updateProviderConnection,
} from "./providerRegistry.ts";
import { hasApiKey } from "./providerCredentials.ts";

export class ProviderSubmissionError extends Error {}
export interface SubmissionBinding {
  id?: string;
  baseUrl?: string;
  credentialRef?: string;
  referenceCount: number;
}
interface SubmissionOptions {
  explicitRetry?: boolean;
  ownSlot?: boolean;
  skipCapacity?: boolean;
}
interface BrowserLockSnapshot {
  held?: Array<{ name?: string | null }>;
}
interface BrowserLocks {
  request<T>(
    name: string,
    options: { mode: "exclusive" },
    callback: () => T | PromiseLike<T>,
  ): Promise<T>;
  query(): Promise<BrowserLockSnapshot>;
}
export interface ProviderSubmissionReservation {
  connection: ProviderConnection;
  assertCurrent: () => ProviderConnection;
  healthUnchanged: () => boolean;
  release: () => void | Promise<void>;
}
const endpoint = (value: string | undefined) => value?.replace(/\/$/, "");
// All connections share one registry record, so its lease writes use one mutex.
const REGISTRY_LOCK = "kk-studio:provider-registry-leases";
const leasePrefix = (id: string) =>
  `kk-studio:provider-slot:${encodeURIComponent(id)}:`;
function locksOrThrow(): BrowserLocks {
  if (
    typeof navigator === "undefined" ||
    !navigator.locks?.request ||
    !navigator.locks?.query
  )
    throw new ProviderSubmissionError(
      "当前浏览器不支持安全的连接租约协调，本次未提交；请更新浏览器后重试。",
    );
  return navigator.locks as unknown as BrowserLocks;
}

/** Local BYOK image endpoint only; other adapters retain their own contracts. */
export function assertSubmissionConnection(
  binding: SubmissionBinding,
  options: SubmissionOptions = {},
): ProviderConnection {
  const connection = readProviderConnections().find(
    (item) => item.id === binding.id,
  );
  if (!connection)
    throw new ProviderSubmissionError(
      "原绑定连接已移除或未登记，请重新配置后创建任务；当前内容已保留。",
    );
  if (
    connection.kind !== "user_byok" ||
    !connection.baseUrl ||
    !connection.credentialRef
  )
    throw new ProviderSubmissionError(
      "此入口只支持已配置凭据的 BYOK 图片连接。",
    );
  if (
    endpoint(connection.baseUrl) !== endpoint(binding.baseUrl) ||
    connection.credentialRef !== binding.credentialRef
  )
    throw new ProviderSubmissionError(
      "绑定连接的地址或凭据身份已变化，请重新确认连接后创建任务。",
    );
  const health =
    options.explicitRetry && connection.state === "degraded"
      ? { ...connection, state: "active" as const }
      : connection;
  if (!isConnectionReady(health)) {
    const reason =
      connection.state === "quarantined"
        ? "连接已隔离，请核对密钥与项目权限后重新配置。"
        : connection.state === "disabled"
          ? "连接已禁用。"
          : connection.state === "degraded"
            ? "连接暂不可用，请在原任务中显式重试，或检查连接。"
            : "连接仍在冷却，请等待冷却结束后重试。";
    throw new ProviderSubmissionError(reason);
  }
  const activeJobs = Math.max(
    0,
    (connection.activeJobs ?? 0) - (options.ownSlot ? 1 : 0),
  );
  if (!options.skipCapacity && activeJobs >= connection.concurrencyLimit)
    throw new ProviderSubmissionError(
      "连接并发已满，请等待当前任务结束后重试。",
    );
  if (
    !connection.capabilities.modalities.includes("image") ||
    !connection.capabilities.operations.includes(
      binding.referenceCount ? "edit" : "generate",
    ) ||
    (connection.capabilities.maxReferences !== undefined &&
      binding.referenceCount > connection.capabilities.maxReferences)
  )
    throw new ProviderSubmissionError(
      "连接不支持本次图片操作或参考图数量，请选择支持的连接。",
    );
  return connection;
}

/** Credentials can await a vault; always re-read the binding afterward. */
export async function selectSubmissionConnection(
  referenceCount: number,
): Promise<ProviderConnection> {
  const candidates = readProviderConnections().sort(
    (a, b) =>
      (a.activeJobs ?? 0) / a.concurrencyLimit -
      (b.activeJobs ?? 0) / b.concurrencyLimit,
  );
  let reason = "没有可用的模型连接；请配置连接后重试，当前草稿已保留。";
  for (const candidate of candidates) {
    const binding = {
      id: candidate.id,
      baseUrl: candidate.baseUrl,
      credentialRef: candidate.credentialRef,
      referenceCount,
    };
    try {
      assertSubmissionConnection(binding);
      if (!(await hasApiKey(candidate.baseUrl!, candidate.credentialRef)))
        continue;
      return assertSubmissionConnection(binding);
    } catch (error) {
      if (error instanceof ProviderSubmissionError) reason = error.message;
    }
  }
  throw new ProviderSubmissionError(reason);
}

/** Compatibility helper for non-UI callers; the UI uses the coordinated API below. */
export function reserveProviderSubmission(
  binding: SubmissionBinding,
  options: SubmissionOptions = {},
): ProviderSubmissionReservation {
  const connection = assertSubmissionConnection(binding, options);
  const leaseId =
    globalThis.crypto?.randomUUID?.() ?? `lease-${Date.now()}-${Math.random()}`;
  updateProviderConnection(connection.id, (item) => ({
    ...item,
    activeJobs: (item.activeJobs ?? 0) + 1,
    activeLeaseIds: [...(item.activeLeaseIds ?? []), leaseId],
  }));
  const persisted = readProviderConnections().find(
    (item) => item.id === connection.id,
  );
  if (!persisted?.activeLeaseIds?.includes(leaseId))
    throw new ProviderSubmissionError(
      "无法保存连接占用状态，本次未提交，请检查浏览器存储权限。",
    );
  let released = false;
  const assertCurrent = () => {
    const current = assertSubmissionConnection(binding, {
      ...options,
      skipCapacity: true,
    });
    if (released || !current.activeLeaseIds?.includes(leaseId))
      throw new ProviderSubmissionError(
        "当前连接占用已失效，剩余输出未提交，请重新确认连接。",
      );
    return current;
  };
  return {
    connection,
    assertCurrent,
    healthUnchanged: () => {
      try {
        const current = assertCurrent();
        return (
          current.state === connection.state &&
          current.cooldownUntil === connection.cooldownUntil &&
          current.lastHealthCheckAt === connection.lastHealthCheckAt &&
          current.healthRevision === connection.healthRevision
        );
      } catch {
        return false;
      }
    },
    release: () => {
      if (!released) {
        released = true;
        releaseProviderLease(connection.id, leaseId);
      }
    },
  };
}

/** Holds a real browser lock until release or document termination, never a TTL. */
export async function reserveProviderSubmissionAsync(
  binding: SubmissionBinding,
  options: SubmissionOptions = {},
): Promise<ProviderSubmissionReservation> {
  const locks = locksOrThrow();
  return locks.request(REGISTRY_LOCK, { mode: "exclusive" }, async () => {
    const initial = assertSubmissionConnection(binding, {
      ...options,
      skipCapacity: true,
    });
    const prefix = leasePrefix(initial.id);
    const snapshot = await locks.query();
    const activeLeaseIds = (snapshot.held ?? []).flatMap((lock) =>
      lock.name?.startsWith(prefix) ? [lock.name.slice(prefix.length)] : [],
    );
    const connection = assertSubmissionConnection(binding, {
      ...options,
      skipCapacity: true,
    });
    // A legacy record without lease IDs cannot be proven orphaned. Keep its
    // occupied count conservatively; records with IDs are reconciled from live
    // Web Locks and therefore can be safely reclaimed after a crash.
    const legacyActiveJobs =
      (connection.activeLeaseIds?.length ?? 0) === 0
        ? (connection.activeJobs ?? 0)
        : 0;
    const occupied = Math.max(activeLeaseIds.length, legacyActiveJobs);
    if (occupied >= connection.concurrencyLimit)
      throw new ProviderSubmissionError(
        "连接并发已满，请等待当前任务结束后重试。",
      );
    const leaseId =
      globalThis.crypto?.randomUUID?.() ??
      `lease-${Date.now()}-${Math.random()}`;
    let endHold!: () => void;
    let acquired!: () => void;
    let rejectAcquired!: (reason: unknown) => void;
    const hold = new Promise<void>((resolve) => {
      endHold = resolve;
    });
    const ready = new Promise<void>((resolve, reject) => {
      acquired = resolve;
      rejectAcquired = reject;
    });
    const finished = locks.request(
      prefix + leaseId,
      { mode: "exclusive" },
      async () => {
        acquired();
        await hold;
      },
    );
    void finished.catch(rejectAcquired);
    await ready;
    try {
      // Reconcile orphaned legacy/crashed-tab metadata from the browser's live locks.
      updateProviderConnection(connection.id, (item) => ({
        ...item,
        activeJobs: occupied + 1,
        activeLeaseIds: [...activeLeaseIds, leaseId],
      }));
      const persisted = readProviderConnections().find(
        (item) => item.id === connection.id,
      );
      if (!persisted?.activeLeaseIds?.includes(leaseId))
        throw new ProviderSubmissionError(
          "无法保存连接占用状态，本次未提交，请检查浏览器存储权限。",
        );
      assertSubmissionConnection(binding, { ...options, skipCapacity: true });
    } catch (error) {
      endHold();
      await finished;
      throw error;
    }
    let released = false;
    let releasePromise: Promise<void> | undefined;
    const assertCurrent = () => {
      const current = assertSubmissionConnection(binding, {
        ...options,
        skipCapacity: true,
      });
      if (released || !current.activeLeaseIds?.includes(leaseId))
        throw new ProviderSubmissionError(
          "当前连接占用已失效，剩余输出未提交，请重新确认连接。",
        );
      return current;
    };
    return {
      connection,
      assertCurrent,
      healthUnchanged: () => {
        try {
          const current = assertCurrent();
          return (
            current.state === connection.state &&
            current.cooldownUntil === connection.cooldownUntil &&
            current.lastHealthCheckAt === connection.lastHealthCheckAt &&
            current.healthRevision === connection.healthRevision
          );
        } catch {
          return false;
        }
      },
      release: () => {
        releasePromise ??= locks.request(
          REGISTRY_LOCK,
          { mode: "exclusive" },
          async () => {
            released = true;
            try {
              releaseProviderLease(connection.id, leaseId);
            } finally {
              endHold();
              await finished;
            }
          },
        );
        return releasePromise;
      },
    };
  });
}
