import { invoke } from "@tauri-apps/api/core";
import type { ProviderProtocol } from "../domain/modelProvider.ts";

/** Only the explicitly keyless loopback discovery path uses this IPC. */
export async function readNativeModelPage(
  url: URL,
  protocol: ProviderProtocol,
  signal: AbortSignal,
): Promise<Response> {
  signal.throwIfAborted();
  const requestId = `model-page-${crypto.randomUUID()}`;
  const abort = () => {
    void invoke("provider_models_cancel", { requestId }).catch(() => undefined);
  };
  signal.addEventListener("abort", abort, { once: true });
  try {
    const page = await invoke<{ status: number; body: string }>(
      "provider_models_read",
      { requestId, url: url.toString(), protocol },
    );
    signal.throwIfAborted();
    return new Response(page.status === 204 ? null : page.body, {
      status: page.status,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    signal.removeEventListener("abort", abort);
  }
}
