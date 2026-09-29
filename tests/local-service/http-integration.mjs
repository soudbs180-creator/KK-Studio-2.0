import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { emptySnapshot } from "../../src/features/creation/model.ts";
import { startCompanionService } from "../../src/features/local-service/main.ts";

const origin = "http://127.0.0.1:1421";
const root = mkdtempSync(join(tmpdir(), "kk-companion-integration-"));

async function pair(service) {
  const response = await fetch(`http://127.0.0.1:${service.port}/v1/pair`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ code: service.pairingCode }),
  });
  assert.equal(response.status, 200);
  return response.headers.get("set-cookie").split(";", 1)[0];
}

async function readSnapshot(service, cookie) {
  const response = await fetch(`http://127.0.0.1:${service.port}/v1/snapshot`, {
    headers: { Origin: origin, Cookie: cookie },
  });
  assert.equal(response.status, 200);
  return response.json();
}

const first = await startCompanionService({
  dataDirectory: root,
  port: 0,
  allowedOrigins: [origin],
});
const firstCookie = await pair(first);
const snapshot = emptySnapshot();
const saved = await fetch(`http://127.0.0.1:${first.port}/v1/snapshot`, {
  method: "PUT",
  headers: {
    Origin: origin,
    Cookie: firstCookie,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ expectedRevision: null, snapshot }),
});
assert.equal(saved.status, 200);
const advanced = await fetch(`http://127.0.0.1:${first.port}/v1/snapshot`, {
  method: "PUT",
  headers: {
    Origin: origin,
    Cookie: firstCookie,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    expectedRevision: 0,
    snapshot: { ...snapshot, revision: 1 },
  }),
});
assert.equal(advanced.status, 200);
await new Promise((resolve) => first.server.close(resolve));

const second = await startCompanionService({
  dataDirectory: root,
  port: 0,
  allowedOrigins: [origin],
});
const secondCookie = await pair(second);
assert.equal((await readSnapshot(second, secondCookie)).revision, 1);
writeFileSync(join(root, "projects", "creation-v2.json"), "{broken", "utf8");
const recovered = await readSnapshot(second, secondCookie);
assert.equal(recovered.status, "recovered");
assert.equal(recovered.revision, 0);
await new Promise((resolve) => second.server.close(resolve));
process.stdout.write(
  "local companion integration: restart and backup recovery passed\n",
);
