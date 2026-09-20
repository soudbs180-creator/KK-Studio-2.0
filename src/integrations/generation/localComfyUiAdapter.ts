import type { ProviderConnection } from "../../domain/providerConnections.ts";
import type {
  CostEstimate,
  GenerationProviderAdapter,
  GenerationRequest,
  ProviderResult,
  SubmittedGenerationJob,
} from "./providerAdapter.ts";
import { ProviderAdapterError } from "./providerAdapter.ts";

interface HistoryEntry {
  outputs?: Record<
    string,
    {
      images?: Array<{
        filename?: unknown;
        subfolder?: unknown;
        type?: unknown;
      }>;
    }
  >;
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
    const payload = (await response.json()) as Record<string, HistoryEntry>;
    const entry = payload[providerJobId];
    return {
      providerJobId,
      async: true,
      status: entry?.outputs ? "succeeded" : "running",
    };
  }

  async cancel(providerJobId: string, signal?: AbortSignal): Promise<void> {
    const response = await fetch(`${baseUrl(this.connection)}/interrupt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt_id: providerJobId }),
      credentials: "omit",
      redirect: "error",
      signal,
    });
    if (!response.ok) throw await responseError(response, "ComfyUI 取消失败");
  }

  async listResults(
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
    const payload = (await response.json()) as Record<string, HistoryEntry>;
    const images = Object.values(payload[providerJobId]?.outputs ?? {}).flatMap(
      (output) => output.images ?? [],
    );
    return images.flatMap((image, index) => {
      if (typeof image.filename !== "string") return [];
      const params = new URLSearchParams({
        filename: image.filename,
        subfolder: typeof image.subfolder === "string" ? image.subfolder : "",
        type: typeof image.type === "string" ? image.type : "output",
      });
      return [
        {
          providerJobId,
          url: `${baseUrl(this.connection)}/view?${params.toString()}`,
          mime: "image/png",
          index,
        },
      ];
    });
  }
}
