import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { createElement, Fragment, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import type { CredentialReadState } from "../../src/components/settings/useProviderCredentialState.ts";

type StatusComponent =
  typeof import("../../src/components/settings/ProviderCredentialStatus.tsx").default;

// Render the actual component. Platform detection is the only substituted
// boundary; importing any credential IO here is deliberately rejected.
async function harness(desktop: boolean) {
  const source = await readFile(
    new URL(
      "../../src/components/settings/ProviderCredentialStatus.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  const exports: { default?: StatusComponent } = {};
  const modules: Record<string, unknown> = {
    "react/jsx-runtime": { jsx: createElement, jsxs: createElement, Fragment },
    "@tauri-apps/api/core": { isTauri: () => desktop },
  };
  runInNewContext(compiled.outputText, {
    exports,
    require: (name: string) => {
      assert(name in modules, `Unexpected status dependency: ${name}`);
      return modules[name];
    },
  });
  return (status: CredentialReadState, onRetry = () => {}) => {
    const tree = exports.default!({ status, onRetry });
    return { tree, html: renderToStaticMarkup(tree) };
  };
}

test("desktop saved status explicitly identifies secure system storage without exposing an input", async () => {
  const render = await harness(true);
  const { html } = render("saved");
  assert.match(html, /role="status"/);
  assert.match(html, /系统凭据库.*安全保存/);
  assert.doesNotMatch(html, /<input|本次会话|重试读取密钥/);
});

test("web saved status clearly reports session availability rather than durable system storage", async () => {
  const render = await harness(false);
  const { html } = render("saved");
  assert.match(html, /role="status"/);
  assert.match(html, /本次会话.*可用/);
  assert.match(html, /刷新.*关闭.*不会保留/);
  assert.doesNotMatch(html, /系统凭据库|安全保存|<input/);
});

test("desktop missing status states the current read result and allows keyless endpoints without claiming deletion", async () => {
  const render = await harness(true);
  const { html } = render("missing");
  assert.match(html, /role="status"/);
  assert.match(html, /当前连接.*未读取到.*系统密钥/);
  assert.match(html, /若接口无需密钥，可留空/);
  assert.doesNotMatch(html, /必须|重新填写|已删除|已清除|安全保存|<input/);
});

test("web missing status distinguishes an empty session and allows keyless endpoints", async () => {
  const render = await harness(false);
  const { html } = render("missing");
  assert.match(html, /role="status"/);
  assert.match(html, /当前连接.*本次会话.*尚无已保存密钥/);
  assert.match(html, /若接口无需密钥，可留空/);
  assert.doesNotMatch(html, /系统密钥|系统凭据库|必须|已删除|已清除|<input/);
});

test("loading remains an unknown state with the existing progress announcement", async () => {
  const render = await harness(true);
  const { html } = render("loading");
  assert.match(html, /role="status"/);
  assert.match(html, /正在读取已保存的密钥…/);
  assert.doesNotMatch(html, /安全保存|未读取到|重试读取密钥|<input/);
});

test("read errors remain unknown and the visible retry button invokes the original callback", async () => {
  const render = await harness(true);
  let retries = 0;
  const { tree, html } = render("error", () => {
    retries++;
  });
  assert.match(html, /role="alert"/);
  assert.match(html, /尚不能确认密钥状态/);
  assert.match(html, /原密钥未被清除/);
  assert.match(html, /重试读取密钥/);
  assert.doesNotMatch(html, /安全保存|未读取到|<input/);
  const findButton = (
    value: unknown,
  ): ReactElement<{ onClick: () => void }> | undefined => {
    if (Array.isArray(value)) return value.map(findButton).find(Boolean);
    if (value && typeof value === "object" && "props" in value) {
      const element = value as ReactElement<{
        children?: unknown;
        onClick: () => void;
      }>;
      return element.type === "button"
        ? element
        : findButton(element.props.children);
    }
    return undefined;
  };
  const button = findButton(tree);
  assert(button, "The existing accessible retry action must remain rendered");
  button.props.onClick();
  assert.equal(retries, 1);
});
