import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { once } from "node:events";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, spawn } from "node:child_process";
import test from "node:test";
import { CompanionStore } from "../../src/features/local-service/store.ts";
import { startCompanionService } from "../../src/features/local-service/main.ts";
import { createCompanionServer } from "../../src/features/local-service/server.ts";
import { CompanionProtocolError } from "../../src/features/local-service/protocol.ts";
import {
  createManifest,
  sha256Json,
} from "../../src/features/local-service/manifest.ts";
import {
  createProject,
  emptySnapshot,
  serializeCreationSnapshot,
} from "../../src/features/creation/model.ts";

const nativeIdentity =
  '{"version":1,"repositoryId":"0123456789abcdef0123456789abcdef","formatVersion":2,"minimumWriterVersion":2}';
const origin = "http://127.0.0.1:1421";
const freshRoot = () => mkdtempSync(join(tmpdir(), "kk-native-boundary-"));
const isNativeRoot = (error: unknown) =>
  error instanceof CompanionProtocolError &&
  error.code === "SNAPSHOT_UNSUPPORTED";
function markNative(root: string, raw = nativeIdentity): string {
  mkdirSync(join(root, "app"), { recursive: true });
  const marker = join(root, "app/repository.json");
  writeFileSync(marker, raw);
  return marker;
}
function closeStore(store: CompanionStore): void {
  const close = Reflect.get(store, "close");
  if (typeof close === "function") close.call(store);
}

test("companion refuses any Native identity before initializing directories", async () => {
  for (const value of [nativeIdentity, "{broken", '{"version":999}']) {
    const root = freshRoot();
    const marker = markNative(root, value);
    const before = readdirSync(root).sort();
    assert.throws(() => new CompanionStore(root), isNativeRoot);
    await assert.rejects(
      startCompanionService({ dataDirectory: root, port: 0 }),
      isNativeRoot,
    );
    assert.deepEqual(readdirSync(root).sort(), before);
    assert.equal(readFileSync(marker, "utf8"), value);
  }
  const root = freshRoot();
  mkdirSync(join(root, "app/repository.json"), { recursive: true });
  assert.throws(() => new CompanionStore(root), isNativeRoot);
});

test("all public store data paths reject a late Native marker and retain staged bytes", () => {
  const root = freshRoot();
  const store = new CompanionStore(root);
  const bytes = new Uint8Array([1, 2, 3]);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const staged = store.stageAsset(
    {
      assetId: `asset-${sha256.slice(0, 24)}`,
      sha256,
      mime: "image/png",
      size: 3,
      tags: [],
    },
    bytes,
  );
  const stagePath = join(store.stagingRoot, staged.stageId, "blob");
  const marker = markNative(root);
  try {
    for (const method of [
      "readSnapshot",
      "writeSnapshot",
      "stageAsset",
      "publishStagedAsset",
      "listAssets",
      "preflightImport",
      "publishImportedSnapshot",
      "readAsset",
      "assetBlobPath",
      "createBackup",
      "listBackups",
      "restoreBackup",
    ] as const) {
      assert.throws(
        () => Reflect.apply(store[method], store, []),
        isNativeRoot,
        method,
      );
    }
    assert.deepEqual(readFileSync(stagePath), Buffer.from(bytes));
    assert.equal(readFileSync(marker, "utf8"), nativeIdentity);
    assert.deepEqual(readdirSync(store.assetBlobsRoot), []);
    assert.deepEqual(readdirSync(store.assetRecordsRoot), []);
  } finally {
    closeStore(store);
  }
});

