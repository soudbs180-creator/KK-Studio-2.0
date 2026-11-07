import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

test("official editor extension authenticates the parent and round-trips the actual graph", async () => {
  const replies: Record<string, unknown>[] = [];
  let receive: (event: {
    source: unknown;
    origin: string;
    data: unknown;
  }) => Promise<void> = async () => {};
  const graph = {
    "1": { class_type: "CLIPTextEncode", inputs: { text: "native change" } },
  };
  const fixture = {
    app: {
      graph: { _nodes: [], setDirtyCanvas() {} },
      loaded: undefined as unknown,
      async loadApiJson(value: unknown, filename: string) {
        assert.equal(filename, "KK-kk-comfy-project-card-editor.json");
        this.loaded = value;
      },
      async loadGraphData(value: unknown) {
        this.loaded = value;
      },
      async graphToPrompt() {
        return {
          output: graph,
          workflow: { nodes: [{ id: 1, pos: [200, 300] }] },
        };
      },
      registerExtension(extension: { setup: () => void }) {
        extension.setup();
      },
    },
    api: {
      clientId: "unrelated",
      async queuePrompt() {
        return this.clientId;
      },
    },
  };
  const parent = {
    postMessage(value: Record<string, unknown>, origin: string) {
      assert.equal(origin, "http://127.0.0.1:1421");
      replies.push(value);
    },
  };
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      parent,
      addEventListener(_type: string, listener: typeof receive) {
        receive = listener;
      },
    },
  });
  Object.defineProperty(globalThis, "__comfyBridgeFixture", {
    configurable: true,
    value: fixture,
  });
  const hooks = registerHooks({
    resolve(specifier, context, next) {
      if (
        specifier.endsWith("/scripts/app.js") ||
        specifier.endsWith("/scripts/api.js")
      ) {
        const name = specifier.endsWith("/app.js") ? "app" : "api";
        return {
          url: `data:text/javascript,export const ${name}=globalThis.__comfyBridgeFixture.${name}`,
          shortCircuit: true,
        };
      }
      return next(specifier, context);
    },
  });
  try {
    await import("../../src/features/comfyui/editorBridge.js");
    const nonce = "11111111-1111-4111-8111-111111111111";
    const message = (
      op: string,
      extra = {},
      origin = "http://127.0.0.1:1421",
      source: unknown = parent,
    ) =>
      receive({
        source,
        origin,
        data: { source: "kk-studio", version: 1, nonce, op, ...extra },
      });
    await message("hello", {}, "https://untrusted.test");
    await message("hello", {}, "http://127.0.0.1:1421", {});
    assert.equal(replies.length, 0);
    await message("hello");
    assert.equal(replies.at(-1)?.op, "ready");
    await message("load", {
      requestId: "load-1",
      clientId: "kk-comfy-project-card-editor",
      record: { workflow: graph },
    });
    assert.deepEqual(fixture.app.loaded, graph);
    assert.equal(
      await fixture.api.queuePrompt(),
      "kk-comfy-project-card-editor",
    );
    await message("read", {
      requestId: "read-1",
      nonce: "22222222-2222-4222-8222-222222222222",
    });
    assert.equal(replies.at(-1)?.op, "loaded");
    await message("read", { requestId: "read-2" });
    assert.deepEqual(replies.at(-1)?.workflow, graph);
    assert.deepEqual(replies.at(-1)?.editorWorkflow, {
      nodes: [{ id: 1, pos: [200, 300] }],
    });
  } finally {
    hooks.deregister();
    Reflect.deleteProperty(globalThis, "__comfyBridgeFixture");
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
