import {
  providerConnectionSchema,
  type ProviderConnection,
} from "../../domain/providerConnections.ts";
import { loadApiKey } from "../providers/credentialVault.ts";
import {
  ProviderAdapterError,
  type GenerationProviderAdapter,
  type GenerationRequest,
  type ProviderResult,
  type SubmittedGenerationJob,
} from "./providerAdapter.ts";
import {
  buildTwelveAiTaskBody,
  parseTwelveAiTask,
  parseTwelveAiSubmissionReceipt,
  twelveAiApiBase,
  twelveAiIntentKeySchema,
  twelveAiModelKind,
  twelveAiTaskIdSchema,
  type TwelveAiMediaInput,
  type TwelveAiTaskState,
  type TwelveAiSubmissionReceipt,
} from "./twelveAiTaskProtocol.ts";
export type { TwelveAiSubmissionReceipt } from "./twelveAiTaskProtocol.ts";

export type TwelveAiGenerationRequest = GenerationRequest & {
  media?: TwelveAiMediaInput;
};
export interface TwelveAiSubmissionPersistence {
  readonly connectionId: string;
  /** Atomically insert by connectionId + idempotencyKey; commit durably before created:true, or return the unchanged existing receipt. */
  claimSubmission(
    receipt: TwelveAiSubmissionReceipt,
  ): Promise<
    { created: true } | { created: false; receipt: TwelveAiSubmissionReceipt }
  >;
  /** Durably update the claimed intent without changing its connection binding before resolving. */
  persistSubmissionReceipt(receipt: TwelveAiSubmissionReceipt): Promise<void>;
}
export interface TwelveAiTaskSnapshot extends SubmittedGenerationJob {
  providerStatus: TwelveAiTaskState["providerStatus"];
  terminal: boolean;
  partial: boolean;
  outputs: ProviderResult[];
  failure?: TwelveAiTaskState["failure"];
}
type Reason =
  | "invalid_connection"
  | "invalid_request"
  | "invalid_response"
  | "submission_unknown"
  | "request_failed"
  | "receipt_persistence_failed"
  | "receipt_persistence_required"
  | "polling_stopped"
  | "remote_cancel_unsupported";
export class TwelveAiTaskError extends ProviderAdapterError {
  readonly uncertain: boolean;
  readonly reason: Reason;
  readonly providerJobId?: string;
  constructor(
    reason: Reason,
    options: {
      failureClass?: ProviderAdapterError["failureClass"];
      uncertain?: boolean;
      status?: number;
      retryable?: boolean;
      retryAfterSeconds?: number;
      providerJobId?: string;
    } = {},
  ) {
    super(`TWELVE_AI_${reason.toUpperCase()}`, {
      failureClass: options.failureClass ?? "invalid_request",
      status: options.status,
      retryable: options.retryable ?? false,
      retryAfterSeconds: options.retryAfterSeconds,
    });
    this.name = "TwelveAiTaskError";
    this.uncertain = options.uncertain ?? false;
    this.reason = reason;
    if (twelveAiTaskIdSchema.safeParse(options.providerJobId).success)
      this.providerJobId = options.providerJobId;
  }
}
export interface TwelveAiTaskAdapterOptions {
  fetch?: typeof fetch;
  resolveCredential?: (
    baseUrl: string,
    credentialRef: string,
  ) => Promise<string | undefined>;
  /** Host persists these opaque receipts before allowing a retry after reload. No prompts or secrets. */
  submissionReceipts?: readonly TwelveAiSubmissionReceipt[];
  submissionPersistence?: TwelveAiSubmissionPersistence;
}
const maxResponseBytes = 1024 * 1024;

function responseError(
  response: Response,
  submitting: boolean,
): TwelveAiTaskError {
  const status = response.status;
  const retryHeader = response.headers.get("retry-after");
  const retry =
    retryHeader && /^\d+(?:\.\d+)?$/.test(retryHeader)
      ? Number(retryHeader)
      : undefined;
  return new TwelveAiTaskError("request_failed", {
    status,
    failureClass:
      status === 401
        ? "unauthorized"
        : status === 403
          ? "forbidden"
          : status === 429
            ? "rate_limited"
            : status >= 500
              ? "provider_unavailable"
              : "invalid_request",
    uncertain: submitting && status >= 500,
    retryable: !submitting && (status === 429 || status >= 500),
    retryAfterSeconds:
      retry !== undefined && Number.isFinite(retry) && retry >= 0
        ? Math.min(retry, 86400)
        : undefined,
  });
}

