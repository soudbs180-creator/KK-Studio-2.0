import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  fileIdentity,
  verifyInstaller,
  verifyInstalledFiles,
  assertInstallerFresh,
  nsisExecutableIdentity,
} from "../../scripts/windows/installer-receipt.mjs";

test("installer verification rejects corrupted bytes before execution", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "kk-installer-check-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, "setup.exe");
  await fs.writeFile(file, "fixture installer bytes");
  const receipt = {
    installer: { path: "setup.exe", ...(await fileIdentity(file)) },
  };
  assert.equal(await verifyInstaller(receipt, root), file);
  await fs.writeFile(file, "corrupt installer bytes");
  await assert.rejects(verifyInstaller(receipt, root), /verification failed/);
});

test("installed executable identity accounts for Tauri NSIS bundle marker and rejects ambiguous inputs", () => {
  const original = Buffer.from("prefix__TAURI_BUNDLE_TYPE_VAR_UNKsuffix");
  const unchanged = Buffer.from(original);
  const identity = nsisExecutableIdentity(original);
  assert.equal(identity.size, original.length);
  assert.deepEqual(original, unchanged, "Source executable must not be edited");
  assert.throws(
    () => nsisExecutableIdentity(Buffer.from("missing marker")),
    /one Tauri bundle marker/,
  );
  assert.throws(
    () => nsisExecutableIdentity(Buffer.concat([original, original])),
    /one Tauri bundle marker/,
  );
});

test("receipt freshness rejects newer installer configuration and runtime inputs", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "kk-installer-fresh-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const installer = path.join(root, "setup.exe");
  const inputs = [
    "kk-studio.exe",
    "tauri.installer.conf.json",
    "runtime-manifest.json",
    "node.exe",
  ].map((name) => path.join(root, name));
  for (const file of [installer, ...inputs]) {
    await fs.writeFile(file, "synthetic input");
    await fs.utimes(file, 10, 10);
  }
  await fs.utimes(installer, 20, 20);
  await assertInstallerFresh(installer, inputs);
  for (const input of inputs) {
    await fs.utimes(input, 30, 30);
    await assert.rejects(
      assertInstallerFresh(installer, inputs),
      /older than input/,
    );
    await fs.utimes(input, 10, 10);
  }
});

test("installed runtime verifies executable and each resource; missing or corrupt files fail", async (t) => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "kk-installer-runtime-"),
  );
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "agent-runtime"));
  const files = ["kk-studio.exe", "agent-runtime/node.exe"];
  const installedFiles = [];
  for (const relative of files) {
    const file = path.join(root, relative);
    await fs.writeFile(file, relative);
    installedFiles.push({ path: relative, ...(await fileIdentity(file)) });
  }
  assert.equal(await verifyInstalledFiles({ installedFiles }, root), 2);
  await fs.writeFile(path.join(root, files[1]), "damaged");
  await assert.rejects(
    verifyInstalledFiles({ installedFiles }, root),
    /verification failed/,
  );
  await fs.unlink(path.join(root, files[1]));
  await assert.rejects(
    verifyInstalledFiles({ installedFiles }, root),
    /ENOENT/,
  );
});

test("receipt paths cannot read outside the selected installation directory", async () => {
  for (const relative of [
    "../outside.exe",
    "agent-runtime/../../outside.exe",
    "C:/outside.exe",
    "agent-runtime\\outside.exe",
    "/outside.exe",
    "agent-runtime//node.exe",
  ]) {
    await assert.rejects(
      verifyInstalledFiles(
        { installedFiles: [{ path: relative }] },
        os.tmpdir(),
      ),
      /Invalid receipt file path/,
    );
  }
});

test("installer config includes the Agent and offline WebView2 without changing data identity", async () => {
  const config = JSON.parse(
    await fs.readFile(
      new URL("../../src-tauri/tauri.installer.conf.json", import.meta.url),
      "utf8",
    ),
  );
  assert.deepEqual(config.bundle.targets, ["nsis"]);
  assert.equal(config.bundle.resources["agent-runtime/"], "agent-runtime/");
  assert.equal(
    config.bundle.windows.webviewInstallMode.type,
    "offlineInstaller",
  );
  assert.equal(config.bundle.windows.nsis.installMode, "currentUser");
  assert.equal(config.bundle.windows.allowDowngrades, true);
  assert.equal(config.identifier, undefined);
  assert.equal(config.version, undefined);
});
