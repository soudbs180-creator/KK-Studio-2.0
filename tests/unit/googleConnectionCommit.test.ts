import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { normalizeGeminiBridgeUrl } from "../../src/features/agent/geminiCliAdapter.ts";
import {
  ProviderSaveError,
  providerSaveErrorMessage,
} from "../../src/features/creation/providerSaveRecovery.ts";

type Element = {
  type: unknown;
  props: { children?: unknown; [key: string]: unknown };
};
type Component =
  typeof import("../../src/components/settings/GoogleConnectionSettings.tsx").default;

// Execute the actual component, credential hook and preference writer. Only
// React lifecycle, external connection controls and storage IO are synthetic.
async function harness(
  options: {
    commitFails?: boolean;
    preferenceFails?: boolean;
    configureFails?: boolean;
    mode?: "api-key" | "cli";
  } = {},
) {
  const slots: unknown[] = [];
  const effects: (() => void)[] = [];
  let cursor = 0;
  let vault = "";
  let writes = 0;
  const preferences = new Map<string, string>();
  const configured: unknown[] = [];
  const feedback: string[] = [];
  const hooks = {
    useState(initial: unknown) {
      const index = cursor++;
      if (!(index in slots))
        slots[index] = typeof initial === "function" ? initial() : initial;
      return [
        slots[index],
        (value: unknown) => {
          slots[index] =
            typeof value === "function" ? value(slots[index]) : value;
        },
      ];
    },
    useRef(initial: unknown) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useEffect(effect: () => (() => void) | undefined, deps: unknown[]) {
      const index = cursor++;
      const previous = slots[index] as
        { deps: unknown[]; cleanup?: () => void } | undefined;
      if (
        previous &&
        deps.every((value, i) => Object.is(value, previous.deps[i]))
      )
        return;
      effects.push(() => {
        previous?.cleanup?.();
        slots[index] = { deps, cleanup: effect() };
      });
    },
    useSyncExternalStore(_subscribe: unknown, snapshot: () => unknown) {
      return snapshot();
    },
  };
  const credentials = {
    credentialId: () => "synthetic_google_ref",
    loadApiKey: async () => vault,
  };
  const recovery = {
    ProviderSaveError,
    providerSaveErrorMessage,
    saveProviderConnection: async (_connection: unknown, secret: string) => {
      if (options.commitFails) throw new Error("synthetic native conflict");
      vault = secret;
    },
    restoreProviderConnection: async () => [],
  };
  const window = {
    dispatchEvent: () => true,
    localStorage: {
      getItem: (name: string) => preferences.get(name) ?? null,
      removeItem: (name: string) => {
        writes++;
        if (options.preferenceFails)
          throw new Error("synthetic storage denied");
        preferences.delete(name);
      },
      setItem: (name: string, value: string) => {
        writes++;
        if (options.preferenceFails)
          throw new Error("synthetic storage denied");
        preferences.set(name, value);
      },
    },
  };
  const google = {
    GOOGLE_API_BASE: "https://synthetic.invalid/v1",
    GOOGLE_IMAGE_MODEL: "synthetic-image",
  };
  const cli = {
    GEMINI_BRIDGE_DEFAULT_URL: "http://127.0.0.1:1424",
    normalizeGeminiBridgeUrl,
  };
  async function loadSource(
    relative: string,
    modules: Record<string, unknown>,
  ) {
    const source = await readFile(new URL(relative, import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    });
    const exports: Record<string, unknown> = {};
    runInNewContext(compiled.outputText, {
      exports,
      require: (id: string) => {
        assert(id in modules, `Unexpected dependency: ${id}`);
        return modules[id];
      },
      window,
      AbortController,
      AbortSignal,
      Event,
      setTimeout,
      clearTimeout,
    });
    return exports;
  }
  const config = await loadSource(
    "../../src/features/agent/googleAgentConfig.ts",
    {
      "../creation/providerCredentials.ts": credentials,
      "../creation/providerRegistry.ts": { readProviderConnections: () => [] },
      "../creation/providerSaveRecovery.ts": recovery,
      "./googleInteractions.ts": google,
      "./geminiCliAdapter.ts": cli,
    },
  );
  const credentialHook = await loadSource(
    "../../src/components/settings/useProviderCredentialState.ts",
    {
      react: hooks,
      "../../features/creation/providerCredentials": credentials,
      "../../features/creation/providerSaveRecovery": recovery,
    },
  );
  const jsx = (type: unknown, props: Element["props"]): Element => ({
    type,
    props,
  });
  const component = await loadSource(
    "../../src/components/settings/GoogleConnectionSettings.tsx",
    {
      react: hooks,
      "react/jsx-runtime": { jsx, jsxs: jsx },
      "../../features/creation/providerCredentials": credentials,
      "../../features/agent/googleInteractions": google,
      "../../features/agent/googleAgentConfig": config,
      "../../features/agent/googleAgentConnection": {
        googleAgentConnection: {
          subscribe: () => () => {},
          getState: () => ({ sending: false, status: "disconnected" }),
          configure: (settings: unknown) => {
            if (options.configureFails)
              throw new Error("synthetic preference listener failed");
            configured.push(settings);
          },
          disconnect: () => {},
        },
      },
      "../../features/agent/geminiCliAdapter": cli,
      "./GoogleConnectionActions": { default: "Actions", __esModule: true },
      "./GoogleLoginModePanels": {
        GoogleKeySetup: "Key",
        GoogleCliSetup: "Cli",
        GoogleLoginModeChoice: "Choice",
      },
      "./useSettingsBusy": { default: () => {}, __esModule: true },
      "./useProviderCredentialState": credentialHook,
      "./ProviderCredentialStatus": {
        default: "CredentialStatus",
        __esModule: true,
      },
      "../../features/creation/providerSaveRecovery": recovery,
    },
  );
  function render() {
    cursor = 0;
    const tree = (component.default as Component)({
      mode: options.mode ?? "api-key",
      onFeedback: (text) => feedback.push(text),
    }) as Element;
    while (effects.length) effects.shift()!();
    return tree;
  }
  function find(type: string): Element {
    const visit = (value: unknown): Element | undefined => {
      if (Array.isArray(value)) return value.map(visit).find(Boolean);
      if (value && typeof value === "object" && "props" in value) {
        const element = value as Element;
        return element.type === type ? element : visit(element.props.children);
      }
      return undefined;
    };
    const element = visit(render());
    assert(element, `Missing rendered ${type}`);
    return element;
  }
  render();
  await new Promise((resolve) => setImmediate(resolve));
  return {
    render,
    find,
    feedback,
    configured,
    preferences,
    vault: () => vault,
    preferenceWrites: () => writes,
    saveCli: () => (find("Actions").props.onSaveCli as () => void)(),
    save: async () => {
      (find("Key").props.onChange as (value: string) => void)(
        "synthetic-submitted-key",
      );
      (find("Actions").props.onSaveKey as () => void)();
      await new Promise((resolve) => setImmediate(resolve));
    },
    unmount: () => {
      for (const slot of slots)
        if (slot && typeof slot === "object" && "cleanup" in slot)
          (slot as { cleanup?: () => void }).cleanup?.();
    },
  };
}

