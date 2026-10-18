import type {
  CredentialReader,
  GenerationInput,
  ProviderConnection,
  SubmissionIdentity,
} from "./providerTypes.ts";
import {
  checkedAssetUrl,
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
import { isTwelveAiConnection } from "./twelveAiProtocol.ts";
import { videoModelProfile } from "./twelveAiVideoModels.ts";

export interface VideoJob {
  id: string;
  status: "queued" | "processing" | "in_progress" | "completed" | "failed";
  /** Request-local signed URLs; they must not enter project snapshots or logs. */
  outputs: string[];
}
export interface VideoOriginal {
  index: 0;
  bytes: Uint8Array;
  mime: "video/mp4";
  signatureVerified: true;
}
export interface VideoReceipt {
  identity: SubmissionIdentity;
  submissionState: "submitted" | "unknown" | "terminal";
  providerRequestId: string;
  originals: VideoOriginal[];
  archivalState: "pending";
}
const identityPattern = /^[A-Za-z0-9._:-]{1,200}$/;
const safeRequest = {
  redirect: "error",
  credentials: "omit",
  referrerPolicy: "no-referrer",
} as const;
function requireVideo(connection: ProviderConnection, model: string) {
  const profile = videoModelProfile(model);
  if (!isTwelveAiConnection(connection) || !profile)
    throw new ServiceError("VIDEO_MODEL_UNAVAILABLE");
  return profile;
}
function endpoint(connection: ProviderConnection, route: string) {
  return new URL(`/v1/${route}`, new URL(connection.baseUrl).origin);
}
function job(
  value: unknown,
  protocol: "task" | "sora",
  expected?: string,
): VideoJob {
  if (
    !record(value) ||
    typeof value.id !== "string" ||
    !identityPattern.test(value.id) ||
    (expected !== undefined && expected !== value.id) ||
    !["queued", "processing", "in_progress", "completed", "failed"].includes(
      String(value.status),
    )
  )
    throw new ServiceError("INVALID_VIDEO_JOB", "unknown");
  const outputs =
    protocol === "sora"
      ? value.output === undefined
        ? []
        : [value.output]
      : (value.outputs ?? []);
  if (
    !Array.isArray(outputs) ||
    outputs.length > 1 ||
    outputs.some(
      (output) => typeof output !== "string" || output.length > 8192,
    ) ||
    (value.status === "completed" &&
      protocol === "task" &&
      outputs.length !== 1)
  )
    throw new ServiceError("INVALID_VIDEO_OUTPUT", "unknown");
  return {
    id: value.id,
    status: value.status as VideoJob["status"],
    outputs: outputs as string[],
  };
}
/** Check bounded ISO BMFF structure; playback/codec support is verified by the existing player. */
function mp4(bytes: Uint8Array): void {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (start: number) =>
    String.fromCharCode(...bytes.subarray(start, start + 4));
  let offset = 0,
    header = false,
    movie = false,
    media = false;
  while (offset < bytes.length) {
    if (bytes.length - offset < 8)
      throw new ServiceError("INVALID_VIDEO_BYTES");
    let size = view.getUint32(offset);
    const type = ascii(offset + 4);
    let minimum = 8;
    if (size === 1) {
      if (bytes.length - offset < 16 || view.getUint32(offset + 8) !== 0)
        throw new ServiceError("INVALID_VIDEO_BYTES");
      size = view.getUint32(offset + 12);
      minimum = 16;
    } else if (size === 0) size = bytes.length - offset;
    if (size < minimum || size > bytes.length - offset)
      throw new ServiceError("INVALID_VIDEO_BYTES");
    if (offset === 0) {
      if (
        type !== "ftyp" ||
        size < minimum + 8 ||
        ![
          "isom",
          "iso2",
          "iso4",
          "iso5",
          "iso6",
          "mp41",
          "mp42",
          "avc1",
          "dash",
          "M4V ",
        ].includes(ascii(offset + minimum))
      )
        throw new ServiceError("INVALID_VIDEO_BYTES");
      header = true;
    }
    if (type === "moov" && size > minimum) movie = true;
    if (type === "mdat" && size > minimum) media = true;
    offset += size;
  }
  if (!header || !movie || !media)
    throw new ServiceError("INVALID_VIDEO_BYTES");
}
export function createTwelveAiVideoClient(
  options: HttpOptions & { credentials: CredentialReader },
) {
  const started = new Set<string>();
  async function headers(connection: ProviderConnection, signal: AbortSignal) {
    const secret = await options.credentials.read(connection.credentialRef);
    if (signal.aborted) throw new ServiceError("REQUEST_ABORTED");
    if (!secret || /[\r\n]/.test(secret))
      throw new ServiceError("PROVIDER_CREDENTIAL_REQUIRED");
    return { authorization: `Bearer ${secret}` };
  }
  async function original(
    connection: ProviderConnection,
    route: URL,
    authenticated: boolean,
    signal?: AbortSignal,
  ): Promise<VideoOriginal> {
    return withHttp(options, signal, async (fetcher, requestSignal) => {
      const response = await fetcher(route, {
        ...safeRequest,
        method: "GET",
        signal: requestSignal,
        ...(authenticated
          ? { headers: await headers(connection, requestSignal) }
          : {}),
      });
      requireOk(response);
      const bytes = await readBytes(response, 16 * 1024 * 1024);
      mp4(bytes);
      const mime = response.headers
        .get("content-type")
        ?.split(";")[0]
        .trim()
        .toLowerCase();
      if (mime && !["video/mp4", "application/octet-stream"].includes(mime))
        throw new ServiceError("VIDEO_MIME_MISMATCH");
      return { index: 0, bytes, mime: "video/mp4", signatureVerified: true };
    });
  }
  return {
    async submit(
      input: GenerationInput,
      signal?: AbortSignal,
      onAccepted?: (id: string) => Promise<void>,
    ): Promise<VideoJob> {
      input = structuredClone(input);
      const profile = requireVideo(input.connection, input.model);
      if (
        !identityPattern.test(input.submissionId) ||
        !nonempty(input.projectId) ||
        !nonempty(input.connection.id) ||
        !nonempty(input.connection.credentialRef) ||
        !input.prompt.trim() ||
        input.prompt.length > 5000
      )
        throw new ServiceError("INVALID_VIDEO_INPUT");
      if (input.attachments?.length)
        throw new ServiceError("REFERENCE_INPUT_UNAVAILABLE");
      if (started.has(input.submissionId))
        throw new ServiceError("SUBMISSION_ALREADY_STARTED", "unknown");
      let sent = false;
      let acceptedId: string | undefined;
      try {
        return await withHttp(
          options,
          signal,
          async (fetcher, requestSignal) => {
            const auth = await headers(input.connection, requestSignal);
            if (started.has(input.submissionId))
              throw new ServiceError("SUBMISSION_ALREADY_STARTED", "unknown");
            if (started.size >= 1000)
              throw new ServiceError("SUBMISSION_HISTORY_LIMIT");
            started.add(input.submissionId);
            sent = true;
            const response = await fetcher(
              endpoint(
                input.connection,
                profile.protocol === "sora" ? "videos" : "task/submit",
              ),
              {
                ...safeRequest,
                method: "POST",
                headers: { ...auth, "content-type": "application/json" },
                body: JSON.stringify(profile.body(input.prompt)),
                signal: requestSignal,
              },
            );
            requireSubmissionOk(response);
            const value = await readJson(response);
            if (
              record(value) &&
              typeof value.id === "string" &&
              identityPattern.test(value.id)
            ) {
              acceptedId = value.id;
              await onAccepted?.(acceptedId);
            }
            return job(value, profile.protocol);
          },
        );
      } catch (error) {
        const failure =
          error instanceof ServiceError
            ? error
            : new ServiceError("VIDEO_SUBMISSION_FAILED");
        if (sent && !failure.rejectedBeforeAcceptance)
          failure.submissionState = "unknown";
        if (acceptedId) failure.providerRequestId = acceptedId;
        throw failure;
      }
    },
    async get(
      connection: ProviderConnection,
      model: string,
      id: string,
      signal?: AbortSignal,
    ): Promise<VideoJob> {
      connection = structuredClone(connection);
      const profile = requireVideo(connection, model);
      if (!identityPattern.test(id))
        throw new ServiceError("INVALID_VIDEO_ID", "unknown");
      try {
        return await withHttp(
          options,
          signal,
          async (fetcher, requestSignal) => {
            const response = await fetcher(
              endpoint(
                connection,
                `${profile.protocol === "sora" ? "videos" : "task"}/${encodeURIComponent(id)}`,
              ),
              {
                ...safeRequest,
                method: "GET",
                headers: await headers(connection, requestSignal),
                signal: requestSignal,
              },
            );
            requireOk(response);
            return job(await readJson(response), profile.protocol, id);
          },
        );
      } catch (error) {
        const failure =
          error instanceof ServiceError
            ? error
            : new ServiceError("VIDEO_QUERY_FAILED");
        failure.submissionState = "unknown";
        throw failure;
      }
    },
    async download(
      connection: ProviderConnection,
      model: string,
      result: VideoJob,
      signal?: AbortSignal,
    ): Promise<VideoOriginal> {
      connection = structuredClone(connection);
      result = structuredClone(result);
      const profile = requireVideo(connection, model);
      if (!identityPattern.test(result.id) || result.status !== "completed")
        throw new ServiceError("VIDEO_NOT_COMPLETED", "unknown");
      try {
        if (result.outputs.length === 1) {
          try {
            const route = checkedAssetUrl(result.outputs[0]);
            if (
              route.port ||
              ![
                "img.12ai.org",
                "cdn.12ai.org",
                "new.12ai.org",
                "api.12ai.org",
              ].includes(route.hostname)
            )
              throw new ServiceError("VIDEO_ASSET_URL_UNAVAILABLE", "unknown");
            return await original(connection, route, false, signal);
          } catch (error) {
            if (profile.protocol !== "sora" || signal?.aborted) throw error;
          }
        } else if (profile.protocol !== "sora")
          throw new ServiceError("INVALID_VIDEO_OUTPUT", "unknown");
        return await original(
          connection,
          endpoint(
            connection,
            `videos/${encodeURIComponent(result.id)}/content`,
          ),
          true,
          signal,
        );
      } catch (error) {
        const failure =
          error instanceof ServiceError
            ? error
            : new ServiceError("VIDEO_ORIGINAL_RETRIEVAL_FAILED");
        failure.submissionState = "unknown";
        throw failure;
      }
    },
  };
}
