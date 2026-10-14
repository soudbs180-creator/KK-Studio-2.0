import assert from "node:assert/strict";
import test from "node:test";
import http from "node:http";
import { EventEmitter } from "node:events";
import { spawn } from "node:child_process";
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
  // A real ChildProcess emits its `close` event after stdout/stderr have
  // flushed. Keep the fixture ordering deterministic under the parallel test
  // runner; scheduling close only a few milliseconds after listener setup can
  // otherwise make login probes observe an empty stdout buffer.
  setTimeout(() => {
    if (spawnError) child.emitError();
    else child.emitClose();
  }, 10);
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
  onSpawn?: (command: string, args: string[]) => void;
};

function fakeSpawn(plan: FakeSpawnPlan = {}) {
  return (command: string, args: string[]) => {
    plan.onSpawn?.(command, args);
    if (plan.spawnError) return stubChild({ spawnError: new Error("ENOENT") });
    if (args.some((arg) => arg.endsWith("npm-cli.js")))
      return stubChild({ stdout: "C:/fake/node_modules" });
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
    loginStatus: "verified",
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
    loginStatus: "required",
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
  assert.ok(seen!.includes("--prompt=hello"));
  assert.ok(seen!.includes("--output-format=json"));
  assert.ok(seen!.includes("--model=gemini-2.5-pro"));
  assert.ok(seen!.includes("--resume=s-8"));
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
  assert.ok(!seen!.some((arg) => arg.startsWith("--resume=")));
});

test("chat reads the official Gemini CLI session_id for resume", async () => {
  const bridge = bridgeWith({
    chat: () => ({ stdout: '{"response":"ok","session_id":"real-session"}' }),
  });
  assert.deepEqual(await bridge.handleChat({ prompt: "hi" }), {
    text: "ok",
    sessionId: "real-session",
  });
});

test("chat always passes user text as a process argument without a shell", async () => {
  const spawned: Array<{ command: string; args: string[] }> = [];
  const prompt = '--yolo hello" & echo INJECTION_PROBE & rem "';
  const bridge = bridgeWith({
    onSpawn: (command, args) => spawned.push({ command, args }),
  });
  await bridge.handleChat({ prompt });
  assert.ok(spawned.some(({ args }) => args.includes(`--prompt=${prompt}`)));
  assert.ok(spawned.every(({ args }) => !args.includes("--yolo")));
  assert.ok(spawned.every(({ command }) => !/cmd(?:\.exe)?$/i.test(command)));
});

