/**
 * 运行时诊断日志。
 *
 * 定位：内部诊断与排障，不承载用户可见文案（用户提示统一走 i18n）。
 * 设计取上游 infinite-canvas canvas-agent Logger 之长（级别阈值、脱敏、
 * 结构化详情），按本仓规范落地：零依赖、无 import、无 DOM 依赖，
 * 可在 Node 下单测；桌面端落盘经 configureLogSink() 预留 seam，
 * 待 Tauri 命令就绪后接入，当前不在 Web 视图内直接写文件。
 *
 * 排障入口：URL 加 ?kklog=debug 临时提升级别；诊断文本经
 * buildDiagnosticsText() 生成、downloadDiagnostics() 下载。
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

/** 级别权重：数值越大越严重，低于阈值的记录直接丢弃。 */
const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/** 环形缓冲容量：兼顾排障回溯与常驻内存，超出后淘汰最旧记录。 */
const RING_CAPACITY = 500;

/** 命中即整支打码的字段名（上游 agent Logger 同款 + 本仓凭据词汇）。 */
const SENSITIVE_KEY =
  /token|authorization|api.?key|secret|password|credential/i;
const SENSITIVE_FIELD_VALUE =
  /(\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|token|password|secret|authorization|credential|cookie|session(?:[_-]?id)?)\b\s*[:=]\s*)(?:(?:bearer|basic)\s+)?[^&\s,;]+/gi;
const SENSITIVE_AUTH_VALUE =
  /\b(?:bearer|basic)\s+[A-Za-z0-9._~+\/-]+=*/gi;
const SENSITIVE_PROVIDER_KEY = /\bsk-[A-Za-z0-9_-]+/gi;
const MAX_SANITIZE_DEPTH = 8;
const MAX_SANITIZE_KEYS = 100;
const DIAGNOSTIC_CONTEXT_KEYS = new Set([
  "version",
  "platform",
  "mode",
  "build",
  "route",
]);

export type LogEntry = {
  seq: number;
  time: string;
  level: LogLevel;
  scope: string;
  message: string;
  details?: unknown;
};

/** 外部日志接收器（桌面落盘 seam）；抛错不得反噬业务路径。 */
export type LogSink = (entry: LogEntry) => void;

export type ScopedLogger = {
  debug(message: string, details?: unknown): void;
  info(message: string, details?: unknown): void;
  warn(message: string, details?: unknown): void;
  error(message: string, details?: unknown): void;
};

let sequence = 0;
let threshold: LogLevel = resolveInitialThreshold();
const entries: LogEntry[] = [];
let sink: LogSink | null = null;

export function isLogLevel(value: unknown): value is LogLevel {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(LEVEL_WEIGHT, value)
  );
}

export function getLogLevel(): LogLevel {
  return threshold;
}

/** 设置级别并尽量持久化；存储不可用（隐私模式等）时仅内存生效。 */
export function setLogLevel(level: LogLevel): void {
  if (!isLogLevel(level)) return;
  threshold = level;
  try {
    if (typeof localStorage !== "undefined")
      localStorage.setItem("kk.logger.level", level);
  } catch {
    // 存储不可用时仅内存生效，不影响调用方。
  }
}

/** 初始级别：URL ?kklog=<level> 优先，其次 localStorage，默认 info。 */
function resolveInitialThreshold(): LogLevel {
  const fromUrl = readUrlLevel();
  if (fromUrl) return fromUrl;
  const stored = readStoredLevel();
  if (stored) return stored;
  return "info";
}

function readUrlLevel(): LogLevel | null {
  if (typeof window === "undefined" || !window.location.search) return null;
  const value = new URLSearchParams(window.location.search).get("kklog");
  return isLogLevel(value) ? value : null;
}

function readStoredLevel(): LogLevel | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const value = localStorage.getItem("kk.logger.level");
    return isLogLevel(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * 脱敏并转为可 JSON 序列化的值：敏感字段整支打码、data URL 截断为长度、
 * Error 结构化为 name/message/stack、循环引用标记。
 * 任何详情进入环形缓冲前必须经过本函数。
 */
export function sanitizeLogValue(
  value: unknown,
  key = "",
  seen: WeakSet<object> = new WeakSet(),
  depth = 0,
): unknown {
  if (SENSITIVE_KEY.test(key)) return "[REDACTED]";
  if (typeof value === "string") return sanitizeLogString(value);
  if (!value || typeof value !== "object") {
    if (typeof value === "bigint" || typeof value === "function")
      return String(value);
    return value;
  }
  if (depth >= MAX_SANITIZE_DEPTH) return "[TRUNCATED]";
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);
  try {
    if (value instanceof Error) {
      const result: Record<string, unknown> = {
        name: sanitizeLogString(safeReadString(value, "name")),
        message: sanitizeLogString(safeReadString(value, "message")),
        stack: sanitizeLogString(safeReadString(value, "stack")),
      };
      try {
        if ("cause" in value)
          result.cause = sanitizeLogValue(
            (value as Error & { cause?: unknown }).cause,
            "cause",
            seen,
            depth + 1,
          );
      } catch {
        result.cause = "[UNSERIALIZABLE]";
      }
      return result;
    }
    if (Array.isArray(value)) {
      const result: unknown[] = [];
      for (let index = 0; index < Math.min(value.length, MAX_SANITIZE_KEYS); index++) {
        try {
          result.push(sanitizeLogValue(value[index], key, seen, depth + 1));
        } catch {
          result.push("[UNSERIALIZABLE]");
        }
      }
      if (value.length > MAX_SANITIZE_KEYS) result.push("[TRUNCATED]");
      return result;
    }
    const result: Record<string, unknown> = {};
    let keys: string[];
    try {
      keys = Object.keys(value);
    } catch {
      return "[UNSERIALIZABLE]";
    }
    for (const field of keys.slice(0, MAX_SANITIZE_KEYS)) {
      try {
        result[field] = sanitizeLogValue(
          (value as Record<string, unknown>)[field],
          field,
          seen,
          depth + 1,
        );
      } catch {
        result[field] = "[UNSERIALIZABLE]";
      }
    }
    if (keys.length > MAX_SANITIZE_KEYS) result.__truncated__ = true;
    return result;
  } catch {
    return "[UNSERIALIZABLE]";
  } finally {
    seen.delete(value);
  }
}

