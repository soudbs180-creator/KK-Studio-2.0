import type {
  ComfyClientOptions,
  ComfyConnection,
  ComfyHealth,
  ComfyWorkflowInput,
  ComfySubmissionReceipt,
  ComfyPollReceipt,
  ComfyImageOutput,
  ComfyOriginal,
  ComfyCancelReceipt,
  ComfyNodeCatalog,
} from "./comfyTypes.ts";
import {
  checkedUrl,
  nonempty,
  record,
  readJson,
  readBytes,
  requireOk,
  requireSubmissionOk,
  ServiceError,
  withHttp,
} from "./httpClient.ts";
import { imageMime, MAX_IMAGE_BYTES } from "./imageBytes.ts";
import {
  captureComfyWorkflow,
  parseComfyNodeCatalog,
  validateComfyWorkflow,
} from "./comfyWorkflow.ts";
import {
  COMFY_UUID,
  parseComfyAcceptance,
  parseComfyHistory,
  parseComfyQueue,
  validComfyOutput,
} from "./comfyProtocol.ts";
export class ComfyServiceError extends ServiceError {
  comfyReceipt?: ComfySubmissionReceipt;
}
export function createComfyUiClient(options: ComfyClientOptions = {}) {
  options = { ...options };
  const started = new Set<string>();
  const captureConnection = (value: ComfyConnection) =>
    Object.freeze({ ...value });
  function captureReceipt(
    value: ComfySubmissionReceipt,
  ): ComfySubmissionReceipt {
    return Object.freeze({
      ...value,
      identity: Object.freeze({
        ...value.identity,
        // Historical receipts can omit a workflow; it is never executed by read/cancel APIs.
        workflow:
          record(value.identity.workflow) &&
          !Object.keys(value.identity.workflow).length
            ? Object.freeze({})
            : captureComfyWorkflow(value.identity.workflow),
      }),
    });
  }
  function base(connection: ComfyConnection) {
    if (connection.protocol !== "comfyui" || !nonempty(connection.id))
      throw new ServiceError("COMFY_CONNECTION_REQUIRED");
    const url = checkedUrl(connection.baseUrl, options.allowLoopbackHttp);
    if (url.pathname !== "/") throw new ServiceError("COMFY_ORIGIN_REQUIRED");
    return url;
  }
  async function headers(
    connection: ComfyConnection,
    signal: AbortSignal,
  ): Promise<Record<string, string>> {
    if (!connection.credentialRef) return {};
    const credential = await options.credentials?.read(
      connection.credentialRef,
    );
    if (signal.aborted) throw new ServiceError("REQUEST_ABORTED");
    if (!credential || /[\r\n]/.test(credential))
      throw new ServiceError("COMFY_CREDENTIAL_REQUIRED");
    return { authorization: `Bearer ${credential}` };
  }
  async function request(
    connection: ComfyConnection,
    route: string,
    signal?: AbortSignal,
  ) {
    connection = captureConnection(connection);
    const url = new URL(route, base(connection));
    return withHttp(options, signal, async (fetcher, requestSignal) => {
      const auth = await headers(connection, requestSignal);
      const response = await fetcher(url, {
        headers: auth,
        signal: requestSignal,
        redirect: "error",
        credentials: "omit",
      });
      requireOk(response);
      return readJson(response, 8 * 1024 * 1024);
    });
  }
  function bind(connection: ComfyConnection, receipt: ComfySubmissionReceipt) {
    const origin = base(connection).origin;
    if (receipt.readOnly)
      throw new ServiceError("HISTORICAL_COMFY_RECEIPT_READ_ONLY");
    if (
      !COMFY_UUID.test(receipt.promptId) ||
      !COMFY_UUID.test(receipt.identity.submissionId) ||
      receipt.identity.connectionId !== connection.id ||
      receipt.identity.baseUrl !== origin ||
      !nonempty(receipt.identity.projectId) ||
      !Number.isSafeInteger(receipt.identity.workflowRevision) ||
      receipt.identity.workflowRevision < 0
    )
      throw new ServiceError("COMFY_RECEIPT_CONNECTION_CHANGED");
  }
  return {
    async health(
      connection: ComfyConnection,
      signal?: AbortSignal,
    ): Promise<ComfyHealth> {
      connection = captureConnection(connection);
      const value = await request(connection, "/system_stats", signal);
      if (
        !record(value) ||
        !record(value.system) ||
        !Array.isArray(value.devices) ||
        value.devices.length > 100
      )
        throw new ServiceError("INVALID_COMFY_HEALTH");
      return {
        connectionId: connection.id,
        reachable: true,
        generationVerified: false,
        cancellation: "unknown",
        ...(nonempty(value.system.comfyui_version)
          ? { version: value.system.comfyui_version }
          : {}),
      };
    },
    async listModelFolders(
      connection: ComfyConnection,
      signal?: AbortSignal,
    ): Promise<string[]> {
      connection = captureConnection(connection);
      const value = await request(connection, "/models", signal);
      if (
        !Array.isArray(value) ||
        value.length > 200 ||
        !value.every(
          (item) =>
            typeof item === "string" && /^[A-Za-z0-9_-]{1,120}$/.test(item),
        )
      )
        throw new ServiceError("INVALID_COMFY_MODEL_FOLDERS");
      return [...value];
    },
    async listModels(
      connection: ComfyConnection,
      folder: string,
      signal?: AbortSignal,
    ): Promise<string[]> {
      connection = captureConnection(connection);
      if (!/^[A-Za-z0-9_-]{1,120}$/.test(folder))
        throw new ServiceError("INVALID_COMFY_MODEL_FOLDER");
      const value = await request(
        connection,
        `/models/${encodeURIComponent(folder)}`,
        signal,
      );
      if (
        !Array.isArray(value) ||
        value.length > 10_000 ||
        !value.every(nonempty)
      )
        throw new ServiceError("INVALID_COMFY_MODELS");
      return [...value];
    },
    async inspectNodes(
      connection: ComfyConnection,
      signal?: AbortSignal,
    ): Promise<ComfyNodeCatalog> {
      connection = captureConnection(connection);
      return parseComfyNodeCatalog(
        await request(connection, "/object_info", signal),
      );
    },
    async submitWorkflow(
      input: ComfyWorkflowInput,
      signal?: AbortSignal,
    ): Promise<ComfySubmissionReceipt> {
      const connection = captureConnection(input.connection);
      const origin = base(connection).origin;
      const requestedCapturedAt = input.capturedAt;
      const capturedAt =
        requestedCapturedAt === undefined ? Date.now() : requestedCapturedAt;
      if (
        !COMFY_UUID.test(input.submissionId) ||
        !nonempty(input.projectId) ||
        !Number.isSafeInteger(input.workflowRevision) ||
        input.workflowRevision < 0 ||
        !Number.isSafeInteger(capturedAt) ||
        capturedAt < 0
      )
        throw new ServiceError("INVALID_COMFY_WORKFLOW_IDENTITY");
      if (started.has(input.submissionId))
        throw new ComfyServiceError("SUBMISSION_ALREADY_STARTED", "unknown");
      const workflow = captureComfyWorkflow(input.workflow);
      const identity = Object.freeze({
        submissionId: input.submissionId,
        projectId: input.projectId,
        connectionId: connection.id,
        baseUrl: origin,
        workflowRevision: input.workflowRevision,
        workflow,
        capturedAt,
      });
      let knownReceipt: ComfySubmissionReceipt = Object.freeze({
        identity,
        promptId: identity.submissionId,
        promptIdConfirmed: false,
        submissionState: "submitted" as const,
      });
      let sent = false;
      try {
        return await withHttp(
          options,
          signal,
          async (fetcher, requestSignal) => {
            const auth = await headers(connection, requestSignal);
            const definitions = await fetcher(new URL("/object_info", origin), {
              headers: auth,
              signal: requestSignal,
              redirect: "error",
              credentials: "omit",
            });
            requireOk(definitions);
            validateComfyWorkflow(
              workflow,
              parseComfyNodeCatalog(
                await readJson(definitions, 8 * 1024 * 1024),
              ),
            );
            if (requestSignal.aborted)
              throw new ServiceError("REQUEST_ABORTED");
            if (started.has(identity.submissionId))
              throw new ComfyServiceError(
                "SUBMISSION_ALREADY_STARTED",
                "unknown",
              );
            if (started.size >= 1000)
              throw new ServiceError("SUBMISSION_HISTORY_LIMIT");
            started.add(identity.submissionId);
            sent = true;
            const response = await fetcher(new URL("/prompt", origin), {
              method: "POST",
              headers: {
                ...auth,
                "content-type": "application/json",
                "idempotency-key": identity.submissionId,
              },
              body: JSON.stringify({
                prompt: workflow,
                prompt_id: identity.submissionId,
                client_id: identity.submissionId,
              }),
              signal: requestSignal,
              redirect: "error",
              credentials: "omit",
            });
            requireSubmissionOk(response);
            const value = await readJson(response, 32 * 1024);
            if (
              record(value) &&
              typeof value.prompt_id === "string" &&
              COMFY_UUID.test(value.prompt_id)
            )
              knownReceipt = Object.freeze({
                identity,
                promptId: value.prompt_id,
                promptIdConfirmed: true,
                submissionState: "submitted" as const,
              });
            const accepted = parseComfyAcceptance(value, identity);
            knownReceipt = accepted;
            return accepted;
          },
        );
      } catch (error) {
        const failure = new ComfyServiceError(
          error instanceof ServiceError ? error.code : "COMFY_REQUEST_FAILED",
          sent &&
            !(error instanceof ServiceError && error.rejectedBeforeAcceptance)
            ? "unknown"
            : error instanceof ServiceError
              ? error.submissionState
              : "intent",
          error instanceof ServiceError ? error.status : undefined,
        );
        if (sent) {
          failure.providerRequestId = knownReceipt.promptId;
          failure.comfyReceipt = knownReceipt;
        }
        throw failure;
      }
    },
    async pollPrompt(
      connection: ComfyConnection,
      receipt: ComfySubmissionReceipt,
      signal?: AbortSignal,
    ): Promise<ComfyPollReceipt> {
      connection = captureConnection(connection);
      receipt = captureReceipt(receipt);
      bind(connection, receipt);
      try {
        const result = parseComfyHistory(
          await request(connection, `/history/${receipt.promptId}`, signal),
          receipt,
        );
        return (
          result ??
          parseComfyQueue(await request(connection, "/queue", signal), receipt)
        );
      } catch (error) {
        const failure = new ComfyServiceError(
          error instanceof ServiceError ? error.code : "COMFY_POLL_FAILED",
          "unknown",
          error instanceof ServiceError ? error.status : undefined,
        );
        failure.comfyReceipt = receipt;
        failure.providerRequestId = receipt.promptId;
        throw failure;
      }
    },
    async downloadOriginal(
      connection: ComfyConnection,
      receipt: ComfySubmissionReceipt,
      output: ComfyImageOutput,
      signal?: AbortSignal,
    ): Promise<ComfyOriginal> {
      connection = captureConnection(connection);
      receipt = captureReceipt(receipt);
      output = Object.freeze({ ...output });
      bind(connection, receipt);
      validComfyOutput(output);
      if (
        output.promptId !== receipt.promptId ||
        output.connectionId !== connection.id
      )
        throw new ServiceError("COMFY_OUTPUT_ID_CHANGED");
      const url = new URL("/view", base(connection));
      url.search = new URLSearchParams({
        filename: output.filename,
        subfolder: output.subfolder,
        type: output.type,
      }).toString();
      try {
        return await withHttp(
          options,
          signal,
          async (fetcher, requestSignal) => {
            const auth = await headers(connection, requestSignal);
            const response = await fetcher(url, {
              headers: auth,
              signal: requestSignal,
              redirect: "error",
              credentials: "omit",
            });
            requireOk(response);
            const bytes = await readBytes(response, MAX_IMAGE_BYTES);
            const mime = imageMime(bytes);
            if (
              response.headers.get("content-type")?.split(";")[0].trim() !==
              mime
            )
              throw new ServiceError("IMAGE_MIME_MISMATCH");
            return {
              index: output.index,
              bytes,
              mime,
              signatureVerified: true,
              promptId: receipt.promptId,
              nodeId: output.nodeId,
              filename: output.filename,
            };
          },
        );
      } catch (error) {
        const failure = new ComfyServiceError(
          error instanceof ServiceError ? error.code : "COMFY_ORIGINAL_FAILED",
          "unknown",
          error instanceof ServiceError ? error.status : undefined,
        );
        failure.comfyReceipt = receipt;
        failure.providerRequestId = receipt.promptId;
        throw failure;
      }
    },
    async requestCancel(
      connection: ComfyConnection,
      receipt: ComfySubmissionReceipt,
      signal?: AbortSignal,
    ): Promise<ComfyCancelReceipt> {
      connection = captureConnection(connection);
      receipt = captureReceipt(receipt);
      bind(connection, receipt);
      if (receipt.promptIdConfirmed !== true)
        return {
          receipt,
          available: false,
          cancelRequested: false,
          providerCancellationConfirmed: false,
          reason: "提交回执未确认服务端任务标识，不能安全取消。",
        };
      try {
        return await withHttp(
          options,
          signal,
          async (fetcher, requestSignal) => {
            const auth = await headers(connection, requestSignal);
            const response = await fetcher(
              new URL(`/api/jobs/${receipt.promptId}/cancel`, base(connection)),
              {
                method: "POST",
                headers: { ...auth, "content-type": "application/json" },
                body: "{}",
                signal: requestSignal,
                redirect: "error",
                credentials: "omit",
              },
            );
            if ([404, 405].includes(response.status))
              return {
                receipt,
                available: false,
                cancelRequested: false,
                providerCancellationConfirmed: false,
                reason: "该 ComfyUI 服务未提供按任务标识的安全取消接口。",
              };
            requireOk(response);
            const value = await readJson(response, 4096);
            if (!record(value) || typeof value.cancelled !== "boolean")
              throw new ServiceError("INVALID_COMFY_CANCEL_RESPONSE");
            return {
              receipt,
              available: true,
              cancelRequested: value.cancelled,
              providerCancellationConfirmed: false,
            };
          },
        );
      } catch (error) {
        const failure = new ComfyServiceError(
          error instanceof ServiceError ? error.code : "COMFY_CANCEL_UNKNOWN",
          "unknown",
          error instanceof ServiceError ? error.status : undefined,
        );
        failure.comfyReceipt = receipt;
        failure.providerRequestId = receipt.promptId;
        throw failure;
      }
    },
  };
}
