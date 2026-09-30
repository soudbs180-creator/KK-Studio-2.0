import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn, execFileSync, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { fileIdentity } from "../../scripts/windows/installer-receipt.mjs";

const windows = process.platform === "win32";
const powershell = (command: string) =>
  execFileSync("powershell.exe", ["-NoProfile", "-Command", command], {
    encoding: "utf8",
    windowsHide: true,
  });
const probe = (name: string) =>
  JSON.parse(
    execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-File",
        path.resolve("tests/desktop/installer-state.ps1"),
        "-ProductName",
        name,
      ],
      { encoding: "utf8", windowsHide: true },
    ),
  );

test(
  "installer preflight finds an MSI registered under a GUID",
  { skip: !windows },
  (t) => {
    const id = randomUUID();
    const name = `KK Studio audit fixture ${id}`;
    const key = `Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{${id}}`;
    const open =
      "$registry = [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::CurrentUser, [Microsoft.Win32.RegistryView]::Registry64);";
    t.after(() =>
      powershell(
        `${open} $key = $registry.OpenSubKey('${key}'); if ($null -ne $key) { if ($key.GetValue('DisplayName') -ne '${name}') { throw 'Not owned fixture'; }; $key.Dispose(); $registry.DeleteSubKey('${key}', $false); }; $registry.Dispose();`,
      ),
    );
    powershell(
      `${open} $key = $registry.CreateSubKey('${key}'); try { $key.SetValue('DisplayName', '${name}'); $key.SetValue('InstallLocation', 'C:\\audit-fixture'); $key.SetValue('DisplayVersion', '0.0.0'); } finally { $key.Dispose(); $registry.Dispose(); }`,
    );
    assert(
      probe(name).some(
        (entry: { kind: string; version?: string }) =>
          entry.kind === "uninstall" && entry.version === "0.0.0",
      ),
    );
  },
);

test(
  "installer preflight refuses a running portable before executing any installer",
  { skip: !windows },
  async (t) => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "kk-installer-guard-"),
    );
    const childExe = path.join(root, "kk-studio.exe");
    await fs.copyFile(process.execPath, childExe);
    const child = spawn(childExe, ["-e", "setInterval(() => {}, 1000)"], {
      windowsHide: true,
      stdio: "ignore",
    });
    await new Promise<void>((resolve, reject) => {
      child.once("spawn", resolve);
      child.once("error", reject);
    });
    t.after(async () => {
      if (child.exitCode === null) {
        child.kill();
        await new Promise<void>((resolve) =>
          child.once("exit", () => resolve()),
        );
      }
      await fs.rm(root, { recursive: true, force: true });
    });
    assert(
      probe(`nonexistent-${randomUUID()}`).some(
        (entry: { kind: string; pid?: number }) =>
          entry.kind === "process" && entry.pid === child.pid,
      ),
    );
    const installer = path.join(root, "never-execute.exe");
    await fs.writeFile(
      installer,
      "This is a synthetic package; executing it would fail.",
    );
    const receiptPath = path.join(root, "receipt.json");
    await fs.writeFile(
      receiptPath,
      JSON.stringify({
        installer: {
          path: path.basename(installer),
          ...(await fileIdentity(installer)),
        },
      }),
    );
    const result = spawnSync(
      process.execPath,
      ["tests/desktop/installer.mjs", receiptPath],
      { cwd: process.cwd(), encoding: "utf8", windowsHide: true },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /An existing installation must not be changed/);
    assert.equal(child.exitCode, null, "Existing portable must remain running");
  },
);
