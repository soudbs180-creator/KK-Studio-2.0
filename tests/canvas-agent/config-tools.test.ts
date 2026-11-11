import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  configToolNames,
  parseConfigToolInput,
  safeConfigToolResult,
} from "../../vendor/canvas-agent/src/config/tools.ts";
import {
  toolNames,
  toolInputSchemas,
  toolDescriptions,
} from "../../vendor/canvas-agent/src/canvas/schemas.ts";

test("all seven configuration tools have strict input envelopes and registered schemas", () => {
  assert.equal(configToolNames.length, 7);
  for (const name of configToolNames) {
    assert.ok(toolNames.includes(name));
    assert.ok(toolDescriptions[name]);
    assert.equal(
      toolInputSchemas[name].safeParse({ confirmed: true }).success,
      false,
    );
  }
  assert.deepEqual(parseConfigToolInput("kk_config_get", {}), {});
  assert.deepEqual(
    safeConfigToolResult("kk_credential_request", { status: "provided" }),
    { status: "provided" },
  );
});

test("generated config contract matches the browser contract and rejects secret-shaped payloads", async () => {
  const browser = await readFile(
    new URL("../../src/domain/configTools.ts", import.meta.url),
    "utf8",
  );
  const agent = await readFile(
    new URL("../../vendor/canvas-agent/src/config/tools.ts", import.meta.url),
    "utf8",
  );
  assert.equal(agent.replace(/^\/\/ Generated[^\n]*\n/, ""), browser);
  const fake = "sk-FAKE-CONFIG-CONTRACT-1234567890";
  for (const value of [
    { apiKey: fake },
    { label: fake },
    { authorization: "Bearer " + fake },
  ]) {
    assert.throws(
      () => parseConfigToolInput("kk_config_propose", { draft: value }),
      (error) => !String(error).includes(fake),
    );
    assert.throws(
      () => safeConfigToolResult("kk_config_get", value),
      (error) => !String(error).includes(fake),
    );
  }
});