function containsCredential(payload: unknown, secret: string): boolean {
  if (!payload || typeof payload !== "object") return false;
  const id = "id" in payload ? payload.id : undefined;
  const outputs = "outputs" in payload ? payload.outputs : undefined;
  return (
    (typeof id === "string" && id.includes(secret)) ||
    (Array.isArray(outputs) &&
      outputs.some(
        (url: unknown) => typeof url === "string" && url.includes(secret),
      ))
  );
}

async function readPayload(
  response: Response,
  submitting: boolean,
  secret: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const reader = response.body?.getReader();
  let raw = "";
  let size = 0;
  try {
    if (!reader) throw new Error();
    const decoder = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxResponseBytes) throw new Error();
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
    const payload: unknown = JSON.parse(raw);
    if (containsCredential(payload, secret)) throw new Error();
    return payload;
  } catch {
    throw new TwelveAiTaskError(
      !submitting && signal?.aborted ? "polling_stopped" : "invalid_response",
      {
        uncertain: submitting,
        failureClass:
          !submitting && signal?.aborted ? "cancelled" : "invalid_request",
      },
    );
  } finally {
    await reader?.cancel().catch(() => {});
  }
}

/** One submission per intent. Polling is host-owned; this adapter never starts a queue or downloads outputs. */
export class TwelveAiTaskAdapter implements GenerationProviderAdapter {
  readonly connection: ProviderConnection;
  private readonly base: string;
  private readonly fetch: typeof fetch;
  private readonly resolveCredential: NonNullable<
    TwelveAiTaskAdapterOptions["resolveCredential"]
  >;
  private readonly submissionPersistence?: TwelveAiSubmissionPersistence;
  private readonly submissions = new Map<
    string,
    {
      receipt: TwelveAiSubmissionReceipt;
      promise?: Promise<SubmittedGenerationJob>;
    }
  >();
  constructor(
    connection: ProviderConnection,
    options: TwelveAiTaskAdapterOptions = {},
  ) {
    const parsed = providerConnectionSchema.safeParse(connection);
    const base = twelveAiApiBase(connection.baseUrl);
    if (
      !parsed.success ||
      !base ||
      !connection.credentialRef ||
      !["managed_api", "user_byok"].includes(connection.kind) ||
      !["active", "degraded"].includes(connection.state)
    )
      throw new TwelveAiTaskError("invalid_connection");
    this.connection = parsed.data;
    this.base = base;
    this.fetch = options.fetch ?? fetch;
    this.resolveCredential = options.resolveCredential ?? loadApiKey;
    this.submissionPersistence = options.submissionPersistence;
    for (const receipt of options.submissionReceipts ?? []) {
      let parsedReceipt: TwelveAiSubmissionReceipt;
      try {
        parsedReceipt = parseTwelveAiSubmissionReceipt(
          receipt,
          this.connection.id,
        );
      } catch {
        throw new TwelveAiTaskError("invalid_request");
      }
      if (this.submissions.has(parsedReceipt.idempotencyKey))
        throw new TwelveAiTaskError("invalid_request");
      this.submissions.set(parsedReceipt.idempotencyKey, {
        receipt: parsedReceipt,
      });
    }
  }