test("HTTP upload rechecks Native admission after awaiting the body", async () => {
  const root = freshRoot();
  const store = new CompanionStore(root);
  const server = createCompanionServer({
    store,
    allowedOrigins: [origin],
    pairingCode: "native-boundary-code",
    deviceId: "device-test",
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const endpoint = `http://127.0.0.1:${address.port}`;
  try {
    const paired = await fetch(endpoint + "/v1/pair", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ code: "native-boundary-code" }),
    });
    assert.equal(paired.status, 200);
    const cookie = paired.headers.get("set-cookie")!.split(";", 1)[0];
    const bytes = Buffer.from([1, 2, 3]);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const metadata = {
      assetId: `asset-${sha256.slice(0, 24)}`,
      sha256,
      mime: "image/png",
      size: 3,
      tags: [],
    };
    let observeFirstByte!: () => void;
    const firstByte = new Promise<void>((resolve) => {
      observeFirstByte = resolve;
    });
    server.once("request", (incoming) =>
      incoming.once("data", observeFirstByte),
    );
    const sent = request(endpoint + `/v1/assets/${metadata.assetId}`, {
      method: "PUT",
      headers: {
        Origin: origin,
        Cookie: cookie,
        "Content-Length": 3,
        "X-KK-Asset-Metadata": Buffer.from(JSON.stringify(metadata)).toString(
          "base64url",
        ),
      },
    });
    const response = new Promise<{ status: number; body: string }>(
      (resolve, reject) => {
        sent.once("error", reject);
        sent.once("response", (incoming) => {
          let body = "";
          incoming.setEncoding("utf8");
          incoming.on("data", (chunk) => {
            body += chunk;
          });
          incoming.once("end", () =>
            resolve({ status: incoming.statusCode!, body }),
          );
        });
      },
    );
    sent.write(bytes.subarray(0, 1));
    await firstByte;
    markNative(root);
    sent.end(bytes.subarray(1));
    const received = await response;
    assert.equal(received.status, 409);
    assert.equal(JSON.parse(received.body).error, "SNAPSHOT_UNSUPPORTED");
    assert.deepEqual(readdirSync(store.stagingRoot), []);
    assert.deepEqual(readdirSync(store.assetRecordsRoot), []);
  } finally {
    server.close();
    await once(server, "close");
    closeStore(store);
  }
});

test(
  "Windows owner handle prevents a Native owner from opening a live companion root",
  { skip: process.platform !== "win32" },
  () => {
    const root = freshRoot();
    const store = new CompanionStore(root);
    const probe =
      "try { $h=[IO.File]::Open($env:KK_BOUNDARY_LOCK,[IO.FileMode]::OpenOrCreate,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None); $h.Dispose(); 'OPEN' } catch [IO.IOException] { 'BUSY' }";
    const inspect = () =>
      execFileSync("powershell.exe", ["-NoProfile", "-Command", probe], {
        windowsHide: true,
        encoding: "utf8",
        env: {
          ...process.env,
          KK_BOUNDARY_LOCK: join(root, ".kk-native-owner.lock"),
        },
      }).trim();
    try {
      assert.equal(inspect(), "BUSY");
    } finally {
      closeStore(store);
    }
    assert.equal(inspect(), "OPEN");
  },
);

test(
  "Windows Native exclusive owner prevents companion initialization even before a marker",
  { skip: process.platform !== "win32" },
  async () => {
    const root = freshRoot();
    const child = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        "$h=[IO.File]::Open($env:KK_BOUNDARY_LOCK,[IO.FileMode]::OpenOrCreate,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None); [Console]::Out.WriteLine('LOCKED'); [Console]::Out.Flush(); [Console]::ReadLine() | Out-Null; $h.Dispose()",
      ],
      {
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
          KK_BOUNDARY_LOCK: join(root, ".kk-native-owner.lock"),
        },
      },
    );
    try {
      const [chunk] = await once(child.stdout!, "data");
      assert.match(String(chunk), /LOCKED/);
      assert.throws(
        () => new CompanionStore(root),
        (error: unknown) =>
          error instanceof CompanionProtocolError && error.code === "IO",
      );
      assert.deepEqual(readdirSync(root), [".kk-native-owner.lock"]);
    } finally {
      child.stdin!.end("release\n");
      await once(child, "exit");
    }
  },
);

test("standalone v3 writes and reads only canonical chat authority", () => {
  const store = new CompanionStore(freshRoot());
  try {
    const project = createProject({
      prompt: "保留聊天",
      model: "image-test",
      kind: "image",
      attachments: [],
    });
    const snapshot = JSON.parse(
      JSON.stringify(
        serializeCreationSnapshot({
          ...emptySnapshot(),
          version: 3,
          activeProjectId: project.id,
          projects: [project],
        }),
      ),
    );
    store.writeSnapshot(snapshot, null);
    const disk = JSON.parse(readFileSync(store.snapshotPath, "utf8"));
    assert.deepEqual(disk, snapshot);
    assert.deepEqual(store.readSnapshot().snapshot, snapshot);
    for (const key of [
      "messages",
      "composerDraft",
      "agentThreadId",
      "googleConversation",
    ])
      assert.equal(Object.hasOwn(disk.projects[0], key), false);
    const backup = store.createBackup();
    assert.equal(
      store.restoreBackup(backup.directory.split(/[\\/]/).pop()!).revision,
      snapshot.revision,
    );
    assert.deepEqual(
      JSON.parse(readFileSync(store.snapshotPath, "utf8")),
      snapshot,
    );
  } finally {
    closeStore(store);
  }
});

