import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import type { CreationDraft } from "@kk-studio/creation-contracts";
import type { MobileAsset } from "../src/core/mobileModel.ts";

type Node = {
  type: string | ((props: Record<string, unknown>) => Node);
  props: Record<string, unknown>;
};
function walk(node: unknown, match: (node: Node) => boolean): Node | undefined {
  if (!node || typeof node !== "object") return;
  const item = node as Node;
  if (match(item)) return item;
  const children = item.props?.children;
  for (const child of Array.isArray(children)
    ? children.flat(Infinity)
    : [children]) {
    const found = walk(child, match);
    if (found) return found;
  }
}

// Execute the real Composer/ComposerPanels callbacks. Only React/RN rendering
// ports are deterministic: this models two delivered events before a new commit.
const ports: Record<string, string> = {
  react: `export const useState=init=>{const i=globalThis.hooks.index++;if(!(i in globalThis.hooks.slots))globalThis.hooks.slots[i]=typeof init==='function'?init():init;return [globalThis.hooks.slots[i],v=>{globalThis.hooks.slots[i]=typeof v==='function'?v(globalThis.hooks.slots[i]):v}]};export const useRef=v=>{const i=globalThis.hooks.index++;return globalThis.hooks.slots[i]??=({current:v})};export const useEffect=()=>{};export const useCallback=f=>f;`,
  "react/jsx-runtime": `export const jsx=(type,props)=>({type,props});export const jsxs=jsx;export const Fragment='Fragment';`,
  "react-native": `export const useWindowDimensions=()=>({width:390,height:844});export const TextInput='TextInput',View='View',Keyboard={dismiss(){}},Pressable='Pressable',Text='Text',ActivityIndicator='ActivityIndicator';`,
  "expo-router": `export const router={push(){}};export const useFocusEffect=effect=>{globalThis.hooks.blur=effect()};`,
  application: `export const useApplication=()=>globalThis.hooks.application;`,
  theme: `export const touchTarget=48;export const useTheme=()=>({input:'#fff',text:'#111',muted:'#666',selected:'#eee',border:'#eee',subtleBorder:'#eee'});`,
  primitives: `export const Action='Action',Label='Label',Row='Row';`,
  sheet: `export const Sheet='Sheet';`,
  picker: `export const ModelPicker='ModelPicker';`,
  recovery: `export const DraftRecovery='DraftRecovery';`,
  action: `export const useAction=()=>({busy:false,run:action=>{const pending=Promise.resolve(action());globalThis.hooks.pendingAction=pending;return pending}});`,
  icon: `export const Icon='Icon';`,
  speech: `export const useSpeechInput=()=>({state:'off',supported:false,toggle(){},cancel(){globalThis.hooks.speechCancels++}});`,
  media: `export const importImage=repo=>globalThis.hooks.importMedia(repo);export const importDocument=importImage;`,
};

