import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import type { ConnectionInput } from "../src/application/types.ts";
import type { MobileConnectionMetadata } from "../src/core/mobileModel.ts";
type Element = {
  type: string;
  props: { children?: unknown; label?: string; onPress?: () => Promise<void> };
};
function saveButton(node: unknown): Element | undefined {
  if (!node || typeof node !== "object") return;
  const element = node as Element;
  if (element.props.label === "保存连接") return element;
  const children = element.props.children;
  for (const child of Array.isArray(children)
    ? children.flat(Infinity)
    : [children]) {
    const found = saveButton(child);
    if (found) return found;
  }
}
test("saving a connection preserves declared sizes and adds documented sizes only to official 12ai image endpoints", async () => {
  const directory = mkdtempSync(join(tmpdir(), "kk-connection-capabilities-"));
  const globals = globalThis as typeof globalThis & {
    connectionFixture?: {
      existing: MobileConnectionMetadata;
      saved?: ConnectionInput;
    };
  };
  try {
    const ports: Record<string, string> = {
      react: "export const useState=value=>[value,()=>{}];",
      "react/jsx-runtime":
        "export const jsx=(type,props)=>({type,props});export const jsxs=jsx;",
      "react-native":
        "export const View='View',Switch='Switch',Platform={OS:'web'};",
      "expo-router":
        "export const router={back(){}};export const useLocalSearchParams=()=>({id:'fixture'});",
      app: "export const useApplication=()=>({state:{snapshot:{connections:[globalThis.connectionFixture.existing]}},app:{deps:{},saveConnection:async input=>{globalThis.connectionFixture.saved=input}}});",
      theme: "export const useTheme=()=>({});",
      primitives:
        "export const Action='Action',Card='Card',Content='Content',Field='Field',Header='Header',Label='Label',Row='Row',Screen='Screen',Empty='Empty';",
      action: "export const useAction=()=>({busy:false,run:action=>action()});",
    };
    const bundle = join(directory, "editor.mjs");
    await build({
      entryPoints: [
        fileURLToPath(
          new URL("../src/screens/ConnectionEditorScreen.tsx", import.meta.url),
        ),
      ],
      outfile: bundle,
      bundle: true,
      format: "esm",
      platform: "node",
      jsx: "automatic",
      plugins: [
        {
          name: "editor-ports",
          setup(builder) {
            builder.onResolve({ filter: /.*/ }, ({ path }) => {
              if (ports[path]) return { path, namespace: "port" };
              for (const [pattern, key] of [
                ["AppProvider", "app"],
                ["/theme", "theme"],
                ["/primitives", "primitives"],
                ["/useAction", "action"],
              ])
                if (path.includes(pattern))
                  return { path: key, namespace: "port" };
            });
            builder.onLoad({ filter: /.*/, namespace: "port" }, ({ path }) => ({
              contents: ports[path],
              loader: "js",
            }));
          },
        },
      ],
    });
    const { default: Editor } = await import(pathToFileURL(bundle).href);
    for (const [baseUrl, declared, expected] of [
      ["https://cdn.12ai.org/v1", ["1536x1024"], ["1536x1024"]],
      [
        "https://cdn.12ai.org/v1",
        undefined,
        ["auto", "1248x1248", "1536x1024", "1024x1536"],
      ],
      ["https://generic.example/v1", undefined, undefined],
      ["https://cdn.12ai.org/proxy/v1", undefined, undefined],
    ] as const) {
      globals.connectionFixture = {
        existing: {
          id: "fixture",
          name: "Fixture",
          baseUrl,
          provider: "openai-compatible",
          protocol: "openai-compatible",
          capabilities: {
            text: true,
            image: true,
            imageSizes: declared ? [...declared] : undefined,
          },
        },
      };
      await saveButton(Editor())!.props.onPress!();
      assert.deepEqual(
        globals.connectionFixture.saved!.capabilities.imageSizes,
        expected,
      );
    }
  } finally {
    delete globals.connectionFixture;
    rmSync(directory, { recursive: true, force: true });
  }
});