test("chat rejects CLI option-like model and session values", async () => {
  let chatSpawned = false;
  const bridge = bridgeWith({
    chat: () => {
      chatSpawned = true;
      return { stdout: '{"response":"ok"}' };
    },
  });
  assert.equal(
    (await bridge.handleChat({ prompt: "hi", model: "--yolo" })).error?.code,
    "invalid",
  );
  assert.equal(
    (await bridge.handleChat({ prompt: "hi", resumeSessionId: "--yolo" })).error
      ?.code,
    "invalid",
  );
  assert.equal(chatSpawned, false);
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
  const status = await fetch(base + "/status", {
    headers: { Origin: "http://localhost:1421" },
  });
  assert.equal(status.status, 200);
  assert.equal(
    status.headers.get("access-control-allow-origin"),
    "http://localhost:1421",
  );
  assert.deepEqual(await status.json(), {
    installed: true,
    version: "Gemini CLI 1.2.3",
    login: true,
    loginStatus: "verified",
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
  const preflight = await fetch(base + "/chat", {
    method: "OPTIONS",
    headers: { Origin: "http://localhost:1421" },
  });
  assert.equal(preflight.status, 204);
  assert.equal(
    preflight.headers.get("access-control-allow-origin"),
    "http://localhost:1421",
  );
  const hostile = await fetch(base + "/chat", {
    method: "POST",
    headers: {
      Origin: "https://untrusted.example",
      "content-type": "application/json",
    },
    body: JSON.stringify({ prompt: "do not run" }),
  });
  assert.equal(hostile.status, 403);
  assert.equal(hostile.headers.get("access-control-allow-origin"), null);
  const noCors = await fetch(base + "/status", {
    headers: { "sec-fetch-site": "cross-site", "sec-fetch-mode": "no-cors" },
  });
  assert.equal(noCors.status, 403);
});

test(
  "aborting the browser request terminates the active Gemini CLI child",
  { timeout: 5000 },
  async (t) => {
    let started!: () => void;
    const chatStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    let killed = false;
    const bridge = createGeminiBridge({
      port: 0,
      readFileImpl: fakeReadFile,
      spawnImpl: (_command: string, args: string[]) => {
        if (args.some((arg) => arg.endsWith("npm-cli.js")))
          return stubChild({ stdout: "C:/fake/node_modules" });
        const child = new EventEmitter() as EventEmitter & {
          stdout: EventEmitter;
          stderr: EventEmitter;
          kill: () => void;
        };
        child.stdout = new EventEmitter();
        child.stderr = new EventEmitter();
        child.kill = () => {
          killed = true;
          child.emit("close", null, "SIGTERM");
        };
        started();
        return child;
      },
    });
    t.after(() => bridge.close());
    await bridge.listen();
    const address = bridge.server.address();
    assert.ok(address && typeof address === "object");
    const controller = new AbortController();
    const pending = fetch(`http://127.0.0.1:${address.port}/chat`, {
      method: "POST",
      headers: {
        Origin: "http://localhost:1421",
        "content-type": "application/json",
      },
      body: JSON.stringify({ prompt: "slow" }),
      signal: controller.signal,
    });
    await chatStarted;
    controller.abort();
    await assert.rejects(pending);
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(killed, true);
  },
);

test("quota, model failure and malformed probes do not falsely report missing login", async () => {
  for (const probe of [
    { exitCode: 1, stdout: '{"error":{"message":"Quota exceeded"}}' },
    { stdout: '{"error":{"message":"Model unavailable"}}' },
    { stdout: "not-json" },
  ]) {
    const report = await bridgeWith({ probe }).handleStatus();
    assert.equal(report.installed, true);
    assert.equal(report.login, false);
    assert.equal(report.loginStatus, "unknown");
    assert.deepEqual(Object.keys(report).sort(), [
      "installed",
      "login",
      "loginStatus",
      "version",
    ]);
  }
});

test(
  "installation after a missing CLI is detected without restarting the bridge",
  { skip: process.platform !== "win32" },
  async () => {
    let installed = false;
    const bridge = bridgeWith(
      {},
      {
        readFileImpl: async () => {
          if (!installed) throw new Error("ENOENT");
          return fakeReadFile();
        },
      },
    );
    assert.deepEqual(await bridge.handleStatus(), {
      installed: false,
      login: false,
    });
    installed = true;
    assert.equal((await bridge.handleStatus()).installed, true);
  },
);

test(
  "uninstalling a CLI is detected without reusing its cached invocation",
  { skip: process.platform !== "win32" },
  async () => {
    let installed = true;
    const bridge = bridgeWith(
      {},
      {
        readFileImpl: async () => {
          if (!installed) throw new Error("ENOENT");
          return fakeReadFile();
        },
      },
    );
    assert.equal((await bridge.handleStatus()).installed, true);
    installed = false;
    assert.deepEqual(await bridge.handleStatus(), {
      installed: false,
      login: false,
    });
  },
);

class BridgeResponseFixture extends EventEmitter {
  status = 0;
  payload: Record<string, unknown> = {};
  writableEnded = false;
  destroyed = false;
  writeHead(status: number) {
    this.status = status;
    return this;
  }
  end(body: string) {
    this.payload = body ? JSON.parse(body) : {};
    this.writableEnded = true;
    this.emit("finish");
    return this;
  }
}

function bridgeRequestFixture(
  bridge: ReturnType<typeof createGeminiBridge>,
  method: string,
  url: string,
  headers: Record<string, string> = {},
) {
  bridge.server.address = () => ({
    address: "127.0.0.1",
    family: "IPv4",
    port: 1424,
  });
  const req = Object.assign(new EventEmitter(), {
    method,
    url,
    headers: { host: "127.0.0.1:1424", ...headers },
  });
  const res = new BridgeResponseFixture();
  bridge.server.emit("request", req, res);
  return { req, res };
}

test("owned health requires its nonce and never starts Gemini or a model probe", () => {
  let calls = 0;
  const nonce = "a".repeat(64);
  const bridge = createGeminiBridge({
    ownerNonce: nonce,
    spawnImpl: () => {
      calls++;
      throw new Error("unexpected CLI call");
    },
  });
  assert.equal(bridgeRequestFixture(bridge, "GET", "/health").res.status, 403);
  assert.equal(
    bridgeRequestFixture(bridge, "GET", "/health", {
      "x-kk-bridge-owner": "b".repeat(64),
    }).res.status,
    403,
  );
  const response = bridgeRequestFixture(bridge, "GET", "/health", {
    "x-kk-bridge-owner": nonce,
  }).res;
  assert.equal(response.status, 200);
  assert.deepEqual(response.payload, {
    ok: true,
    service: "kk-gemini-bridge",
    owned: true,
    pid: process.pid,
    nonce,
  });
  assert.equal(calls, 0);
});

test("manual health is free and cannot grant a Native shutdown owner", () => {
  let calls = 0;
  const bridge = createGeminiBridge({
    spawnImpl: () => {
      calls++;
      throw new Error("unexpected CLI call");
    },
  });
  const response = bridgeRequestFixture(bridge, "GET", "/health").res;
  assert.equal(response.status, 200);
  assert.equal(response.payload.owned, false);
  assert.equal(Object.hasOwn(response.payload, "nonce"), false);
  assert.equal(
    bridgeRequestFixture(bridge, "POST", "/runtime/shutdown", {
      "x-kk-bridge-owner": "a".repeat(64),
    }).res.status,
    403,
  );
  assert.equal(calls, 0);
});

test("owned shutdown refuses an in-flight body then prevents new paid requests", () => {
  let calls = 0;
  const nonce = "a".repeat(64);
  const bridge = createGeminiBridge({
    ownerNonce: nonce,
    spawnImpl: () => {
      calls++;
      throw new Error("unexpected CLI call");
    },
  });
  const active = bridgeRequestFixture(bridge, "POST", "/chat", {
    "content-type": "application/json",
  });
  const owner = { "x-kk-bridge-owner": nonce };
  assert.equal(
    bridgeRequestFixture(bridge, "POST", "/runtime/shutdown").res.status,
    403,
  );
  assert.equal(
    bridgeRequestFixture(bridge, "POST", "/runtime/shutdown", owner).res.status,
    409,
  );
  active.res.emit("close");
  assert.equal(
    bridgeRequestFixture(bridge, "POST", "/runtime/shutdown", owner).res.status,
    200,
  );
  assert.equal(bridgeRequestFixture(bridge, "GET", "/status").res.status, 503);
  assert.equal(
    bridgeRequestFixture(bridge, "POST", "/chat", {
      "content-type": "application/json",
    }).res.status,
    503,
  );
  assert.equal(calls, 0);
});

test("owned bridge nonce must be a fixed generated hex identifier", () => {
  for (const ownerNonce of [
    "fake",
    "a".repeat(63),
    "z".repeat(64),
    "a\n".repeat(32),
  ])
    assert.throws(() => createGeminiBridge({ ownerNonce }), /归属/);
});

for (const scenario of ["exit7", "timeout"] as const) {
  test(
    "real controlled CLI " + scenario + " cannot publish JSON as success",
    { timeout: 10000 },
    async (t) => {
      const children: ReturnType<typeof spawn>[] = [];
      let output = "";
      const bridge = createGeminiBridge({
        timeoutMs: 2000,
        readFileImpl: fakeReadFile,
        spawnImpl: (
          _command: string,
          args: string[],
          options: Parameters<typeof spawn>[2],
        ) => {
          const npmRoot = args.some((arg) => arg.endsWith("npm-cli.js"));
          const script = npmRoot
            ? "console.log('C:/fixture/node_modules')"
            : "console.log(JSON.stringify({response:'partial fixture text',session_id:'fixture-session'}));" +
              (scenario === "exit7"
                ? "process.exitCode=7;"
                : "setInterval(()=>{},1000);");
          const child = spawn(process.execPath, ["-e", script], {
            ...options,
            env: { ...process.env, NODE_OPTIONS: "", NODE_PATH: "" },
          });
          children.push(child);
          if (!npmRoot)
            child.stdout?.on("data", (chunk) => {
              output += String(chunk);
            });
          return child;
        },
      });
      t.after(() => {
        for (const child of children)
          if (child.exitCode === null && child.signalCode === null)
            child.kill();
      });
      const result = await bridge.handleChat({ prompt: "synthetic request" });
      assert.match(output, /partial fixture text/);
      assert.equal(
        result.error?.code,
        scenario === "exit7" ? "failed" : "timeout",
      );
      assert.equal(result.text, undefined);
      assert.equal(result.sessionId, undefined);
      if (scenario === "exit7")
        assert.match(result.error?.message ?? "", /结果未确认/);
      assert.ok(
        children.every(
          (child) => child.exitCode !== null || child.signalCode !== null,
        ),
      );
    },
  );
}
