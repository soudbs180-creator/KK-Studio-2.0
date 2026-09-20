import type {
  CapabilityManifest,
  ProviderConnection,
} from "../../domain/providerConnections.ts";
import { loadApiKey } from "../../features/creation/providerCredentials.ts";
import type {
  CostEstimate,
  GenerationProviderAdapter,
  GenerationRequest,
  ProviderResult,
  SubmittedGenerationJob,
} from "./providerAdapter.ts";
import { ProviderAdapterError } from "./providerAdapter.ts";

interface GeminiPart {
  inlineData?: { data?: unknown; mimeType?: unknown };
}

async function responseError(
  response: Response,
): Promise<ProviderAdapterError> {
  let detail = "";
  try {
    detail = (await response.text()).slice(0, 400);
  } catch {
    /* no body is retained */
  }
  const lowered = detail.toLowerCase();
  const failureClass =
    response.status === 401
      ? "unauthorized"
      : response.status === 403 && /invalid[_ -]?scope/.test(lowered)
        ? "invalid_scope"
        : response.status === 403 &&
            /project.*(disabled|not found)|disabled.*project/.test(lowered)
          ? "project_disabled"
          : response.status === 403
            ? "forbidden"
            : response.status === 429
              ? "rate_limited"
              : response.status >= 500
                ? "provider_unavailable"
                : "invalid_request";
  const retryAfter = Number(response.headers.get("Retry-After") ?? "");
  return new ProviderAdapterError(
    `Gemini 图片请求失败（HTTP ${response.status}）。`,
    {
      status: response.status,
      failureClass,
      retryAfterSeconds:
        Number.isFinite(retryAfter) && retryAfter >= 0 ? retryAfter : undefined,
      retryable:
        failureClass === "rate_limited" ||
        failureClass === "provider_unavailable",
    },
  );
}

function endpoint(connection: ProviderConnection, model: string): string {
  const base = new URL(
    connection.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta",
  );
  base.pathname = `${base.pathname.replace(/\/$/, "")}/models/${encodeURIComponent(model)}:generateContent`;
  base.search = "";
  base.hash = "";
  return base.toString();
}

function dataUrlToInline(
  dataUrl: string,
): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/i);
  return match ? { mimeType: match[1], data: match[2] } : null;
}

/** Native Gemini image adapter. A response is one generation; the worker repeats it for a batch. */
export class GeminiApiAdapter implements GenerationProviderAdapter {
  readonly connection: ProviderConnection;
  private readonly results = new Map<string, ProviderResult[]>();

  constructor(connection: ProviderConnection) {
    this.connection = connection;
  }

  async discoverCapabilities(): Promise<CapabilityManifest> {
    return {
      modalities: ["image"],
      operations: ["generate", "edit", "inpaint", "outpaint", "batch"],
      maxReferences: 10,
      maxOutputs: 1,
      async: false,
      estimatedLatencyClass: "interactive",
    };
  }

  async estimate(request: GenerationRequest): Promise<CostEstimate> {
    return {
      currency: "USD",
      minimumUnits: request.requestedOutputs,
      maximumUnits: request.requestedOutputs,
      billingMode:
        this.connection.kind === "managed_api" ? "metered" : "unknown",
    };
  }

  async submit(request: GenerationRequest): Promise<SubmittedGenerationJob> {
    const providerJobId = `gemini-${request.idempotencyKey}`;
    const apiKey = await loadApiKey(
      this.connection.baseUrl ??
        "https://generativelanguage.googleapis.com/v1beta",
      this.connection.credentialRef,
    );
    if (!apiKey.trim()) throw new Error("尚未配置 Gemini API Key。");
    const parts: Array<Record<string, unknown>> = [{ text: request.prompt }];
    for (const attachment of request.attachments) {
      if (attachment.dataUrl) {
        const inline = dataUrlToInline(attachment.dataUrl);
        if (inline) parts.push({ inlineData: inline });
      }
    }
    const response = await fetch(endpoint(this.connection, request.model), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-goog-api-key": apiKey.trim(),
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
      credentials: "omit",
      redirect: "error",
      signal: request.signal,
    });
    if (!response.ok) throw await responseError(response);
    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
    };
    const values = (payload.candidates ?? []).flatMap((candidate) =>
      (candidate.content?.parts ?? []).flatMap((part) => {
        const inline = part.inlineData;
        return typeof inline?.data === "string"
          ? [
              {
                providerJobId,
                b64Json: inline.data,
                mime:
                  typeof inline.mimeType === "string"
                    ? inline.mimeType
                    : "image/png",
                index: 0,
              },
            ]
          : [];
      }),
    );
    if (!values.length) throw new Error("Gemini 没有返回图片结果。");
    this.results.set(providerJobId, values);
    return { providerJobId, async: false, status: "succeeded" };
  }

  async getStatus(providerJobId: string): Promise<SubmittedGenerationJob> {
    return {
      providerJobId,
      async: false,
      status: this.results.has(providerJobId) ? "succeeded" : "failed",
    };
  }

  async cancel(providerJobId: string): Promise<void> {
    this.results.delete(providerJobId);
  }

  async listResults(providerJobId: string): Promise<ProviderResult[]> {
    return this.results.get(providerJobId) ?? [];
  }
}
