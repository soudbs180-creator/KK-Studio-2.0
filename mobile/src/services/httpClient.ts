import type { CreationSubmissionState } from "@kk-studio/creation-contracts";
import type { ImageReceipt } from "./providerTypes.ts";
export interface HttpOptions {
  baseUrl?: string;
  allowLoopbackHttp?: boolean;
  timeoutMs?: number;
  fetch?: typeof fetch;
}
export class ServiceError extends Error {
  code: string;
  status?: number;
  submissionState: CreationSubmissionState;
  providerRequestId?: string;
  recoveryReceipt?: ImageReceipt;
  /** Set only for an HTTP rejection of the generation submit endpoint itself. */
  rejectedBeforeAcceptance = false;
  constructor(
    code: string,
    state: CreationSubmissionState = "intent",
    status?: number,
  ) {
    super(code);
    this.code = code;
    this.submissionState = state;
    this.status = status;
  }
}
export function checkedUrl(value: string, allowLoopbackHttp = false): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ServiceError("INVALID_SERVICE_URL");
  }
  if (url.username || url.password || url.search || url.hash)
    throw new ServiceError("INVALID_SERVICE_URL");
  if (
    url.protocol !== "https:" &&
    !(
      allowLoopbackHttp &&
      url.protocol === "http:" &&
      ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
    )
  )
    throw new ServiceError("HTTPS_REQUIRED");
  return url;
}
export async function withHttp<T>(
  options: HttpOptions,
  signal: AbortSignal | undefined,
  action: (fetcher: typeof fetch, requestSignal: AbortSignal) => Promise<T>,
): Promise<T> {
  if (signal?.aborted) throw new ServiceError("CANCELLED_BEFORE_SUBMISSION");
  const timeout = options.timeoutMs ?? 60_000;
  if (!Number.isFinite(timeout) || timeout < 1 || timeout > 300_000)
    throw new ServiceError("INVALID_TIMEOUT");
  const controller = new AbortController();
  let rejectAbort: (error: Error) => void = () => undefined;
  const aborted = new Promise<never>((_resolve, reject) => {
    rejectAbort = reject;
  });
  const abort = () => {
    controller.abort();
    rejectAbort(new ServiceError("REQUEST_ABORTED"));
  };
  signal?.addEventListener("abort", abort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
    rejectAbort(new ServiceError("REQUEST_TIMEOUT"));
  }, timeout);
  try {
    return await Promise.race([
      action(options.fetch ?? fetch, controller.signal),
      aborted,
    ]);
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(
      timedOut
        ? "REQUEST_TIMEOUT"
        : signal?.aborted
          ? "REQUEST_ABORTED"
          : "NETWORK_OR_PROTOCOL_ERROR",
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
/** Signed asset queries remain request-local and are never returned in a receipt. */
export function checkedAssetUrl(value: string, allowLoopbackHttp = false): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ServiceError("INVALID_ASSET_URL");
  }
  const query = url.search;
  url.search = "";
  checkedUrl(url.toString(), allowLoopbackHttp);
  url.search = query;
  return url;
}
export function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
export function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 1024;
}
export async function readBytes(
  response: Response,
  maximum: number,
): Promise<Uint8Array> {
  const declared = Number(response.headers.get("content-length"));
  if (declared > maximum) throw new ServiceError("RESPONSE_TOO_LARGE");
  if (!response.body?.getReader) {
    // Content-Length is untrusted; buffering first cannot enforce a memory bound.
    throw new ServiceError("BOUNDED_RESPONSE_UNAVAILABLE");
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const item = await reader.read();
      if (item.done) break;
      size += item.value.length;
      if (size > maximum) throw new ServiceError("RESPONSE_TOO_LARGE");
      chunks.push(item.value);
    }
    const output = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      output.set(chunk, offset);
      offset += chunk.length;
    }
    return output;
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
export async function readJson(
  response: Response,
  maximum = 1024 * 1024,
): Promise<unknown> {
  if (
    response.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  )
    throw new ServiceError("JSON_RESPONSE_REQUIRED");
  try {
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        await readBytes(response, maximum),
      ),
    ) as unknown;
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError("INVALID_JSON_RESPONSE");
  }
}
export function requireOk(response: Response) {
  if (!response.ok)
    throw new ServiceError(
      response.status === 401 ? "AUTH_REQUIRED" : "HTTP_ERROR",
      "terminal",
      response.status,
    );
}
export function requireSubmissionOk(response: Response) {
  try {
    requireOk(response);
  } catch (error) {
    if (
      error instanceof ServiceError &&
      [400, 401, 403, 404, 422].includes(response.status)
    )
      error.rejectedBeforeAcceptance = true;
    throw error;
  }
}
