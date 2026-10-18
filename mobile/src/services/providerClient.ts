import type {
  GenerationInput,
  ImageInput,
  TextReceipt,
  ImageReceipt,
  ProviderConnection,
  CredentialReader,
  ModelProbe,
  SubmissionIdentity,
  ImageOriginal,
} from "./providerTypes.ts";
import {
  checkedAssetUrl,
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
import { readTextStream } from "./textStream.ts";
import { decodeBase64, imageMime, MAX_IMAGE_BYTES } from "./imageBytes.ts";
import {
  isTwelveAiConnection,
  supportsImageReferences,
} from "./twelveAiProtocol.ts";
export function createProviderClient(
  options: HttpOptions & { credentials: CredentialReader },
) {
  const started = new Set<string>();
  function endpoint(connection: ProviderConnection, route: string) {
    const base = checkedUrl(connection.baseUrl, options.allowLoopbackHttp);
    if (base.pathname === "/") base.pathname = "/v1/";
    else if (!base.pathname.endsWith("/")) base.pathname += "/";
    return new URL(route, base);
  }
  async function authorization(
    connection: ProviderConnection,
    signal: AbortSignal,
  ) {
    const secret = await options.credentials.read(connection.credentialRef);
    if (signal.aborted) throw new ServiceError("REQUEST_ABORTED");
    if (!secret || /[\r\n]/.test(secret))
      throw new ServiceError("PROVIDER_CREDENTIAL_REQUIRED");
    return { authorization: `Bearer ${secret}` };
  }
  function capture(
    input: GenerationInput,
    imageReferences = false,
  ): SubmissionIdentity {
    endpoint(input.connection, "models");
    if (
      !/^[A-Za-z0-9_-]{1,180}$/.test(input.submissionId) ||
      !nonempty(input.projectId) ||
      !nonempty(input.model) ||
      !input.prompt.trim() ||
      input.prompt.length > 32_000 ||
      !nonempty(input.connection.id) ||
      !nonempty(input.connection.credentialRef)
    )
      throw new ServiceError("INVALID_GENERATION_INPUT");
    if (input.attachments?.length && !imageReferences)
      throw new ServiceError("REFERENCE_INPUT_UNAVAILABLE");
    return Object.freeze({
      submissionId: input.submissionId,
      projectId: input.projectId,
      connectionId: input.connection.id,
      model: input.model,
      prompt: input.prompt,
      capturedAt: Date.now(),
    });
  }
  function start(identity: SubmissionIdentity) {
    if (started.has(identity.submissionId))
      throw new ServiceError("SUBMISSION_ALREADY_STARTED", "unknown");
    if (started.size >= 1000)
      throw new ServiceError("SUBMISSION_HISTORY_LIMIT");
    started.add(identity.submissionId);
  }
  async function submit<T>(
    input: GenerationInput,
    signal: AbortSignal | undefined,
    operation: (
      fetcher: typeof fetch,
      headers: Record<string, string>,
      requestSignal: AbortSignal,
      identity: SubmissionIdentity,
      markStarted: () => void,
      observe: (progress: {
        providerRequestId?: string;
        recoveryReceipt?: ImageReceipt;
      }) => void,
    ) => Promise<T>,
    imageReferences = false,
  ) {
    const capturedInput = {
      ...input,
      connection: {
        ...input.connection,
        capabilities: { ...input.connection.capabilities },
      },
    };
    const identity = capture(capturedInput, imageReferences);
    let sent = false;
    // This state must outlive the HTTP action: deadline/abort can win its race.
    let progress: {
      providerRequestId?: string;
      recoveryReceipt?: ImageReceipt;
    } = {};
    try {
      return await withHttp(options, signal, async (fetcher, requestSignal) => {
        const headers = await authorization(
          capturedInput.connection,
          requestSignal,
        );
        return operation(
          fetcher,
          {
            ...headers,
            "content-type": "application/json",
            "idempotency-key": identity.submissionId,
          },
          requestSignal,
          identity,
          () => {
            start(identity);
            sent = true;
          },
          (update) => {
            progress = { ...progress, ...update };
          },
        );
      });
    } catch (error) {
      const failure =
        error instanceof ServiceError
          ? error
          : new ServiceError(
              "PROVIDER_REQUEST_FAILED",
              sent ? "unknown" : "intent",
            );
      if (sent && !failure.rejectedBeforeAcceptance)
        failure.submissionState = "unknown";
      if (progress.providerRequestId)
        failure.providerRequestId = progress.providerRequestId;
      if (progress.recoveryReceipt)
        failure.recoveryReceipt = progress.recoveryReceipt;
      throw failure;
    }
  }
  async function original(
    fetcher: typeof fetch,
    url: URL,
    headers: Record<string, string>,
    signal: AbortSignal,
    index: number,
  ): Promise<ImageOriginal> {
    let response: Response;
    try {
      response = await fetcher(url, {
        headers,
        signal,
        redirect: "error",
        credentials: "omit",
      });
    } catch (error) {
      if (signal.aborted || error instanceof ServiceError) throw error;
      throw new ServiceError("IMAGE_ORIGINAL_RETRIEVAL_FAILED");
    }
    if (!response.ok)
      throw new ServiceError(
        "IMAGE_ORIGINAL_RETRIEVAL_FAILED",
        "unknown",
        response.status,
      );
    const bytes = await readBytes(response, MAX_IMAGE_BYTES);
    const mime = imageMime(bytes);
    const claimed = response.headers.get("content-type")?.split(";")[0].trim();
    if (claimed && claimed !== "application/octet-stream" && claimed !== mime)
      throw new ServiceError("IMAGE_MIME_MISMATCH");
    return { index, bytes, mime, signatureVerified: true };
  }
  return {
    async probeModels(
      connection: ProviderConnection,
      signal?: AbortSignal,
    ): Promise<ModelProbe> {
      const url = endpoint(connection, "models");
      return withHttp(options, signal, async (fetcher, requestSignal) => {
        const headers = await authorization(connection, requestSignal);
        const response = await fetcher(url, {
          headers,
          signal: requestSignal,
          redirect: "error",
          credentials: "omit",
        });
        requireOk(response);
        const value = await readJson(response);
        if (
          !record(value) ||
          !Array.isArray(value.data) ||
          value.data.length > 5000
        )
          throw new ServiceError("INVALID_MODELS_RESPONSE");
        const models = value.data.map((model: unknown) => {
          if (!record(model) || !nonempty(model.id))
            throw new ServiceError("INVALID_MODEL");
          return {
            id: model.id,
            text: "unknown" as const,
            image: "unknown" as const,
          };
        });
        return {
          connectionId: connection.id,
          models,
          health: "reachable" as const,
          generationVerified: false as const,
        };
      });
    },
    async generateText(
      input: GenerationInput,
      onDelta: (delta: string) => void,
      signal?: AbortSignal,
    ): Promise<TextReceipt> {
      if (
        !input.connection.capabilities.text ||
        input.connection.protocol !== "openai-compatible"
      )
        throw new ServiceError("TEXT_CAPABILITY_UNAVAILABLE");
      const url = endpoint(input.connection, "chat/completions");
      return submit(
        input,
        signal,
        async (
          fetcher,
          headers,
          requestSignal,
          identity,
          markStarted,
          observe,
        ) => {
          markStarted();
          const response = await fetcher(url, {
            method: "POST",
            headers: { ...headers, accept: "text/event-stream" },
            body: JSON.stringify({
              model: identity.model,
              messages: [{ role: "user", content: identity.prompt }],
              stream: true,
            }),
            signal: requestSignal,
            redirect: "error",
            credentials: "omit",
          });
          requireSubmissionOk(response);
          const result = await readTextStream(
            response,
            onDelta,
            requestSignal,
            (providerRequestId) => observe({ providerRequestId }),
          );
          if (requestSignal.aborted) throw new ServiceError("REQUEST_ABORTED");
          return { identity, submissionState: "terminal", ...result };
        },
      );
    },
    async generateImages(
      input: ImageInput,
      signal?: AbortSignal,
    ): Promise<ImageReceipt> {
      if (
        !input.connection.capabilities.image ||
        input.connection.protocol !== "openai-compatible"
      )
        throw new ServiceError("IMAGE_CAPABILITY_UNAVAILABLE");
      const count = input.count ?? 1;
      const size = input.size;
      if (
        !Number.isInteger(count) ||
        count < 1 ||
        count > Math.min(4, input.connection.capabilities.maxOutputs ?? 1)
      )
        throw new ServiceError("IMAGE_COUNT_UNAVAILABLE");
      if (
        size !== undefined &&
        !input.connection.capabilities.imageSizes?.includes(size)
      )
        throw new ServiceError("IMAGE_SIZE_UNAVAILABLE");
      const references = input.referenceImages ?? [];
      const attachments = input.attachments ?? [];
      if (
        references.length !== attachments.length ||
        (attachments.length &&
          !supportsImageReferences(input.connection, input.model))
      )
        throw new ServiceError("REFERENCE_INPUT_UNAVAILABLE");
      let body: FormData | undefined;
      if (attachments.length) {
        body = new FormData();
        body.append("model", input.model);
        body.append("prompt", input.prompt);
        body.append("n", String(count));
        if (size !== undefined) body.append("size", size);
        body.append("response_format", "b64_json");
        for (const [index, attachment] of attachments.entries()) {
          const reference = references[index];
          if (
            !attachment.assetId ||
            attachment.dataUrl !== undefined ||
            attachment.assetId !== reference.assetId ||
            attachment.mime !== reference.mime ||
            attachment.size !== reference.bytes.byteLength ||
            !reference.bytes.byteLength ||
            reference.bytes.byteLength > MAX_IMAGE_BYTES ||
            imageMime(reference.bytes) !== reference.mime
          )
            throw new ServiceError("INVALID_REFERENCE_ORIGINAL");
          body.append(
            "image[]",
            new Blob([reference.bytes.slice()], { type: reference.mime }),
            `${attachment.id}.${reference.mime.split("/")[1]}`,
          );
        }
      }
      const url = endpoint(
        input.connection,
        body ? "images/edits" : "images/generations",
      );
      const preferBase64 = isTwelveAiConnection(input.connection);
      return submit(
        input,
        signal,
        async (
          fetcher,
          headers,
          requestSignal,
          identity,
          markStarted,
          observe,
        ) => {
          if (body) delete headers["content-type"];
          markStarted();
          const response = await fetcher(url, {
            method: "POST",
            headers,
            body:
              body ??
              JSON.stringify({
                model: identity.model,
                prompt: identity.prompt,
                n: count,
                ...(size ? { size } : {}),
                ...(preferBase64 ? { response_format: "b64_json" } : {}),
              }),
            signal: requestSignal,
            redirect: "error",
            credentials: "omit",
          });
          requireSubmissionOk(response);
          const originals: ImageOriginal[] = [];
          const requestId = response.headers.get("x-request-id");
          const providerRequestId =
            requestId && nonempty(requestId) ? requestId : undefined;
          const observeRecovery = () =>
            observe({
              providerRequestId,
              recoveryReceipt: {
                identity,
                submissionState: "unknown",
                providerRequestId,
                originals: [...originals],
                archivalState: "pending",
              },
            });
          observeRecovery();
          const value = await readJson(response, count * 23 * 1024 * 1024);
          if (
            !record(value) ||
            !Array.isArray(value.data) ||
            value.data.length !== count
          )
            throw new ServiceError("INVALID_IMAGE_RESPONSE");
          for (const [index, item] of value.data.entries()) {
            if (!record(item)) throw new ServiceError("INVALID_IMAGE_RESPONSE");
            if (typeof item.b64_json === "string") {
              const bytes = decodeBase64(item.b64_json);
              originals.push({
                index,
                bytes,
                mime: imageMime(bytes),
                signatureVerified: true,
              });
            } else if (typeof item.url === "string") {
              const assetUrl = checkedAssetUrl(
                item.url,
                options.allowLoopbackHttp,
              );
              originals.push(
                await original(
                  fetcher,
                  assetUrl,
                  assetUrl.origin === url.origin
                    ? { authorization: headers.authorization }
                    : {},
                  requestSignal,
                  index,
                ),
              );
            } else throw new ServiceError("IMAGE_ORIGINAL_MISSING");
            observeRecovery();
          }
          if (requestSignal.aborted) throw new ServiceError("REQUEST_ABORTED");
          return {
            identity,
            submissionState: "terminal",
            providerRequestId,
            originals,
            archivalState: "pending",
          };
        },
        !!body,
      );
    },
  };
}
