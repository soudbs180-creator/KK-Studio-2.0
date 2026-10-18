import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import * as runtimePackaging from "../../scripts/agent/runtime-package.mjs";

const { packageAgentRuntime } = runtimePackaging;

test("runtime package contains production dependencies without repository links or user secrets", async () => {
  const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), "kk-agent-package-"));
  const agent = path.join(sandbox, "vendor");
  async function write(relative: string, content: string) {
    const target = path.join(agent, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content);
  }
  try {
    await write(
      "package.json",
      JSON.stringify({
        name: "canvas-agent",
        version: "1",
        type: "module",
        dependencies: { dep: "1", "kk-studio": "file:../.." },
        devDependencies: { tooling: "1" },
      }),
    );
    await write("dist/index.js", "export const loaded = true;");
    await write("agent-instructions.md", "tools");
    await write("LICENSE", "MIT");
    await write("auth.json", "synthetic-secret");
    await write(
      "node_modules/dep/package.json",
      JSON.stringify({
        name: "dep",
        version: "1",
        main: "index.js",
        dependencies: { string_decoder: "1" },
      }),
    );
    await write(
      "node_modules/string_decoder/package.json",
      JSON.stringify({
        name: "string_decoder",
        version: "1",
        main: "index.js",
      }),
    );
    await write("node_modules/string_decoder/index.js", "module.exports = {};");
    await write("node_modules/dep/index.js", "module.exports=42;");
    await write("node_modules/dep/LICENSE", "MIT");
    await write(
      "node_modules/tooling/package.json",
      JSON.stringify({ name: "tooling", version: "1" }),
    );
    // A nested version must remain nested; flattening silently changes imports.
    await write(
      "node_modules/dep/node_modules/string_decoder/package.json",
      JSON.stringify({
        name: "string_decoder",
        version: "2",
        main: "index.js",
      }),
    );
    await write(
      "node_modules/dep/node_modules/string_decoder/index.js",
      "module.exports = 'nested-v2';",
    );
    await write(
      "node_modules/dep/index.js",
      "module.exports=require('string_decoder/package.json').version;",
    );
    const target = path.join(sandbox, "output");
    const result = await packageAgentRuntime({
      agent,
      target,
      node: process.execPath,
      nodeLicense: path.join(agent, "LICENSE"),
    });
    const files = result.files.map((file: { path: string }) => file.path);
    assert.ok(files.includes("agent/node_modules/dep/index.js"));
    assert.ok(files.includes("agent/node_modules/dep/LICENSE"));
    assert.ok(
      files.includes(
        "agent/node_modules/dep/node_modules/string_decoder/index.js",
      ),
    );
    assert.equal(
      createRequire(path.join(target, "agent/package.json"))("dep"),
      "2",
    );
    assert.ok(files.includes("desktop-entry.mjs"));
    const bridge = await fs.readFile(
      new URL("../../scripts/gemini-bridge.mjs", import.meta.url),
    );
    assert.deepEqual(
      await fs.readFile(path.join(target, "gemini-bridge.mjs")),
      bridge,
    );
    assert.deepEqual(
      result.files.find(
        (file: { path: string }) => file.path === "gemini-bridge.mjs",
      ),
      {
        path: "gemini-bridge.mjs",
        size: bridge.length,
        sha256: createHash("sha256").update(bridge).digest("hex"),
      },
    );
    assert.ok(
      files.includes(process.platform === "win32" ? "node.exe" : "node"),
    );
    assert.equal(
      files.some((file: string) => /auth\.json|tooling|kk-studio/.test(file)),
      false,
    );
    assert.equal(
      JSON.parse(
        await fs.readFile(path.join(target, "agent/package.json"), "utf8"),
      ).dependencies["kk-studio"],
      undefined,
    );
    assert.ok(
      result.files.every((file: { sha256: string }) =>
        /^[a-f0-9]{64}$/.test(file.sha256),
      ),
    );
    await assert.rejects(
      packageAgentRuntime({ agent, target, node: process.execPath }),
      /exists/,
    );
  } finally {
    await fs.rm(sandbox, { recursive: true, force: true });
  }
});

