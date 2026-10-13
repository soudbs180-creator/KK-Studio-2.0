import {
  getModelsEndpoint,
  modelListSchema,
  modelProviderSchema,
  resolveProviderProtocol,
  type ProviderProtocolOptions,
} from "../domain/modelProvider.ts";
import { providerRequestHeaders } from "./providerTextProtocol.ts";
import {
  parseCatalogModels,
  type CatalogModel,
} from "../features/models/modelCatalog.ts";

export async function checkModelProvider(
  baseUrl: string,
  apiKey: string,
  signal: AbortSignal,
  options: ProviderProtocolOptions = {},
): Promise<CatalogModel[]> {
  modelProviderSchema.parse({
    version: 1,
    name: "provider",
    baseUrl,
    model: "",
    protocol: options.protocol,
    authMode: options.authMode,
  });
  const protocol = resolveProviderProtocol(options);
  const headers = providerRequestHeaders(baseUrl, apiKey, options);
  const url = new URL(getModelsEndpoint(baseUrl));
  const models: CatalogModel[] = [];
  const tokens = new Set<string>();
  for (let page = 0; page < 10; page++) {
    signal.throwIfAborted();
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...headers,
      },
      credentials: "omit",
      redirect: "error",
      signal,
    });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new Error(
        `连接失败（HTTP ${response.status}）。请检查地址、密钥和服务权限。`,
      );
    }
    let payload: unknown;
    try {
      payload = await readModelPayload(response, signal);
    } catch {
      signal.throwIfAborted();
      throw new Error(
        "服务未返回有效的模型列表，请检查 API Base URL 是否指向模型接口。",
      );
    }
    const data =
      payload && typeof payload === "object"
        ? (payload as Record<string, unknown>)
        : {};
    const normalized =
      protocol === "gemini" && Array.isArray(data.models)
        ? {
            data: data.models.map((item: unknown) => {
              const model =
                item && typeof item === "object"
                  ? (item as Record<string, unknown>)
                  : {};
              return {
                id:
                  typeof model.name === "string"
                    ? model.name.replace(/^models\//, "")
                    : undefined,
                capabilities: {
                  modalities:
                    Array.isArray(model.supportedGenerationMethods) &&
                    model.supportedGenerationMethods.includes("generateContent")
                      ? ["text"]
                      : [],
                },
              };
            }),
          }
        : payload;
    if (!modelListSchema.safeParse(normalized).success) {
      throw new Error(
        "响应不符合所选协议的模型列表格式，请检查 API 地址和接口协议。",
      );
    }
    models.push(...parseCatalogModels(normalized));
    if (models.length > 5000)
      throw new Error("模型目录过大，请使用更小的目录范围。");
    const next =
      protocol === "gemini"
        ? data.nextPageToken
        : protocol === "anthropic-messages" && data.has_more === true
          ? data.last_id
          : undefined;
    if (!next) {
      if (protocol === "anthropic-messages" && data.has_more === true)
        throw new Error("模型列表分页信息无效。");
      return models.filter(
        (model, index) =>
          models.findIndex((item) => item.id === model.id) === index,
      );
    }
    if (typeof next !== "string" || next.length > 4096 || tokens.has(next))
      throw new Error("模型列表分页信息无效。");
    tokens.add(next);
    url.searchParams.set(
      protocol === "gemini" ? "pageToken" : "after_id",
      next,
    );
  }
  throw new Error("模型列表分页超过限制，请检查服务端。");
}

async function readModelPayload(
  response: Response,
  signal: AbortSignal,
): Promise<unknown> {
  if (!response.body) throw new Error("empty response");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  const abort = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", abort, { once: true });
  try {
    while (true) {
      const chunk = await reader.read();
      signal.throwIfAborted();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 2 * 1024 * 1024) throw new Error("oversized response");
      chunks.push(chunk.value);
    }
    const all = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      all.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(all));
  } finally {
    signal.removeEventListener("abort", abort);
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
