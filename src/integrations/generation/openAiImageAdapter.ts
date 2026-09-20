import type { ProviderConnection } from "../../domain/providerConnections.ts";
import { generateImages } from "../../features/creation/imageGeneration.ts";
import {
  type CostEstimate,
  type GenerationProviderAdapter,
  type GenerationRequest,
  type ProviderResult,
  type SubmittedGenerationJob,
} from "./providerAdapter.ts";

/**
 * Official OpenAI Images compatible adapter.
 *
 * The browser app still uses the existing direct BYOK path today. This adapter
 * gives the future queue worker the same contract without exposing a key or a
 * provider URL to the canvas layer. It deliberately keeps completed results
 * in memory until the worker archives them.
 */
export class OpenAiImageAdapter implements GenerationProviderAdapter {
  readonly connection: ProviderConnection;
  private readonly results = new Map<string, string[]>();
  private readonly cancelled = new Set<string>();

  constructor(connection: ProviderConnection) {
    this.connection = connection;
  }

  async discoverCapabilities(): Promise<ProviderConnection["capabilities"]> {
    return this.connection.capabilities;
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
    const providerJobId = `openai-${request.idempotencyKey}`;
    if (this.cancelled.has(providerJobId))
      return { providerJobId, async: false, status: "failed" };
    const values = await generateImages({
      prompt: request.prompt,
      model: request.model,
      attachments: request.attachments,
      signal: request.signal,
      providerBaseUrl: this.connection.baseUrl,
      credentialRef: this.connection.credentialRef,
      count: request.requestedOutputs,
      idempotencyKey: request.idempotencyKey,
    });
    this.results.set(providerJobId, values.sources);
    return {
      providerJobId,
      async: false,
      status: "succeeded",
    };
  }

  async getStatus(providerJobId: string): Promise<SubmittedGenerationJob> {
    return {
      providerJobId,
      async: false,
      status: this.results.has(providerJobId) ? "succeeded" : "failed",
    };
  }

  async cancel(providerJobId: string): Promise<void> {
    this.cancelled.add(providerJobId);
    this.results.delete(providerJobId);
  }

  async listResults(providerJobId: string): Promise<ProviderResult[]> {
    return (this.results.get(providerJobId) ?? []).map((source, index) =>
      source.startsWith("data:")
        ? {
            providerJobId,
            b64Json: source.split(",", 2)[1],
            mime: "image/png",
            index,
          }
        : { providerJobId, url: source, index },
    );
  }
}
