export const PROVIDER_SAVE_LOCK = "kk-studio:provider-save:v1";

/** Shared-profile browser coordination complements the native all-process lock. */
export async function withProviderStoreLock<T>(
  desktop: boolean,
  run: () => Promise<T>,
): Promise<T> {
  if (!desktop) return run();
  const locks =
    typeof window !== "undefined" ? window.navigator?.locks : undefined;
  if (!locks)
    throw new Error(
      "当前桌面无法协调多窗口安全保存，未修改任何存储；请更新运行环境后重试。",
    );
  return await locks.request(
    PROVIDER_SAVE_LOCK,
    { mode: "exclusive", signal: AbortSignal.timeout(10_000) },
    run,
  );
}
