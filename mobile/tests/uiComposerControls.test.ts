import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

type Node = {
  type: string | ((props: Record<string, unknown>) => Node);
  props: Record<string, unknown>;
};
const ports: Record<string, string> = {
  "react/jsx-runtime":
    "export const jsx=(type,props)=>({type,props});export const jsxs=jsx;",
  "react-native":
    "export const useWindowDimensions=()=>({width:390,height:844});export const View='View',Text='Text',Pressable='Pressable',ActivityIndicator='ActivityIndicator';",
  theme:
    "export const touchTarget=48;export const useTheme=()=>({selected:'surface',text:'ink',input:'input',tertiary:'disabled'});",
  icon: "export const Icon='Icon';",
};
async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "kk-composer-controls-"));
  const output = join(directory, "toolbar.mjs");
  await build({
    entryPoints: [
      fileURLToPath(
        new URL("../src/screens/ComposerToolbar.tsx", import.meta.url),
      ),
    ],
    outfile: output,
    bundle: true,
    platform: "node",
    format: "esm",
    jsx: "automatic",
    plugins: [
      {
        name: "render-ports",
        setup(builder) {
          builder.onResolve({ filter: /.*/ }, ({ path }) => {
            const key = path.includes("/theme")
              ? "theme"
              : path.includes("/Icon")
                ? "icon"
                : path;
            if (ports[key]) return { path: key, namespace: "ports" };
          });
          builder.onLoad({ filter: /.*/, namespace: "ports" }, ({ path }) => ({
            contents: ports[path],
            loader: "js",
          }));
        },
      },
    ],
  });
  const { ComposerToolbar } = await import(pathToFileURL(output).href);
  const calls: string[] = [];
  function buttons(overrides = {}) {
    const tree = ComposerToolbar({
      kind: "text",
      model: "fixture-model",
      running: false,
      blocked: false,
      busy: false,
      voiceState: "off",
      onAdd: () => calls.push("upload"),
      onModel: () => calls.push("model"),
      onParameters: () => calls.push("parameters"),
      onExtensions: () => calls.push("extensions"),
      onVoice: () => calls.push("voice"),
      onSend: () => calls.push("send"),
      ...overrides,
    });
    const result: Node[] = [];
    function visit(value: unknown): void {
      if (!value || typeof value !== "object") return;
      const node = value as Node;
      if (typeof node.type === "function") return visit(node.type(node.props));
      if (node.type === "Pressable") result.push(node);
      for (const child of [node.props?.children].flat(Infinity)) visit(child);
    }
    visit(tree);
    return result;
  }
  return {
    buttons,
    calls,
    dispose: () => rm(directory, { recursive: true, force: true }),
  };
}
test("actual toolbar exposes six real controls without requiring input focus", async () => {
  const f = await fixture();
  try {
    const buttons = f.buttons();
    assert.deepEqual(
      buttons.map((b) => b.props.accessibilityLabel),
      [
        "上传",
        "当前模型：fixture-model，选择模型",
        "参数选项",
        "扩展选择",
        "开启语音输入",
        "发送",
      ],
    );
    for (const button of buttons) (button.props.onPress as () => void)();
    assert.deepEqual(f.calls, [
      "upload",
      "model",
      "parameters",
      "extensions",
      "voice",
      "send",
    ]);
  } finally {
    await f.dispose();
  }
});
test("send is a single circular surface matching adjacent controls", async () => {
  const f = await fixture();
  try {
    const buttons = f.buttons();
    for (const button of buttons) {
      const style = (
        button.props.style as (state: {
          pressed: boolean;
        }) => Record<string, unknown>
      )({ pressed: false });
      assert.equal(style.width, 48);
      assert.equal(style.height, 48);
      assert.equal(style.borderRadius, 24);
      assert.ok(style.backgroundColor);
    }
  } finally {
    await f.dispose();
  }
});
test("an empty or blocked draft still allows configuration while only send is disabled", async () => {
  const f = await fixture();
  try {
    const buttons = f.buttons({ blocked: true });
    assert.equal(buttons.length, 6);
    assert.ok(buttons.slice(0, -1).every((b) => !b.props.disabled));
    assert.equal(buttons.at(-1)!.props.disabled, true);
    assert.equal(
      f.buttons({ running: true, blocked: true }).at(-1)!.props
        .accessibilityLabel,
      "停止生成",
    );
    assert.equal(
      f.buttons({ voiceState: "starting" })[4].props.accessibilityLabel,
      "关闭语音输入",
    );
  } finally {
    await f.dispose();
  }
});

test("speech is visibly unavailable during an operation or storage failure", async () => {
  const f = await fixture();
  try {
    for (const state of [
      { busy: true },
      { running: true },
      { voiceDisabled: true },
    ]) {
      const voice = f.buttons(state)[4];
      assert.equal(voice.props.disabled, true);
      assert.match(String(voice.props.accessibilityLabel), /暂不可用/);
    }
  } finally {
    await f.dispose();
  }
});
