import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildManifest,
  deploy,
  packageRelease,
  quotePosix,
} from "../../deploy/release.mjs";

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "kk-deploy-test-"));
  const dist = path.join(root, "dist");
  const out = path.join(root, "out");
  await mkdir(path.join(dist, "assets"), { recursive: true });
  await writeFile(
    path.join(dist, "index.html"),
    "<html><body>Prototype</body></html>\n",
  );
  await writeFile(path.join(dist, "assets", "app.js"), "console.log('ok');\n");
  return { root, dist, out };
}

test("manifest has stable hashes and excludes no files silently", async () => {
  const { dist } = await fixture();
  const manifest = await buildManifest(dist, "test-release");
  assert.equal(manifest.kind, "kk-studio-web-static-prototype");
  assert.deepEqual(
    manifest.files.map((file) => file.path),
    ["assets/app.js", "index.html"],
  );
  assert.match(manifest.files[0].sha256, /^[a-f0-9]{64}$/);
});

test("packaging emits archive and verification sidecars", async () => {
  const { dist, out } = await fixture();
  const result = await packageRelease({ dist, out, release: "test-release" });
  const hashes = await readFile(result.hashesPath, "utf8");
  const archiveHash = await readFile(result.archiveHashPath, "utf8");
  const archiveEntries = execFileSync(
    process.platform === "win32" ? "tar.exe" : "tar",
    ["-tzf", result.archivePath],
    { encoding: "utf8" },
  );
  assert.match(result.archivePath, /test-release\.tar\.gz$/);
  assert.match(archiveEntries, /index\.html/);
  assert.match(archiveEntries, /manifest\.json/);
  assert.match(archiveEntries, /manifest\.sha256/);
  assert.match(hashes, /^[a-f0-9]{64}  assets\/app\.js/m);
  assert.match(hashes, /^[a-f0-9]{64}  index\.html/m);
  assert.equal(
    archiveHash,
    `${createHash("sha256")
      .update(await readFile(result.archivePath))
      .digest("hex")}  ${path.basename(result.archivePath)}\n`,
  );
});

test("deploying a recovered archive uses its verified bytes without dist", async () => {
  const { dist, out } = await fixture();
  const packaged = await packageRelease({ dist, out, release: "test-release" });
  const result = await deploy({
    archive: packaged.archivePath,
    host: "staging.example.invalid",
    user: "deploy",
    path: "/srv/kk-studio-next",
    release: "test-release",
    dryRun: true,
  });
  assert.equal(result.archivePath, packaged.archivePath);
  assert.equal(result.archiveHashPath, packaged.archiveHashPath);
  assert.ok(
    result.commands.some((command) => command.includes(".tar.gz.sha256")),
  );
  assert.ok(
    result.commands.some((command) => command.includes("sha256sum -c")),
  );
});

test("recovered archive with a damaged byte is refused before upload", async () => {
  const { dist, out } = await fixture();
  const packaged = await packageRelease({ dist, out, release: "test-release" });
  await writeFile(packaged.archivePath, "damaged archive");
  await assert.rejects(
    () =>
      deploy({
        archive: packaged.archivePath,
        host: "staging.example.invalid",
        user: "deploy",
        path: "/srv/kk-studio-next",
        release: "test-release",
        dryRun: true,
      }),
    /archive SHA-256 mismatch/,
  );
});

test("deploy refuses ambiguous archive and dist inputs", async () => {
  await assert.rejects(
    () =>
      deploy({
        archive: "saved.tar.gz",
        dist: "dist",
        host: "staging.example.invalid",
        user: "deploy",
        path: "/srv/kk-studio-next",
        release: "test-release",
        dryRun: true,
      }),
    /either --archive or --dist/,
  );
});

test("deploy rejects root aliases before staging an archive", async () => {
  const { dist, out } = await fixture();
  const packaged = await packageRelease({ dist, out, release: "test-release" });
  for (const remotePath of ["/", "//", "/tmp/..", "/srv/./app"]) {
    await assert.rejects(
      () =>
        deploy({
          archive: packaged.archivePath,
          host: "staging.example.invalid",
          user: "deploy",
          path: remotePath,
          release: "test-release",
          dryRun: true,
        }),
      /remote root/i,
    );
  }
});