for (const boundary of ["save", "read", "preflight", "restore"] as const) {
  test(`standalone ${boundary} refuses ambiguous v3 root history before projection`, () => {
    const store = new CompanionStore(freshRoot());
    try {
      const project = createProject({
        prompt: "canonical draft",
        model: "image-test",
        kind: "image",
        attachments: [],
      });
      const canonical = JSON.parse(
        JSON.stringify(
          serializeCreationSnapshot({
            ...emptySnapshot(),
            version: 3,
            activeProjectId: project.id,
            projects: [project],
          }),
        ),
      );
      store.writeSnapshot(canonical, null);
      const ambiguous = structuredClone(canonical);
      ambiguous.revision += 1;
      ambiguous.projects[0].messages = [
        {
          id: "legacy-message",
          role: "user",
          content: "independent original history",
        },
      ];
      ambiguous.projects[0].composerDraft = {
        prompt: "independent original draft",
        model: "image-test",
        kind: "image",
        attachments: [],
      };
      if (boundary === "read")
        writeFileSync(store.snapshotPath, JSON.stringify(ambiguous));
      const originals = [
        readFileSync(store.snapshotPath),
        readFileSync(store.backupPath),
      ];
      const action = () => {
        if (boundary === "save")
          store.writeSnapshot(ambiguous, canonical.revision);
        else if (boundary === "read") store.readSnapshot();
        else if (boundary === "preflight")
          store.preflightImport(
            ambiguous,
            [],
            sha256Json({ snapshot: ambiguous, assets: [] }),
          );
        else {
          const directory = join(store.backupsRoot, "ambiguous-v3");
          mkdirSync(join(directory, "projects"), { recursive: true });
          const bytes = Buffer.from(JSON.stringify(ambiguous));
          writeFileSync(join(directory, "projects/creation-v2.json"), bytes);
          writeFileSync(
            join(directory, "manifest.json"),
            JSON.stringify(
              createManifest(ambiguous.revision, [
                { path: "projects/creation-v2.json", bytes },
              ]),
            ),
          );
          store.restoreBackup("ambiguous-v3");
          assert.deepEqual(
            readFileSync(join(directory, "projects/creation-v2.json")),
            bytes,
          );
        }
      };
      assert.throws(action, isNativeRoot);
      assert.deepEqual(readFileSync(store.snapshotPath), originals[0]);
      assert.deepEqual(readFileSync(store.backupPath), originals[1]);
    } finally {
      closeStore(store);
    }
  });
}

test("known v3 primary or backup cannot be downgraded by a v2 save", () => {
  const old = { ...emptySnapshot(), version: 2 as const };
  const modern = { ...emptySnapshot(), version: 3 as const };
  for (const main of [old, modern]) {
    const store = new CompanionStore(freshRoot());
    try {
      writeFileSync(store.snapshotPath, JSON.stringify(main));
      writeFileSync(store.backupPath, JSON.stringify(modern));
      const raw = [
        readFileSync(store.snapshotPath),
        readFileSync(store.backupPath),
      ];
      assert.throws(
        () => store.writeSnapshot({ ...old, revision: 1 }, 0),
        isNativeRoot,
      );
      assert.deepEqual(readFileSync(store.snapshotPath), raw[0]);
      assert.deepEqual(readFileSync(store.backupPath), raw[1]);
    } finally {
      closeStore(store);
    }
  }
});

test("existing companion v2 files require an explicit migration instead of an implicit upgrade", () => {
  const store = new CompanionStore(freshRoot());
  try {
    const original = JSON.stringify({ ...emptySnapshot(), version: 2 });
    writeFileSync(store.snapshotPath, original);
    writeFileSync(store.backupPath, original);
    assert.throws(
      () =>
        store.writeSnapshot({ ...emptySnapshot(), version: 3, revision: 1 }, 0),
      isNativeRoot,
    );
    assert.equal(readFileSync(store.snapshotPath, "utf8"), original);
    assert.equal(readFileSync(store.backupPath, "utf8"), original);
  } finally {
    closeStore(store);
  }
});

test(
  "failed service startup releases the Windows owner handle",
  { skip: process.platform !== "win32" },
  async () => {
    const root = freshRoot();
    await assert.rejects(
      startCompanionService({ dataDirectory: root, port: 80 }),
      /between 1024 and 65535/,
    );
    const probe =
      "$h=[IO.File]::Open($env:KK_BOUNDARY_LOCK,[IO.FileMode]::Open,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None); $h.Dispose(); 'OPEN'";
    assert.equal(
      execFileSync("powershell.exe", ["-NoProfile", "-Command", probe], {
        windowsHide: true,
        encoding: "utf8",
        env: {
          ...process.env,
          KK_BOUNDARY_LOCK: join(root, ".kk-native-owner.lock"),
        },
      }).trim(),
      "OPEN",
    );
  },
);
