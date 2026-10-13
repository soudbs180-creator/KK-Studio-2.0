import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { packageAgentRuntime } from "../../scripts/agent/runtime-package.mjs";

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
    assert.equal(
      result.nodeExecutable,
      process.platform === "win32" ? "node.exe" : "node",
    );
    assert.equal(result.platform, process.platform);
    assert.equal(result.arch, process.arch);
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

test("runtime packaging rejects an OS or architecture different from the Node build host before writing", async () => {
  const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), "kk-agent-target-"));
  const target = path.join(sandbox, "output");
  try {
    for (const mismatch of [
      {
        platform: process.platform === "win32" ? "linux" : "win32",
        arch: process.arch,
      },
      {
        platform: process.platform,
        arch: process.arch === "x64" ? "arm64" : "x64",
      },
    ]) {
      await assert.rejects(
        packageAgentRuntime({
          agent: sandbox,
          target,
          node: process.execPath,
          ...mismatch,
        }),
        /platform or architecture/,
      );
      await assert.rejects(fs.stat(target), { code: "ENOENT" });
    }
  } finally {
    await fs.rm(sandbox, { recursive: true, force: true });
  }
});

test("runtime packaging finds the official Unix distribution license above bin and preserves its bytes", async () => {
  const sandbox = await fs.mkdtemp(
    path.join(os.tmpdir(), "kk-agent-node-license-"),
  );
  const agent = path.join(sandbox, "agent");
  const node = path.join(
    sandbox,
    "node-distribution",
    "bin",
    process.platform === "win32" ? "node.exe" : "node",
  );
  try {
    await fs.mkdir(path.join(agent, "node_modules"), { recursive: true });
    await fs.mkdir(path.join(agent, "dist"), { recursive: true });
    await fs.writeFile(path.join(agent, "dist", "index.js"), "export {};");
    await fs.writeFile(path.join(agent, "agent-instructions.md"), "fixture");
    await fs.writeFile(
      path.join(agent, "package.json"),
      JSON.stringify({ name: "fixture", version: "1", dependencies: {} }),
    );
    await fs.mkdir(path.dirname(node), { recursive: true });
    await fs.writeFile(node, "fixture", { mode: 0o700 });
    await fs.writeFile(
      path.join(path.dirname(path.dirname(node)), "LICENSE"),
      "Node distribution license fixture\n",
    );
    const target = path.join(sandbox, "output");
    await packageAgentRuntime({ agent, node, target });
    assert.equal(
      await fs.readFile(path.join(target, "NODE-LICENSE.txt"), "utf8"),
      "Node distribution license fixture\n",
    );
  } finally {
    await fs.rm(sandbox, { recursive: true, force: true });
  }
});
