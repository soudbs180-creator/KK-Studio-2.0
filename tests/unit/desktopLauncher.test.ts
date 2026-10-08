import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test(
  "Windows icon installer creates a GUI launcher with no console and current icon",
  { skip: process.platform !== "win32" },
  (t) => {
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), "kk-gui-launcher-"));
    const root = path.join(parent, "KK 测试 & launch");
    t.after(() => {
      assert.equal(path.dirname(parent), path.resolve(os.tmpdir()));
      assert.ok(path.basename(parent).startsWith("kk-gui-launcher-"));
      fs.rmSync(parent, { recursive: true, force: true });
    });
    fs.mkdirSync(path.join(root, "scripts", "windows"), { recursive: true });
    fs.mkdirSync(path.join(root, "src-tauri", "icons"), { recursive: true });
    for (const name of ["install-shortcut.ps1", "desktop-launcher.cs"]) {
      const source = new URL(`../../scripts/windows/${name}`, import.meta.url);
      if (fs.existsSync(source))
        fs.copyFileSync(source, path.join(root, "scripts", "windows", name));
    }
    fs.copyFileSync(
      new URL("../../src-tauri/icons/icon.ico", import.meta.url),
      path.join(root, "src-tauri", "icons", "icon.ico"),
    );
    const compiler = path.join(
      process.env.WINDIR ?? "C:\\Windows",
      "Microsoft.NET",
      "Framework64",
      "v4.0.30319",
      "csc.exe",
    );
    const probe = path.join(root, "ConsoleProbe.cs");
    fs.writeFileSync(
      probe,
      'using System; using System.IO; using System.Runtime.InteropServices; class Probe { [DllImport("kernel32.dll")] static extern IntPtr GetConsoleWindow(); static void Main(string[] args) { File.WriteAllText("probe.txt", GetConsoleWindow().ToInt64() + "\\n" + Directory.GetCurrentDirectory() + "\\n" + string.Join(" ", args)); } }',
    );
    const compiled = spawnSync(
      compiler,
      ["/nologo", `/out:${path.join(root, "probe.exe")}`, probe],
      { windowsHide: true, encoding: "utf8" },
    );
    assert.equal(compiled.status, 0, compiled.stdout + compiled.stderr);
    fs.writeFileSync(
      path.join(root, "start-kk-studio.bat"),
      '@echo off\r\n"%~dp0probe.exe" %*\r\nexit /b 0\r\n',
    );
    const install = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        path.join(root, "scripts", "windows", "install-shortcut.ps1"),
      ],
      { windowsHide: true, encoding: "utf8", timeout: 15000 },
    );
    assert.equal(install.status, 0, install.stdout + install.stderr);
    const exe = path.join(root, "KK Studio Launcher.exe");
    const bytes = fs.readFileSync(exe);
    const pe = bytes.readUInt32LE(0x3c);
    assert.equal(
      bytes.readUInt16LE(pe + 24 + 68),
      2,
      "launcher must use the Windows GUI subsystem",
    );
    const link = path.join(root, "启动 KK Studio.lnk");
    const inspect = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        "[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding; $s = (New-Object -ComObject WScript.Shell).CreateShortcut($env:KK_TEST_LINK); @{Target=$s.TargetPath;Directory=$s.WorkingDirectory;Icon=$s.IconLocation} | ConvertTo-Json -Compress",
      ],
      {
        env: { ...process.env, KK_TEST_LINK: link },
        windowsHide: true,
        encoding: "utf8",
      },
    );
    assert.equal(inspect.status, 0, inspect.stdout + inspect.stderr);
    const shortcut = JSON.parse(inspect.stdout);
    assert.equal(shortcut.Target, exe);
    assert.equal(shortcut.Directory, root);
    assert.equal(
      shortcut.Icon,
      `${exe},0`,
      "shortcut should use the launcher's embedded icon",
    );
    const reinstall = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        path.join(root, "scripts", "windows", "install-shortcut.ps1"),
      ],
      { windowsHide: true, encoding: "utf8", timeout: 15000 },
    );
    assert.equal(reinstall.status, 0, reinstall.stdout + reinstall.stderr);
    const launch = spawnSync(exe, [], {
      cwd: parent,
      encoding: "utf8",
      timeout: 15000,
    });
    assert.equal(launch.status, 0, launch.error?.message ?? launch.stderr);
    const observed = fs
      .readFileSync(path.join(root, "probe.txt"), "utf8")
      .split("\n");
    assert.equal(
      observed[0],
      "0",
      "background command tree must not allocate a console",
    );
    assert.equal(observed[1], root);
    assert.equal(observed[2], "--background");
  },
);

test(
  "Windows background batch failure exits without an interactive pause",
  { skip: process.platform !== "win32" },
  (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "kk-background-batch-"));
    t.after(() => {
      assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
      assert.ok(path.basename(root).startsWith("kk-background-batch-"));
      fs.rmSync(root, { recursive: true, force: true });
    });
    fs.mkdirSync(path.join(root, "scripts", "windows"), { recursive: true });
    fs.copyFileSync(
      new URL("../../start-kk-studio.bat", import.meta.url),
      path.join(root, "start-kk-studio.bat"),
    );
    fs.writeFileSync(
      path.join(root, "scripts", "windows", "desktop-release.mjs"),
      "process.exitCode = 23;",
    );
    const result = spawnSync(
      process.env.ComSpec ?? "cmd.exe",
      ["/d", "/c", "start-kk-studio.bat", "--background"],
      { cwd: root, windowsHide: true, timeout: 10000 },
    );
    const output = Buffer.concat([result.stdout, result.stderr]);
    const text =
      output.toString("utf8") + new TextDecoder("gb18030").decode(output);
    assert.equal(result.status, 1, result.error?.message ?? text);
    assert.doesNotMatch(text, /Press any key|请按任意键/i);
  },
);

