#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repository = fileURLToPath(new URL("../", import.meta.url));
const entryFile = new URL("./initial-web-entry.js", import.meta.url);

async function mustNotExist(file) {
  try {
    await lstat(file);
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  throw new Error(
    `Combined output already exists; rebuild Desktop dist first: ${file}`,
  );
}

function desktopEntry(html) {
  const moduleScript = /<script\b[^>]*\btype=["']module["'][^>]*>/i;
  if (!moduleScript.test(html) || !/<body\b[^>]*>/i.test(html))
    throw new Error("Expected the standalone Desktop production index");
  return html
    .replace(
      moduleScript,
      '<script src="/kk-initial-entry.js"></script>\n    $&',
    )
    .replace(
      /<body\b[^>]*>/i,
      '$&\n    <noscript><p>请启用 JavaScript 使用 KK Studio。<a href="/mobile/">手机端</a> · <a href="/?view=desktop">桌面端</a></p></noscript>',
    );
}

function validateMobileIndex(html) {
  const resources = [
    ...html.matchAll(
      /<(?:script|link)\b[^>]*?\b(?:src|href)=["']([^"']+)["']/gi,
    ),
  ].map((match) => match[1]);
  if (
    !resources.some(
      (resource) =>
        resource.startsWith("/mobile/") && /\.js(?:\?|$)/.test(resource),
    ) ||
    resources.some(
      (resource) =>
        resource.startsWith("/") && !resource.startsWith("/mobile/"),
    )
  )
    throw new Error(
      "Mobile export must use experiments.baseUrl /mobile for scripts and assets",
    );
}

export async function buildCombinedWeb({
  dist = path.join(repository, "dist"),
  mobile = path.join(repository, "mobile"),
} = {}) {
  dist = path.resolve(dist);
  mobile = path.resolve(mobile);
  const info = await lstat(dist);
  if (!info.isDirectory() || info.isSymbolicLink())
    throw new Error("dist must be an ordinary directory");
  const index = path.join(dist, "index.html");
  const original = await readFile(index, "utf8");
  const combined = desktopEntry(original);
  const mobileOutput = path.join(dist, "mobile");
  const initialEntry = path.join(dist, "kk-initial-entry.js");
  await mustNotExist(mobileOutput);
  await mustNotExist(initialEntry);
  const stage = await mkdtemp(path.join(tmpdir(), "kk-mobile-web-"));
  let mobileCreated = false;
  let entryCreated = false;
  try {
    const exported = path.join(stage, "web");
    const result = spawnSync(
      process.execPath,
      [
        path.join(mobile, "node_modules", "expo", "bin", "cli"),
        "export",
        "--platform",
        "web",
        "--output-dir",
        exported,
        "--max-workers",
        "2",
      ],
      {
        cwd: mobile,
        env: { ...process.env, CI: "1", EXPO_NO_DOTENV: "1" },
        stdio: "inherit",
      },
    );
    if (result.error || result.status !== 0)
      throw new Error(
        `Mobile export failed: ${result.error?.message ?? result.status}`,
      );
    validateMobileIndex(
      await readFile(path.join(exported, "index.html"), "utf8"),
    );
    await mkdir(mobileOutput);
    mobileCreated = true;
    for (const name of await readdir(exported))
      await cp(path.join(exported, name), path.join(mobileOutput, name), {
        recursive: true,
        errorOnExist: true,
        force: false,
      });
    await writeFile(initialEntry, await readFile(entryFile), { flag: "wx" });
    entryCreated = true;
    await writeFile(index, combined);
    return {
      dist,
      mobileBaseUrl: "/mobile/",
      desktopOverride: "/?view=desktop",
      initialLoadOnly: true,
    };
  } catch (error) {
    if (entryCreated) await rm(initialEntry);
    if (mobileCreated) await rm(mobileOutput, { recursive: true, force: true });
    if ((await readFile(index, "utf8")) !== original)
      await writeFile(index, original);
    throw error;
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  try {
    const options = {};
    for (let index = 2; index < process.argv.length; index += 2) {
      const key = { "--dist": "dist", "--mobile": "mobile" }[
        process.argv[index]
      ];
      if (!key || !process.argv[index + 1] || options[key])
        throw new Error("Expected optional --dist and --mobile paths");
      options[key] = process.argv[index + 1];
    }
    console.log(JSON.stringify(await buildCombinedWeb(options)));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