  async discoverCapabilities(): Promise<ProviderConnection["capabilities"]> {
    const kind = this.connection.model
      ? twelveAiModelKind(this.connection.model)
      : undefined;
    if (this.connection.model && !kind)
      return { modalities: [], operations: [], maxOutputs: 1, async: true };
    return {
      modalities: this.connection.capabilities.modalities.filter((value) =>
        kind ? value === kind : value === "image" || value === "video",
      ),
      operations: this.connection.capabilities.operations.filter(
        (value) =>
          value === "generate" || (value === "edit" && kind !== "video"),
      ),
      maxOutputs: 1,
      async: true,
    };
  }
  async estimate() {
    return {
      currency: "output",
      minimumUnits: 1,
      maximumUnits: 1,
      billingMode: "unknown" as const,
    };
  }
  submissionReceipt(
    idempotencyKey: string,
  ): TwelveAiSubmissionReceipt | undefined {
    const receipt = this.submissions.get(idempotencyKey)?.receipt;
    return receipt ? { ...receipt } : undefined;
  }
  async submit(
    request: TwelveAiGenerationRequest,
  ): Promise<SubmittedGenerationJob> {
    if (request.signal.aborted)
      throw new TwelveAiTaskError("polling_stopped", {
        failureClass: "cancelled",
      });
    this.persistence();
    let body: ReturnType<typeof buildTwelveAiTaskBody>;
    try {
      if (
        !twelveAiIntentKeySchema.safeParse(request.idempotencyKey).success ||
        request.workflow !== undefined
      )
        throw new Error();
      const images = request.attachments.map((attachment) => {
        if (!attachment.dataUrl?.startsWith(`data:${attachment.mime};base64,`))
          throw new Error();
        return attachment.dataUrl;
      });
      body = buildTwelveAiTaskBody({
        model: request.model,
        prompt: request.prompt,
        requestedOutputs: request.requestedOutputs,
        images,
        media: request.media,
      });
    } catch {
      throw new TwelveAiTaskError("invalid_request");
    }
    const existing = this.submissions.get(request.idempotencyKey);
    if (existing) return existing.promise ?? this.receiptJob(existing.receipt);
    const entry: {
      receipt: TwelveAiSubmissionReceipt;
      promise?: Promise<SubmittedGenerationJob>;
    } = {
      receipt: {
        connectionId: this.connection.id,
        idempotencyKey: request.idempotencyKey,
        acceptance: "unknown",
      },
    };
    this.submissions.set(request.idempotencyKey, entry);
    entry.promise = (async () => {
      let claimed = false;
      try {
        const existingReceipt = await this.claimReceipt(entry.receipt);
        if (existingReceipt) {
          entry.receipt = existingReceipt;
          return this.receiptJob(existingReceipt);
        }
        claimed = true;
        const task = await this.submitTask(body, request.signal);
        entry.receipt = {
          ...entry.receipt,
          acceptance: "accepted",
          providerJobId: task.providerJobId,
        };
        await this.persistReceipt(entry.receipt, true);
        return task;
      } catch (error: unknown) {
        if (claimed && error instanceof TwelveAiTaskError) {
          if (!error.uncertain && entry.receipt.acceptance !== "accepted")
            entry.receipt = { ...entry.receipt, acceptance: "rejected" };
          if (error.providerJobId)
            entry.receipt = {
              ...entry.receipt,
              providerJobId: error.providerJobId,
            };
          if (error.reason !== "receipt_persistence_failed")
            await this.persistReceipt(entry.receipt, error.uncertain);
        }
        throw error;
      }
    })();
    return entry.promise;
  }
  private persistence(): TwelveAiSubmissionPersistence {
    const port = this.submissionPersistence;
    if (
      !port ||
      port.connectionId !== this.connection.id ||
      typeof port.claimSubmission !== "function" ||
      typeof port.persistSubmissionReceipt !== "function"
    )
      throw new TwelveAiTaskError("receipt_persistence_required");
    return port;
  }
  private receiptJob(
    receipt: TwelveAiSubmissionReceipt,
  ): SubmittedGenerationJob {
    if (receipt.acceptance === "accepted")
      return {
        providerJobId: receipt.providerJobId!,
        async: true,
        status: "queued",
      };
    throw new TwelveAiTaskError(
      receipt.acceptance === "unknown"
        ? "submission_unknown"
        : "request_failed",
      {
        uncertain: receipt.acceptance === "unknown",
        providerJobId: receipt.providerJobId,
      },
    );
  }
  private async claimReceipt(
    receipt: TwelveAiSubmissionReceipt,
  ): Promise<TwelveAiSubmissionReceipt | undefined> {
    try {
      const claimed = await this.persistence().claimSubmission({ ...receipt });
      if (claimed?.created === true) return undefined;
      if (claimed?.created === false)
        return parseTwelveAiSubmissionReceipt(
          claimed.receipt,
          this.connection.id,
          receipt.idempotencyKey,
        );
      throw new Error();
    } catch {
      throw new TwelveAiTaskError("receipt_persistence_failed");
    }
  }
  private async persistReceipt(
    receipt: TwelveAiSubmissionReceipt,
    uncertain = false,
  ): Promise<void> {
    try {
      await this.persistence().persistSubmissionReceipt({ ...receipt });
    } catch {
      throw new TwelveAiTaskError("receipt_persistence_failed", {
        uncertain,
        providerJobId: receipt.providerJobId,
      });
    }
  }
  private async submitTask(
    body: ReturnType<typeof buildTwelveAiTaskBody>,
    signal: AbortSignal,
  ): Promise<SubmittedGenerationJob> {
    const payload = await this.request("/task/submit", signal, body);
    try {
      const task = parseTwelveAiTask(payload);
      if (task.providerStatus !== "queued") throw new Error();
      return { providerJobId: task.id, async: true, status: "queued" };
    } catch {
      const id =
        payload && typeof payload === "object" && "id" in payload
          ? payload.id
          : undefined;
      throw new TwelveAiTaskError("invalid_response", {
        uncertain: true,
        providerJobId: typeof id === "string" ? id : undefined,
      });
    }
  }
  async getTask(
    providerJobId: string,
    signal?: AbortSignal,
  ): Promise<TwelveAiTaskSnapshot> {
    if (!twelveAiTaskIdSchema.safeParse(providerJobId).success)
      throw new TwelveAiTaskError("invalid_request");
    const payload = await this.request(`/task/${providerJobId}`, signal);
    let task: TwelveAiTaskState;
    try {
      task = parseTwelveAiTask(payload, providerJobId);
    } catch {
      throw new TwelveAiTaskError("invalid_response");
    }
    return {
      providerJobId: task.id,
      async: true,
      // Partial is terminal but never wholly successful; getTask/listResults retain successful outputs.
      status:
        task.providerStatus === "completed"
          ? "succeeded"
          : task.terminal
            ? "failed"
            : task.providerStatus === "queued"
              ? "queued"
              : "running",
      providerStatus: task.providerStatus,
      terminal: task.terminal,
      partial: task.partial,
      failure: task.failure,
      outputs: task.outputs.map((url, index) => ({
        providerJobId: task.id,
        url,
        index,
      })),
    };
  }
  async getStatus(
    providerJobId: string,
    signal?: AbortSignal,
  ): Promise<TwelveAiTaskSnapshot> {
    return this.getTask(providerJobId, signal);
  }
  async listResults(
    providerJobId: string,
    signal?: AbortSignal,
  ): Promise<ProviderResult[]> {
    return (await this.getTask(providerJobId, signal)).outputs;
  }
  async cancel(_providerJobId: string, _signal?: AbortSignal): Promise<void> {
    throw new TwelveAiTaskError("remote_cancel_unsupported");
  }

