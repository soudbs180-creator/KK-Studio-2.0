import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { prepareProductionAgent } from "../../scripts/agent/production-install.mjs";

test("production install copies only locked inputs and leaves source dependencies untouched", async () => {
  const sandbox = await fs.mkdtemp(
    path.join(os.tmpdir(), "kk-agent-production-"),
  );
  const source = path.join(sandbox, "source");
  try {
    await fs.mkdir(path.join(source, "dist"), { recursive: true });
    for (const name of [
      "package.json",
      "package-lock.json",
      "agent-instructions.md",
      ".env",
    ])
      await fs.writeFile(path.join(source, name), name);
    await fs.writeFile(path.join(source, "dist/index.js"), "compiled");
    await fs.mkdir(path.join(source, "node_modules"));
    await fs.writeFile(path.join(source, "node_modules/existing"), "preserved");
    let called = false;
    const staging = await prepareProductionAgent({
      agent: source,
      temporaryRoot: path.join(sandbox, "temporary"),
      npmCli: "fixture-npm.js",
      run: async (
        command: string,
        args: string[],
        options: { cwd: string },
      ) => {
        called = true;
        assert.equal(command, process.execPath);
        assert.deepEqual(args, [
          "fixture-npm.js",
          "ci",
          "--omit=dev",
          "--ignore-scripts",
          "--no-audit",
          "--no-fund",
        ]);
        assert.notEqual(options.cwd, source);
        assert.equal(
          await fs.readFile(
            path.join(options.cwd, "package-lock.json"),
            "utf8",
          ),
          "package-lock.json",
        );
        assert.equal(
          await fs.stat(path.join(options.cwd, ".env")).catch(() => null),
          null,
        );
        assert.equal(
          await fs
            .stat(path.join(options.cwd, "node_modules"))
            .catch(() => null),
          null,
        );
        return { stdout: "fixture", stderr: "" };
      },
    });
    assert.equal(called, true);
    assert.equal(
      await fs.readFile(path.join(staging, "dist/index.js"), "utf8"),
      "compiled",
    );
    assert.equal(
      await fs.readFile(path.join(source, "node_modules/existing"), "utf8"),
      "preserved",
    );
    await assert.rejects(
      prepareProductionAgent({
        agent: source,
        temporaryRoot: path.join(sandbox, "temporary"),
        run: async () => {
          throw new Error("private registry echo");
        },
      }),
      (error: Error) => !error.message.includes("private registry echo"),
    );
  } finally {
    await fs.rm(sandbox, { recursive: true, force: true });
  }
});
