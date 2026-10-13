import assert from "node:assert/strict";
import test from "node:test";
import { checkModelProvider } from "../../src/integrations/modelProvider.ts";

test("desktop keyless local discovery uses bounded Native IPC rather than a blocked WebView origin", async () => {
  const previousWindow = globalThis.window;
  const previousFetch = globalThis.fetch;
  const desktopFlag = globalThis as typeof globalThis & { isTauri?: boolean };
  const previousFlag = desktopFlag.isTauri;
  const calls: Array<{ command: string; args: Record<string, unknown> }> = [];
  try {
    desktopFlag.isTauri = true;
    globalThis.window = {
      __TAURI_INTERNALS__: {
        invoke: async (command: string, args: Record<string, unknown>) => {
          calls.push({ command, args });
          return {
            status: 200,
            body: JSON.stringify({ data: [{ id: "qwen2.5:0.5b" }] }),
          };
        },
      },
    } as unknown as Window & typeof globalThis;
    globalThis.fetch = async () => {
      throw new TypeError(
        "WebView origin is forbidden by the real local service",
      );
    };
    const models = await checkModelProvider(
      "http://127.0.0.1:11434/v1",
      "",
      new AbortController().signal,
      { authMode: "none" },
    );
    assert.equal(models[0].id, "qwen2.5:0.5b");
    assert.equal(models[0].kind, "unknown");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].command, "provider_models_read");
    assert.equal(calls[0].args.url, "http://127.0.0.1:11434/v1/models");
    assert.equal("apiKey" in calls[0].args, false);
    assert.equal("headers" in calls[0].args, false);
  } finally {
    globalThis.window = previousWindow;
    globalThis.fetch = previousFetch;
    desktopFlag.isTauri = previousFlag;
  }
});

test("desktop local discovery abort cancels its exact Native request and never accepts a late catalog", async () => {
  const previousWindow = globalThis.window;
  const previousFetch = globalThis.fetch;
  const desktopFlag = globalThis as typeof globalThis & { isTauri?: boolean };
  const previousFlag = desktopFlag.isTauri;
  const calls: Array<{ command: string; args: Record<string, unknown> }> = [];
  let release: (value: unknown) => void = () => {};
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  try {
    desktopFlag.isTauri = true;
    globalThis.window = {
      __TAURI_INTERNALS__: {
        invoke: async (command: string, args: Record<string, unknown>) => {
          calls.push({ command, args });
          if (command === "provider_models_cancel") {
            release({ status: 200, body: '{"data":[{"id":"late"}]}' });
            return true;
          }
          return pending;
        },
      },
    } as unknown as Window & typeof globalThis;
    globalThis.fetch = async () => {
      throw new TypeError("unexpected browser fetch");
    };
    const controller = new AbortController();
    const operation = checkModelProvider(
      "http://127.0.0.1:11434/v1",
      "",
      controller.signal,
      { authMode: "none" },
    );
    controller.abort("user");
    await assert.rejects(operation);
    assert.equal(calls.length, 2);
    assert.equal(calls[1].command, "provider_models_cancel");
    assert.equal(calls[0].args.requestId, calls[1].args.requestId);
  } finally {
    release({ status: 200, body: '{"data":[]}' });
    globalThis.window = previousWindow;
    globalThis.fetch = previousFetch;
    desktopFlag.isTauri = previousFlag;
  }
});
