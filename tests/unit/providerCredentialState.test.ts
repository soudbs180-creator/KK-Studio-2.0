import { featureEntryMocks } from "../support/featureEntryMocks.ts";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { ProviderSaveError } from "../../src/features/creation/providerSaveRecovery.ts";

type CredentialHook =
  typeof import("../../src/components/settings/useProviderCredentialState.ts").useProviderCredentialState;

async function harness(
  load: (baseUrl: string, ref: string) => Promise<string>,
) {
  const slots: unknown[] = [];
  let cursor = 0;
  let mounted = true;
  let lateWrites = 0;
  let identity = ["https://fixture-one.invalid/v1", "opaque_one"];
  const effects: (() => void)[] = [];
  const requestRef = { current: null };
  const hooks = {
    useState(initial: unknown) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [
        slots[index],
        (value: unknown) => {
          if (!mounted) lateWrites++;
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
  };
  const source = await readFile(
    new URL(
      "../../src/components/settings/useProviderCredentialState.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports: { useProviderCredentialState?: CredentialHook } = {};
  const modules: Record<string, unknown> = {
    react: hooks,
    "../../features/creation/providerCredentials": { loadApiKey: load },
  };
  modules["../../features/creation/providerSaveRecovery"] = {
    ProviderSaveError,
  };
  runInNewContext(compiled, {
    exports,
    require: (name: string) => {
      const allModules = featureEntryMocks(modules);
      assert(name in allModules, `Unexpected dependency: ${name}`);
      return allModules[name];
    },
    setTimeout,
    clearTimeout,
  });
  const render = () => {
    cursor = 0;
    const state = exports.useProviderCredentialState!(
      identity[0]!,
      identity[1]!,
      requestRef,
    );
    while (effects.length) effects.shift()!();
    return state;
  };
  const settle = async () => {
    await new Promise((resolve) => setImmediate(resolve));
    return render();
  };
  const unmount = () => {
    for (const slot of slots) {
      if (slot && typeof slot === "object" && "cleanup" in slot)
        (slot as { cleanup?: () => void }).cleanup?.();
    }
    mounted = false;
  };
  return {
    render,
    settle,
    unmount,
    changeIdentity: () => {
      identity = ["https://fixture-two.invalid/v1", "opaque_two"];
    },
    lateWrites: () => lateWrites,
  };
}

test("a first vault read error remains unknown and retry restores the saved marker without exposing the key", async () => {
  let fail = true;
  const ui = await harness(async () => {
    if (fail) throw new Error("synthetic vault unavailable");
    return "synthetic-existing-key";
  });
  try {
    assert.equal(ui.render().credentialStatus, "loading");
    const failed = await ui.settle();
    assert.equal(failed.credentialStatus, "error");
    assert.equal(failed.hasStoredKey, false);
    fail = false;
    failed.retryCredentialLoad();
    ui.render();
    const restored = await ui.settle();
    assert.equal(restored.credentialStatus, "saved");
    assert.equal(restored.hasStoredKey, true);
    assert.equal(
      JSON.stringify(restored).includes("synthetic-existing-key"),
      false,
    );
  } finally {
    ui.unmount();
  }
});

test("a save callback from the old account cannot invalidate the new account's pending read", async () => {
  let finish: (value: string) => void = () => undefined;
  const ui = await harness((_baseUrl, ref) =>
    ref === "opaque_one"
      ? Promise.resolve("synthetic-first-key")
      : new Promise((resolve) => {
          finish = resolve;
        }),
  );
  try {
    ui.render();
    const first = await ui.settle();
    ui.changeIdentity();
    ui.render();
    first.setHasStoredKey(true);
    finish("synthetic-second-key");
    const second = await ui.settle();
    assert.equal(second.credentialStatus, "saved");
  } finally {
    ui.unmount();
  }
});

test("a save callback after unmount does not write stale credential state", async () => {
  const ui = await harness(async () => "synthetic-existing-key");
  ui.render();
  const saved = await ui.settle();
  ui.unmount();
  saved.setHasStoredKey(false);
  assert.equal(ui.lateWrites(), 0);
});

test("a committed cache failure clears the submitted secret draft and reflects the vault state, while an uncommitted failure keeps the draft", async () => {
  const ui = await harness(async () => "");
  try {
    ui.render();
    let state = await ui.settle();
    let draft = "synthetic-submitted-key";
    state.reflectCommittedCredential(
      new ProviderSaveError("synthetic cache failure", "saved"),
      () => {
        draft = "";
      },
    );
    state = ui.render();
    assert.equal(state.credentialStatus, "saved");
    assert.equal(draft, "");
    draft = "synthetic-unsaved-draft";
    state.reflectCommittedCredential(
      new Error("synthetic native CAS failure"),
      () => {
        draft = "";
      },
    );
    assert.equal(draft, "synthetic-unsaved-draft");
    state.reflectCommittedCredential(
      new ProviderSaveError("synthetic cache failure", "missing"),
      () => {
        draft = "";
      },
    );
    assert.equal(ui.render().credentialStatus, "missing");
    assert.equal(draft, "");
  } finally {
    ui.unmount();
  }
});
