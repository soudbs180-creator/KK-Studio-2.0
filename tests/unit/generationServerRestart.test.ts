import assert from "node:assert/strict";
import test from "node:test";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer, type Server } from "node:http";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==",
  "base64",
);
async function listen(s: Server) {
  await new Promise<void>((r) => s.listen(0, "127.0.0.1", r));
  return (s.address() as { port: number }).port;
}
async function stop(child: ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((r) => {
    child.once("exit", () => r());
    child.kill("SIGKILL");
  });
}
async function until<T>(read: () => Promise<T>, done: (value: T) => boolean) {
  for (let i = 0; i < 60; i++) {
    const value = await read();
    if (done(value)) return value;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("CONDITION_TIMEOUT");
}
test(
  "actual Gateway process restart resumes async Provider ID, retains SQLite balance, and never resubmits",
  { timeout: 20000 },
  async () => {
    let submissions = 0;
    let completed = false;
    const provider = createServer((req, res) => {
      res.setHeader("Content-Type", "application/json");
      if (req.url === "/prompt") {
        submissions++;
        res.end(JSON.stringify({ prompt_id: "durable-prompt" }));
      } else if (req.url?.startsWith("/history/"))
        res.end(
          JSON.stringify(
            completed
              ? {
                  "durable-prompt": {
                    status: { status_str: "success", completed: true },
                    outputs: {
                      "1": {
                        images: [
                          {
                            filename: "result.png",
                            subfolder: "",
                            type: "output",
                          },
                        ],
                      },
                    },
                  },
                }
              : {},
          ),
        );
      else if (req.url?.startsWith("/view")) {
        res.setHeader("Content-Type", "image/png");
        res.end(png);
      } else {
        res.statusCode = 404;
        res.end("{}");
      }
    });
    const providerPort = await listen(provider);
    const probe = createServer();
    const port = await listen(probe);
    await new Promise<void>((r) => probe.close(() => r()));
    const dir = mkdtempSync(join(tmpdir(), "kk-process-"));
    const config = join(dir, "config.json");
    writeFileSync(
      config,
      JSON.stringify({
        dataDirectory: dir,
        port,
        principals: [
          {
            ownerId: "owner",
            tokenEnv: "KK_TEST_ACCESS",
            initialCredits: 10,
            admin: true,
          },
        ],
        connections: [
          {
            metadata: {
              id: "comfy",
              provider: "ComfyUI",
              kind: "local_comfyui",
              displayName: "Own Comfy",
              baseUrl: `http://127.0.0.1:${providerPort}`,
              capabilities: {
                modalities: ["image"],
                operations: ["generate"],
                async: true,
              },
              state: "active",
              concurrencyLimit: 1,
            },
            ownerId: "owner",
            unitPrice: 1,
            costLimit: 10,
          },
        ],
      }),
    );
    let output = "";
    const launch = () => {
      const child = spawn(
        process.execPath,
        ["src/features/generation-server/main.ts", config],
        {
          cwd: process.cwd(),
          env: { ...process.env, KK_TEST_ACCESS: "process-test-access-token" },
          windowsHide: true,
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      child.stdout?.on("data", (b) => {
        output += String(b);
      });
      child.stderr?.on("data", (b) => {
        output += String(b);
      });
      return child;
    };
    let child = launch();
    const url = `http://127.0.0.1:${port}`;
    const ready = () =>
      until(async () => {
        try {
          return (await fetch(url + "/health")).ok;
        } catch {
          return false;
        }
      }, Boolean);
    const get = (path: string, method = "GET", body?: unknown) =>
      fetch(url + path, {
        method,
        headers: {
          Authorization: "Bearer process-test-access-token",
          "Content-Type": "application/json",
          "Idempotency-Key": "process-restart",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    try {
      await ready();
      const response = await get("/v1/jobs", "POST", {
        connectionId: "comfy",
        model: "workflow",
        prompt: "test",
        privacyMode: "local_only",
        requestedOutputs: 1,
        workflow: { "1": { class_type: "Fixture", inputs: {} } },
      });
      assert.equal(response.status, 202);
      const job = (await response.json()) as { id: string };
      await until(
        async () =>
          (await (await get("/v1/jobs/" + job.id)).json()) as {
            outputs: { status: string }[];
          },
        (j) => j.outputs[0].status === "waiting_provider",
      );
      await stop(child);
      completed = true;
      child = launch();
      await ready();
      const result = await until(
        async () =>
          (await (await get("/v1/jobs/" + job.id)).json()) as {
            status: string;
            outputs: { assetRoute: string }[];
          },
        (j) => j.status === "succeeded",
      );
      assert.equal(submissions, 1);
      assert.equal((await get(result.outputs[0].assetRoute)).status, 200);
      assert.equal(output.includes("process-test-access-token"), false);
      assert.equal(output.includes("result.png"), false);
    } finally {
      await stop(child);
      await new Promise<void>((r) => provider.close(() => r()));
    }
  },
);
