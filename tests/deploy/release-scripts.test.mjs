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
