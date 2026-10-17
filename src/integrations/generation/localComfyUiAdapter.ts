import type { ProviderConnection } from "../../domain/providerConnections.ts";
import type {
  CostEstimate,
  GenerationProviderAdapter,
  GenerationRequest,
  ProviderResult,
  SubmittedGenerationJob,
} from "./providerAdapter.ts";
import { ProviderAdapterError } from "./providerAdapter.ts";

export interface ComfyUiOutputItem {
  filename?: unknown;
  subfolder?: unknown;
  type?: unknown;
}

export interface ComfyUiNodeOutput {
  images?: ComfyUiOutputItem[];
  videos?: ComfyUiOutputItem[];
  [key: string]: unknown;
}

export interface ComfyUiHistoryEntry {
  outputs?: Record<string, ComfyUiNodeOutput>;
  [key: string]: unknown;
}

function resolveOutputItem(
  item: ComfyUiOutputItem,
  isVideoArray: boolean,
  providerJobId: string,
  base: string,
  index: number,
): ProviderResult | null {
  if (typeof item.filename !== "string" || !item.filename) return null;
  const filename = item.filename;
  const subfolder = typeof item.subfolder === "string" ? item.subfolder : "";
  const type = typeof item.type === "string" ? item.type : "output";
  const params = new URLSearchParams({
    filename,
    subfolder,
    type,
  });
  const url = `${base}/view?${params.toString()}`;
  const lower = filename.toLowerCase();

  if (lower.endsWith(".mp4")) {
    return {
      providerJobId,
      url,
      mime: "video/mp4",
      kind: "video",
      index,
    };
  }
  if (lower.endsWith(".webm")) {
    return {
      providerJobId,
      url,
      mime: "video/webm",
      kind: "video",
      index,
    };
  }
  if (isVideoArray) {
    return {
      providerJobId,
      url,
      mime: "video/mp4",
      kind: "video",
      index,
    };
  }

  const mime = lower.endsWith(".webp")
    ? "image/webp"
    : lower.endsWith(".jpg") || lower.endsWith(".jpeg")
      ? "image/jpeg"
      : "image/png";

  return {
    providerJobId,
    url,
    mime,
    kind: "image",
    index,
  };
}

export function extractComfyUiOutputs(
  outputs: Record<string, ComfyUiNodeOutput> | undefined,
  providerJobId: string,
  base: string,
): ProviderResult[] {
  if (!outputs) return [];
  const results: ProviderResult[] = [];
  let index = 0;

  for (const nodeOutput of Object.values(outputs)) {
    if (Array.isArray(nodeOutput.images)) {
      for (const item of nodeOutput.images) {
        const res = resolveOutputItem(item, false, providerJobId, base, index);
        if (res) {
          results.push(res);
          index++;
        }
      }
    }
    if (Array.isArray(nodeOutput.videos)) {
      for (const item of nodeOutput.videos) {
        const res = resolveOutputItem(item, true, providerJobId, base, index);
        if (res) {
          results.push(res);
          index++;
        }
      }
    }
  }

  return results;
}

function baseUrl(connection: ProviderConnection): string {
  return (connection.baseUrl ?? "http://127.0.0.1:8188").replace(/\/$/, "");
}

async function responseError(
  response: Response,
  label: string,
): Promise<ProviderAdapterError> {
  let detail = "";
  try {
    detail = (await response.text()).slice(0, 200);
  } catch {
    /* response bodies are not logged */
  }
  const failureClass =
    response.status === 401
      ? "unauthorized"
      : response.status === 403 && /invalid[_ -]?scope/i.test(detail)
        ? "invalid_scope"
        : response.status === 403 &&
            /disabled.*project|project.*disabled/i.test(detail)
          ? "project_disabled"
          : response.status === 403
            ? "forbidden"
            : response.status === 429
              ? "rate_limited"
              : response.status >= 500
                ? "provider_unavailable"
                : "invalid_request";
  const retryAfter = Number(response.headers.get("Retry-After") ?? "");
  return new ProviderAdapterError(`${label}（HTTP ${response.status}）。`, {
    status: response.status,
    failureClass,
    retryAfterSeconds:
      Number.isFinite(retryAfter) && retryAfter >= 0 ? retryAfter : undefined,
    retryable:
      failureClass === "rate_limited" ||
      failureClass === "provider_unavailable",
  });
}

