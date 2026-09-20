import { z } from "zod";
import {
  usesNativeAssets,
  storeNativeAsset,
  readNativeAsset,
  listNativeAssets,
} from "./nativeAssetAdapter.ts";

export const assetProvenanceSchema = z.object({
  provider: z.string().max(80).optional(),
  model: z.string().max(120).optional(),
  providerRequestId: z.string().max(200).optional(),
  connectionId: z.string().max(160).optional(),
  c2paPresent: z.boolean().optional(),
  synthIdSignal: z.boolean().optional(),
  generatedAt: z.string().datetime(),
});
export type AssetProvenance = z.infer<typeof assetProvenanceSchema>;

export interface StoredGeneratedAsset {
  assetId: string;
  sha256: string;
  preview: string;
  mime: string;
  tags: string[];
  sourceJobId?: string;
  promptHash?: string;
  parentId?: string;
  isAiGenerated?: boolean;
  source?: "provider" | "upload";
  origins?: Array<{
    sourceJobId?: string;
    promptHash?: string;
    parentId?: string;
    provenance: AssetProvenance;
  }>;
  provenance: AssetProvenance;
}

/** Client-facing route identity. The provider's temporary URL is never returned here. */
export function authenticatedAssetRoute(
  assetId: string,
  routeBase = "/assets",
): string {
  if (!/^asset-[a-f0-9]{24}$/i.test(assetId)) throw new Error("素材标识无效。");
  const base = routeBase.replace(/\/$/, "");
  return `${base}/${encodeURIComponent(assetId)}`;
}

const ASSET_DATABASE = "kk-studio-assets";
const ASSET_STORE = "blobs";
const MAX_ASSET_BYTES = 100 * 1024 * 1024;
const ALLOWED_MIME =
  /^(image\/(png|jpeg|webp|gif)|video\/(mp4|webm)|audio\/(mpeg|wav|ogg))$/i;

function openAssetDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(ASSET_DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(ASSET_STORE))
        request.result.createObjectStore(ASSET_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("无法打开素材归档存储。"));
  });
}

async function persistBlob(
  id: string,
  blob: Blob,
  metadata: StoredGeneratedAsset,
): Promise<void> {
  if (typeof indexedDB === "undefined")
    throw new Error("当前环境没有可用的素材归档存储。");
  const db = await openAssetDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(ASSET_STORE, "readwrite");
    const store = transaction.objectStore(ASSET_STORE);
    const existing = store.get(id);
    existing.onsuccess = () => {
      const old = (
        existing.result as { metadata?: StoredGeneratedAsset } | undefined
      )?.metadata;
      if (old) {
        if (old.sha256 !== metadata.sha256) {
          transaction.abort();
          return;
        }
        const origins = [
          ...(old.origins ?? [
            {
              sourceJobId: old.sourceJobId,
              promptHash: old.promptHash,
              parentId: old.parentId,
              provenance: old.provenance,
            },
          ]),
          {
            sourceJobId: metadata.sourceJobId,
            promptHash: metadata.promptHash,
            parentId: metadata.parentId,
            provenance: metadata.provenance,
          },
        ];
        const unique = origins
          .filter(
            (origin, index) =>
              origins.findIndex(
                (entry) =>
                  entry.sourceJobId === origin.sourceJobId &&
                  entry.promptHash === origin.promptHash,
              ) === index,
          )
          .slice(-200);
        // Content deduplication never erases prior AI provenance when those bytes are uploaded again.
        const canonical =
          old.isAiGenerated !== false
            ? old
            : metadata.isAiGenerated
              ? metadata
              : old;
        Object.assign(metadata, canonical, {
          origins: unique,
          tags: [...new Set([...old.tags, ...metadata.tags])].slice(0, 20),
        });
      }
      store.put({ blob, metadata }, id);
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("无法保存素材归档。"));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("素材归档被中断。"));
  }).finally(() => db.close());
}

export async function loadStoredAsset(
  id: string,
): Promise<StoredGeneratedAsset | null> {
  if (usesNativeAssets()) return readNativeAsset(id);
  if (typeof indexedDB === "undefined") return null;
  const db = await openAssetDatabase();
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(ASSET_STORE, "readonly")
      .objectStore(ASSET_STORE)
      .get(id);
    request.onsuccess = () => {
      db.close();
      const value = request.result as
        { metadata?: StoredGeneratedAsset } | undefined;
      resolve(value?.metadata ?? null);
    };
    request.onerror = () => {
      db.close();
      reject(request.error ?? new Error("无法读取素材归档。"));
    };
  });
}

function bytesToDataUrl(bytes: Uint8Array, mime: string): string {
  let binary = "";
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  return `data:${mime};base64,${btoa(binary)}`;
}

