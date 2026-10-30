import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { actionAppearance } from "../src/ui/actionAppearance.ts";
import { radii, typography } from "../src/ui/geometry.ts";

type Element = { type: string; props: Record<string, unknown> };
const source = ts.transpileModule(
  readFileSync(new URL("../src/ui/Action.tsx", import.meta.url), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  },
).outputText;
const composerSource = ts.transpileModule(
  readFileSync(
    new URL("../src/screens/ComposerToolbar.tsx", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  },
).outputText;
const jsx = (type: string, props: Record<string, unknown>) => ({ type, props });
const theme = JSON.parse(
  readFileSync(
    new URL("../src/ui/colorTokens.generated.json", import.meta.url),
    "utf8",
  ),
).colors.dark;

for (const [touchTarget, graphic] of [
  [44, 28],
  [48, 32],
]) {
  test(`phone ${touchTarget}px icon actions keep ${graphic}px glyphs and one selected icon`, () => {
    const exported: {
      Action?: (props: Record<string, unknown>) => Element;
      ComposerIcon?: (props: Record<string, unknown>) => Element;
    } = {};
    const context = {
      exports: exported,
      require: (name: string) => {
        if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
        if (name === "react-native")
          return {
            View: "View",
            Text: "Text",
            Pressable: "Pressable",
            ActivityIndicator: "Spinner",
            useWindowDimensions: () => ({ width: 390 }),
          };
        if (name === "./theme.tsx" || name === "../ui/theme.tsx")
          return { touchTarget, useTheme: () => theme };
        if (name === "./geometry.ts") return { radii, typography };
        if (name === "./actionAppearance.ts") return { actionAppearance };
        if (name === "./Icon.tsx" || name === "../ui/Icon.tsx")
          return { Icon: "Icon" };
        if (name === "./Label.tsx") return { Label: "Label" };
        throw new Error(`Unexpected action dependency ${name}`);
      },
    };
    runInNewContext(source, context);
    runInNewContext(composerSource, { ...context });
    function pressable(props: Record<string, unknown>): Element {
      const root = exported.Action!({ label: "关闭", icon: "close", ...props });
      return (root.props.children as Element[])[0];
    }
    const button = pressable({ iconOnly: true, selected: true });
    const style = (
      button.props.style as (state: {
        pressed: boolean;
      }) => Record<string, unknown>
    )({ pressed: false });
    assert.equal(style.minWidth, touchTarget);
    assert.equal(style.minHeight, touchTarget);
    assert.equal(style.alignItems, "center");
    assert.equal(style.justifyContent, "center");
    const icons = (button.props.children as Element[]).filter(
      (item) => item && item.type === "Icon",
    );
    assert.equal(icons.length, 1);
    assert.equal(icons[0].props.size, graphic);
    const loading = (
      pressable({ iconOnly: true, busy: true }).props.children as Element[]
    ).find((item) => item && item.type === "Spinner")!;
    assert.equal(loading.props.size, graphic);
    const paired = (pressable({}).props.children as Element[]).find(
      (item) => item && item.type === "Icon",
    )!;
    assert.equal(paired.props.size, 16);
    const composer = exported.ComposerIcon!({
      name: "plus",
      label: "添加",
      onPress() {},
    });
    assert.equal(composer.type, "Pressable");
    const plateStyle = (
      composer.props.style as (state: {
        pressed: boolean;
      }) => Record<string, unknown>
    )({ pressed: false });
    assert.equal(plateStyle.width, touchTarget);
    assert.equal(plateStyle.height, touchTarget);
    assert.equal(plateStyle.borderRadius, touchTarget / 2);
    const composerIcon = composer.props.children as Element;
    assert.equal(composerIcon.type, "Icon");
    assert.equal(composerIcon.props.size, graphic);
  });
}
