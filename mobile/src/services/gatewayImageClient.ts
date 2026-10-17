import type {
  CredentialReader,
  GatewayJob,
  ImageInput,
  ImageOriginal,
  ProviderConnection,
  SubmissionIdentity,
} from "./providerTypes.ts";
import {
  checkedUrl,
  nonempty,
  readBytes,
  readJson,
  record,
  requireOk,
  requireSubmissionOk,
  ServiceError,
  withHttp,
  type HttpOptions,
} from "./httpClient.ts";
import { imageMime, MAX_IMAGE_BYTES } from "./imageBytes.ts";
export interface GatewaySubmissionReceipt {
  identity: SubmissionIdentity;
  job: GatewayJob;
  submissionState: "submitted";
}
const statuses = new Set([
  "queued",
  "submitting",
  "waiting_provider",
  "downloading",
  "succeeded",
  "failed",
  "cancelled",
  "dead_letter",
  "quarantined",
  "manual_review",
  "partial",
  "running",
]);
function parseJob(value: unknown): GatewayJob {
  if (
    !record(value) ||
    typeof value.id !== "string" ||
    !/^job-[a-f0-9-]+$/.test(value.id) ||
    !nonempty(value.status) ||
    !statuses.has(value.status) ||
    typeof value.requestedOutputs !== "number" ||
    !Number.isInteger(value.requestedOutputs) ||
    value.requestedOutputs < 1 ||
    value.requestedOutputs > 100 ||
    typeof value.completedOutputs !== "number" ||
    !Number.isInteger(value.completedOutputs) ||
    value.completedOutputs < 0 ||
    value.completedOutputs > value.requestedOutputs ||
    !Array.isArray(value.outputs) ||
    value.outputs.length !== value.requestedOutputs
  )
    throw new ServiceError("INVALID_GATEWAY_JOB");
  const indices = new Set<number>();
  const outputs = value.outputs.map((output: unknown) => {
    if (
      !record(output) ||
      typeof output.index !== "number" ||
      !Number.isInteger(output.index) ||
      output.index < 0 ||
      output.index >= Number(value.requestedOutputs) ||
      indices.has(output.index) ||
      !nonempty(output.status) ||
      !statuses.has(output.status)
    )
      throw new ServiceError("INVALID_GATEWAY_OUTPUT");
    indices.add(output.index);
    if (
      output.assetId !== undefined &&
      (typeof output.assetId !== "string" ||
        !/^asset-[a-f0-9]{64}$/.test(output.assetId))
    )
      throw new ServiceError("INVALID_GATEWAY_ASSET");
    if (
      output.assetRoute !== undefined &&
      (typeof output.assetRoute !== "string" ||
        output.assetRoute !== `/v1/assets/${output.assetId}`)
    )
      throw new ServiceError("INVALID_GATEWAY_ASSET_ROUTE");
    if (
      output.status === "succeeded" &&
      (!output.assetId || !output.assetRoute)
    )
      throw new ServiceError("GATEWAY_ORIGINAL_MISSING");
    return {
      index: output.index,
      status: output.status,
      ...(typeof output.assetId === "string"
        ? { assetId: output.assetId }
        : {}),
      ...(typeof output.assetRoute === "string"
        ? { assetRoute: output.assetRoute }
        : {}),
      ...(nonempty(output.errorClass) ? { errorClass: output.errorClass } : {}),
    };
  });
  if (
    outputs.filter((output) => output.status === "succeeded").length !==
    value.completedOutputs
  )
    throw new ServiceError("GATEWAY_COMPLETION_CONFLICT");
  return {
    id: value.id,
    status: value.status,
    requestedOutputs: value.requestedOutputs,
    completedOutputs: value.completedOutputs,
    outputs,
  };
}
/** credentialRef addresses a gateway application token, never an upstream provider key. */
export function createGatewayImageClient(
  options: HttpOptions & { credentials: CredentialReader },
) {
  const submissions = new Set<string>();
  function base(connection: ProviderConnection) {
    if (connection.protocol !== "kk-image-jobs")
      throw new ServiceError("GATEWAY_ADAPTER_REQUIRED");
    const url = checkedUrl(connection.baseUrl, options.allowLoopbackHttp);
    if (url.pathname !== "/" && url.pathname.replace(/\/$/, "") !== "/v1")
      throw new ServiceError("GATEWAY_V1_BASE_REQUIRED");
    return url;
  }
  async function headers(connection: ProviderConnection, signal: AbortSignal) {
    const token = await options.credentials.read(connection.credentialRef);
    if (signal.aborted) throw new ServiceError("REQUEST_ABORTED");
    if (!token || /[\r\n]/.test(token))
      throw new ServiceError("GATEWAY_TOKEN_REQUIRED");
    return {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    };
  }
  async function requestJob(
    connection: ProviderConnection,
    id: string,
    cancel: boolean,
    signal?: AbortSignal,
  ) {
    const url = base(connection);
    if (!/^job-[a-f0-9-]+$/.test(id))
      throw new ServiceError("INVALID_GATEWAY_JOB_ID");
    return withHttp(options, signal, async (fetcher, requestSignal) => {
      const auth = await headers(connection, requestSignal);
      const response = await fetcher(
        new URL(`/v1/jobs/${id}${cancel ? "/cancel" : ""}`, url),
        {
          method: cancel ? "POST" : "GET",
          headers: auth,
          ...(cancel ? { body: "{}" } : {}),
          signal: requestSignal,
          redirect: "error",
          credentials: "omit",
        },
      );
      requireOk(response);
      const job = parseJob(await readJson(response));
      if (job.id !== id) throw new ServiceError("GATEWAY_JOB_ID_CHANGED");
      return job;
    });
  }
  return {
    async submitImageJob(
      input: ImageInput,
      signal?: AbortSignal,
    ): Promise<GatewaySubmissionReceipt> {
      const connection = {
        ...input.connection,
        capabilities: { ...input.connection.capabilities },
      };
      const url = new URL("/v1/jobs", base(connection));
      if (!connection.capabilities.image)
        throw new ServiceError("IMAGE_CAPABILITY_UNAVAILABLE");
      if (input.attachments?.length)
        throw new ServiceError("REFERENCE_INPUT_UNAVAILABLE");
      if (input.size) throw new ServiceError("GATEWAY_SIZE_UNAVAILABLE");
      const count = input.count ?? 1;
      if (
        !Number.isInteger(count) ||
        count < 1 ||
        count > Math.min(4, connection.capabilities.maxOutputs ?? 1)
      )
        throw new ServiceError("IMAGE_COUNT_UNAVAILABLE");
      if (
        !/^[A-Za-z0-9_-]{1,180}$/.test(input.submissionId) ||
        !nonempty(input.projectId) ||
        !nonempty(input.model) ||
        input.model.length > 120 ||
        !input.prompt.trim() ||
        input.prompt.length > 4000 ||
        !nonempty(connection.id)
      )
        throw new ServiceError("INVALID_GENERATION_INPUT");
      const identity = Object.freeze({
        submissionId: input.submissionId,
        projectId: input.projectId,
        connectionId: connection.id,
        model: input.model,
        prompt: input.prompt,
        capturedAt: Date.now(),
      });
      let sent = false;
      try {
        return await withHttp(
          options,
          signal,
          async (fetcher, requestSignal) => {
            const auth = await headers(connection, requestSignal);
            if (submissions.has(identity.submissionId))
              throw new ServiceError("SUBMISSION_ALREADY_STARTED", "unknown");
            if (submissions.size >= 1000)
              throw new ServiceError("SUBMISSION_HISTORY_LIMIT");
            submissions.add(identity.submissionId);
            sent = true;
            const response = await fetcher(url, {
              method: "POST",
              headers: { ...auth, "idempotency-key": identity.submissionId },
              body: JSON.stringify({
                connectionId: connection.id,
                idempotencyKey: identity.submissionId,
                model: identity.model,
                prompt: identity.prompt,
                requestedOutputs: count,
                privacyMode: "byok_local",
                attachments: [],
              }),
              signal: requestSignal,
              redirect: "error",
              credentials: "omit",
            });
            requireSubmissionOk(response);
            const job = parseJob(await readJson(response));
            if (job.requestedOutputs !== count)
              throw new ServiceError("GATEWAY_OUTPUT_COUNT_CHANGED");
            return { identity, job, submissionState: "submitted" as const };
          },
        );
      } catch (error) {
        if (error instanceof ServiceError) {
          if (sent && !error.rejectedBeforeAcceptance)
            error.submissionState = "unknown";
          throw error;
        }
        throw new ServiceError(
          "GATEWAY_REQUEST_FAILED",
          sent ? "unknown" : "intent",
        );
      }
    },
    getImageJob(
      connection: ProviderConnection,
      jobId: string,
      signal?: AbortSignal,
    ) {
      return requestJob(connection, jobId, false, signal);
    },
    async cancelImageJob(
      connection: ProviderConnection,
      jobId: string,
      signal?: AbortSignal,
    ) {
      const job = await requestJob(connection, jobId, true, signal);
      return {
        job,
        cancelRequested: true as const,
        providerCancellationConfirmed: false as const,
      };
    },
    async downloadOriginal(
      connection: ProviderConnection,
      output: GatewayJob["outputs"][number],
      signal?: AbortSignal,
    ): Promise<ImageOriginal> {
      const url = base(connection);
      if (
        output.status !== "succeeded" ||
        !output.assetId ||
        !/^asset-[a-f0-9]{64}$/.test(output.assetId) ||
        output.assetRoute !== `/v1/assets/${output.assetId}`
      )
        throw new ServiceError("GATEWAY_ORIGINAL_UNAVAILABLE");
      return withHttp(options, signal, async (fetcher, requestSignal) => {
        const auth = await headers(connection, requestSignal);
        const response = await fetcher(new URL(output.assetRoute!, url), {
          headers: auth,
          signal: requestSignal,
          redirect: "error",
          credentials: "omit",
        });
        requireOk(response);
        const bytes = await readBytes(response, MAX_IMAGE_BYTES);
        const mime = imageMime(bytes);
        if (response.headers.get("content-type")?.split(";")[0].trim() !== mime)
          throw new ServiceError("IMAGE_MIME_MISMATCH");
        return {
          index: output.index,
          bytes,
          mime,
          signatureVerified: true,
          providerAssetId: output.assetId,
        };
      });
    },
  };
}
