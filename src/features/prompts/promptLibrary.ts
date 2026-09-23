/**
 * 提示词库服务（移植自 infinite-canvas web/src/services/api/prompt-source-* 与 prompts.ts）。
 *
 * 职责：管理第三方提示词来源（内置 7 个开源合集 + 自定义 URL），拉取、解析、缓存
 * 与搜索提示词条目。不依赖 zustand / localforage / i18n，缓存后端可注入，
 * 浏览器默认使用 localStorage，Node 测试环境退化为内存缓存。
 *
 * 来源：https://github.com/basketikun/infinite-canvas（MIT License）
 */

export type PromptSource = {
  id: string;
  name: string;
  url: string;
  homepage: string;
  enabled: boolean;
  builtIn: boolean;
};

export type RawPrompt = {
  id: string;
  title: string;
  prompt: string;
  description: string;
  coverUrl: string;
  referenceImageUrls: string[];
  tags: string[];
  preview: string;
  createdAt: string;
  updatedAt: string;
  author?: string;
  sourceUrl?: string;
  imageMode?: string;
  imageModel?: string;
  imageSize?: string;
  imageCount?: number;
};

export type Prompt = RawPrompt & {
  sourceId: string;
  category: string;
  githubUrl: string;
};

export type PromptSourceStatus = {
  sourceId: string;
  count: number;
  lastSuccessAt: string;
  lastError: string;
};

export type PromptSourceRefreshResult = PromptSourceStatus & {
  sourceName: string;
  success: boolean;
};

export type PromptSourceRefreshSummary = {
  results: PromptSourceRefreshResult[];
  total: number;
  successCount: number;
  failureCount: number;
};

export type PromptListResponse = {
  items: Prompt[];
  tags: string[];
  categories: string[];
  total: number;
};

export type PromptFetchOptions = {
  keyword?: string;
  tag?: string[];
  category?: string;
  page?: number;
  pageSize?: number;
};

export type PromptCache = {
  get: (sourceId: string) => Promise<PromptSourceCacheEntry | null>;
  set: (sourceId: string, entry: PromptSourceCacheEntry) => Promise<void>;
};

export type PromptSourceCacheEntry = PromptSourceStatus & {
  items: Prompt[];
  fetchedAt: number;
  signature: string;
};

export const ALL_PROMPTS_OPTION = "all";
export const PROMPT_CACHE_TTL_MS = 1000 * 60 * 60;

export const PROMPT_REGISTRY_HOMEPAGE =
  "https://github.com/yukkcat/image-prompts";
const PROMPT_REGISTRY_SOURCE_BASE =
  "https://raw.githubusercontent.com/yukkcat/image-prompts/main/dist/sources";

export const DEFAULT_PROMPT_SOURCES: PromptSource[] = [
  registrySource(
    "banana-prompt-quicker",
    "Banana Prompt Quicker",
    "https://glidea.github.io/banana-prompt-quicker/",
  ),
  registrySource(
    "davidwu-gpt-image2-prompts",
    "DavidWu GPT Image 2",
    "https://github.com/davidwuw0811-boop/awesome-gpt-image2-prompts",
  ),
  registrySource(
    "freestylefly-gpt-image-2",
    "Freestylefly GPT Image 2",
    "https://github.com/freestylefly/awesome-gpt-image-2",
  ),
  registrySource(
    "awesome-gpt-image",
    "Awesome GPT Image",
    "https://github.com/ZeroLu/awesome-gpt-image",
  ),
  registrySource(
    "awesome-gpt4o-image-prompts",
    "Awesome GPT-4o",
    "https://github.com/ImgEdify/Awesome-GPT4o-Image-Prompts",
  ),
  registrySource(
    "youmind-gpt-image-2",
    "YouMind GPT Image 2",
    "https://github.com/YouMind-OpenLab/awesome-gpt-image-2",
  ),
  registrySource(
    "youmind-nano-banana-pro",
    "YouMind Nano Banana Pro",
    "https://github.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts",
  ),
];

function registrySource(
  id: string,
  name: string,
  homepage: string,
): PromptSource {
  return {
    id,
    name,
    url: `${PROMPT_REGISTRY_SOURCE_BASE}/${id}.json`,
    homepage,
    enabled: true,
    builtIn: true,
  };
}

export function createPromptSource(
  source?: Partial<PromptSource>,
): PromptSource {
  const id = source?.id?.trim();
  return {
    id: id || `custom-${Date.now().toString(36)}`,
    name: source?.name?.trim() || "",
    url: source?.url?.trim() || "",
    homepage: source?.homepage?.trim() || "",
    enabled: source?.enabled ?? true,
    builtIn: source?.builtIn ?? false,
  };
}

