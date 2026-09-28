import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { once } from "node:events";
import {
  chmod,
  mkdtemp,
  mkdir,
  rename,
  rm,
  readFile,
  readlink,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { packageRelease } from "../../deploy/release.mjs";

const script = fileURLToPath(
  new URL("../../deploy/remote-rollback.sh", import.meta.url),
);
const activateScript = fileURLToPath(
  new URL("../../deploy/remote-activate.sh", import.meta.url),
);
const shell = "/bin/sh";
// Windows needs symlink privilege for this real filesystem test; Linux CI runs it.
const shellAvailable = process.platform !== "win32" && existsSync(shell);

function rollback(root, expected, target, env = process.env) {
  return execFileSync(shell, [script, root, expected, target], {
    encoding: "utf8",
    stdio: "pipe",
    env,
  });
}

async function archiveDigest(archivePath) {
  return createHash("sha256")
    .update(await readFile(archivePath))
    .digest("hex");
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
    assert.throws(
      () => rollback(root, "release-a", "release-b"),
      (error) => {
        assert.match(String(error.stderr), /current release changed/);
        return true;
      },
    );
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
  "activation and rollback both wait for the same release lock",
  { skip: !shellAvailable },
  async () => {
    const root = await fixture();
    const holder = spawn(
      shell,
      [
        "-c",
        'exec 9>>"$1/.release.lock"; flock -x 9; printf "locked\\n"; IFS= read -r release || true',
        "hold",
        root,
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    const holderExit = once(holder, "exit");
    await once(holder.stdout, "data");
    const run = (file, args) => {
      const child = spawn(shell, [file, root, ...args], {
        stdio: ["ignore", "ignore", "pipe"],
      });
      let finished = false;
      const result = once(child, "exit").then(([code]) => {
        finished = true;
        return code;
      });
      return { result, isFinished: () => finished };
    };
    const rollbackRun = run(script, ["release-b", "release-a"]);
    const activateRun = run(activateScript, [
      "release-c",
      path.join(root, "missing.tar.gz"),
      "0".repeat(64),
    ]);
    try {
      await delay(250);
      assert.equal(rollbackRun.isFinished(), false);
      assert.equal(activateRun.isFinished(), false);
    } finally {
      holder.stdin.end();
    }
    assert.equal(await rollbackRun.result, 0);
    assert.notEqual(await activateRun.result, 0);
    assert.equal(
      await readlink(path.join(root, "current")),
      "releases/release-a",
    );
    await holderExit;
  },
);

test(
  "rollback leaves current unchanged when the previous-pointer move fails",
  { skip: !shellAvailable },
  async () => {
    const root = await fixture();
    const bin = path.join(root, "bin");
    await mkdir(bin);
    const mv = path.join(bin, "mv");
    await writeFile(
      mv,
      '#!/bin/sh\nif [ "$3" = "$ROLLBACK_FAIL_DEST" ]; then exit 17; fi\nexec /bin/mv "$@"\n',
    );
    await chmod(mv, 0o755);
    assert.throws(() =>
      rollback(root, "release-b", "release-a", {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        ROLLBACK_FAIL_DEST: path.join(root, "previous"),
      }),
    );
    assert.equal(
      await readlink(path.join(root, "current")),
      "releases/release-b",
    );
  },
);

test(
  "rollback refuses traversal and release symlink targets",
  { skip: !shellAvailable },
  async () => {
    const root = await fixture();
    assert.throws(() => rollback(root, "release-b", "../release-a"));
    assert.throws(() => rollback("//", "release-b", "release-a"));
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

test(
  "activation preserves current and unrelated previous files or directories",
  { skip: !shellAvailable },
  async () => {
    for (const kind of ["file", "directory"]) {
      const root = await fixture();
      const dist = path.join(root, "dist");
      await mkdir(dist);
      await writeFile(path.join(dist, "index.html"), "<html>new</html>\n");
      const packaged = await packageRelease({
        dist,
        out: path.join(root, "out"),
        release: "release-c",
      });
      const digest = await archiveDigest(packaged.archivePath);
      await rm(path.join(root, "previous"));
      if (kind === "file")
        await writeFile(path.join(root, "previous"), "keep this file\n");
      else {
        await mkdir(path.join(root, "previous"));
        await writeFile(
          path.join(root, "previous", "keep.txt"),
          "keep this directory\n",
        );
      }
      assert.throws(() =>
        execFileSync(shell, [
          activateScript,
          root,
          "release-c",
          packaged.archivePath,
          digest,
        ]),
      );
      assert.equal(
        await readlink(path.join(root, "current")),
        "releases/release-b",
      );
      const preserved =
        kind === "file"
          ? path.join(root, "previous")
          : path.join(root, "previous", "keep.txt");
      assert.match(await readFile(preserved, "utf8"), /keep this/);
    }
  },
);

test(
  "activation and rollback reject a releases directory symlink",
  { skip: !shellAvailable },
  async () => {
    const root = await fixture();
    const dist = path.join(root, "dist");
    await mkdir(dist);
    await writeFile(path.join(dist, "index.html"), "<html>new</html>\n");
    const packaged = await packageRelease({
      dist,
      out: path.join(root, "out"),
      release: "release-c",
    });
    const digest = await archiveDigest(packaged.archivePath);
    const external = path.join(root, "external-releases");
    await rename(path.join(root, "releases"), external);
    await symlink(external, path.join(root, "releases"));
    assert.throws(() => rollback(root, "release-b", "release-a"));
    assert.throws(() =>
      execFileSync(shell, [
        activateScript,
        root,
        "release-c",
        packaged.archivePath,
        digest,
      ]),
    );
    assert.equal(
      await readlink(path.join(root, "current")),
      "releases/release-b",
    );
    assert.equal(existsSync(path.join(external, "release-c")), false);
  },
);

test(
  "activation binds the archive digest under the release lock",
  { skip: !shellAvailable },
  async () => {
    const root = await fixture();
    const dist = path.join(root, "dist");
    await mkdir(dist);
    await writeFile(path.join(dist, "index.html"), "<html>new</html>\n");
    const packaged = await packageRelease({
      dist,
      out: path.join(root, "out"),
      release: "release-c",
    });
    assert.throws(() =>
      execFileSync(shell, [
        activateScript,
        root,
        "release-c",
        packaged.archivePath,
        "0".repeat(64),
      ]),
    );
    assert.equal(
      await readlink(path.join(root, "current")),
      "releases/release-b",
    );
    const digest = await archiveDigest(packaged.archivePath);
    assert.match(
      execFileSync(
        shell,
        [activateScript, root, "release-c", packaged.archivePath, digest],
        { encoding: "utf8" },
      ),
      /activated release-c/,
    );
    assert.equal(
      await readlink(path.join(root, "current")),
      "releases/release-c",
    );
    assert.equal(
      await readlink(path.join(root, "previous")),
      "releases/release-b",
    );
  },
);
