import type {
  CapabilityManifest,
  ProviderConnection,
} from "../../domain/providerConnections.ts";
import {
  ProviderAdapterError,
  type CostEstimate,
  type GenerationProviderAdapter,
  type GenerationRequest,
  type ProviderResult,
  type SubmittedGenerationJob,
} from "./providerAdapter.ts";

export interface FastVideoRunner {
  generateVideo(input: {
    prompt: string;
    model: string;
    outputPath: string;
    signal: AbortSignal;
  }): Promise<{ path: string; mime: string }>;
}

export interface FastVideoAdapterOptions {
  connection: ProviderConnection;
  /** App-managed output directory; never taken from the user prompt. */
  outputDirectory: string;
  runner?: FastVideoRunner;
  modelId?: string;
}

const DEFAULT_MODEL = "FastVideo/FastWan2.1-T2V-1.3B-Diffusers";

interface PendingJob {
  prompt: string;
  model: string;
  status: SubmittedGenerationJob["status"];
  results: ProviderResult[];
  error?: string;
}

/**
 * Desktop-only optional adapter for hao-ai-lab/FastVideo.
 * Unconfigured runners fail closed with an explicit disable reason.
 */
export class FastVideoAdapter implements GenerationProviderAdapter {
  readonly connection: ProviderConnection;
  readonly #outputDirectory: string;
  readonly #runner?: FastVideoRunner;
  readonly #modelId: string;
  readonly #jobs = new Map<string, PendingJob>();

  constructor(options: FastVideoAdapterOptions) {
    this.connection = options.connection;
    this.#outputDirectory = options.outputDirectory.replace(/[\\/]+$/, "");
    this.#runner = options.runner;
    this.#modelId = options.modelId ?? DEFAULT_MODEL;
  }

  async discoverCapabilities(): Promise<CapabilityManifest> {
    return {
      modalities: ["video"],
      operations: ["generate", "image_to_video"],
      async: true,
      maxOutputs: 1,
      estimatedLatencyClass: "batch",
    };
  }

  async estimate(_request: GenerationRequest): Promise<CostEstimate> {
    return {
      currency: "USD",
      minimumUnits: 0,
      maximumUnits: 0,
      billingMode: "free",
    };
  }

  async submit(request: GenerationRequest): Promise<SubmittedGenerationJob> {
    if (request.signal.aborted) {
      throw new ProviderAdapterError("已取消 FastVideo 任务", {
        failureClass: "cancelled",
        retryable: false,
      });
    }
    if (!this.#runner) {
      throw new ProviderAdapterError(
        "未配置 FastVideo 运行时：请在桌面版安装并连接 FastVideo 后再试",
        {
          status: 503,
          failureClass: "provider_unavailable",
          retryable: false,
        },
      );
    }
    const providerJobId = `fastvideo:${request.idempotencyKey}`;
    this.#jobs.set(providerJobId, {
      prompt: request.prompt,
      model: request.model || this.#modelId,
      status: "queued",
      results: [],
    });
    return { providerJobId, async: true, status: "queued" };
  }

  async getStatus(
    providerJobId: string,
    signal?: AbortSignal,
  ): Promise<SubmittedGenerationJob> {
    if (signal?.aborted) {
      throw new ProviderAdapterError("已取消 FastVideo 查询", {
        failureClass: "cancelled",
        retryable: false,
      });
    }
    const job = this.#jobs.get(providerJobId);
    if (!job) {
      return { providerJobId, async: true, status: "failed" };
    }
    if (job.status === "succeeded" || job.status === "failed") {
      return { providerJobId, async: true, status: job.status };
    }
    if (!this.#runner) {
      job.status = "failed";
      job.error = "fastvideo-runner-missing";
      return { providerJobId, async: true, status: "failed" };
    }
    job.status = "running";
    try {
      const output = await this.#runner.generateVideo({
        prompt: job.prompt,
        model: job.model,
        outputPath: `${this.#outputDirectory}/${providerJobId.replace(/[^a-zA-Z0-9._-]+/g, "_")}.mp4`,
        signal: signal ?? new AbortController().signal,
      });
      job.status = "succeeded";
      job.results = [
        {
          providerJobId,
          url: output.path,
          mime: output.mime,
          index: 0,
          kind: "video",
        },
      ];
      return { providerJobId, async: true, status: "succeeded" };
    } catch (error) {
      if (error instanceof ProviderAdapterError) throw error;
      job.status = "failed";
      job.error =
        error instanceof Error
          ? error.message.slice(0, 200)
          : "fastvideo-failed";
      return { providerJobId, async: true, status: "failed" };
    }
  }

  async cancel(providerJobId: string): Promise<void> {
    const job = this.#jobs.get(providerJobId);
    if (job && job.status !== "succeeded") {
      job.status = "failed";
      job.error = "cancelled";
    }
  }

  async listResults(providerJobId: string): Promise<ProviderResult[]> {
    return this.#jobs.get(providerJobId)?.results ?? [];
  }
}

export function createFastVideoAdapter(
  options: FastVideoAdapterOptions,
): GenerationProviderAdapter {
  return new FastVideoAdapter(options);
}

export function fastVideoDisableReason(runnerConfigured: boolean): string {
  return runnerConfigured ? "" : "需要 Desktop 已安装并配置 FastVideo 运行时";
}

export function isFastVideoConnection(connection: ProviderConnection): boolean {
  const haystack =
    `${connection.provider} ${connection.displayName} ${connection.baseUrl ?? ""}`.toLowerCase();
  return haystack.includes("fastvideo");
}