test("deploy preflights staging directories against symlinks", async () => {
  const { dist, out } = await fixture();
  const packaged = await packageRelease({ dist, out, release: "test-release" });
  const result = await deploy({
    archive: packaged.archivePath,
    host: "staging.example.invalid",
    user: "deploy",
    path: "/srv/kk-studio-next",
    release: "test-release",
    dryRun: true,
  });
  assert.match(result.commands[0], /test ! -L .*incoming/);
  assert.match(result.commands[0], /test ! -L .*releases/);
});

test("same release deployments use distinct staging and bind the archive digest", async () => {
  const firstFiles = await fixture();
  const secondFiles = await fixture();
  await writeFile(
    path.join(secondFiles.dist, "index.html"),
    "<html>different bytes</html>\n",
  );
  const firstPackage = await packageRelease({
    dist: firstFiles.dist,
    out: firstFiles.out,
    release: "test-release",
  });
  const secondPackage = await packageRelease({
    dist: secondFiles.dist,
    out: secondFiles.out,
    release: "test-release",
  });
  const options = {
    host: "staging.example.invalid",
    user: "deploy",
    path: "/srv/kk-studio-next",
    release: "test-release",
    dryRun: true,
  };
  const first = await deploy({ ...options, archive: firstPackage.archivePath });
  const second = await deploy({
    ...options,
    archive: secondPackage.archivePath,
  });
  const stagedPath = /incoming\/test-release-[a-f0-9]{24}/;
  const firstStage = first.commands[1].match(stagedPath)?.[0];
  const secondStage = second.commands[1].match(stagedPath)?.[0];
  assert.ok(firstStage);
  assert.ok(secondStage);
  assert.notEqual(firstStage, secondStage);
  assert.match(first.commands[0], /mkdir -m 700/);
  assert.ok(
    first.commands.slice(1, 5).every((command) => command.includes(firstStage)),
  );
  assert.notEqual(firstPackage.archiveSha256, secondPackage.archiveSha256);
  assert.ok(first.commands[4].includes(firstPackage.archiveSha256));
  assert.ok(second.commands[4].includes(secondPackage.archiveSha256));
  assert.ok(!first.commands[4].includes(secondPackage.archiveSha256));
  assert.match(first.commands[4], /rmdir -- .*incoming\/test-release-/);
});

test("concurrent dist deployments keep independent local archives", async () => {
  const firstFiles = await fixture();
  const secondFiles = await fixture();
  await writeFile(
    path.join(secondFiles.dist, "index.html"),
    "<html>second build</html>\n",
  );
  const options = {
    out: firstFiles.out,
    host: "staging.example.invalid",
    user: "deploy",
    path: "/srv/kk-studio-next",
    release: "test-release",
    dryRun: true,
  };
  const [first, second] = await Promise.all([
    deploy({ ...options, dist: firstFiles.dist }),
    deploy({ ...options, dist: secondFiles.dist }),
  ]);
  assert.notEqual(first.archivePath, second.archivePath);
  assert.notEqual(first.archiveSha256, second.archiveSha256);
  for (const deployed of [first, second]) {
    assert.equal(
      createHash("sha256")
        .update(await readFile(deployed.archivePath))
        .digest("hex"),
      deployed.archiveSha256,
    );
    assert.ok(deployed.commands[4].includes(deployed.archiveSha256));
  }
});

test("shell quoting prevents remote path injection", () => {
  assert.equal(
    quotePosix("/srv/a path/it's-safe"),
    "'/srv/a path/it'\\''s-safe'",
  );
});

test("sensitive files are rejected before packaging", async () => {
  const { dist } = await fixture();
  await writeFile(
    path.join(dist, ".env.production"),
    "SECRET=do-not-package\n",
  );
  await assert.rejects(
    () => buildManifest(dist, "test-release"),
    /sensitive-looking/,
  );
});
