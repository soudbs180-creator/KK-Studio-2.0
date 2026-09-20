import { z } from "zod";
/** Public DTOs contain owned asset routes only. Provider credentials and provider URLs never enter this API. */
const outputSchema = z
  .object({
    index: z.number().int().min(0).max(99),
    status: z.string(),
    assetId: z
      .string()
      .regex(/^asset-[a-f0-9]{64}$/)
      .optional(),
    assetRoute: z
      .string()
      .regex(/^\/v1\/assets\/asset-[a-f0-9]{64}$/)
      .optional(),
    errorClass: z.string().optional(),
  })
  .strict();
const jobSchema = z
  .object({
    id: z.string(),
    status: z.string(),
    requestedOutputs: z.number().int().min(1).max(100),
    completedOutputs: z.number().int().min(0).max(100),
    outputs: z.array(outputSchema).max(100),
  })
  .strict();
export type GatewayJob = z.infer<typeof jobSchema>;
export interface JobSubmission {
  connectionId: string;
  idempotencyKey: string;
  model: string;
  prompt: string;
  privacyMode: "local_only" | "byok_local" | "platform_backed";
  requestedOutputs: number;
  attachments?: Array<{
    id: string;
    name: string;
    mime: string;
    size: number;
    dataUrl?: string;
  }>;
  workflow?: Record<string, unknown>;
}
export class GenerationJobClient {
  readonly baseUrl: string;
  constructor(baseUrl: string) {
    const u = new URL(baseUrl);
    if (
      !["http:", "https:"].includes(u.protocol) ||
      u.username ||
      u.password ||
      u.search ||
      u.hash
    )
      throw new Error("INVALID_GATEWAY_URL");
    this.baseUrl = u.href.replace(/\/$/, "");
  }
  private async request(
    path: string,
    method = "GET",
    body?: unknown,
    idempotencyKey?: string,
  ): Promise<unknown> {
    const response = await fetch(this.baseUrl + path, {
      method,
      credentials: "include",
      redirect: "error",
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`GATEWAY_HTTP_${response.status}`);
    return response.json();
  }
  async submit(input: JobSubmission) {
    return jobSchema.parse(
      await this.request("/v1/jobs", "POST", input, input.idempotencyKey),
    );
  }
  async get(id: string) {
    return jobSchema.parse(
      await this.request("/v1/jobs/" + encodeURIComponent(id)),
    );
  }
  async list() {
    return z.array(jobSchema).parse(await this.request("/v1/jobs"));
  }
  async cancel(id: string) {
    return jobSchema.parse(
      await this.request(
        "/v1/jobs/" + encodeURIComponent(id) + "/cancel",
        "POST",
        {},
      ),
    );
  }
  async retry(id: string, indices: number[]) {
    return jobSchema.parse(
      await this.request(
        "/v1/jobs/" + encodeURIComponent(id) + "/retry",
        "POST",
        { indices },
      ),
    );
  }
  assetUrl(assetId: string) {
    if (!/^asset-[a-f0-9]{64}$/.test(assetId))
      throw new Error("INVALID_ASSET_ID");
    return this.baseUrl + "/v1/assets/" + assetId;
  }
}
