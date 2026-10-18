import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import type {
  SpeechInput,
  SpeechInputOptions,
} from "../src/ui/useSpeechInput.types.ts";
import { useSpeechInput as useNativeSpeechInput } from "../src/ui/useSpeechInput.ts";

type ResultEvent = { results: ArrayLike<{ 0: { transcript: string } }> };
class Recognition {
  static instances: Recognition[] = [];
  static failure = "";
  lang = "";
  continuous = false;
  interimResults = false;
  maxAlternatives = 0;
  starts = 0;
  stops = 0;
  aborts = 0;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onresult: ((event: ResultEvent) => void) | null = null;
  constructor() {
    if (Recognition.failure === "constructor") throw new Error("constructor");
    Recognition.instances.push(this);
  }
  start() {
    this.starts++;
    if (Recognition.failure === "start") throw new Error("start");
  }
  stop() {
    this.stops++;
    if (Recognition.failure === "stop") throw new Error("stop");
  }
  abort() {
    this.aborts++;
    if (Recognition.failure === "abort") throw new Error("abort");
  }
  emit(...texts: string[]) {
    this.onresult?.({
      results: texts.map((transcript) => ({ 0: { transcript } })),
    });
  }
}

type Slot = { value?: unknown; deps?: unknown[]; cleanup?: () => void };
// Same deterministic React ports used by uiComposerDraft; execute the real hook,
// including effect cleanup, without a microphone or a new rendering dependency.
async function fixture(mode = "standard") {
  Recognition.instances = [];
  Recognition.failure = "";
  const slots: Slot[] = [];
  let index = 0;
  let effects: (() => void)[] = [];
  let layouts: (() => void)[] = [];
  const runtime = {
    useRef(value: unknown) {
      const slot = (slots[index++] ??= {});
      return (slot.value ??= { current: value });
    },
    useState(value: unknown) {
      const slot = (slots[index++] ??= { value });
      return [
        slot.value,
        (next: unknown) => {
          slot.value = next;
        },
      ];
    },
    useCallback(callback: () => unknown, deps: unknown[]) {
      const slot = (slots[index++] ??= {});
      if (!slot.deps || deps.some((dep, i) => dep !== slot.deps?.[i])) {
        slot.value = callback;
        slot.deps = deps;
      }
      return slot.value;
    },
    useEffect(callback: () => void | (() => void), deps: unknown[]) {
      const slot = (slots[index++] ??= {});
      if (!slot.deps || deps.some((dep, i) => dep !== slot.deps?.[i])) {
        effects.push(() => {
          slot.cleanup?.();
          slot.cleanup = callback() || undefined;
          slot.deps = deps;
        });
      }
    },
    useLayoutEffect(callback: () => void | (() => void), deps: unknown[]) {
      const slot = (slots[index++] ??= {});
      if (!slot.deps || deps.some((dep, i) => dep !== slot.deps?.[i])) {
        layouts.push(() => {
          slot.cleanup?.();
          slot.cleanup = callback() || undefined;
          slot.deps = deps;
        });
      }
    },
  };
  const globals = globalThis as typeof globalThis & {
    __kkSpeechHooks?: unknown;
  };
  globals.__kkSpeechHooks = runtime;
  const directory = mkdtempSync(join(tmpdir(), "kk-mobile-speech-"));
  const bundle = join(directory, "hook.mjs");
  await build({
    entryPoints: [
      fileURLToPath(
        new URL("../src/ui/useSpeechInput.web.ts", import.meta.url),
      ),
    ],
    outfile: bundle,
    bundle: true,
    format: "esm",
    platform: "node",
    plugins: [
      {
        name: "react-ports",
        setup(builder) {
          builder.onResolve({ filter: /^react$/ }, ({ path }) => ({
            path,
            namespace: "probe",
          }));
          builder.onLoad({ filter: /.*/, namespace: "probe" }, () => ({
            contents: [
              "useRef",
              "useState",
              "useEffect",
              "useLayoutEffect",
              "useCallback",
            ]
              .map(
                (name) =>
                  `export const ${name}=(...args)=>globalThis.__kkSpeechHooks.${name}(...args);`,
              )
              .join("\n"),
          }));
        },
      },
    ],
  });
  const timers = new Map<number, { callback: () => void; delay: number }>();
  let timerId = 0;
  const browser = Object.assign(new EventTarget(), {
    SpeechRecognition: ["standard", "insecure"].includes(mode)
      ? Recognition
      : undefined,
    webkitSpeechRecognition: mode === "prefixed" ? Recognition : undefined,
    isSecureContext: mode !== "insecure",
    setTimeout(callback: () => void, delay: number) {
      timers.set(++timerId, { callback, delay });
      return timerId;
    },
    clearTimeout(id: number) {
      timers.delete(id);
    },
  });
  const document = Object.assign(new EventTarget(), { hidden: false });
  const navigator = { onLine: true };
  const descriptors = ["window", "document", "navigator"].map(
    (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
  );
  for (const [key, value] of Object.entries({
    window: browser,
    document,
    navigator,
  }))
    Object.defineProperty(globalThis, key, { configurable: true, value });
  const module = (await import(pathToFileURL(bundle).href)) as {
    useSpeechInput: (options: SpeechInputOptions) => SpeechInput;
  };
  const changes: string[] = [];
  const statuses: string[] = [];
  let options: SpeechInputOptions = {
    value: "已有文字",
    sessionKey: "account/project",
    enabled: true,
    onChange: (value) => {
      changes.push(value);
      options = { ...options, value };
    },
    onStatus: (value) => statuses.push(value),
  };
  function render(next: Partial<SpeechInputOptions> = {}, commit = true) {
    options = { ...options, ...next };
    index = 0;
    const view = module.useSpeechInput(options);
    const pendingLayouts = layouts;
    layouts = [];
    pendingLayouts.forEach((effect) => effect());
    if (commit) {
      const pending = effects;
      effects = [];
      pending.forEach((effect) => effect());
    }
    return view;
  }
  render();
  let disposed = false;
  return {
    render,
    changes,
    statuses,
    browser,
    document,
    navigator,
    timers,
    current: () => Recognition.instances.at(-1)!,
    begin() {
      render().toggle();
      return Recognition.instances.at(-1)!;
    },
    expire(delay: number) {
      for (const [id, timer] of timers) {
        if (timer.delay !== delay) continue;
        timers.delete(id);
        timer.callback();
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      slots.forEach((slot) => slot.cleanup?.());
      for (const [key, descriptor] of descriptors) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
      delete globals.__kkSpeechHooks;
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

test("supported recognition waits for a gesture and appends revised transcript without duplicating the draft", async () => {
  const f = await fixture();
  try {
    assert.equal(f.render().supported, true);
    assert.equal(Recognition.instances.length, 0);
    const recognition = f.begin();
    assert.equal(f.render().state, "starting");
    assert.equal(recognition.lang, "zh-CN");
    assert.equal(recognition.continuous, true);
    assert.equal(recognition.interimResults, true);
    recognition.onstart?.();
    assert.equal(f.render().state, "on");
    recognition.emit("中间");
    f.render({ value: "已有文字 中间" });
    recognition.emit("最终", "结果");
    assert.deepEqual(f.changes, ["已有文字 中间", "已有文字 最终结果"]);
    f.render({ value: "已有文字 最终结果" }).toggle();
    assert.equal(f.render().state, "stopping");
    recognition.emit("最终结果。");
    recognition.onend?.();
    assert.equal(f.render({ value: "已有文字 最终结果。" }).state, "off");
    assert.equal(recognition.stops, 1);
  } finally {
    f.dispose();
  }
});

for (const mode of ["unsupported", "insecure"]) {
  test(`${mode} environment preserves input and explains why voice is unavailable`, async () => {
    const f = await fixture(mode);
    try {
      assert.equal(f.render().supported, false);
      f.render().toggle();
      assert.equal(Recognition.instances.length, 0);
      assert.deepEqual(f.changes, []);
      assert.match(f.statuses.at(-1)!, /不支持|安全连接/);
    } finally {
      f.dispose();
    }
  });
}

test("prefixed recognition is supported and keeps the user's existing whitespace", async () => {
  const f = await fixture("prefixed");
  try {
    f.render({ value: "原草稿  " });
    const recognition = f.begin();
    recognition.onstart?.();
    recognition.emit("追加");
    assert.deepEqual(f.changes, ["原草稿  追加"]);
  } finally {
    f.dispose();
  }
});

test("cancelling during startup rejects callbacks already queued by the browser", async () => {
  const f = await fixture();
  try {
    const recognition = f.begin();
    const lateResult = recognition.onresult!;
    const lateStart = recognition.onstart!;
    f.render().cancel();
    lateStart();
    lateResult({ results: [{ 0: { transcript: "迟到文字" } }] });
    assert.equal(f.render().state, "off");
    assert.equal(recognition.aborts, 1);
    assert.equal(f.timers.size, 0);
    assert.deepEqual(f.changes, []);
  } finally {
    f.dispose();
  }
});

for (const change of ["value", "sessionKey", "enabled"]) {
  test(`${change} invalidates queued results even before effect cleanup`, async () => {
    const f = await fixture();
    try {
      const recognition = f.begin();
      recognition.onstart?.();
      const lateResult = recognition.onresult!;
      const next = {
        value: "新草稿",
        sessionKey: "other/project",
        enabled: false,
      };
      f.render({ [change]: next[change as keyof typeof next] }, false);
      lateResult({ results: [{ 0: { transcript: "不应追加" } }] });
      assert.deepEqual(f.changes, []);
      f.render();
      assert.equal(f.render().state, "off");
      assert.equal(recognition.aborts, 1);
    } finally {
      f.dispose();
    }
  });
}

for (const event of ["hidden", "pagehide", "offline", "unmount"]) {
  test(`${event} aborts recognition and rejects late text`, async () => {
    const f = await fixture();
    try {
      const recognition = f.begin();
      recognition.onstart?.();
      const lateResult = recognition.onresult!;
      if (event === "hidden") {
        f.document.hidden = true;
        f.document.dispatchEvent(new Event("visibilitychange"));
      } else if (event === "unmount") f.dispose();
      else {
        if (event === "offline") f.navigator.onLine = false;
        f.browser.dispatchEvent(new Event(event));
      }
      lateResult({ results: [{ 0: { transcript: "迟到文字" } }] });
      assert.equal(recognition.aborts, 1);
      assert.equal(f.timers.size, 0);
      assert.deepEqual(f.changes, []);
      if (event !== "unmount") assert.equal(f.render().state, "off");
    } finally {
      f.dispose();
    }
  });
}

for (const [code, message] of [
  ["not-allowed", /权限被拒绝/],
  ["service-not-allowed", /权限被拒绝/],
  ["audio-capture", /麦克风/],
  ["network", /网络/],
  ["no-speech", /没有听到/],
  ["language-not-supported", /中文/],
  ["unexpected", /失败/],
] as const) {
  test(`${code} error preserves the draft and allows an explicit retry`, async () => {
    const f = await fixture();
    try {
      f.begin().onerror?.({ error: code });
      assert.equal(f.render().state, "off");
      assert.match(f.statuses.at(-1)!, message);
      assert.deepEqual(f.changes, []);
      f.begin();
      assert.equal(Recognition.instances.length, 2);
    } finally {
      f.dispose();
    }
  });
}

for (const failure of ["constructor", "start", "stop"]) {
  test(`${failure} exception exits cleanly and leaves a usable retry`, async () => {
    const f = await fixture();
    try {
      Recognition.failure = failure;
      const recognition = f.begin();
      if (failure === "stop") {
        recognition.onstart?.();
        f.render().toggle();
      }
      assert.equal(f.render().state, "off");
      assert.match(f.statuses.at(-1)!, /失败/);
      assert.equal(f.timers.size, 0);
      Recognition.failure = "";
      f.begin().onstart?.();
      assert.equal(f.render().state, "on");
    } finally {
      f.dispose();
    }
  });
}

for (const delay of [12000, 3000]) {
  test(`${delay}ms timeout aborts and reports a stalled recognition service`, async () => {
    const f = await fixture();
    try {
      const recognition = f.begin();
      if (delay === 3000) {
        recognition.onstart?.();
        f.render().toggle();
      }
      f.expire(delay);
      assert.equal(f.render().state, "off");
      assert.equal(recognition.aborts, 1);
      assert.match(f.statuses.at(-1)!, /超时/);
    } finally {
      f.dispose();
    }
  });
}

test("a completed recognition does not restart until another explicit gesture", async () => {
  const f = await fixture();
  try {
    const recognition = f.begin();
    recognition.onstart?.();
    recognition.onend?.();
    assert.equal(f.render().state, "off");
    assert.equal(Recognition.instances.length, 1);
    assert.equal(recognition.aborts, 0);
    f.begin().onstart?.();
    assert.equal(Recognition.instances.length, 2);
    assert.equal(f.render().state, "on");
  } finally {
    f.dispose();
  }
});

test("disabled, hidden and offline contexts never start recognition", async () => {
  const f = await fixture();
  try {
    f.render({ enabled: false }).toggle();
    f.render({ enabled: true });
    f.document.hidden = true;
    f.render().toggle();
    f.document.hidden = false;
    f.navigator.onLine = false;
    f.render().toggle();
    assert.equal(Recognition.instances.length, 0);
    assert.deepEqual(f.changes, []);
    assert.match(f.statuses.at(-1)!, /网络/);
  } finally {
    f.dispose();
  }
});

test("Native explicitly reports unavailable speech recognition without changing the draft", () => {
  const statuses: string[] = [];
  const view = useNativeSpeechInput({
    value: "保留原生草稿",
    onChange: () => assert.fail("must not change the draft"),
    onStatus: (message) => statuses.push(message),
  });
  assert.equal(view.supported, false);
  assert.equal(view.state, "off");
  view.toggle();
  view.cancel();
  assert.match(statuses[0], /尚未接入语音识别.*系统键盘听写/);
});

test("callbacks from a previous attempt cannot overwrite or close the newly started attempt", async () => {
  const f = await fixture();
  try {
    const first = f.begin();
    const lateResult = first.onresult!,
      lateEnd = first.onend!;
    first.onerror?.({ error: "network" });
    const second = f.begin();
    second.onstart?.();
    lateResult({ results: [{ 0: { transcript: "旧结果" } }] });
    lateEnd();
    assert.deepEqual(f.changes, []);
    assert.equal(f.render().state, "on");
    second.emit("新结果");
    assert.deepEqual(f.changes, ["已有文字 新结果"]);
  } finally {
    f.dispose();
  }
});

test("rapid clicks cancel a pending start without creating overlapping recognitions", async () => {
  const f = await fixture();
  try {
    const view = f.render();
    view.toggle();
    view.toggle();
    assert.equal(Recognition.instances.length, 1);
    assert.equal(f.current().aborts, 1);
    assert.equal(f.render().state, "off");
    view.toggle();
    assert.equal(Recognition.instances.length, 2);
    assert.equal(f.render().state, "starting");
  } finally {
    f.dispose();
  }
});

test("abort exceptions are visible while detached callbacks cannot change text", async () => {
  const f = await fixture();
  try {
    const recognition = f.begin(),
      lateResult = recognition.onresult!;
    Recognition.failure = "abort";
    f.render().cancel();
    assert.match(f.statuses.at(-1)!, /未能确认麦克风停止/);
    lateResult({ results: [{ 0: { transcript: "迟到结果" } }] });
    assert.deepEqual(f.changes, []);
  } finally {
    f.dispose();
  }
});

test("unmount cleanup does not send status updates to a released composer", async () => {
  const f = await fixture();
  try {
    f.begin();
    Recognition.failure = "abort";
    const before = [...f.statuses];
    f.dispose();
    assert.deepEqual(f.statuses, before);
  } finally {
    f.dispose();
  }
});