export type PromptLibrary = {
  sources: PromptSource[];
  runSource: (
    source: PromptSource,
    options?: { signal?: AbortSignal },
  ) => Promise<RawPrompt[]>;
  fetchPrompts: (options?: PromptFetchOptions) => Promise<PromptListResponse>;
  fetchSourcePrompts: (sourceId: string) => Promise<Prompt[]>;
  refreshSource: (
    sourceId: string,
    options?: { signal?: AbortSignal },
  ) => Promise<PromptSourceRefreshResult>;
  readCachedSource: (sourceId: string) => Promise<Prompt[]>;
  refreshAllSources: () => Promise<PromptSourceRefreshSummary>;
  refreshDueSources: (maxAgeMs: number) => Promise<PromptSourceRefreshSummary>;
  statuses: () => Promise<Record<string, PromptSourceStatus>>;
};

function memoryCacheBackend(): PromptCache {
  const entries = new Map<string, PromptSourceCacheEntry>();
  return {
    get: async (sourceId) => entries.get(sourceId) ?? null,
    set: async (sourceId, entry) => void entries.set(sourceId, entry),
  };
}

function localStorageCacheBackend(): PromptCache {
  const CACHE_PREFIX = "kk-studio:prompt-cache:";
  const read = (key: string) => {
    try {
      const raw = globalThis.localStorage?.getItem(key);
      return raw ? (JSON.parse(raw) as PromptSourceCacheEntry) : null;
    } catch {
      return null;
    }
  };
  const write = (key: string, entry: PromptSourceCacheEntry) => {
    try {
      globalThis.localStorage?.setItem(key, JSON.stringify(entry));
    } catch {
      // 容量满或隐私模式时静默退化，不影响主流程。
    }
  };
  return {
    get: async (sourceId) => read(`${CACHE_PREFIX}${sourceId}`),
    set: async (sourceId, entry) => write(`${CACHE_PREFIX}${sourceId}`, entry),
  };
}