async function composerFixture(video = false) {
  const directory = mkdtempSync(join(tmpdir(), "kk-composer-events-"));
  const bundle = join(directory, "composer.mjs");
  await build({
    entryPoints: [
      fileURLToPath(new URL("../src/screens/Composer.tsx", import.meta.url)),
    ],
    outfile: bundle,
    bundle: true,
    format: "esm",
    platform: "node",
    jsx: "automatic",
    plugins: [
      {
        name: "component-ports",
        setup(builder) {
          builder.onResolve({ filter: /.*/ }, ({ path }) => {
            if (
              path === "react" ||
              path === "react/jsx-runtime" ||
              path === "react-native" ||
              path === "expo-router"
            )
              return { path, namespace: "probe" };
            for (const [pattern, key] of [
              ["AppProvider", "application"],
              ["/theme", "theme"],
              ["/primitives", "primitives"],
              ["/Sheet", "sheet"],
              ["/ModelPicker", "picker"],
              ["/DraftRecovery", "recovery"],
              ["/useAction", "action"],
              ["/Icon", "icon"],
              ["/useSpeechInput", "speech"],
              ["/storage/media", "media"],
            ])
              if (path.includes(pattern))
                return { path: key, namespace: "probe" };
          });
          builder.onLoad({ filter: /.*/, namespace: "probe" }, ({ path }) => ({
            contents: ports[path],
            loader: "js",
          }));
        },
      },
    ],
  });
  const seed: CreationDraft = {
    prompt: "old render prompt",
    kind: "image",
    model: "selected-model",
    providerConnectionId: "connection",
    attachments: [],
    outputCount: 2,
    updatedAt: 1,
    approvalMode: "ask",
    privacyMode: "byok_local",
  };
  let saved = seed;
  let generation = 0;
  let finishImport: ((asset: MobileAsset) => void) | undefined;
  const originals: MobileAsset[] = [];
  const saves: CreationDraft[] = [];
  const repo = {
    storeOriginal: async (asset: MobileAsset) => {
      originals.push(structuredClone(asset));
      return asset;
    },
    load: async () => ({
      ...runtime.application.state.snapshot,
      assets: originals,
    }),
  };
  type Context = { accountId: string; generation: number; repo: typeof repo };
  const globals = globalThis as typeof globalThis & { hooks?: unknown };
  const runtime = {
    index: 0,
    speechCancels: 0,
    pendingAction: undefined as Promise<unknown> | undefined,
    importMedia: async (repository: typeof repo) => {
      const asset = await new Promise<MobileAsset>((resolve) => {
        finishImport = resolve;
      });
      return repository.storeOriginal(asset);
    },
    slots: { 4: "parameters" },
    application: {
      app: {
        getDraft: () => saved,
        saveDraft: async (_id: string, next: CreationDraft) => {
          saved = structuredClone(next);
          saves.push(saved);
        },
        context: (): Context => ({
          accountId: runtime.application.state.accountId,
          generation,
          repo,
        }),
        valid: (ctx: Context): boolean =>
          ctx.accountId === runtime.application.state.accountId &&
          ctx.generation === generation,
        mutate: async (
          _ctx: Context,
          operation: (repository: typeof repo) => Promise<unknown>,
        ) => operation(repo),
        getState: () => runtime.application.state,
        report: (error: unknown) => {
          throw error;
        },
        deps: { id: () => "reference" },
      },
      state: {
        accountId: "account",
        snapshot: {
          activeProjectId: "project",
          assets: [],
          connections: [
            {
              id: "connection",
              baseUrl: video
                ? "https://cdn.12ai.org/v1"
                : "https://example.test/v1",
              credentialRef: "fixture-ref",
              capabilities: { text: true, image: true, maxOutputs: 4 },
            },
          ],
        },
        busyTaskIds: [],
        unsavedDraftProjectIds: [],
      },
    },
  };
  globals.hooks = runtime;
  const { Composer } = await import(pathToFileURL(bundle).href);
  const view = Composer({
    project: { id: "project", composerDraft: seed, tasks: [] },
  });
  const inputComponent = walk(
    view,
    (item) =>
      typeof item.type === "function" && item.type.name === "ComposerInput",
  )!;
  const input = walk(
    (inputComponent.type as (props: Record<string, unknown>) => Node)(
      inputComponent.props,
    ),
    (item) => item.type === "TextInput",
  )!;
  const picker = walk(view, (item) => item.type === "ModelPicker")!;
  const panels = walk(
    view,
    (item) =>
      typeof item.type === "function" && item.type.name === "ComposerPanels",
  )!;
  assert.ok(input && picker && panels);
  const panelTree = (panels.type as (props: Record<string, unknown>) => Node)(
    panels.props,
  );
  function press(label: string) {
    const button = walk(
      panelTree,
      (item) => item.type === "Action" && item.props.label === label,
    );
    assert.ok(button);
    (button.props.onPress as () => void)();
  }
  return {
    saved: () => saved,
    saves: () => saves,
    originals: () => originals,
    editStoredPrompt: (prompt: string) => {
      saved = { ...saved, prompt };
    },
    setActiveProject: (activeProjectId: string) => {
      runtime.application.state = {
        ...runtime.application.state,
        snapshot: { ...runtime.application.state.snapshot, activeProjectId },
      };
    },
    setAccount: (accountId: string) => {
      generation++;
      runtime.application.state = { ...runtime.application.state, accountId };
    },
    beginImport: async (image: boolean) => {
      (panels.props.onImport as (image: boolean) => void)(image);
      await Promise.resolve();
      assert.ok(
        finishImport,
        "actual upload must reach the pending device import",
      );
      assert.ok(runtime.pendingAction);
      return { done: runtime.pendingAction, complete: finishImport };
    },
    routeCleanup: () => (globals.hooks as { blur?: () => void }).blur,
    speechCancels: () =>
      (globals.hooks as { speechCancels: number }).speechCancels,
    press,
    type: (text: string) =>
      (input.props.onChangeText as (text: string) => void)(text),
    select: (id: string, model: string) =>
      (picker.props.onSelect as (id: string, model: string) => void)(id, model),
    attach: () =>
      (panels.props.onAsset as (asset: unknown) => void)({
        id: "material",
        name: "reference.png",
        mime: "image/png",
        size: 12,
      }),
    dispose: () => {
      delete globals.hooks;
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

test("leaving a retained chat route cancels the active speech session", async () => {
  const fixture = await composerFixture();
  try {
    const blur = fixture.routeCleanup();
    assert.equal(typeof blur, "function", "chat must subscribe to route blur");
    const before = fixture.speechCancels();
    blur!();
    assert.equal(fixture.speechCancels(), before + 1);
  } finally {
    fixture.dispose();
  }
});

const importedOriginal: MobileAsset = {
  id: "delayed-original",
  name: "delayed.png",
  mime: "image/png",
  size: 12,
  sha256: "a".repeat(64),
  createdAt: 1,
  provenance: { source: "import" },
};

for (const image of [true, false]) {
  test(`${image ? "image" : "document"} upload returning after route A to B to A preserves a newer stored draft`, async () => {
    const fixture = await composerFixture();
    try {
      const pending = await fixture.beginImport(image);
      fixture.routeCleanup()!();
      fixture.setActiveProject("other-project");
      fixture.editStoredPrompt(
        "new prompt edited while the original import was pending",
      );
      fixture.setActiveProject("project");
      pending.complete(importedOriginal);
      await pending.done;
      assert.equal(
        fixture.saved().prompt,
        "new prompt edited while the original import was pending",
      );
      assert.deepEqual(fixture.saved().attachments, []);
      assert.equal(
        fixture.saves().length,
        0,
        "an expired upload must not save its retained draft",
      );
      assert.equal(
        fixture.originals()[0]?.id,
        "delayed-original",
        "the completed original remains stored",
      );
    } finally {
      fixture.dispose();
    }
  });
}

test("an upload completed after the account changes retains its original without attaching to the current draft", async () => {
  const fixture = await composerFixture();
  try {
    const pending = await fixture.beginImport(true);
    fixture.setAccount("other-account");
    fixture.editStoredPrompt("other account's current draft");
    pending.complete(importedOriginal);
    await pending.done;
    assert.equal(fixture.saved().prompt, "other account's current draft");
    assert.deepEqual(fixture.saved().attachments, []);
    assert.equal(fixture.saves().length, 0);
    assert.equal(fixture.originals()[0]?.id, "delayed-original");
  } finally {
    fixture.dispose();
  }
});

test("a current upload still attaches the completed original to its current draft", async () => {
  const fixture = await composerFixture();
  try {
    const pending = await fixture.beginImport(true);
    pending.complete(importedOriginal);
    await pending.done;
    assert.equal(fixture.saved().prompt, "old render prompt");
    assert.equal(fixture.saved().attachments[0]?.assetId, "delayed-original");
    assert.equal(fixture.originals()[0]?.id, "delayed-original");
  } finally {
    fixture.dispose();
  }
});

for (const label of ["增加图片数量", "减少图片数量", "切换到文字对话"]) {
  test(`actual ${label} callback preserves input, model and references delivered before another render`, async () => {
    const fixture = await composerFixture();
    try {
      fixture.type("new typing delivered before another render");
      fixture.select("new-connection", "new-model");
      fixture.attach();
      fixture.press(label);
      assert.equal(
        fixture.saved().prompt,
        "new typing delivered before another render",
      );
      assert.equal(fixture.saved().model, "new-model");
      assert.equal(fixture.saved().providerConnectionId, "new-connection");
      assert.equal(fixture.saved().attachments[0]?.assetId, "material");
      assert.equal(
        fixture.saved().outputCount,
        label === "增加图片数量" ? 3 : label === "减少图片数量" ? 1 : 2,
      );
      assert.equal(
        fixture.saved().kind,
        label === "切换到文字对话" ? "text" : "image",
      );
    } finally {
      fixture.dispose();
    }
  });
}
test("rapid count and mode callbacks calculate from the newest draft and remain bounded", async () => {
  const fixture = await composerFixture();
  try {
    for (let i = 0; i < 6; i++) fixture.press("增加图片数量");
    assert.equal(fixture.saved().outputCount, 4);
    for (let i = 0; i < 6; i++) fixture.press("减少图片数量");
    assert.equal(fixture.saved().outputCount, 1);
    fixture.press("切换到文字对话");
    fixture.press("切换到文字对话");
    assert.equal(fixture.saved().kind, "image");
  } finally {
    fixture.dispose();
  }
});
test("switching four images to video keeps newest input and model but captures one output", async () => {
  const fixture = await composerFixture(true);
  try {
    for (let i = 0; i < 4; i++) fixture.press("增加图片数量");
    fixture.type("Newest video prompt");
    fixture.select("connection", "sora-2");
    fixture.press("切换到视频生成");
    assert.equal(fixture.saved().kind, "video");
    assert.equal(fixture.saved().outputCount, 1);
    assert.equal(fixture.saved().prompt, "Newest video prompt");
    assert.equal(fixture.saved().model, "sora-2");
  } finally {
    fixture.dispose();
  }
});