/** Local ComfyUI HTTP adapter. It requires a workflow produced by the workflow editor. */
export class LocalComfyUiAdapter implements GenerationProviderAdapter {
  readonly connection: ProviderConnection;

  constructor(connection: ProviderConnection) {
    this.connection = connection;
  }

  async discoverCapabilities() {
    return this.connection.capabilities;
  }

  async estimate(request: GenerationRequest): Promise<CostEstimate> {
    return {
      currency: "local",
      minimumUnits: request.requestedOutputs,
      maximumUnits: request.requestedOutputs,
      billingMode: "free",
    };
  }

  async submit(request: GenerationRequest): Promise<SubmittedGenerationJob> {
    if (!request.workflow)
      throw new Error("请先在 ComfyUI 工作流编辑器中提供可执行工作流。");
    const response = await fetch(`${baseUrl(this.connection)}/prompt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        prompt: request.workflow,
        client_id: request.idempotencyKey,
      }),
      credentials: "omit",
      redirect: "error",
      signal: request.signal,
    });
    if (!response.ok) throw await responseError(response, "ComfyUI 提交失败");
    const payload = (await response.json()) as { prompt_id?: unknown };
    if (typeof payload.prompt_id !== "string" || !payload.prompt_id)
      throw new Error("ComfyUI 没有返回任务标识。");
    return {
      providerJobId: payload.prompt_id,
      async: true,
      status: "queued",
    };
  }

  async getStatus(
    providerJobId: string,
    signal?: AbortSignal,
  ): Promise<SubmittedGenerationJob> {
    const response = await fetch(
      `${baseUrl(this.connection)}/history/${encodeURIComponent(providerJobId)}`,
      {
        headers: { Accept: "application/json" },
        credentials: "omit",
        redirect: "error",
        signal,
      },
    );
    if (!response.ok) throw await responseError(response, "ComfyUI 查询失败");
    const payload = (await response.json()) as Record<
      string,
      ComfyUiHistoryEntry
    >;
    const entry = payload[providerJobId];
    return {
      providerJobId,
      async: true,
      status: entry?.outputs ? "succeeded" : "running",
    };
  }

  async cancel(providerJobId: string, signal?: AbortSignal): Promise<void> {
    // Send targeted /queue delete request specifying the exact prompt_id
    const queueResponse = await fetch(`${baseUrl(this.connection)}/queue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ delete: [providerJobId] }),
      credentials: "omit",
      redirect: "error",
      signal,
    });
    if (!queueResponse.ok)
      throw await responseError(queueResponse, "ComfyUI 队列删除失败");

    // Call /interrupt for the running prompt ID
    const interruptResponse = await fetch(
      `${baseUrl(this.connection)}/interrupt`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ prompt_id: providerJobId }),
        credentials: "omit",
        redirect: "error",
        signal,
      },
    );
    if (!interruptResponse.ok)
      throw await responseError(interruptResponse, "ComfyUI 中断执行失败");
  }

  async pollHistory(
    providerJobId: string,
    signal?: AbortSignal,
  ): Promise<ProviderResult[]> {
    const response = await fetch(
      `${baseUrl(this.connection)}/history/${encodeURIComponent(providerJobId)}`,
      {
        headers: { Accept: "application/json" },
        credentials: "omit",
        redirect: "error",
        signal,
      },
    );
    if (!response.ok)
      throw await responseError(response, "ComfyUI 结果查询失败");
    const payload = (await response.json()) as Record<
      string,
      ComfyUiHistoryEntry
    >;
    return extractComfyUiOutputs(
      payload[providerJobId]?.outputs,
      providerJobId,
      baseUrl(this.connection),
    );
  }

  async listResults(
    providerJobId: string,
    signal?: AbortSignal,
  ): Promise<ProviderResult[]> {
    return this.pollHistory(providerJobId, signal);
  }
}
