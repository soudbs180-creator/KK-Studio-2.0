import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { setImmediate } from "node:timers/promises";
import ts from "typescript";

// Run the actual component callbacks with a deferred native seek boundary.
// This checks source/lifetime behavior, not codec or actual device playback.
const source = readFileSync(
  new URL("../src/ui/MediaOriginalPreviewPlayers.tsx", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  fileName: "MediaOriginalPreviewPlayers.tsx",
  compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
interface Node {
  props: { label?: string; onPress?: () => void; children?: Node | Node[] };
}
function find(
  tree: Node | Node[] | undefined,
  label: string,
): Node | undefined {
  if (!tree) return;
  if (Array.isArray(tree)) {
    for (const child of tree) {
      const value = find(child, label);
      if (value) return value;
    }
  } else if (typeof tree === "object") {
    return tree.props?.label === label
      ? tree
      : find(tree.props?.children, label);
  }
}
function fixture() {
  let released = false,
    valid = true,
    plays = 0,
    releasedPlays = 0,
    seeks = 0,
    stopped = 0;
  let resolveSeek: (() => void) | undefined,
    rejectSeek: ((error: Error) => void) | undefined;
  const effects: (() => (() => void) | undefined)[] = [],
    cleanups: (() => void)[] = [];
  const stateWrites: unknown[] = [],
    releasedStateWrites: unknown[] = [];
  const player = {
    isLoaded: true,
    seekTo() {
      seeks++;
      return new Promise<void>((resolve, reject) => {
        resolveSeek = resolve;
        rejectSeek = reject;
      });
    },
    play() {
      plays++;
      if (released) releasedPlays++;
    },
    pause() {},
  };
  const jsx = (_type: unknown, props: Node["props"]) => ({ props });
  const exports: {
    LocalAudioPlayer?: (props: {
      uri: string;
      name: string;
      valid(): boolean;
      onCancel(): void;
    }) => Node;
  } = {};
  runInNewContext(compiled, {
    exports,
    require(name: string) {
      if (name === "react")
        return {
          useEffect(callback: () => (() => void) | undefined) {
            effects.push(callback);
            const cleanup = callback();
            if (cleanup) cleanups.push(cleanup);
          },
          useState(value: unknown) {
            return [
              value,
              (next: unknown) => {
                stateWrites.push(next);
                if (released) releasedStateWrites.push(next);
              },
            ];
          },
          useRef(value: unknown) {
            return { current: value };
          },
        };
      if (name === "react/jsx-runtime")
        return { jsx, jsxs: jsx, Fragment: "Fragment" };
      if (name === "react-native")
        return {
          View: "View",
          ActivityIndicator: "Spinner",
          AppState: {
            currentState: "active",
            addEventListener() {
              return { remove() {} };
            },
          },
        };
      if (name === "expo-audio")
        return {
          useAudioPlayer() {
            return player;
          },
          useAudioPlayerStatus() {
            return {
              playing: false,
              isLoaded: true,
              didJustFinish: true,
              currentTime: 10,
              duration: 10,
            };
          },
        };
      if (name === "expo-video") return {};
      if (name.endsWith("primitives.tsx"))
        return { Action: "Action", Label: "Label", Row: "Row" };
      if (name.endsWith("geometry.ts")) return { radii: { card: 20 } };
      if (name.endsWith("theme.tsx"))
        return {
          useTheme() {
            return { accent: "semantic-token" };
          },
        };
      throw new Error(`Unspecified dependency: ${name}`);
    },
    setTimeout,
    clearTimeout,
  });
  assert.ok(exports.LocalAudioPlayer);
  const tree = exports.LocalAudioPlayer({
    uri: "file:///verified-original.wav",
    name: "Original",
    valid: () => valid,
    onCancel() {
      stopped++;
    },
  });
  return {
    press(label: string) {
      const button = find(tree, label);
      assert.ok(button?.props.onPress);
      button.props.onPress();
    },
    resolve() {
      assert.ok(resolveSeek);
      resolveSeek();
    },
    reject() {
      assert.ok(rejectSeek);
      rejectSeek(new Error("native seek failed"));
    },
    unmount() {
      for (const cleanup of cleanups.splice(0)) cleanup();
      released = true;
    },
    effectReplay() {
      for (const cleanup of cleanups.splice(0)) cleanup();
      for (const effect of effects) {
        const cleanup = effect();
        if (cleanup) cleanups.push(cleanup);
      }
    },
    expire() {
      valid = false;
    },
    get evidence() {
      return {
        plays,
        releasedPlays,
        seeks,
        stopped,
        stateWrites,
        releasedStateWrites,
      };
    },
  };
}
for (const label of ["播放音频", "从头播放"]) {
  for (const outcome of ["resolve", "reject"] as const) {
    for (const leave of [
      "stop",
      "unmount",
      "effect-replay",
      "account-expiry",
    ] as const) {
      test(`${label}: late ${outcome} after ${leave} never plays or updates the old instance`, async () => {
        const f = fixture();
        try {
          f.press(label);
          if (leave === "stop") f.press("停止预览");
          if (leave === "unmount") f.unmount();
          if (leave === "effect-replay") f.effectReplay();
          if (leave === "account-expiry") f.expire();
          f[outcome]();
          await setImmediate();
          assert.equal(f.evidence.plays, 0);
          assert.deepEqual(f.evidence.stateWrites, []);
          assert.equal(f.evidence.releasedPlays, 0);
        } finally {
          f.unmount();
        }
      });
    }
    test(`${label}: mounted ${outcome} preserves normal playback/error feedback`, async () => {
      const f = fixture();
      try {
        f.press(label);
        f[outcome]();
        await setImmediate();
        assert.equal(f.evidence.plays, outcome === "resolve" ? 1 : 0);
        assert.equal(
          f.evidence.stateWrites.length,
          outcome === "reject" ? 1 : 0,
        );
      } finally {
        f.unmount();
      }
    });
  }
  test(`${label}: an old callback cannot begin a seek after unmount`, () => {
    const f = fixture();
    f.unmount();
    f.press(label);
    assert.equal(f.evidence.seeks, 0);
  });
}
test("reopening the player effect permits a new seek while rejecting the prior request", async () => {
  const f = fixture();
  try {
    f.press("播放音频");
    f.effectReplay();
    f.resolve();
    await setImmediate();
    assert.equal(f.evidence.plays, 0);
    f.press("从头播放");
    f.resolve();
    await setImmediate();
    assert.equal(f.evidence.plays, 1);
  } finally {
    f.unmount();
  }
});
