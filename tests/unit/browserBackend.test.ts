import assert from "node:assert/strict";
import test from "node:test";
import {
  BROWSER_PROVIDER_IDS,
  listBrowserProviders,
} from "../../src/features/browser/browserProviders.ts";
import {
  createBrowserBackend,
  BrowserBackendError,
} from "../../src/features/browser/browserBackend.ts";
import type {
  BrowserInspection,
  BrowserOpenResult,
  BrowserProviderId,
  BrowserRuntime,
} from "../../src/features/browser/browserTypes.ts";

function runtimeFor(available = true): BrowserRuntime & {
  opened: Array<{ provider: BrowserProviderId; url: string }>;
} {
  const opened: Array<{ provider: BrowserProviderId; url: string }> = [];
  return {
    opened,
    async inspect(provider) {
      const result: BrowserInspection = {
        provider,
        available,
        message: available ? "ready" : "missing",
      };
      return result;
    },
    async open(provider, url) {
      opened.push({ provider, url });
      const result: BrowserOpenResult = {
        provider,
        url,
        started: true,
        message: "opened",
      };
      return result;
    },
  };
}

test("registers the internal browser plus Edge, Chrome, and ego lite", () => {
  assert.deepEqual(
    listBrowserProviders().map((provider) => provider.id),
    BROWSER_PROVIDER_IDS,
  );
  assert.equal(listBrowserProviders()[0]?.id, "internal");
  assert.equal(listBrowserProviders()[0]?.requiresAuthorization, false);
  assert.equal(
    listBrowserProviders().find((provider) => provider.id === "ego-lite")
      ?.automation,
    "agent",
  );
});

test("keeps the internal provider ready without an external authorization", async () => {
  const runtime = runtimeFor();
  const backend = createBrowserBackend(runtime);

  assert.equal(backend.getState().provider, "internal");
  assert.equal(backend.getState().authorized, true);
  await backend.open("https://example.com");

  assert.deepEqual(runtime.opened, [
    { provider: "internal", url: "https://example.com" },
  ]);
  assert.equal(backend.getState().phase, "running");
});

test("requires task authorization before ego lite can open", async () => {
  const runtime = runtimeFor();
  const backend = createBrowserBackend(runtime, { provider: "ego-lite" });

  await assert.rejects(
    backend.open("https://example.com"),
    (error: unknown) =>
      error instanceof BrowserBackendError &&
      error.code === "authorization-required",
  );
  assert.deepEqual(runtime.opened, []);

  backend.authorize();
  await backend.open("https://example.com");
  assert.deepEqual(runtime.opened, [
    { provider: "ego-lite", url: "https://example.com" },
  ]);
});

test("reports Edge and Chrome as manual-only external browsers", async () => {
  const backend = createBrowserBackend(runtimeFor(), { provider: "edge" });
  backend.authorize();
  await backend.open("https://example.com");
  assert.equal(backend.getState().automation, "manual-only");
  assert.match(backend.getState().message, /手动/);

  backend.select("chrome");
  assert.equal(backend.getState().authorized, false);
  assert.equal(backend.getState().phase, "idle");
});

test("fails closed when the selected external browser is unavailable", async () => {
  const backend = createBrowserBackend(runtimeFor(false), { provider: "edge" });
  backend.authorize();

  await assert.rejects(
    backend.open("https://example.com"),
    (error: unknown) =>
      error instanceof BrowserBackendError &&
      error.code === "provider-unavailable",
  );
  assert.equal(backend.getState().phase, "error");
  assert.equal(backend.getState().available, false);
});

test("pauses for security takeover and requires explicit resume", () => {
  const backend = createBrowserBackend(runtimeFor(), { provider: "ego-lite" });
  backend.authorize();
  const request = backend.requestHandoff(
    "login",
    "需要用户在站点完成登录或二次验证。",
  );

  assert.equal(backend.getState().phase, "handoff");
  assert.equal(backend.getState().handoff?.kind, "login");
  assert.equal(request.method, "browser_handoff");
  assert.match(request.reason ?? "", /登录/);
  assert.equal(backend.requestHandoff("login", "重复请求"), request);

  assert.throws(() => backend.resume(), /尚未确认/);
  backend.confirmHandoff();
  backend.resume();
  assert.equal(backend.getState().phase, "ready");
  assert.equal(backend.getState().handoff, null);
});

test("a declined takeover revokes the task authorization", () => {
  const backend = createBrowserBackend(runtimeFor(), { provider: "ego-lite" });
  backend.authorize();
  backend.requestHandoff("security-warning", "证书警告需要用户判断。\n");
  backend.declineHandoff();

  assert.equal(backend.getState().phase, "idle");
  assert.equal(backend.getState().authorized, false);
  assert.match(backend.getState().message, /未授权|拒绝/);
});