function safeReadString(value: object, key: string): string {
  try {
    const result = (value as Record<string, unknown>)[key];
    return typeof result === "string" ? result : String(result ?? "");
  } catch {
    return "[UNSERIALIZABLE]";
  }
}

function sanitizeLogString(value: string): string {
  if (/^data:/i.test(value)) return `[DATA URL ${value.length} chars]`;
  return value
    .replace(SENSITIVE_FIELD_VALUE, "$1[REDACTED]")
    .replace(SENSITIVE_AUTH_VALUE, "[REDACTED]")
    .replace(SENSITIVE_PROVIDER_KEY, "[REDACTED]");
}

function safeText(value: unknown): string {
  try {
    return sanitizeLogString(String(value));
  } catch {
    return "[UNSERIALIZABLE]";
  }
}

function write(
  level: LogLevel,
  scope: string,
  message: string,
  details?: unknown,
): void {
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[threshold]) return;
  const entry: LogEntry = {
    seq: ++sequence,
    time: new Date().toISOString(),
    level,
    scope: safeText(scope),
    message: safeText(message),
    ...(details === undefined ? {} : { details: sanitizeLogValue(details) }),
  };
  entries.push(entry);
  if (entries.length > RING_CAPACITY)
    entries.splice(0, entries.length - RING_CAPACITY);
  try {
    mirrorToConsole(entry);
  } catch {
    // A replaced console implementation must not break the caller either.
  }
  try {
    sink?.(cloneLogEntry(entry));
  } catch {
    // 接收器故障不得反噬业务路径。
  }
}

function mirrorToConsole(entry: LogEntry): void {
  // console 镜像保留开发期实时性；脱敏在入缓冲前已完成。
  const line = `[kk:${entry.scope}] ${entry.message}`;
  if (entry.level === "debug") console.debug(line, entry.details);
  else if (entry.level === "info") console.info(line, entry.details);
  else if (entry.level === "warn") console.warn(line, entry.details);
  else console.error(line, entry.details);
}

export function createLogger(scope: string): ScopedLogger {
  return {
    debug: (message, details) => write("debug", scope, message, details),
    info: (message, details) => write("info", scope, message, details),
    warn: (message, details) => write("warn", scope, message, details),
    error: (message, details) => write("error", scope, message, details),
  };
}

/** 无明确归属的通用日志器；模块内请优先 createLogger("<scope>")。 */
export const logger = createLogger("app");

export function getLogEntries(): readonly LogEntry[] {
  return entries.map(cloneLogEntry);
}

export function clearLog(): void {
  entries.length = 0;
}

/** 挂接/摘除外部接收器（桌面落盘 seam）。 */
export function configureLogSink(next: LogSink | null): void {
  sink = next;
}

function formatDetails(details: unknown): string {
  if (details === undefined) return "";
  let text: string;
  try {
    text = JSON.stringify(details) ?? String(details);
  } catch {
    text = safeText(details);
  }
  return text ? ` ${text}` : "";
}

function cloneLogEntry(entry: LogEntry): LogEntry {
  return {
    ...entry,
    ...(entry.details === undefined
      ? {}
      : { details: sanitizeLogValue(entry.details) }),
  };
}

/** 生成可复制/下载的诊断文本：环境头 + 单行日志。 */
export function buildDiagnosticsText(context?: Record<string, string>): string {
  const header: Record<string, string> = {
    generatedAt: new Date().toISOString(),
    level: threshold,
    entries: String(entries.length),
    ...(readSafeLocation() ? { location: readSafeLocation()! } : {}),
  };
  for (const [key, value] of Object.entries(context ?? {})) {
    if (DIAGNOSTIC_CONTEXT_KEYS.has(key))
      header[key] = safeText(value);
  }
  return [
    "# KK Studio diagnostics",
    ...Object.entries(header).map(([key, value]) => `# ${key}=${value}`),
    ...entries.map(
      (entry) =>
        `${entry.time} ${entry.level.toUpperCase()} [${entry.scope}] ${entry.message}${formatDetails(entry.details)}`,
    ),
  ].join("\n");
}

function readSafeLocation(): string | null {
  try {
    if (typeof location === "undefined" || !location.href) return null;
    const url = new URL(location.href);
    return `${url.origin}${url.pathname}`;
  } catch {
    return null;
  }
}

/** 触发诊断包下载（浏览器环境）；无 DOM 时返回 false。 */
export function downloadDiagnostics(
  filename = "kk-studio-diagnostics.txt",
  context?: Record<string, string>,
): boolean {
  if (typeof document === "undefined") return false;
  const blob = new Blob([buildDiagnosticsText(context)], {
    type: "text/plain",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return true;
}