  private async request(
    path: string,
    signal?: AbortSignal,
    body?: unknown,
  ): Promise<unknown> {
    if (signal?.aborted)
      throw new TwelveAiTaskError("polling_stopped", {
        failureClass: "cancelled",
      });
    const secret = await this.credential();
    if (signal?.aborted)
      throw new TwelveAiTaskError("polling_stopped", {
        failureClass: "cancelled",
      });
    const response = await this.fetchResponse(path, secret, signal, body);
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      throw responseError(response, body !== undefined);
    }
    return readPayload(response, body !== undefined, secret, signal);
  }

  private async credential(): Promise<string> {
    let secret: string | undefined;
    try {
      secret = await this.resolveCredential(
        this.connection.baseUrl!,
        this.connection.credentialRef!,
      );
    } catch {
      throw new TwelveAiTaskError("request_failed", {
        failureClass: "unauthorized",
      });
    }
    if (
      typeof secret !== "string" ||
      !secret.length ||
      secret.length > 8192 ||
      Array.from(secret).some(
        (character) =>
          character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127,
      )
    )
      throw new TwelveAiTaskError("request_failed", {
        failureClass: "unauthorized",
      });
    return secret;
  }

  private async fetchResponse(
    path: string,
    secret: string,
    signal?: AbortSignal,
    body?: unknown,
  ): Promise<Response> {
    const submitting = body !== undefined;
    const deadline = AbortSignal.timeout(110_000);
    try {
      return await this.fetch(this.base + path, {
        method: submitting ? "POST" : "GET",
        redirect: "error",
        credentials: "omit",
        signal: signal ? AbortSignal.any([signal, deadline]) : deadline,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${secret}`,
          ...(submitting ? { "Content-Type": "application/json" } : {}),
        },
        body: submitting ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new TwelveAiTaskError(
        submitting
          ? "submission_unknown"
          : signal?.aborted
            ? "polling_stopped"
            : "request_failed",
        {
          failureClass:
            !submitting && signal?.aborted ? "cancelled" : "network",
          uncertain: submitting,
          retryable: !submitting && !signal?.aborted,
        },
      );
    }
  }
}
