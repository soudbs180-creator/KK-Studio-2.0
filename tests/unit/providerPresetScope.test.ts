import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import {
  PROVIDER_PRESETS,
  findProviderPreset,
  type ProviderPreset,
} from "../../src/domain/providerPresets.ts";

type Element = {
  type: unknown;
  props: Record<string, unknown> & { children?: unknown };
};

async function harness() {
  const slots: unknown[] = [];
  const selected: ProviderPreset[] = [];
  let cursor = 0;
  let busy = false;
  let googleCalls = 0;
  const jsx = (type: unknown, props: Element["props"]) => ({ type, props });
  const hooks = {
    useContext: () => ({ busy }),
    useRef(initial: unknown) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useState(initial: unknown) {
      const index = cursor++;
      if (!(index in slots))
        slots[index] = typeof initial === "function" ? initial() : initial;
      return [
        slots[index],
        (next: unknown) => {
          slots[index] = typeof next === "function" ? next(slots[index]) : next;
        },
      ];
    },
  };
  const exports: Record<string, unknown> = {};
  const source = await readFile(
    new URL(
      "../../src/components/settings/ProviderPresetSelector.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    {
      exports,
      setTimeout,
      clearTimeout,
      require(name: string) {
        if (name === "react") return hooks;
        if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
        if (name.includes("SettingsNavigationContext"))
          return { SettingsNavigationContext: {} };
        if (name.includes("api/core"))
          return {
            isTauri: () => false,
            invoke: () => {
              throw new Error("unexpected Native call");
            },
          };
        if (name.includes("providerPresets"))
          return { PROVIDER_PRESETS, findProviderPreset };
        throw new Error("Unexpected import " + name);
      },
    },
  );
  let tree: Element;
  function render(localOnly: boolean): void {
    cursor = 0;
    tree = (exports.default as (props: unknown) => Element)({
      localOnly,
      onSelect: (preset: ProviderPreset) => selected.push(preset),
      onOpenGoogle: () => {
        googleCalls++;
      },
    });
  }
  function all(): Element[] {
    function visit(value: unknown): Element[] {
      if (Array.isArray(value)) return value.flatMap(visit);
      if (!value || typeof value !== "object" || !("props" in value)) return [];
      const item = value as Element;
      return [item, ...visit(item.props.children)];
    }
    return visit(tree);
  }
  function text(value: unknown): string {
    if (Array.isArray(value)) return value.map(text).join("");
    if (value && typeof value === "object" && "props" in value)
      return text((value as Element).props.children);
    return value == null || typeof value === "boolean" ? "" : String(value);
  }
  function button(label: string): Element {
    const found = all().find(
      (item) => item.type === "button" && text(item.props.children) === label,
    );
    assert.ok(found, "Missing button: " + label);
    return found;
  }
  function click(item: Element): void {
    (item.props.onClick as () => void)();
  }
  function cardAction(labelOrId: string): Element {
    function findButton(val: unknown): Element | undefined {
      if (Array.isArray(val)) {
        for (const c of val) {
          const res = findButton(c);
          if (res) return res;
        }
      } else if (val && typeof val === "object" && "props" in val) {
        const el = val as Element;
        if (
          el.type === "button" &&
          (text(el.props.children) === "一键填入" ||
            text(el.props.children) === "前往 Google 配置")
        ) {
          return el;
        }
        return findButton(el.props.children);
      }
      return undefined;
    }
    const card = all().find(
      (entry) =>
        typeof entry.props?.className === "string" &&
        entry.props.className.includes("provider-preset-item") &&
        text(entry.props.children).startsWith(labelOrId),
    );
    assert.ok(card, "Missing card for " + labelOrId);
    const btn = findButton(card);
    assert.ok(btn, "Missing action button for card " + labelOrId);
    return btn;
  }
  render(false);
  return {
    render,
    all,
    text,
    button,
    cardAction,
    click,
    selected,
    setBusy: (value: boolean) => {
      busy = value;
    },
    googleCalls: () => googleCalls,
  };
}

test("switching to local removes an incompatible category and search before any effect", async () => {
  const h = await harness();
  const previousCategory = h.button("官方");
  h.click(previousCategory);
  const input = h.all().find((item) => item.type === "input")!;
  (input.props.onChange as (event: unknown) => void)({
    target: { value: "OpenAI" },
  });
  h.render(false);
  h.render(true);
  h.click(previousCategory);
  h.render(true);
  assert.equal(h.button("全部").props["aria-pressed"], true);
  assert.equal(h.all().find((item) => item.type === "input")!.props.value, "");
  const choices = h
    .all()
    .filter(
      (item) =>
        typeof item.props?.className === "string" &&
        item.props.className.includes("provider-preset-item"),
    );
  assert.ok(
    choices.length > 0,
    "local options remain reachable without resetting hidden filters",
  );
  for (const choice of choices)
    assert.ok(
      PROVIDER_PRESETS.some(
        (preset) =>
          preset.category === "本地" &&
          h.text(choice.props.children).startsWith(preset.label),
      ),
    );
  assert.deepEqual(h.selected, []);
});

test("a remote detail and its retained apply callback cannot cross into local scope", async () => {
  const h = await harness();
  const staleApply = h.cardAction("OpenAI");
  h.render(true);
  const openAiCard = h
    .all()
    .find(
      (item) =>
        typeof item.props?.className === "string" &&
        item.props.className.includes("provider-preset-item") &&
        h.text(item.props.children).startsWith("OpenAI"),
    );
  assert.equal(
    openAiCard,
    undefined,
    "remote card must not be present in local scope",
  );
  h.click(staleApply);
  assert.deepEqual(
    h.selected,
    [],
    "even the previous render's callback must validate the current scope",
  );
  assert.equal(h.googleCalls(), 0);
});

test("a stale remote callback cannot open Google after local navigation", async () => {
  const h = await harness();
  const staleApply = h.cardAction("Gemini");
  h.render(true);
  h.click(staleApply);
  assert.equal(h.googleCalls(), 0);
  assert.deepEqual(h.selected, []);
});

test("local presets still apply and busy state is checked by retained callbacks", async () => {
  const h = await harness();
  h.render(true);
  const local = PROVIDER_PRESETS.find(
    (preset) => preset.category === "本地" && !preset.unavailableReason,
  )!;
  const apply = h.cardAction(local.label);
  h.setBusy(true);
  h.render(true);
  h.click(apply);
  assert.deepEqual(h.selected, []);
  h.setBusy(false);
  h.render(true);
  h.click(h.cardAction(local.label));
  assert.equal(h.selected.length, 1);
  assert.equal(h.selected[0], local);
});
