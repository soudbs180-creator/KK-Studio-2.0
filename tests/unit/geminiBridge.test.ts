import assert from "node:assert/strict";
import test from "node:test";
import http from "node:http";
import { createGeminiBridge } from "../../scripts/gemini-bridge.mjs";

function stubChild({
  exitCode = 0,
  stdout = "",
  stderr = "",
  spawnError,
} = {}) {
  const listeners: Record<string, Array<(value?: unknown) => void>> = {};
  const child: {
    stdout: { on: (event: string, cb: (chunk: Buffer) => void) => void };
    stderr: { on: (event: string, cb: (chunk: Buffer) => void) => void };
    killed?: boolean;
    on: (event: string, cb: (value?: unknown) => void) => void;
    kill: () => void;
    emitClose: () => void;
    emitError: () => void;
  } = {
    stdout: {
      on(event, cb) {
        if (event === "data") setTimeout(() => cb(Buffer.from(stdout)), 1);
      },
    },
    stderr: {
      on(event, cb) {
        if (event === "data") setTimeout(() => cb(Buffer.from(stderr)), 1);
      },
    },
    on(event, cb) {
      (listeners[event] ??= []).push(cb);
    },
    kill() {
      child.killed = true;
    },
    emitClose() {
      (listeners.close ?? []).forEach((cb) => cb(exitCode));
    },
    emitError() {
      (listeners.error ?? []).forEach((cb) =>
        cb(spawnError ?? new Error("spawn ENOENT")),
      );
    },
  };
  setTimeout(() => {
    if (spawnError) child.emitError();
    else child.emitClose();
  }, 3);
  return child;
}

type FakeSpawnPlan = {
  version?: { exitCode?: number; stdout?: string };
  probe?: { exitCode?: number; stdout?: string };
  chat?: (args: string[]) => {
    exitCode?: number;
    stdout?: string;
    stderr?: string;
  };
  spawnError?: boolean;
};

function fakeSpawn(plan: FakeSpawnPlan = {}) {
  return (command: string, args: string[]) => {
    if (plan.spawnError) return stubChild({ spawnError: new Error("ENOENT") });
    if (command === "npm") return stubChild({ stdout: "C:/fake/node_modules" });
    if (args.includes("--version"))
      return stubChild({
        exitCode: plan.version?.exitCode ?? 0,
        stdout: plan.version?.stdout ?? "Gemini CLI 1.2.3",
      });
    if (args.includes("ping"))
      return stubChild({
        exitCode: plan.probe?.exitCode ?? 0,
        stdout: plan.probe?.stdout ?? '{"response":"pong"}',
      });
    const chat = plan.chat?.(args) ?? {
      stdout: '{"response":"ok","sessionId":"s1"}',
    };
    return stubChild({
      exitCode: chat.exitCode ?? 0,
      stdout: chat.stdout ?? "",
      stderr: chat.stderr ?? "",
    });
  };
}

const fakeReadFile = async () =>
  JSON.stringify({ bin: { gemini: "build/src/index.js" } });

function bridgeWith(
  plan: FakeSpawnPlan = {},
  extra: Record<string, unknown> = {},
) {
  return createGeminiBridge({
    spawnImpl: fakeSpawn(plan),
    readFileImpl: fakeReadFile,
    ...extra,
  });
}

test("status detects installed and logged-in gemini", async () => {
  const bridge = bridgeWith({});
  assert.deepEqual(await bridge.handleStatus(), {
    installed: true,
    version: "Gemini CLI 1.2.3",
    login: true,
  });
});

test("status reports not installed when spawn fails", async () => {
  const bridge = bridgeWith({ spawnError: true });
  assert.deepEqual(await bridge.handleStatus(), {
    installed: false,
    login: false,
  });
});

test("status reports not logged in when probe returns a login error", async () => {
  const bridge = bridgeWith({
    probe: {
      stdout: '{"error":{"message":"Please sign in with your Google account"}}',
    },
  });
  assert.deepEqual(await bridge.handleStatus(), {
    installed: true,
    version: "Gemini CLI 1.2.3",
    login: false,
  });
});

test("chat builds gemini args and returns text with sessionId", async () => {
  let seen: string[] | undefined;
  const bridge = bridgeWith({
    chat: (args) => {
      seen = args;
      return {
        stdout:
          '{"response":"hi","sessionId":"s-9","stats":{"sessionId":"s-9"}}',
      };
    },
  });
  const result = await bridge.handleChat({
    prompt: "  hello  ",
    resumeSessionId: "s-8",
    model: "gemini-2.5-pro",
  });
  assert.deepEqual(result, { text: "hi", sessionId: "s-9" });
  assert.ok(seen!.includes("-p"));
  assert.ok(seen!.includes("hello"));
  assert.ok(seen!.includes("--output-format"));
  assert.ok(seen!.includes("json"));
  assert.ok(seen!.includes("-m"));
  assert.ok(seen!.includes("gemini-2.5-pro"));
  assert.ok(seen!.includes("--resume"));
  assert.ok(seen!.includes("s-8"));
});

test("chat omits resume when absent", async () => {
  let seen: string[] | undefined;
  const bridge = bridgeWith({
    chat: (args) => {
      seen = args;
      return { stdout: '{"response":"ok"}' };
    },
  });
  const result = await bridge.handleChat({ prompt: "hi" });
  assert.deepEqual(result, { text: "ok" });
  assert.ok(!seen!.includes("--resume"));
});

test("chat maps login hint errors to not-logged-in", async () => {
  const bridge = bridgeWith({
    chat: () => ({ stdout: '{"error":{"message":"Authentication required"}}' }),
  });
  const result = await bridge.handleChat({ prompt: "hi" });
  assert.ok(result.error);
  assert.equal(result.error!.code, "not-logged-in");
});

test("chat rejects empty prompt", async () => {
  const bridge = bridgeWith({});
  const result = await bridge.handleChat({ prompt: "   " });
  assert.equal(result.error?.code, "invalid");
});

test("http smoke: status and chat over localhost with CORS", async (t) => {
  const bridge = bridgeWith({}, { port: 0 });
  t.after(() => bridge.close());
  await bridge.listen();
  const address = bridge.server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;
  const status = await fetch(base + "/status");
  assert.equal(status.status, 200);
  assert.equal(status.headers.get("access-control-allow-origin"), "*");
  assert.deepEqual(await status.json(), {
    installed: true,
    version: "Gemini CLI 1.2.3",
    login: true,
  });
  const chat = await new Promise<{ status: number; body: string }>(
    (resolve, reject) => {
      const body = JSON.stringify({ prompt: "hello" });
      const request = http.request(
        base + "/chat",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "content-length": body.length,
          },
        },
        (response) => {
          const chunks: Buffer[] = [];
          response.on("data", (chunk) => chunks.push(chunk));
          response.on("end", () =>
            resolve({
              status: response.statusCode ?? 500,
              body: Buffer.concat(chunks).toString("utf8"),
            }),
          );
        },
      );
      request.on("error", reject);
      request.end(body);
    },
  );
  assert.equal(chat.status, 200);
  assert.deepEqual(JSON.parse(chat.body), { text: "ok", sessionId: "s1" });
});