async function sourceToBlob(
  source: string,
  signal?: AbortSignal,
): Promise<Blob> {
  if (signal?.aborted) throw new Error("素材归档已取消。");
  if (source.startsWith("data:")) {
    const [header, encoded] = source.split(",", 2);
    if (!/^data:[^;,]+;base64$/i.test(header) || !encoded)
      throw new Error("生成结果不是受支持的 Base64 媒体资源。");
    const mime =
      header.match(/^data:([^;]+)/i)?.[1] ?? "application/octet-stream";
    if (!ALLOWED_MIME.test(mime))
      throw new Error("生成结果的媒体类型不受支持。");
    let binary: string;
    try {
      binary = atob(encoded);
    } catch {
      throw new Error("生成结果的 Base64 数据无效。");
    }
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    if (bytes.byteLength > MAX_ASSET_BYTES)
      throw new Error("生成结果超过 100 MB 大小限制。");
    return new Blob([bytes], {
      type: mime,
    });
  }
  const url = new URL(source);
  if (url.protocol !== "https:" && url.protocol !== "http:")
    throw new Error("供应商返回的资源地址协议不受支持。");
  const response = await fetch(url, {
    credentials: "omit",
    redirect: "error",
    signal,
  });
  if (!response.ok) throw new Error("生成结果下载失败，结果链接可能已过期。");
  const contentLength = Number(response.headers.get("Content-Length") ?? 0);
  if (contentLength > MAX_ASSET_BYTES)
    throw new Error("生成结果超过 100 MB 大小限制。");
  const blob = await response.blob();
  if (blob.size > MAX_ASSET_BYTES)
    throw new Error("生成结果超过 100 MB 大小限制。");
  const mime = blob.type || "application/octet-stream";
  if (!ALLOWED_MIME.test(mime)) throw new Error("生成结果的媒体类型不受支持。");
  return blob;
}

async function digest(bytes: Uint8Array): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const hash = await crypto.subtle.digest(
      "SHA-256",
      new Uint8Array(bytes).buffer as ArrayBuffer,
    );
    return Array.from(new Uint8Array(hash), (value) =>
      value.toString(16).padStart(2, "0"),
    ).join("");
  }
  throw new Error("当前运行环境不支持 SHA-256，无法建立稳定素材标识。");
}

/** Hashes prompt text without persisting the prompt itself in asset metadata. */
export async function hashPrompt(prompt: string): Promise<string | undefined> {
  try {
    const bytes = new TextEncoder().encode(prompt);
    return await digest(bytes);
  } catch {
    return undefined;
  }
}

function assetId(sha256: string): string {
  return `asset-${sha256.slice(0, 24)}`;
}

/**
 * Downloads a provider result immediately and returns a stable local identity.
 * The preview remains a data URL so existing canvas snapshots can recover it.
 */
export async function storeGeneratedAsset(options: {
  source: string;
  provider?: string;
  model?: string;
  providerRequestId?: string;
  connectionId?: string;
  sourceJobId?: string;
  promptHash?: string;
  parentId?: string;
  isAiGenerated?: boolean;
  c2paPresent?: boolean;
  synthIdSignal?: boolean;
  sourceKind?: "provider" | "upload";
  tags?: string[];
  signal?: AbortSignal;
}): Promise<StoredGeneratedAsset> {
  const blob = await sourceToBlob(options.source, options.signal);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const sha256 = await digest(bytes);
  if (options.signal?.aborted) throw new Error("素材归档已取消。");
  const mime = blob.type || "image/png";
  const stored: StoredGeneratedAsset = {
    assetId: assetId(sha256),
    sha256,
    preview: bytesToDataUrl(bytes, mime),
    mime,
    tags: [...new Set((options.tags ?? ["AI生成"]).filter(Boolean))].slice(
      0,
      20,
    ),
    sourceJobId: options.sourceJobId,
    promptHash: options.promptHash,
    parentId: options.parentId,
    isAiGenerated: options.isAiGenerated ?? true,
    source: options.sourceKind ?? "provider",
    provenance: {
      provider: options.provider,
      model: options.model,
      providerRequestId: options.providerRequestId,
      connectionId: options.connectionId,
      c2paPresent: options.c2paPresent,
      synthIdSignal: options.synthIdSignal,
      generatedAt: new Date().toISOString(),
    },
  };
  if (options.signal?.aborted) throw new Error("素材归档已取消。");
  if (usesNativeAssets()) return storeNativeAsset(stored);
  await persistBlob(stored.assetId, blob, stored);
  return stored;
}

/** Reads only the non-secret metadata needed to show archived results in Asset Library. */
export async function listStoredAssets(): Promise<StoredGeneratedAsset[]> {
  if (usesNativeAssets()) return listNativeAssets();
  if (typeof indexedDB === "undefined") return [];
  const db = await openAssetDatabase();
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(ASSET_STORE, "readonly")
      .objectStore(ASSET_STORE)
      .getAll();
    request.onsuccess = () => {
      db.close();
      const values = Array.isArray(request.result) ? request.result : [];
      resolve(
        values.flatMap((value) => {
          const metadata = (value as { metadata?: unknown })?.metadata;
          if (!metadata || typeof metadata !== "object") return [];
          const parsed = assetProvenanceSchema.safeParse(
            (metadata as { provenance?: unknown }).provenance,
          );
          if (!parsed.success) return [];
          return [
            {
              ...(metadata as StoredGeneratedAsset),
              provenance: parsed.data,
              tags: Array.isArray((metadata as { tags?: unknown }).tags)
                ? (metadata as { tags: unknown[] }).tags.filter(
                    (tag): tag is string => typeof tag === "string",
                  )
                : ["AI生成"],
            },
          ];
        }),
      );
    };
    request.onerror = () => {
      db.close();
      reject(request.error ?? new Error("无法读取素材归档。"));
    };
  });
}
