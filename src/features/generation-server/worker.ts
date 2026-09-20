import { randomUUID } from "node:crypto";
import type { GenerationProviderAdapter } from "../../integrations/generation/providerAdapter.ts";
import { ProviderAdapterError } from "../../integrations/generation/providerAdapter.ts";
import type { ProviderConnection } from "../../domain/providerConnections.ts";
import type { GenerationRepository } from "./repository.ts";
import type { PrivateAssetStore } from "./assets.ts";
import type { Claim } from "./types.ts";

/** Process lifetime, HTTP request lifetime, and provider lifetime are independent. */
export class PersistentGenerationWorker {
  readonly repository: GenerationRepository;
  readonly assets: PrivateAssetStore;
  readonly createAdapter: (
    connection: ProviderConnection,
  ) => GenerationProviderAdapter;
  readonly id = "worker-" + randomUUID();
  unhealthy = false;
  private running?: Promise<void>;
  private timer?: ReturnType<typeof setInterval>;
  constructor(
    repository: GenerationRepository,
    assets: PrivateAssetStore,
    createAdapter: (
      connection: ProviderConnection,
    ) => GenerationProviderAdapter,
  ) {
    this.repository = repository;
    this.assets = assets;
    this.createAdapter = createAdapter;
  }
  start() {
    if (this.timer) return;
    const run = () => {
      void this.runOnce().then(
        () => {
          this.unhealthy = false;
        },
        () => {
          this.unhealthy = true;
        },
      );
    };
    this.timer = setInterval(run, 500);
    run();
  }
  async stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    await this.running;
  }
  runOnce(): Promise<void> {
    if (this.running) return this.running;
    this.running = this.tick().finally(() => {
      this.running = undefined;
    });
    return this.running;
  }
  private async tick() {
    const r = this.repository;
    r.recover();
    r.applyWebhooks();
    const work: Promise<void>[] = [];
    for (let n = 0; n < 16; n++) {
      const claim = r.claim(this.id);
      if (!claim) break;
      work.push(this.process(claim));
    }
    await Promise.all(work);
  }
  private async process(c: Claim) {
    const r = this.repository;
    const started = Date.now();
    let accepted = c.operation === "poll";
    const heartbeat = setInterval(() => r.heartbeat(c), 30000);
    heartbeat.unref();
    try {
      if (started - c.job.created_at > 86400000) {
        r.fail(c, "provider_timeout", { uncertain: accepted });
        return;
      }
      const adapter = this.createAdapter(c.connection);
      const signal = AbortSignal.timeout(110000);
      const result =
        c.operation === "submit"
          ? await adapter.submit({
              ...c.input,
              requestedOutputs: 1,
              idempotencyKey: `${c.job.id}:${c.output.output_index}:${c.output.generation}`,
              signal,
            })
          : await adapter.getStatus(c.output.provider_job_id!, signal);
      accepted = true;
      r.log(
        c,
        c.operation,
        "accepted",
        Date.now(),
        undefined,
        undefined,
        Date.now() - started,
      );
      if (!r.isCurrent(c)) {
        r.log(c, c.operation, "discarded");
        return;
      }
      if (result.status === "failed") {
        r.fail(c, "provider_failed", { uncertain: true });
        return;
      }
      if (result.status !== "succeeded") {
        r.waiting(c, result.providerJobId);
        return;
      }
      if (!r.downloading(c, result.providerJobId)) return;
      const results = await adapter.listResults(result.providerJobId, signal);
      if (
        results.length !== 1 ||
        results[0].providerJobId !== result.providerJobId
      ) {
        r.fail(c, "invalid_result_count", { uncertain: true });
        return;
      }
      const asset = await this.assets.archive(results[0], c.connection, signal);
      r.complete(c, asset);
    } catch (error) {
      if (error instanceof ProviderAdapterError) {
        const uncertain =
          (accepted && c.operation === "submit") ||
          Boolean(
            (error as ProviderAdapterError & { uncertain?: boolean }).uncertain,
          );
        r.fail(c, error.failureClass, {
          status: error.status,
          retryAfterMs:
            error.retryAfterSeconds === undefined
              ? undefined
              : error.retryAfterSeconds * 1000,
          retryable: error.retryable,
          uncertain,
        });
      } else
        r.fail(c, accepted ? "asset_unavailable" : "provider_unknown", {
          uncertain: true,
        });
    } finally {
      clearInterval(heartbeat);
    }
  }
  async cancel(ownerId: string, jobId: string) {
    const r = this.repository;
    const result = r.cancel(ownerId, jobId);
    const job = r.job(jobId)!;
    const row = r.connection(job.connection_id)!;
    const metadata = JSON.parse(row.metadata_json) as ProviderConnection;
    const pending = r
      .outputs(jobId)
      .filter((o) => o.status === "cancelled" && o.provider_job_id);
    if (pending.length) {
      try {
        const adapter = this.createAdapter({
          ...metadata,
          credentialRef: row.credential_ref ?? undefined,
        });
        await Promise.allSettled(
          pending.map((o) =>
            adapter.cancel(o.provider_job_id!, AbortSignal.timeout(3000)),
          ),
        );
      } catch {
        /* Durable cancellation is already committed; provider interruption is best effort. */
      }
    }
    return result;
  }
}
