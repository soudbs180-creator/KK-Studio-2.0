import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDiagnosticsText,
  clearLog,
  configureLogSink,
  createLogger,
  downloadDiagnostics,
  getLogEntries,
  getLogLevel,
  isLogLevel,
  sanitizeLogValue,
  setLogLevel,
  type LogEntry,
} from "../../src/runtime/logger.ts";

// 每个用例前重置级别与缓冲，保证用例间互不影响（模块为进程内单例）。
function reset(level: "debug" | "info" | "warn" | "error" = "info") {
  clearLog();
  setLogLevel(level);
}

test("sanitizeLogValue redacts sensitive fields and truncates data URLs", () => {
  const sanitized = sanitizeLogValue({
    apiKey: "sk-live-123",
    nested: { token: "abc", authorization: "Bearer x", keep: "value" },
    password: "hunter2",
    credential: { id: 1 },
    avatar: "data:image/png;base64,AAAA",
  }) as Record<string, unknown>;
  assert.equal(sanitized.apiKey, "[REDACTED]");
  assert.equal(sanitized.password, "[REDACTED]");
  assert.deepEqual(sanitized.credential, "[REDACTED]");
  assert.equal(
    (sanitized.nested as Record<string, unknown>).token,
    "[REDACTED]",
  );
  assert.equal(
    (sanitized.nested as Record<string, unknown>).authorization,
    "[REDACTED]",
  );
  assert.equal((sanitized.nested as Record<string, unknown>).keep, "value");
  assert.match(String(sanitized.avatar), /^\[DATA URL \d+ chars\]$/);
});

test("sanitizeLogValue structures errors and marks circular references", () => {
  const error = new Error("boom");
  const structured = sanitizeLogValue(error) as Record<string, unknown>;
  assert.equal(structured.name, "Error");
  assert.equal(structured.message, "boom");
  assert.match(String(structured.stack), /sanitizeLogValue|runtimeLogger/);

  const circular: Record<string, unknown> = { name: "loop" };
  circular.self = circular;
  assert.equal(
    (sanitizeLogValue(circular) as Record<string, unknown>).self,
    "[CIRCULAR]",
  );
});

test("logger drops entries below the threshold and keeps the rest", () => {
  reset("info");
  const log = createLogger("unit");
  log.debug("hidden");
  log.info("kept-info");
  log.warn("kept-warn", { attempt: 2 });
  log.error("kept-error", new Error("fail"));
  const entries = getLogEntries();
  assert.deepEqual(
    entries.map((entry) => entry.message),
    ["kept-info", "kept-warn", "kept-error"],
  );
  assert.equal(entries[0].scope, "unit");
  assert.equal(entries[2].level, "error");
  // 详情在入缓冲前已脱敏：Error 结构化为普通对象。
  assert.deepEqual(entries[1].details, { attempt: 2 });
  assert.equal((entries[2].details as Record<string, unknown>).message, "fail");
});

test("logger honors level changes and validates level values", () => {
  reset("info");
  assert.equal(getLogLevel(), "info");
  setLogLevel("debug");
  assert.equal(getLogLevel(), "debug");
  createLogger("unit").debug("now-visible");
  assert.equal(getLogEntries().length, 1);
  setLogLevel("error");
  createLogger("unit").warn("dropped-again");
  assert.equal(getLogEntries().length, 1);
  assert.ok(isLogLevel("warn"));
  assert.ok(!isLogLevel("verbose"));
  assert.ok(!isLogLevel("toString"));
  assert.ok(!isLogLevel("constructor"));
  assert.ok(!isLogLevel("__proto__"));
  reset("info");
});