test(
  "Windows startup logs failures and cancellation only stops its own process tree",
  { skip: process.platform !== "win32" },
  (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "kk-startup-process-"));
    const children: { unrelated?: ReturnType<typeof spawn> } = {};
    t.after(async () => {
      const other = children.unrelated;
      if (other && other.exitCode === null) {
        const exited = new Promise<void>((resolve) =>
          other.once("exit", () => resolve()),
        );
        other.kill();
        await exited;
      }
      assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
      assert.ok(path.basename(root).startsWith("kk-startup-process-"));
      fs.rmSync(root, { recursive: true, force: true });
    });
    const compiler = path.join(
      process.env.WINDIR ?? "C:\\Windows",
      "Microsoft.NET",
      "Framework64",
      "v4.0.30319",
      "csc.exe",
    );
    const source = path.join(root, "Probe.cs");
    fs.writeFileSync(
      source,
      'using System; using System.IO; using System.Threading; using System.Threading.Tasks; class Probe { static int Main(string[] args) { var s = new StartupProcess(); if (args[0] != "cancel") return s.Run(args[1], args[2]); var run = Task.Factory.StartNew(() => s.Run(args[1], args[2])); var marker = Path.Combine(args[1], "child.pid"); var end = DateTime.UtcNow.AddSeconds(8); while (!File.Exists(marker)) { if (DateTime.UtcNow > end || run.IsCompleted) return 8; Thread.Sleep(10); } s.Cancel(); return run.Result == 2 && s.Cancelled ? 0 : 9; } }',
    );
    const executable = path.join(root, "core-probe.exe");
    const built = spawnSync(
      compiler,
      [
        "/nologo",
        "/codepage:65001",
        "/r:System.Windows.Forms.dll",
        "/r:System.Drawing.dll",
        "/main:Probe",
        `/out:${executable}`,
        source,
        path.resolve("scripts/windows/desktop-launcher.cs"),
      ],
      { windowsHide: true, encoding: "utf8" },
    );
    assert.equal(built.status, 0, built.stdout + built.stderr);
    const batch = path.join(root, "start-kk-studio.bat");
    fs.writeFileSync(
      batch,
      "@echo off\r\necho startup-out\r\necho startup-error 1>&2\r\nexit /b 23\r\n",
    );
    const failureLog = path.join(root, "failure.log");
    const failed = spawnSync(executable, ["run", root, failureLog], {
      windowsHide: true,
      encoding: "utf8",
      timeout: 10000,
    });
    assert.equal(failed.status, 23, failed.error?.message ?? failed.stderr);
    assert.match(
      fs.readFileSync(failureLog, "utf8"),
      /startup-out[\s\S]*Exit code: 23/,
    );
    assert.match(fs.readFileSync(failureLog, "utf8"), /startup-error/);
    const literalRoot = path.join(root, "literal %KK_LAUNCH_TEST_EXPAND% path");
    fs.mkdirSync(literalRoot);
    fs.copyFileSync(batch, path.join(literalRoot, "start-kk-studio.bat"));
    const literalLog = path.join(root, "literal-path.log");
    const literal = spawnSync(executable, ["run", literalRoot, literalLog], {
      env: { ...process.env, KK_LAUNCH_TEST_EXPAND: "expanded" },
      windowsHide: true,
      encoding: "utf8",
      timeout: 10000,
    });
    assert.equal(literal.status, 23, fs.readFileSync(literalLog, "utf8"));
    assert.match(fs.readFileSync(literalLog, "utf8"), /startup-out/);
    const waitSource = path.join(root, "Wait.cs");
    fs.writeFileSync(
      waitSource,
      "using System.Diagnostics; using System.IO; using System.Threading; class Wait { static void Main(string[] args) { File.WriteAllText(args[0], Process.GetCurrentProcess().Id.ToString()); Thread.Sleep(30000); } }",
    );
    const waitExe = path.join(root, "wait.exe");
    const waitBuilt = spawnSync(
      compiler,
      ["/nologo", `/out:${waitExe}`, waitSource],
      { windowsHide: true, encoding: "utf8" },
    );
    assert.equal(waitBuilt.status, 0, waitBuilt.stdout + waitBuilt.stderr);
    const unrelated = spawn(waitExe, [path.join(root, "unrelated.pid")], {
      windowsHide: true,
      stdio: "ignore",
    });
    children.unrelated = unrelated;
    fs.writeFileSync(
      batch,
      '@echo off\r\n"%~dp0wait.exe" "%~dp0child.pid"\r\n',
    );
    const cancelled = spawnSync(
      executable,
      ["cancel", root, path.join(root, "cancel.log")],
      { windowsHide: true, encoding: "utf8", timeout: 15000 },
    );
    assert.equal(
      cancelled.status,
      0,
      cancelled.error?.message ?? cancelled.stderr,
    );
    const ownedPid = Number(
      fs.readFileSync(path.join(root, "child.pid"), "utf8"),
    );
    assert.throws(() => process.kill(ownedPid, 0), /ESRCH/);
    assert.doesNotThrow(() => process.kill(unrelated.pid!, 0));
  },
);
