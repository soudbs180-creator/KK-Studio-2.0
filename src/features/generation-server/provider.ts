import { createHash } from "node:crypto";
import {
  providerConnectionSchema,
  type ProviderConnection,
} from "../../domain/providerConnections.ts";
import {
  ProviderAdapterError,
  type GenerationProviderAdapter,
  type GenerationRequest,
  type ProviderResult,
  type SubmittedGenerationJob,
} from "../../integrations/generation/providerAdapter.ts";
import { rejectSecrets } from "./types.ts";
export class HostProviderError extends ProviderAdapterError {
  readonly uncertain: boolean;
  constructor(
    failureClass: ProviderAdapterError["failureClass"],
    options: {
      status?: number;
      retryable?: boolean;
      retryAfterSeconds?: number;
      uncertain?: boolean;
    } = {},
  ) {
    super("PROVIDER_" + failureClass.toUpperCase(), {
      failureClass,
      status: options.status,
      retryable: options.retryable ?? false,
      retryAfterSeconds: options.retryAfterSeconds,
    });
    this.uncertain = options.uncertain ?? false;
  }
}
const invalid = (uncertain = false): never => {
  throw new HostProviderError("invalid_request", { uncertain });
};
const key = (id: string) => createHash("sha256").update(id).digest("hex");
const providerId = (value: unknown): string => {
  if (typeof value !== "string" || !/^[A-Za-z0-9:_-]{1,240}$/.test(value))
    invalid(true);
  return value as string;
};
const base64 = (value: unknown): string => {
  if (
    typeof value !== "string" ||
    !value.length ||
    value.length > 140000000 ||
    value.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(value)
  )
    invalid(true);
  return value as string;
};
type Json = Record<string, unknown>;
const object = (value: unknown): Json =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Json)
    : {};
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
class HostAdapter implements GenerationProviderAdapter {
  readonly connection: ProviderConnection;
  private readonly base: string;
  private readonly resolveCredential: (
    ref: string,
  ) => Promise<string | undefined>;
  private readonly synchronous = new Map<string, ProviderResult>();
  constructor(
    connection: ProviderConnection,
    resolveCredential: (ref: string) => Promise<string | undefined>,
  ) {
    this.connection = connection;
    this.base = connection.baseUrl!.replace(/\/$/, "");
    this.resolveCredential = resolveCredential;
  }
  async discoverCapabilities() {
    return this.connection.capabilities;
  }
  async estimate() {
    return {
      currency: "output",
      minimumUnits: 1,
      maximumUnits: 1,
      billingMode: "unknown" as const,
    };
  }
  private get comfy() {
    return this.connection.kind === "local_comfyui";
  }
  private get gemini() {
    return /gemini|google/i.test(this.connection.provider);
  }
  private async headers() {
    if (this.comfy) return {};
    let value: string | undefined;
    try {
      value = this.connection.credentialRef
        ? await this.resolveCredential(this.connection.credentialRef)
        : undefined;
    } catch {
      throw new HostProviderError("unauthorized");
    }
    if (!value || /[\r\n]/.test(value))
      throw new HostProviderError("unauthorized");
    return this.gemini
      ? { "x-goog-api-key": value }
      : { Authorization: "Bearer " + value };
  }
  private async request(
    path: string,
    init: RequestInit,
    submitting = false,
    empty = false,
  ): Promise<Json> {
    let response: Response;
    try {
      response = await fetch(this.base + path, {
        ...init,
        redirect: "error",
        credentials: "omit",
        signal: init.signal ?? AbortSignal.timeout(110000),
      });
    } catch {
      throw new HostProviderError("network", {
        uncertain: submitting,
        retryable: !submitting,
      });
    }
    let raw = "";
    try {
      const reader = response.body?.getReader();
      if (reader) {
        const chunks: Uint8Array[] = [];
        let size = 0;
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.length;
            if (size > (response.ok ? 140000000 : 65536)) break;
            chunks.push(value);
          }
          raw = Buffer.concat(chunks).toString("utf8");
        } finally {
          await reader.cancel().catch(() => {});
        }
      }
    } catch {
      throw new HostProviderError("network", {
        uncertain: submitting,
        retryable: !submitting,
      });
    }
    if (!response.ok) {
      const failureClass: ProviderAdapterError["failureClass"] =
        /invalid[_ ]scope|insufficient.*scope/i.test(raw)
          ? "invalid_scope"
          : /project[_ ]disabled|project.*(?:disabled|suspended)/i.test(raw)
            ? "project_disabled"
            : response.status === 401
              ? "unauthorized"
              : response.status === 403
                ? "forbidden"
                : response.status === 429
                  ? "rate_limited"
                  : response.status >= 500
                    ? "provider_unavailable"
                    : "invalid_request";
      const header = response.headers.get("retry-after");
      const seconds = header
        ? /^\d+(?:\.\d+)?$/.test(header)
          ? Number(header)
          : Math.max(0, (Date.parse(header) - Date.now()) / 1000)
        : undefined;
      throw new HostProviderError(failureClass, {
        status: response.status,
        retryable:
          failureClass === "rate_limited" ||
          failureClass === "provider_unavailable",
        retryAfterSeconds: Number.isFinite(seconds) ? seconds : undefined,
      });
    }
    if (empty) return {};
    try {
      const result = JSON.parse(raw);
      if (!result || typeof result !== "object" || Array.isArray(result))
        invalid(submitting);
      return result as Json;
    } catch {
      return invalid(submitting);
    }
  }
  private references(request: GenerationRequest) {
    return request.attachments.map((attachment) => {
      const match = attachment.dataUrl?.match(
        /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/,
      );
      const mime = match?.[1];
      const data = match?.[2];
      if (!mime || !data || mime !== attachment.mime || data.length > 14000000)
        invalid();
      return { mime: mime!, data: base64(data!) };
    });
  }
  async submit(request: GenerationRequest): Promise<SubmittedGenerationJob> {
    if (
      request.requestedOutputs !== 1 ||
      !request.model.trim() ||
      !request.prompt.trim()
    )
      invalid();
    try {
      rejectSecrets({ prompt: request.prompt, workflow: request.workflow });
    } catch {
      invalid();
    }
    const headers = await this.headers();
    const identity = key(request.idempotencyKey);
    if (this.comfy) {
      if (!request.workflow) invalid();
      const payload = await this.request(
        "/prompt",
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
            "Idempotency-Key": identity,
          } as unknown as HeadersInit,
          body: JSON.stringify({
            prompt: request.workflow,
            client_id: identity,
          }),
          signal: request.signal,
        },
        true,
      );
      return {
        providerJobId: providerId(payload.prompt_id),
        async: true,
        status: "queued",
      };
    }
    const refs = this.references(request);
    let payload: Json;
    if (this.gemini) {
      payload = await this.request(
        `/models/${encodeURIComponent(request.model)}:generateContent`,
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
            "Idempotency-Key": identity,
          } as unknown as HeadersInit,
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: request.prompt },
                  ...refs.map((ref) => ({
                    inlineData: { mimeType: ref.mime, data: ref.data },
                  })),
                ],
              },
            ],
            generationConfig: {
              responseModalities: ["IMAGE"],
              candidateCount: 1,
            },
          }),
          signal: request.signal,
        },
        true,
      );
    } else if (refs.length) {
      const form = new FormData();
      form.set("model", request.model);
      form.set("prompt", request.prompt);
      form.set("n", "1");
      for (const [index, ref] of refs.entries())
        form.append(
          "image[]",
          new Blob([Buffer.from(ref.data, "base64")], { type: ref.mime }),
          `reference-${index}.png`,
        );
      payload = await this.request(
        "/images/edits",
        {
          method: "POST",
          headers: {
            ...headers,
            "Idempotency-Key": identity,
          } as unknown as HeadersInit,
          body: form,
          signal: request.signal,
        },
        true,
      );
    } else
      payload = await this.request(
        "/images/generations",
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
            "Idempotency-Key": identity,
          } as unknown as HeadersInit,
          body: JSON.stringify({
            model: request.model,
            prompt: request.prompt,
            n: 1,
          }),
          signal: request.signal,
        },
        true,
      );
    const id = "sync-" + identity;
    let result: ProviderResult;
    if (this.gemini) {
      const candidate = object(list(payload.candidates)[0]);
      const parts = list(object(candidate.content).parts);
      const inline = object(
        object(parts.find((part) => object(part).inlineData)).inlineData,
      );
      result = {
        providerJobId: id,
        index: 0,
        b64Json: base64(inline.data),
        mime:
          typeof inline.mimeType === "string" ? inline.mimeType : "image/png",
      };
    } else {
      const first = object(list(payload.data)[0]);
      if (first.b64_json)
        result = {
          providerJobId: id,
          index: 0,
          b64Json: base64(first.b64_json),
          mime: "image/png",
        };
      else {
        const url = first.url;
        if (typeof url !== "string" || url.length > 8192) return invalid(true);
        try {
          const u = new URL(url);
          if (
            !["http:", "https:"].includes(u.protocol) ||
            u.username ||
            u.password
          )
            invalid(true);
        } catch {
          invalid(true);
        }
        result = {
          providerJobId: id,
          index: 0,
          url,
          mime: "image/png",
        };
      }
    }
    this.synchronous.set(id, result);
    return { providerJobId: id, async: false, status: "succeeded" };
  }
  private async history(id: string, signal?: AbortSignal) {
    providerId(id);
    return (
      await this.request("/history/" + encodeURIComponent(id), {
        headers: { Accept: "application/json" },
        signal,
      })
    )[id] as Json | undefined;
  }
  private status(entry: Json | undefined): SubmittedGenerationJob["status"] {
    const status = object(entry?.status);
    if (
      status.status_str === "error" ||
      list(status.messages).some((m) => list(m)[0] === "execution_error")
    )
      return "failed";
    return status.completed === true && status.status_str === "success"
      ? "succeeded"
      : "running";
  }
  async getStatus(
    id: string,
    signal?: AbortSignal,
  ): Promise<SubmittedGenerationJob> {
    if (this.comfy)
      return {
        providerJobId: id,
        async: true,
        status: this.status(await this.history(id, signal)),
      };
    if (!this.synchronous.has(id)) invalid(true);
    return { providerJobId: id, async: false, status: "succeeded" };
  }
  async listResults(
    id: string,
    signal?: AbortSignal,
  ): Promise<ProviderResult[]> {
    if (!this.comfy) {
      const result = this.synchronous.get(id);
      if (!result) invalid(true);
      return [result!];
    }
    const entry = await this.history(id, signal);
    if (this.status(entry) !== "succeeded") return [];
    const first = object(
      Object.values(object(entry?.outputs)).flatMap((output) =>
        list(object(output).images),
      )[0],
    );
    const filename = first.filename;
    if (typeof filename !== "string") return invalid(true);
    const params = new URLSearchParams({
      filename,
      subfolder: typeof first.subfolder === "string" ? first.subfolder : "",
      type: "output",
    });
    return [
      {
        providerJobId: id,
        index: 0,
        url: this.base + "/view?" + params.toString(),
        mime: "image/png",
      },
    ];
  }
  async cancel(id: string, signal?: AbortSignal) {
    if (!this.comfy) {
      this.synchronous.delete(id);
      return;
    }
    providerId(id);
    await this.request(
      "/queue",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delete: [id] }),
        signal,
      },
      false,
      true,
    );
  }
}
export function createHostAdapter(
  connection: ProviderConnection,
  resolveCredential: (ref: string) => Promise<string | undefined>,
): GenerationProviderAdapter {
  let parsed: ProviderConnection;
  try {
    parsed = providerConnectionSchema.parse(connection);
  } catch {
    invalid();
  }
  if (
    !parsed!.baseUrl ||
    parsed!.kind === "user_oauth_local" ||
    !["active", "degraded"].includes(parsed!.state)
  )
    invalid();
  const u = new URL(parsed!.baseUrl!);
  const local = ["127.0.0.1", "localhost", "[::1]"].includes(u.hostname);
  if (
    parsed!.kind === "local_comfyui"
      ? !local
      : u.protocol !== "https:" && !local
  )
    invalid();
  return new HostAdapter(parsed!, resolveCredential);
}