export function createPromptLibrary(options?: {
  sources?: PromptSource[];
  cache?: PromptCache;
  ttlMs?: number;
  /** 测试注入用：默认使用全局 fetch。 */
  fetcher?: typeof fetch;
}): PromptLibrary {
  const sources = options?.sources ?? DEFAULT_PROMPT_SOURCES;
  const ttlMs = options?.ttlMs ?? PROMPT_CACHE_TTL_MS;
  const fetchImpl = options?.fetcher ?? fetch;
  const cache =
    options?.cache ??
    (typeof globalThis.localStorage === "undefined"
      ? memoryCacheBackend()
      : localStorageCacheBackend());
  const loading = new Map<string, Promise<PromptSourceRefreshResult>>();
  const runSourceForLibrary = (
    source: PromptSource,
    options?: { signal?: AbortSignal },
  ) => runSource(source, options, fetchImpl);

  function enabledSources() {
    return sources.filter((source) => source.enabled);
  }

  function sourceSignature(source: PromptSource) {
    const value = `${source.name}\n${source.url}\n${source.homepage}`;
    let hash = 0;
    for (let i = 0; i < value.length; i += 1)
      hash = (hash * 31 + value.charCodeAt(i)) | 0;
    return `${value.length}:${hash}`;
  }

  function withSourceMeta(source: PromptSource, items: RawPrompt[]): Prompt[] {
    return items.map((item) => ({
      ...item,
      description: item.description || "",
      referenceImageUrls: Array.isArray(item.referenceImageUrls)
        ? item.referenceImageUrls
        : [],
      sourceId: source.id,
      category: source.name,
      githubUrl: item.sourceUrl || source.homepage,
    }));
  }

  async function readSourceCache(sourceId: string) {
    return cache.get(sourceId);
  }

  async function refreshSourceRecord(
    source: PromptSource,
    options?: { signal?: AbortSignal },
  ): Promise<PromptSourceRefreshResult> {
    const previous = await readSourceCache(source.id);
    try {
      const items = withSourceMeta(
        source,
        await runSourceForLibrary(source, options),
      );
      options?.signal?.throwIfAborted();
      const lastSuccessAt = new Date().toISOString();
      const entry: PromptSourceCacheEntry = {
        sourceId: source.id,
        items,
        count: items.length,
        fetchedAt: Date.now(),
        lastSuccessAt,
        lastError: "",
        signature: sourceSignature(source),
      };
      await cache.set(source.id, entry);
      return {
        sourceId: source.id,
        sourceName: source.name,
        count: items.length,
        lastSuccessAt,
        lastError: "",
        success: true,
      };
    } catch (error) {
      if (options?.signal?.aborted) throw error;
      const lastError = error instanceof Error ? error.message : String(error);
      const entry: PromptSourceCacheEntry = {
        sourceId: source.id,
        items: previous?.items || [],
        count: previous?.items?.length || 0,
        fetchedAt: previous?.fetchedAt || 0,
        lastSuccessAt: previous?.lastSuccessAt || "",
        lastError,
        signature: previous?.signature || sourceSignature(source),
      };
      await cache.set(source.id, entry);
      return {
        sourceId: source.id,
        sourceName: source.name,
        count: entry.count,
        lastSuccessAt: entry.lastSuccessAt,
        lastError,
        success: false,
      };
    }
  }

  function getOrStartRefresh(source: PromptSource) {
    const current = loading.get(source.id);
    if (current) return current;
    const loadingPromise = refreshSourceRecord(source).finally(() =>
      loading.delete(source.id),
    );
    loading.set(source.id, loadingPromise);
    return loadingPromise;
  }

  async function getSourcePrompts(source: PromptSource): Promise<Prompt[]> {
    const cached = await readSourceCache(source.id);
    if (cached) {
      const stale =
        cached.signature !== sourceSignature(source) ||
        Date.now() - cached.fetchedAt >= ttlMs;
      if (stale) void getOrStartRefresh(source).catch(() => undefined);
      return withSourceMeta(source, cached.items);
    }
    const result = await getOrStartRefresh(source);
    if (!result.success) throw new Error(result.lastError);
    return (await readSourceCache(source.id))?.items || [];
  }

  async function getAllPrompts(): Promise<Prompt[]> {
    const settled = await Promise.all(
      enabledSources().map(async (source) => {
        try {
          return await getSourcePrompts(source);
        } catch {
          return [];
        }
      }),
    );
    return settled.flat();
  }

  function fetchPrompts(
    options: PromptFetchOptions = {},
  ): Promise<PromptListResponse> {
    return getAllPrompts().then((items) => {
      const keyword = (options.keyword ?? "").trim().toLowerCase();
      const category = options.category ?? ALL_PROMPTS_OPTION;
      const tags = options.tag ?? [];
      const page = Math.max(1, options.page ?? 1);
      const pageSize = Math.max(1, Math.min(100, options.pageSize ?? 20));
      const withoutTagFilter = filterPrompts(items, {
        keyword,
        category,
        tags: [],
      });
      const filtered = filterPrompts(items, { keyword, category, tags });
      return {
        items: filtered.slice((page - 1) * pageSize, page * pageSize),
        tags: collectTags(withoutTagFilter),
        categories: enabledSources().map((source) => source.name),
        total: filtered.length,
      };
    });
  }

  async function fetchSourcePrompts(sourceId: string): Promise<Prompt[]> {
    const source = sources.find((item) => item.id === sourceId);
    if (!source) throw new Error(`提示词来源不存在：${sourceId}`);
    return getSourcePrompts(source);
  }

  async function refreshSource(
    sourceId: string,
    options?: { signal?: AbortSignal },
  ): Promise<PromptSourceRefreshResult> {
    const source = sources.find((item) => item.id === sourceId);
    if (!source) throw new Error(`提示词来源不存在：${sourceId}`);
    const result = options?.signal
      ? await refreshSourceRecord(source, options)
      : await getOrStartRefresh(source);
    if (!result.success) throw new Error(result.lastError);
    return result;
  }

  async function refreshAllSources(): Promise<PromptSourceRefreshSummary> {
    const results = await Promise.all(enabledSources().map(getOrStartRefresh));
    return summarizeRefresh(results);
  }

  async function refreshDueSources(
    maxAgeMs: number,
  ): Promise<PromptSourceRefreshSummary> {
    const due = await Promise.all(
      enabledSources().map(async (source) => {
        const cached = await readSourceCache(source.id);
        const lastSuccess = cached?.lastSuccessAt
          ? new Date(cached.lastSuccessAt).getTime()
          : 0;
        return !lastSuccess ||
          Boolean(cached?.lastError) ||
          Date.now() - lastSuccess >= maxAgeMs ||
          cached?.signature !== sourceSignature(source)
          ? source
          : null;
      }),
    );
    const results = await Promise.all(
      due
        .filter((source): source is PromptSource => Boolean(source))
        .map(getOrStartRefresh),
    );
    return summarizeRefresh(results);
  }

  async function statuses(): Promise<Record<string, PromptSourceStatus>> {
    const entries = await Promise.all(
      sources.map(async (source) => {
        const entry = await readSourceCache(source.id);
        return [
          source.id,
          {
            sourceId: source.id,
            count: entry?.items?.length || 0,
            lastSuccessAt: entry?.lastSuccessAt || "",
            lastError: entry?.lastError || "",
          },
        ] as const;
      }),
    );
    return Object.fromEntries(entries);
  }

  return {
    sources,
    runSource: runSourceForLibrary,
    fetchPrompts,
    fetchSourcePrompts,
    refreshSource,
    readCachedSource: async (sourceId: string) => {
      const source = sources.find((item) => item.id === sourceId);
      const entry = await readSourceCache(sourceId);
      return source &&
        entry?.signature === sourceSignature(source) &&
        Array.isArray(entry.items)
        ? withSourceMeta(source, parseJsonSource(entry.items, source))
        : [];
    },
    refreshAllSources,
    refreshDueSources,
    statuses,
  };
}