const windowsPublish = { skip: process.platform !== "win32" };
type PublishFixture = {
  root: string;
  staging: string;
  runtime: string;
  temporary: string;
};
async function withPublishFixture(
  run: (fixture: PublishFixture) => Promise<void>,
) {
  assert.equal(typeof runtimePackaging.publishAgentRuntime, "function");
  // Windows TEMP can use an 8.3 alias; publication expects canonical paths.
  const root = await fs.realpath(
    await fs.mkdtemp(path.join(os.tmpdir(), "kk-runtime-publish-")),
  );
  const temporary = path.join(root, ".tmp");
  const staging = path.join(
    temporary,
    "agent-runtime-00000000-0000-4000-8000-000000000000",
  );
  const runtime = path.join(root, "src-tauri/agent-runtime");
  await fs.mkdir(staging, { recursive: true });
  await fs.mkdir(runtime, { recursive: true });
  await fs.writeFile(path.join(staging, "identity.txt"), "new-runtime");
  await fs.writeFile(path.join(runtime, "identity.txt"), "old-runtime");
  try {
    await run({ root, temporary, staging, runtime });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}
const filesystemError = (code: string) =>
  Object.assign(new Error("fixture filesystem failure"), { code });
const identity = (directory: string) =>
  fs.readFile(path.join(directory, "identity.txt"), "utf8");
async function retainedBackups(temporary: string) {
  return (await fs.readdir(temporary))
    .filter((name) => name.startsWith("agent-runtime-previous-"))
    .map((name) => path.join(temporary, name));
}

test(
  "Windows rollback rejects a replaced backup instead of restoring unrelated data",
  windowsPublish,
  async () => {
    await withPublishFixture(async ({ root, staging, runtime, temporary }) => {
      const displaced = path.join(root, "displaced-original");
      await assert.rejects(
        runtimePackaging.publishAgentRuntime({
          root,
          staging,
          rename: async (source: string, destination: string) => {
            if (source === staging) {
              const [backup] = await retainedBackups(temporary);
              await fs.rename(backup, displaced);
              await fs.mkdir(backup);
              await fs.writeFile(
                path.join(backup, "identity.txt"),
                "unrelated",
              );
              throw filesystemError("EACCES");
            }
            await fs.rename(source, destination);
          },
        }),
        /rollback failed/i,
      );
      assert.equal(await fs.lstat(runtime).catch(() => null), null);
      assert.equal(await identity(staging), "new-runtime");
      assert.equal(await identity(displaced), "old-runtime");
      const [backup] = await retainedBackups(temporary);
      assert.equal(await identity(backup), "unrelated");
    });
  },
);

test(
  "Windows publication retains the previous runtime after successful replacement",
  windowsPublish,
  async () => {
    await withPublishFixture(async ({ root, staging, runtime, temporary }) => {
      await runtimePackaging.publishAgentRuntime({ root, staging });
      assert.equal(await identity(runtime), "new-runtime");
      const backups = await retainedBackups(temporary);
      assert.equal(backups.length, 1);
      assert.equal(await identity(backups[0]), "old-runtime");
      assert.equal(await fs.lstat(staging).catch(() => null), null);
    });
  },
);

test(
  "Windows publication retries transient EPERM and EBUSY without rebuilding the candidate",
  windowsPublish,
  async () => {
    await withPublishFixture(async ({ root, staging, runtime, temporary }) => {
      let attempts = 0;
      await runtimePackaging.publishAgentRuntime({
        root,
        staging,
        rename: async (source: string, destination: string) => {
          if (source === staging && ++attempts < 3)
            throw filesystemError(attempts === 1 ? "EPERM" : "EBUSY");
          await fs.rename(source, destination);
        },
      });
      assert.equal(await identity(runtime), "new-runtime");
      assert.equal(attempts, 3);
      const backups = await retainedBackups(temporary);
      assert.equal(backups.length, 1);
      assert.equal(await identity(backups[0]), "old-runtime");
    });
  },
);

test(
  "Windows publication restores the old runtime after bounded transient failures",
  windowsPublish,
  async () => {
    await withPublishFixture(async ({ root, staging, runtime, temporary }) => {
      let attempts = 0;
      const started = Date.now();
      await assert.rejects(
        runtimePackaging.publishAgentRuntime({
          root,
          staging,
          rename: async (source: string, destination: string) => {
            if (source === staging) {
              attempts++;
              throw filesystemError("EPERM");
            }
            await fs.rename(source, destination);
          },
        }),
      );
      assert.equal(await identity(runtime).catch(() => null), "old-runtime");
      assert.equal(await identity(staging), "new-runtime");
      assert.equal((await retainedBackups(temporary)).length, 0);
      assert.ok(attempts > 1 && attempts <= 5);
      assert.ok(Date.now() - started < 6_000);
    });
  },
);

test(
  "Windows publication does not retry permanent failures and still restores the old runtime",
  windowsPublish,
  async () => {
    await withPublishFixture(async ({ root, staging, runtime }) => {
      let attempts = 0;
      await assert.rejects(
        runtimePackaging.publishAgentRuntime({
          root,
          staging,
          rename: async (source: string, destination: string) => {
            if (source === staging) {
              attempts++;
              throw filesystemError("EACCES");
            }
            await fs.rename(source, destination);
          },
        }),
      );
      assert.equal(attempts, 1);
      assert.equal(await identity(runtime).catch(() => null), "old-runtime");
      assert.equal(await identity(staging), "new-runtime");
    });
  },
);

test(
  "Windows publication preserves a target created during retry and keeps both candidates",
  windowsPublish,
  async () => {
    await withPublishFixture(async ({ root, staging, runtime, temporary }) => {
      let attempts = 0;
      let externalIdentity: number | undefined;
      await assert.rejects(
        runtimePackaging.publishAgentRuntime({
          root,
          staging,
          rename: async (source: string, destination: string) => {
            if (source === staging) {
              attempts++;
              await fs.mkdir(runtime);
              externalIdentity = (await fs.lstat(runtime)).ino;
              await fs.rename(source, destination);
            }
            await fs.rename(source, destination);
          },
        }),
      );
      assert.equal(attempts, 1);
      assert.equal((await fs.lstat(runtime)).ino, externalIdentity);
      assert.deepEqual(await fs.readdir(runtime), []);
      assert.equal(await identity(staging), "new-runtime");
      const backups = await retainedBackups(temporary);
      assert.equal(backups.length, 1);
      assert.equal(await identity(backups[0]), "old-runtime");
    });
  },
);

test(
  "Windows publication retains staging and backup when rollback also fails",
  windowsPublish,
  async () => {
    await withPublishFixture(async ({ root, staging, runtime, temporary }) => {
      await assert.rejects(
        runtimePackaging.publishAgentRuntime({
          root,
          staging,
          rename: async (source: string, destination: string) => {
            if (source === staging) throw filesystemError("EPERM");
            if (path.basename(source).startsWith("agent-runtime-previous-"))
              throw filesystemError("EACCES");
            await fs.rename(source, destination);
          },
        }),
        /rollback failed/i,
      );
      assert.equal(await fs.lstat(runtime).catch(() => null), null);
      assert.equal(await identity(staging), "new-runtime");
      const backups = await retainedBackups(temporary);
      assert.equal(backups.length, 1);
      assert.equal(await identity(backups[0]), "old-runtime");
    });
  },
);

test(
  "Windows publication rejects unowned staging before moving the old runtime",
  windowsPublish,
  async () => {
    await withPublishFixture(async ({ root, runtime, temporary }) => {
      const unowned = path.join(
        root,
        "agent-runtime-00000000-0000-4000-8000-000000000000",
      );
      await fs.mkdir(unowned);
      await fs.writeFile(path.join(unowned, "identity.txt"), "outside-staging");
      await assert.rejects(
        runtimePackaging.publishAgentRuntime({ root, staging: unowned }),
        /owned staging/i,
      );
      assert.equal(await identity(runtime), "old-runtime");
      assert.equal(await identity(unowned), "outside-staging");
      assert.equal((await retainedBackups(temporary)).length, 0);
    });
  },
);

test(
  "Windows publication rejects a linked runtime without touching its destination",
  windowsPublish,
  async () => {
    await withPublishFixture(async ({ root, staging, runtime, temporary }) => {
      const external = path.join(root, "external-runtime");
      await fs.rename(runtime, external);
      await fs.symlink(external, runtime, "junction");
      await assert.rejects(
        runtimePackaging.publishAgentRuntime({ root, staging }),
        /link/i,
      );
      assert.equal(await identity(external), "old-runtime");
      assert.equal(await identity(staging), "new-runtime");
      assert.equal((await retainedBackups(temporary)).length, 0);
    });
  },
);

test("packaging requires the current Codex platform dependency and executable version/help", async () => {
  const sandbox = await fs.mkdtemp(
    path.join(os.tmpdir(), "kk-agent-codex-package-"),
  );
  const agent = path.join(sandbox, "vendor");
  const platformPackage =
    "@openai/codex-" + process.platform + "-" + process.arch;
  async function write(relative: string, content: string) {
    const target = path.join(agent, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content);
  }
  async function pack(name: string) {
    return packageAgentRuntime({
      agent,
      target: path.join(sandbox, name),
      node: process.execPath,
      nodeLicense: path.join(agent, "LICENSE"),
    });
  }
  try {
    await write(
      "package.json",
      JSON.stringify({
        name: "fixture-agent",
        version: "1",
        dependencies: { "@openai/codex": "1" },
      }),
    );
    await write("dist/index.js", "export {}");
    await write("agent-instructions.md", "fixture");
    await write("LICENSE", "fixture");
    await write(
      "node_modules/@openai/codex/package.json",
      JSON.stringify({
        name: "@openai/codex",
        version: "1.0.0",
        type: "module",
        optionalDependencies: {
          [platformPackage]: "1",
          "@openai/codex-unsupported": "1",
        },
      }),
    );
    await write("node_modules/@openai/codex/bin/codex.js", "process.exit(1)");
    // A partial package directory must not be silently skipped as optional.
    await write(
      "node_modules/" + platformPackage + "/vendor/bin/codex",
      "fixture",
    );
    await assert.rejects(
      pack("missing-platform"),
      /Missing Codex runtime dependency/,
    );
    assert.equal(
      await fs
        .stat(path.join(sandbox, "missing-platform/runtime-manifest.json"))
        .catch(() => null),
      null,
    );
    await write(
      "node_modules/" + platformPackage + "/package.json",
      JSON.stringify({ name: platformPackage, version: "1.0.0" }),
    );
    await assert.rejects(
      pack("invalid-executable"),
      /Packaged Codex version\/help verification failed/,
    );
    assert.equal(
      await fs
        .stat(path.join(sandbox, "invalid-executable/runtime-manifest.json"))
        .catch(() => null),
      null,
    );
    await write(
      "node_modules/@openai/codex/bin/codex.js",
      [
        'if (process.argv[2] === "--version") console.log("codex-cli 1.0.0");',
        'else if (process.argv[2] === "login") console.log("Usage: codex login");',
        'else if (process.argv[2] === "app-server") console.log("Usage: codex app-server --stdio");',
        "else process.exit(1);",
      ].join("\n"),
    );
    const result = await pack("complete");
    assert.ok(
      result.files.some(
        (file: { path: string }) =>
          file.path ===
          "agent/node_modules/" + platformPackage + "/package.json",
      ),
    );
    assert.equal(
      result.files.some((file: { path: string }) =>
        file.path.includes("codex-unsupported"),
      ),
      false,
    );
    await write(
      "node_modules/@openai/codex/bin/codex.js",
      [
        'if (process.argv[2] === "--version") console.log("codex-cli 1.0.0");',
        "else process.exit(1);",
      ].join("\n"),
    );
    await assert.rejects(
      pack("invalid-help"),
      /Packaged Codex version\/help verification failed/,
    );
  } finally {
    // Allow bounded cleanup retries for Windows executable locks.
    await fs.rm(sandbox, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
  }
});
