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
          return command === "provider_models_fetch" ? ["qwen2.5:0.5b"] : true;
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
    assert.deepEqual(
      calls.map((call) => call.command),
      [
        "provider_models_prepare",
        "provider_models_fetch",
        "provider_models_release",
      ],
    );
    assert.equal(calls[1].args.baseUrl, "http://127.0.0.1:11434/v1");
    assert.equal(calls[1].args.authMode, "none");
    assert.equal(calls[1].args.secret, null);
    assert.equal("apiKey" in calls[1].args, false);
    assert.equal("headers" in calls[1].args, false);
    assert(
      calls.every((call) => call.args.requestId === calls[0].args.requestId),
    );
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
  let started!: () => void;
  const fetching = new Promise<void>((resolve) => {
    started = resolve;
  });
  try {
    desktopFlag.isTauri = true;
    globalThis.window = {
      __TAURI_INTERNALS__: {
        invoke: async (command: string, args: Record<string, unknown>) => {
          calls.push({ command, args });
          if (command === "provider_models_cancel") {
            release(["late"]);
            return true;
          }
          if (command === "provider_models_fetch") {
            started();
            return pending;
          }
          return true;
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
    await fetching;
    controller.abort("user");
    await assert.rejects(operation);
    assert.deepEqual(
      calls.map((call) => call.command),
      [
        "provider_models_prepare",
        "provider_models_fetch",
        "provider_models_cancel",
        "provider_models_release",
      ],
    );
    assert(
      calls.every((call) => call.args.requestId === calls[0].args.requestId),
    );
  } finally {
    release({ status: 200, body: '{"data":[]}' });
    globalThis.window = previousWindow;
    globalThis.fetch = previousFetch;
    desktopFlag.isTauri = previousFlag;
  }
});