/** 默认单例：浏览器用 localStorage 缓存，测试可用 createPromptLibrary 注入内存缓存。 */
export const promptLibrary = createPromptLibrary();

async function runSource(
  source: PromptSource,
  options?: { signal?: AbortSignal },
  fetchImpl: typeof fetch = fetch,
): Promise<RawPrompt[]> {
  if (!source.url.trim()) throw new Error(`提示词来源地址为空：${source.name}`);
  let data: unknown;
  try {
    const response = await fetchImpl(source.url, {
      cache: "no-store",
      signal: options?.signal,
    });
    if (!response.ok)
      throw new Error(`请求提示词来源失败（HTTP ${response.status}）`);
    data = await response.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    throw new Error(
      `拉取「${source.name}」失败：${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error },
    );
  }
  const items = parseJsonSource(data, source);
  if (source.builtIn && !items.length)
    throw new Error(`提示词来源「${source.name}」没有可用的提示词`);
  return items;
}

function parseJsonSource(data: unknown, source: PromptSource): RawPrompt[] {
  if (!Array.isArray(data))
    throw new Error(`提示词来源「${source.name}」根节点不是数组`);
  const seen = new Set<string>();
  const items: RawPrompt[] = [];
  data.forEach((value, index) => {
    const record = asRecord(value);
    const title = stringValue(record.title).trim();
    const prompt = stringValue(record.prompt).trim();
    if (!title || !prompt) return;
    const id =
      stringValue(record.id).trim() || `${source.id}-${leftPad(index + 1)}`;
    if (seen.has(id)) return;
    seen.add(id);
    const referenceImageUrls = stringArray(record.referenceImageUrls).map(
      (url) => absoluteUrl(source.url, url),
    );
    const coverUrl =
      absoluteUrl(source.url, stringValue(record.coverUrl)) ||
      referenceImageUrls[0] ||
      "";
    items.push({
      id,
      title,
      prompt,
      description: stringValue(record.description),
      coverUrl,
      referenceImageUrls,
      tags: stringArray(record.tags),
      preview: stringValue(record.preview),
      createdAt: stringValue(record.createdAt),
      updatedAt: stringValue(record.updatedAt),
      author: optionalString(record.author),
      sourceUrl: absoluteUrl(source.url, stringValue(record.sourceUrl)),
      imageMode: optionalString(record.imageMode),
      imageModel: optionalString(record.imageModel),
      imageSize: optionalString(record.imageSize),
      imageCount: optionalNumber(record.imageCount),
    });
  });
  return items;
}

function summarizeRefresh(
  results: PromptSourceRefreshResult[],
): PromptSourceRefreshSummary {
  return {
    results,
    total: results.reduce((total, item) => total + item.count, 0),
    successCount: results.filter((item) => item.success).length,
    failureCount: results.filter((item) => !item.success).length,
  };
}

function filterPrompts(
  items: Prompt[],
  options: { keyword: string; category: string; tags: string[] },
) {
  return items.filter((item) => {
    if (isActiveOption(options.category) && item.category !== options.category)
      return false;
    if (
      options.tags.length &&
      !options.tags.some((tag) => item.tags.includes(tag))
    )
      return false;
    if (!options.keyword) return true;
    return [
      item.title,
      item.prompt,
      item.description,
      item.category,
      ...item.tags,
    ]
      .join(" ")
      .toLowerCase()
      .includes(options.keyword);
  });
}

function collectTags(items: Prompt[]) {
  return Array.from(
    new Set(items.flatMap((item) => item.tags).filter(Boolean)),
  );
}

function isActiveOption(value: string) {
  return value && value !== ALL_PROMPTS_OPTION && value !== "all";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .map(stringValue)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function optionalString(value: unknown) {
  const result = stringValue(value).trim();
  return result || undefined;
}

function optionalNumber(value: unknown) {
  const result = Number(value);
  return Number.isFinite(result) && result > 0 ? result : undefined;
}

function absoluteUrl(baseUrl: string, path: string) {
  if (!path) return "";
  try {
    return new URL(path, baseUrl).toString();
  } catch {
    return path;
  }
}

function leftPad(value: number) {
  return String(value).padStart(4, "0");
}

export function formatPromptDate(value: string, locale?: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date);
}