test("sanitization redacts secrets in strings, errors, and hostile objects", () => {
  const hostile = new Proxy(
    {},
    {
      ownKeys() {
        throw new Error("proxy trap");
      },
    },
  );
  const sanitized = sanitizeLogValue({
    message: "Authorization: Bearer super-secret",
    apiKey: "sk-live-123",
    error: new Error("api_key=secret-value"),
    hostile,
  }) as Record<string, unknown>;
  assert.equal(sanitized.message, "Authorization: [REDACTED]");
  assert.equal(sanitized.apiKey, "[REDACTED]");
  assert.equal(
    (sanitized.error as Record<string, unknown>).message,
    "api_key=[REDACTED]",
  );
  assert.equal(sanitized.hostile, "[UNSERIALIZABLE]");
});

test("logger sanitizes message and scope before console, sink, and diagnostics", () => {
  reset("info");
  const received: LogEntry[] = [];
  configureLogSink((entry) => received.push(entry));
  try {
    const hostileText = {
      toString() {
        throw new Error("toString trap");
      },
    };
    createLogger(hostileText as never).error(hostileText as never, {
      token: "query-secret",
    });
    assert.equal(received.length, 1);
    assert.equal(received[0].scope, "[UNSERIALIZABLE]");
    assert.equal(received[0].message, "[UNSERIALIZABLE]");
    assert.deepEqual(received[0].details, { token: "[REDACTED]" });
    assert.doesNotMatch(buildDiagnosticsText(), /query-secret/);
  } finally {
    configureLogSink(null);
  }
});

test("ring buffer keeps the most recent entries within capacity", () => {
  reset("debug");
  const log = createLogger("ring");
  for (let index = 0; index < 600; index += 1) log.info(`entry-${index}`);
  const entries = getLogEntries();
  assert.equal(entries.length, 500);
  assert.equal(entries[0].message, "entry-100");
  assert.equal(entries[entries.length - 1].message, "entry-599");
  const seqs = entries.map((entry) => entry.seq);
  assert.deepEqual(
    seqs,
    seqs.map((_, index) => seqs[0] + index),
  );
  reset("info");
});

test("configureLogSink receives entries and detaches on null", () => {
  reset("info");
  const received: LogEntry[] = [];
  configureLogSink((entry) => received.push(entry));
  createLogger("sink").info("to-sink");
  assert.equal(received.length, 1);
  assert.equal(received[0].message, "to-sink");
  configureLogSink(null);
  createLogger("sink").info("after-detach");
  assert.equal(received.length, 1);
});

test("sink failures do not break the logging path", () => {
  reset("info");
  configureLogSink(() => {
    throw new Error("sink down");
  });
  createLogger("sink").error("still-recorded");
  assert.equal(getLogEntries().length, 1);
  configureLogSink(null);
});

test("buildDiagnosticsText emits a header and one line per entry", () => {
  reset("info");
  createLogger("diag").warn("with-details", { reason: "probe" });
  const text = buildDiagnosticsText({ version: "9.9.9" });
  const lines = text.split("\n");
  assert.equal(lines[0], "# KK Studio diagnostics");
  assert.ok(lines.some((line) => line === "# version=9.9.9"));
  assert.ok(lines.some((line) => line.startsWith("# entries=1")));
  assert.ok(
    lines.some((line) =>
      /WARN \[diag\] with-details \{"reason":"probe"\}$/.test(line),
    ),
  );
});

test("diagnostic context is allowlisted and location excludes query secrets", () => {
  reset("info");
  const previousLocation = (globalThis as { location?: unknown }).location;
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: { href: "https://example.test/work?token=secret#fragment" },
  });
  try {
    const text = buildDiagnosticsText({
      version: "9.9.9",
      token: "secret",
      arbitrary: "should-not-appear",
    });
    assert.match(text, /# location=https:\/\/example\.test\/work/);
    assert.doesNotMatch(text, /secret|arbitrary/);
    assert.match(text, /# version=9\.9\.9/);
  } finally {
    if (previousLocation === undefined)
      delete (globalThis as { location?: unknown }).location;
    else
      Object.defineProperty(globalThis, "location", {
        configurable: true,
        value: previousLocation,
      });
  }
});

test("downloadDiagnostics is a no-op without a DOM", () => {
  reset("info");
  assert.equal(downloadDiagnostics(), false);
});