test("Google native commit truth survives a later preference storage failure and the submitted draft is cleared", async () => {
  const ui = await harness({ preferenceFails: true });
  try {
    await ui.save();
    assert.equal(ui.vault(), "synthetic-submitted-key");
    assert.equal(ui.find("Key").props.apiKey, "");
    assert.equal(ui.find("Key").props.stored, true);
    assert.equal(ui.find("CredentialStatus").props.status, "saved");
    const status = ui.find("p").props.children;
    assert.match(String(status), /密钥已保存.*偏好未完成/);
    assert.equal(ui.feedback.length, 0);
  } finally {
    ui.unmount();
  }
});

test("Google CLI preference failure is visible and cannot report a saved login mode or activate it", async () => {
  const ui = await harness({ mode: "cli", preferenceFails: true });
  try {
    ui.saveCli();
    assert.match(String(ui.find("p").props.children), /登录偏好未保存.*重试/);
    assert.equal(ui.find("Actions").props.busy, false);
    assert.equal(ui.configured.length, 0);
    assert.equal(ui.feedback.length, 0);
    assert.equal(ui.preferences.size, 0);
    assert.equal(ui.vault(), "");
  } finally {
    ui.unmount();
  }
});

test("Google CLI preference success stores and activates the selected mode with truthful feedback", async () => {
  const ui = await harness({ mode: "cli" });
  try {
    ui.saveCli();
    assert.equal(ui.preferences.get("kk-google-login-mode"), "cli");
    assert.equal(
      ui.preferences.get("kk-google-bridge-url"),
      "http://127.0.0.1:1424",
    );
    assert.equal(ui.configured.length, 1);
    assert.match(
      String(ui.find("p").props.children),
      /已切换为 Gemini CLI 登录方式/,
    );
    assert.deepEqual(ui.feedback, ["Google 登录方式已更新。"]);
    assert.equal(ui.vault(), "");
  } finally {
    ui.unmount();
  }
});

test("Google rejects an uncommitted native save without clearing the synthetic draft or attempting preferences", async () => {
  const ui = await harness({ commitFails: true });
  try {
    await ui.save();
    assert.equal(ui.vault(), "");
    assert.equal(ui.find("Key").props.apiKey, "synthetic-submitted-key");
    assert.equal(ui.find("Key").props.stored, false);
    assert.equal(ui.preferenceWrites(), 0);
    assert.match(String(ui.find("p").props.children), /保存失败.*草稿已保留/);
  } finally {
    ui.unmount();
  }
});

test("Google retains committed saved state when a later preference listener throws", async () => {
  const ui = await harness({ configureFails: true });
  try {
    await ui.save();
    assert.equal(ui.find("Key").props.apiKey, "");
    assert.equal(ui.find("CredentialStatus").props.status, "saved");
    assert.match(String(ui.find("p").props.children), /密钥已保存.*偏好未完成/);
    assert.equal(ui.feedback.length, 0);
  } finally {
    ui.unmount();
  }
});

test("Google reports complete success when both native commit and preferences succeed", async () => {
  const ui = await harness();
  try {
    await ui.save();
    assert.equal(ui.find("Key").props.apiKey, "");
    assert.equal(ui.find("CredentialStatus").props.status, "saved");
    assert.match(
      String(ui.find("p").props.children),
      /Google 已保存，可在对话/,
    );
    assert.deepEqual(ui.feedback, ["Google 配置已更新。"]);
  } finally {
    ui.unmount();
  }
});
