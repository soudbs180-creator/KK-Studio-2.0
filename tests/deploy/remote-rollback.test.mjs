import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import {
  mkdtemp,
  mkdir,
  readFile,
  readlink,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(
  new URL("../../deploy/remote-rollback.sh", import.meta.url),
);
const shell = "/bin/sh";
// Windows needs symlink privilege for this real filesystem test; Linux CI runs it.
const shellAvailable = process.platform !== "win32" && existsSync(shell);

function rollback(root, expected, target) {
  return execFileSync(shell, [script, root, expected, target], {
    encoding: "utf8",
    stdio: "pipe",
  });
}

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "kk-rollback-test-"));
  for (const release of ["release-a", "release-b"]) {
    const directory = path.join(root, "releases", release);
    await mkdir(directory, { recursive: true });
    const html = `<html>${release}</html>\n`;
    await writeFile(path.join(directory, "index.html"), html);
    await writeFile(path.join(directory, "manifest.json"), "{}\n");
    await writeFile(
      path.join(directory, "manifest.sha256"),
      `${createHash("sha256").update(html).digest("hex")}  index.html\n`,
    );
  }
  await symlink("releases/release-b", path.join(root, "current"));
  await symlink("releases/release-a", path.join(root, "previous"));
  return root;
}

test(
  "rollback switches only to a verified named release",
  { skip: !shellAvailable },
  async () => {
    const root = await fixture();
    assert.match(rollback(root, "release-b", "release-a"), /rolled back/);
    assert.equal(
      await readlink(path.join(root, "current")),
      "releases/release-a",
    );
    assert.equal(
      await readlink(path.join(root, "previous")),
      "releases/release-b",
    );
    assert.match(
      await readFile(path.join(root, "current", "index.html"), "utf8"),
      /release-a/,
    );
  },
);

test(
  "rollback refuses stale current and damaged target without changing links",
  { skip: !shellAvailable },
  async () => {
    const root = await fixture();
    assert.throws(() => rollback(root, "release-a", "release-a"));
    assert.equal(
      await readlink(path.join(root, "current")),
      "releases/release-b",
    );
    await writeFile(
      path.join(root, "releases", "release-a", "index.html"),
      "damaged\n",
    );
    assert.throws(() => rollback(root, "release-b", "release-a"));
    assert.equal(
      await readlink(path.join(root, "current")),
      "releases/release-b",
    );
    assert.equal(
      await readlink(path.join(root, "previous")),
      "releases/release-a",
    );
  },
);

test(
  "rollback refuses traversal and release symlink targets",
  { skip: !shellAvailable },
  async () => {
    const root = await fixture();
    assert.throws(() => rollback(root, "release-b", "../release-a"));
    await symlink(
      path.join(root, "releases", "release-a"),
      path.join(root, "releases", "escape"),
    );
    assert.throws(() => rollback(root, "release-b", "escape"));
    assert.equal(
      await readlink(path.join(root, "current")),
      "releases/release-b",
    );
  },
);
