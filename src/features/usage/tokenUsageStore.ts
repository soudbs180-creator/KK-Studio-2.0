export interface TokenUsageRecord {
  id: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  timestamp: number;
  costUsd?: number;
  latencyMs?: number;
  status: "succeeded" | "failed";
}

export interface DailyUsageSummary {
  date: string; // YYYY-MM-DD
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requests: number;
}

export interface UsageKpis {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalRequests: number;
  todayTokens: number;
}

export const TOKEN_USAGE_STORAGE_KEY = "kk:token-usage-records";

const inMemoryStore: Map<string, string> = new Map();

function getStorageItem(key: string): string | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch (error) {
    // Fall back to memory store on storage failure
    void error;
  }
  return inMemoryStore.get(key) ?? null;
}

function setStorageItem(key: string, value: string): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch (error) {
    // Fall back to memory store
    void error;
  }
  inMemoryStore.set(key, value);
}

function removeStorageItem(key: string): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch (error) {
    // Ignore
    void error;
  }
  inMemoryStore.delete(key);
}

function notifySubscribers(): void {
  if (
    typeof window !== "undefined" &&
    typeof window.dispatchEvent === "function"
  ) {
    try {
      window.dispatchEvent(new CustomEvent("kk:token-usage-changed"));
    } catch (error) {
      // Ignore
      void error;
    }
  }
}

export function getUsageRecords(): TokenUsageRecord[] {
  const raw = getStorageItem(TOKEN_USAGE_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.totalTokens === "number",
    );
  } catch {
    return [];
  }
}

export function saveUsageRecords(records: TokenUsageRecord[]): void {
  setStorageItem(TOKEN_USAGE_STORAGE_KEY, JSON.stringify(records));
  notifySubscribers();
}

export function clearUsageRecords(): void {
  removeStorageItem(TOKEN_USAGE_STORAGE_KEY);
  notifySubscribers();
}

export function recordUsage(params: {
  provider?: string;
  providerId?: string;
  model?: string;
  modelId?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens?: number;
  timestamp?: number;
  costUsd?: number;
  latencyMs?: number;
  status?: "succeeded" | "failed";
}): TokenUsageRecord {
  const promptTokens = Math.max(0, Math.floor(params.promptTokens || 0));
  const completionTokens = Math.max(
    0,
    Math.floor(params.completionTokens || 0),
  );
  const totalTokens =
    params.totalTokens != null
      ? Math.max(0, Math.floor(params.totalTokens))
      : promptTokens + completionTokens;

  const record: TokenUsageRecord = {
    id: `usage_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    provider: params.provider ?? params.providerId ?? "official",
    model: params.model ?? params.modelId ?? "default",
    promptTokens,
    completionTokens,
    totalTokens,
    timestamp: params.timestamp ?? Date.now(),
    costUsd: params.costUsd,
    latencyMs: params.latencyMs,
    status: params.status ?? "succeeded",
  };

  const records = getUsageRecords();
  records.push(record);
  saveUsageRecords(records);
  return record;
}

function formatDateKey(timestamp: number): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDailySummaries(days: number = 7): DailyUsageSummary[] {
  const safeDays = Math.max(1, Math.min(90, Math.floor(days || 7)));
  const records = getUsageRecords();

  const now = new Date();
  const summaries: DailyUsageSummary[] = [];
  const dateMap: Map<string, DailyUsageSummary> = new Map();

  for (let i = safeDays - 1; i >= 0; i--) {
    const target = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - i,
    );
    const key = formatDateKey(target.getTime());
    const entry: DailyUsageSummary = {
      date: key,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      requests: 0,
    };
    dateMap.set(key, entry);
    summaries.push(entry);
  }

  for (const record of records) {
    const key = formatDateKey(record.timestamp);
    const summary = dateMap.get(key);
    if (summary) {
      summary.promptTokens += record.promptTokens;
      summary.completionTokens += record.completionTokens;
      summary.totalTokens += record.totalTokens;
      summary.requests += 1;
    }
  }

  return summaries;
}

export function getModelBreakdown(): Record<string, number> {
  const records = getUsageRecords();
  const breakdown: Record<string, number> = {};

  for (const record of records) {
    const model = record.model || "other";
    breakdown[model] = (breakdown[model] ?? 0) + record.totalTokens;
  }

  return breakdown;
}

export function getUsageKpis(): UsageKpis {
  const records = getUsageRecords();
  const todayKey = formatDateKey(Date.now());

  let totalTokens = 0;
  let promptTokens = 0;
  let completionTokens = 0;
  let todayTokens = 0;

  for (const record of records) {
    totalTokens += record.totalTokens;
    promptTokens += record.promptTokens;
    completionTokens += record.completionTokens;
    if (formatDateKey(record.timestamp) === todayKey) {
      todayTokens += record.totalTokens;
    }
  }

  return {
    totalTokens,
    promptTokens,
    completionTokens,
    totalRequests: records.length,
    todayTokens,
  };
}

export function seedSampleUsageIfEmpty(): void {
  const existing = getUsageRecords();
  if (existing.length > 0) return;

  const sampleModels = [
    { provider: "deepseek", model: "DeepSeek-V3", ratio: 0.45 },
    { provider: "anthropic", model: "Claude-3.5-Sonnet", ratio: 0.3 },
    { provider: "openai", model: "GPT-4o", ratio: 0.15 },
    { provider: "local", model: "Qwen2.5-Coder-7B", ratio: 0.1 },
  ];

  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const samples: TokenUsageRecord[] = [];

  for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
    const dayTimestamp = now - dayOffset * oneDayMs;
    const requestsCount = 4 + Math.floor(Math.sin(dayOffset) * 2 + 3);

    for (let r = 0; r < requestsCount; r++) {
      const modelChoice = sampleModels[r % sampleModels.length];
      const prompt = 400 + Math.floor(Math.random() * 800);
      const completion = 200 + Math.floor(Math.random() * 1200);
      samples.push({
        id: `sample_${dayOffset}_${r}`,
        provider: modelChoice.provider,
        model: modelChoice.model,
        promptTokens: prompt,
        completionTokens: completion,
        totalTokens: prompt + completion,
        timestamp: dayTimestamp + r * 3600 * 1000,
        costUsd: prompt * 0.0000015 + completion * 0.000006,
        latencyMs: 120 + Math.floor(Math.random() * 300),
        status: "succeeded",
      });
    }
  }

  saveUsageRecords(samples);
}
