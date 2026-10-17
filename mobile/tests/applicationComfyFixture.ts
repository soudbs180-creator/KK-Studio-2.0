import { createServer, type ServerResponse } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { createHash, randomUUID } from "node:crypto";
import { createMobileApplication } from "../src/application/application.ts";
import { MobileRepository } from "../src/storage/repository.ts";
import { SqliteSnapshotBackend } from "../src/storage/sqliteBackend.ts";
import { createSessionVault } from "../src/storage/sessionVault.ts";
import { createComfyUiClient } from "../src/services/comfyClient.ts";
import type { MobileSnapshot } from "../src/core/mobileModel.ts";

export const comfyGraph = () => ({
  "1": { class_type: "FixtureImage", inputs: { model: "fixture" } },
  "2": {
    class_type: "SaveImage",
    inputs: { images: ["1", 0] as [string, number] },
  },
});
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
  "base64",
);
export async function applicationComfyFixture() {
  const db = new DatabaseSync(":memory:");
  db.exec(
    "CREATE TABLE mobile_snapshots(account TEXT PRIMARY KEY,revision INTEGER,payload TEXT)",
  );
  const originals = new Map<string, Uint8Array>();
  const calls: string[] = [];
  let failCas = false,
    failOriginal = false,
    dropSubmit = false;
  let failAfter: number | undefined;
  let completedHistory = true;
  let onSubmit = () => {};
  const actualId = randomUUID();
  let hint = "";
  let deviceId = "";
  const json = (res: ServerResponse, value: unknown) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(value));
  };
  const server = createServer((req, res) => {
    calls.push(`${req.method} ${req.url}`);
    if (req.url === "/object_info")
      return json(res, {
        FixtureImage: {
          input: {
            required: { model: [["fixture"]] },
            optional: { invert: ["BOOLEAN"] },
          },
          output: ["IMAGE"],
          output_node: false,
        },
        SaveImage: {
          input: { required: { images: ["IMAGE"] } },
          output: [],
          output_node: true,
        },
      });
    if (req.url === "/system_stats")
      return json(res, { system: {}, devices: [] });
    if (req.url === "/models") return json(res, ["checkpoints"]);
    if (req.url === "/models/checkpoints") return json(res, ["fixture"]);
    if (req.url === "/prompt") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        hint = JSON.parse(body).prompt_id;
        onSubmit();
        if (dropSubmit) res.destroy();
        else json(res, { prompt_id: actualId, number: 1, node_errors: {} });
      });
      return;
    }
    if (req.url === `/history/${actualId}`)
      return json(res, {
        [actualId]: {
          status: {
            completed: completedHistory,
            status_str: "success",
            messages: [],
          },
          outputs: {
            "2": {
              images: [
                { filename: "fixture.png", subfolder: "", type: "output" },
              ],
            },
          },
        },
      });
    if (req.url?.startsWith("/history/")) return json(res, {});
    if (req.url === "/queue")
      return json(res, { queue_running: [], queue_pending: [] });
    if (req.url?.startsWith("/view?")) {
      res.writeHead(200, { "content-type": "image/png" });
      res.end(png);
      return;
    }
    if (req.url === `/api/jobs/${actualId}/cancel`)
      return json(res, { cancelled: true });
    res.writeHead(404);
    res.end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("fixture address");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const sqlite = new SqliteSnapshotBackend(
    {
      async execAsync(sql) {
        db.exec(sql);
      },
      async getFirstAsync<T>(sql: string, ...args: (string | number)[]) {
        return (db.prepare(sql).get(...args) ?? null) as T | null;
      },
      async runAsync(sql, ...args) {
        return { changes: Number(db.prepare(sql).run(...args).changes) };
      },
    },
    { allowLoopbackHttp: true },
  );
  const backend = {
    read: sqlite.read.bind(sqlite),
    compareAndSwap: async (a: string, r: number | null, p: string) =>
      failCas || (failAfter !== undefined && --failAfter <= 0)
        ? false
        : sqlite.compareAndSwap(a, r, p),
  };
  const vaultScope = randomUUID();
  const deps = {
    allowLoopbackHttp: true,
    id: randomUUID,
    now: Date.now,
    identityDigest: async (v: string) =>
      createHash("sha256").update(v).digest("hex"),
    repository: async (accountId: string) =>
      new MobileRepository({
        accountId,
        allowLoopbackHttp: true,
        backend,
        id: randomUUID,
        now: Date.now,
        hash: async (b) => createHash("sha256").update(b).digest("hex"),
        originalStore: {
          async read(a, id) {
            const b = originals.get(`${a}:${id}`);
            if (!b) throw new Error("missing");
            return b.slice();
          },
          async write(a, id, b) {
            if (failOriginal) throw new Error("fixture disk full");
            const k = `${a}:${id}`;
            if (originals.has(k)) throw new Error("immutable");
            originals.set(k, b.slice());
          },
          async remove(a, id) {
            originals.delete(`${a}:${id}`);
          },
        },
      }),
    vault: (a: string) => createSessionVault(`${vaultScope}:${a}`),
    identity: () => ({
      async login(input: { email: string; deviceId: string }) {
        deviceId = input.deviceId;
        return {
          user: { id: input.email, email: input.email, displayName: "Fixture" },
          deviceId: input.deviceId,
          accessToken: "a".repeat(40),
          refreshToken: "r".repeat(40),
          accessExpiresAt: Date.now() + 600000,
          refreshExpiresAt: Date.now() + 1200000,
        };
      },
      async refresh() {
        return {
          user: { id: "alice", email: "alice", displayName: "Fixture" },
          deviceId,
          accessToken: "b".repeat(40),
          refreshToken: "r".repeat(40),
          accessExpiresAt: Date.now() + 600000,
          refreshExpiresAt: Date.now() + 1200000,
        };
      },
      async me() {
        return {
          user: { id: "alice", email: "alice", displayName: "Fixture" },
          deviceId,
        };
      },
      async logout() {
        return { revoked: true as const };
      },
    }),
    provider: () => {
      throw new Error("ordinary provider cannot execute Comfy");
    },
    comfy: (vault: ReturnType<typeof createSessionVault>) =>
      createComfyUiClient({
        allowLoopbackHttp: true,
        timeoutMs: 1000,
        credentials: { read: (ref) => vault.get(ref) },
      }),
  };
  const create = () => createMobileApplication(deps);
  const app = create();
  await app.start();
  await app.login("alice", "fixture", "https://identity.example");
  await app.createProject("Comfy");
  return {
    app,
    create,
    deps,
    baseUrl,
    actualId,
    calls,
    originals,
    get hint() {
      return hint;
    },
    failCas(v: boolean) {
      failCas = v;
      if (!v) failAfter = undefined;
    },
    failAfterCas(n: number) {
      failAfter = n;
    },
    historyCompleted(v: boolean) {
      completedHistory = v;
    },
    failOriginal(v: boolean) {
      failOriginal = v;
    },
    dropSubmit(v: boolean) {
      dropSubmit = v;
    },
    onSubmit(fn: () => void) {
      onSubmit = fn;
    },
    raw(accountId = app.context().accountId) {
      return JSON.parse(
        (
          db
            .prepare("SELECT payload FROM mobile_snapshots WHERE account=?")
            .get(accountId) as { payload: string }
        ).payload,
      );
    },
    // Test-only simulation of a valid old schema persisted before output mapping existed.
    replaceRaw(snapshot: MobileSnapshot) {
      db.prepare("UPDATE mobile_snapshots SET payload=? WHERE account=?").run(
        JSON.stringify(snapshot),
        app.context().accountId,
      );
    },
    async close() {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      db.close();
    },
  };
}
