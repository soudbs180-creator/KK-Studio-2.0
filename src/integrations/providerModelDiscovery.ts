import { getModelsEndpoint } from "../domain/modelProvider.ts";
import {
  providerHeaders,
  providerProtocol,
  type ProviderProtocolOptions,
} from "../domain/providerProtocol.ts";
import {
  parseCatalogModels,
  type CatalogModel,
} from "../features/models/modelCatalog.ts";

const invalid = () =>
  new Error("模型列表不完整或格式无效，请检查地址和接口协议。");
type DiscoveryPage = { data?: unknown[]; has_more?: boolean; last_id?: string };
function nextCursor(
  payload: DiscoveryPage,
  options: ProviderProtocolOptions,
  cursors: Set<string>,
): string | undefined {
  if (
    providerProtocol(options) !== "anthropic" ||
    payload.has_more === false ||
    payload.has_more === undefined
  )
    return undefined;
  if (
    payload.has_more !== true ||
    typeof payload.last_id !== "string" ||
    !payload.last_id ||
    payload.last_id.length > 120 ||
    [...payload.last_id].some(
      (c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127,
    ) ||
    cursors.has(payload.last_id)
  )
    throw invalid();
  return payload.last_id;
}
/** GET only; pagination shares one bound and never follows provider-supplied URLs. */
export async function discoverProviderModels(
  options: ProviderProtocolOptions,
  apiKey: string,
  signal: AbortSignal,
): Promise<CatalogModel[]> {
  const headers = {
    Accept: "application/json",
    ...providerHeaders(options, apiKey),
  };
  const models: CatalogModel[] = [],
    seen = new Set<string>(),
    cursors = new Set<string>();
  let bytes = 0,
    cursor = "";
  for (let page = 0; page < 32; page++) {
    signal.throwIfAborted();
    const url = new URL(getModelsEndpoint(options.baseUrl));
    if (cursor) url.searchParams.set("after_id", cursor);
    const response = await fetch(url, {
      method: "GET",
      headers,
      credentials: "omit",
      redirect: "error",
      signal,
    });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new Error(
        `连接失败（HTTP ${response.status}），请检查地址、密钥和服务权限。`,
      );
    }
    if (!response.body) throw invalid();
    const reader = response.body.getReader(),
      decoder = new TextDecoder("utf-8", { fatal: true });
    let raw = "";
    const abort = () => {
      void reader.cancel().catch(() => undefined);
    };
    signal.addEventListener("abort", abort, { once: true });
    try {
      while (true) {
        const chunk = await reader.read();
        signal.throwIfAborted();
        if (chunk.done) {
          raw += decoder.decode();
          break;
        }
        bytes += chunk.value.byteLength;
        if (bytes > 2 * 1024 * 1024) throw invalid();
        raw += decoder.decode(chunk.value, { stream: true });
      }
    } finally {
      signal.removeEventListener("abort", abort);
      await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
    let payload: { data?: unknown[]; has_more?: boolean; last_id?: string };
    try {
      payload = JSON.parse(raw);
    } catch {
      throw invalid();
    }
    if (!payload || !Array.isArray(payload.data) || payload.data.length > 5000)
      throw invalid();
    const parsed = parseCatalogModels(payload);
    if (parsed.length !== payload.data.length) throw invalid();
    for (const model of parsed) {
      if (!seen.has(model.id)) {
        seen.add(model.id);
        models.push(model);
      }
      if (models.length > 5000) throw invalid();
    }
    const next = nextCursor(payload, options, cursors);
    if (!next) return models;
    cursor = next;
    cursors.add(cursor);
  }
  throw invalid();
}
