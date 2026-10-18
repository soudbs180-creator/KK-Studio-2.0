import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const entryFile = new URL("../../deploy/initial-web-entry.js", import.meta.url);
const builderFile = new URL(
  "../../deploy/build-combined-web.mjs",
  import.meta.url,
);
const desktopHtml =
  '<!doctype html><html><head><meta name="viewport" content="width=device-width"><script type="module" src="/assets/desktop.js"></script></head><body><div id="root"></div></body></html>';

async function entryContext(browser) {
  const context = vm.createContext({ URL, ...browser });
  vm.runInContext(await readFile(entryFile, "utf8"), context);
  return context;
}

test("initial entry selects Mobile for phone UA including landscape, or a narrow initial viewport", async () => {
  const { selectInitialWebEntry: select } = await entryContext();
  for (const userAgent of ["Mozilla iPhone", "Mozilla Android", "Mozilla iPad"])
    assert.equal(
      select({ href: "https://kkai.plus/", userAgent, width: 1920 }),
      "/mobile/",
    );
  assert.equal(
    select({ href: "https://kkai.plus/", userAgent: "Desktop", width: 767 }),
    "/mobile/",
  );
  for (const width of [768, 1920, 0, -1, undefined, NaN])
    assert.equal(
      select({ href: "https://kkai.plus/", userAgent: "Desktop", width }),
      null,
    );
});

test("desktop recovery override, existing Mobile routes and Desktop deep links never redirect", async () => {
  const { selectInitialWebEntry: select } = await entryContext();
  for (const relative of [
    "/?view=desktop",
    "/?view=mobile&view=desktop",
    "/mobile",
    "/mobile/",
    "/mobile/chat/abc?draft=1#latest",
    "/projects/abc",
    "/assets/desktop.js",
  ])
    assert.equal(
      select({
        href: `https://kkai.plus${relative}`,
        userAgent: "iPhone",
        width: 390,
      }),
      null,
      relative,
    );
  assert.equal(
    select({
      href: "https://kkai.plus/index.html?draft=a%2Fb&lang=zh#project-1",
      userAgent: "iPhone",
      width: 844,
    }),
    "/mobile/?draft=a%2Fb&lang=zh#project-1",
  );
  for (const href of ["invalid", "file:///index.html", "javascript:alert(1)"])
    assert.equal(select({ href, userAgent: "iPhone", width: 390 }), null);
});

test("browser entry replaces only the initial document without registering resize or touching storage", async () => {
  const replaced = [];
  const window = {
    location: {
      href: "https://kkai.plus/?draft=1#last",
      replace: (value) => replaced.push(value),
    },
    innerWidth: 390,
    navigator: { userAgent: "Desktop" },
  };
  await entryContext({
    window,
    document: { documentElement: { clientWidth: 390 } },
  });
  assert.deepEqual(replaced, ["/mobile/?draft=1#last"]);
  window.innerWidth = 1920;
  assert.deepEqual(replaced, ["/mobile/?draft=1#last"]);
});

test("Expo deployment base matches the selector and is not a prefix of any internal Mobile route", async () => {
  const config = await readFile(
    new URL("../../mobile/app.config.ts", import.meta.url),
    "utf8",
  );
  const base = /baseUrl:\s*["']([^"']+)["']/.exec(config)?.[1];
  assert.ok(base, "Mobile baseUrl must be explicit");
  const { selectInitialWebEntry: select } = await entryContext();
  assert.equal(
    select({ href: "https://kkai.plus/", userAgent: "iPhone", width: 844 }),
    `${base}/`,
  );
  const app = fileURLToPath(new URL("../../mobile/src/app", import.meta.url));
  for (const entry of await readdir(app, {
    recursive: true,
    withFileTypes: true,
  })) {
    if (
      !entry.isFile() ||
      !entry.name.endsWith(".tsx") ||
      /^[+_]/.test(entry.name)
    )
      continue;
    const segments = path
      .relative(app, path.join(entry.parentPath, entry.name))
      .replace(/\.tsx$/, "")
      .split(path.sep)
      .filter((segment) => !segment.startsWith("("));
    if (segments.at(-1) === "index") segments.pop();
    const route = `/${segments.join("/")}`;
    assert.equal(
      route.startsWith(base),
      false,
      `Expo SDK 57 would strip ${base} from internal route ${route}`,
    );
  }
});

async function fixture(t, { failure = false, wrongBase = false } = {}) {
  const root = await mkdtemp(path.join(tmpdir(), "kk-combined-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const dist = path.join(root, "dist");
  const mobile = path.join(root, "mobile");
  const cli = path.join(mobile, "node_modules", "expo", "bin");
  await mkdir(path.join(dist, "assets"), { recursive: true });
  await mkdir(cli, { recursive: true });
  await writeFile(path.join(dist, "index.html"), desktopHtml);
  await writeFile(
    path.join(dist, "assets", "desktop.js"),
    "desktop-user-data-contract",
  );
  await writeFile(
    path.join(cli, "cli"),
    `
const fs = require('node:fs'); const path = require('node:path');
const args = process.argv.slice(2);
if (${failure}) process.exit(7);
if (args[0] !== 'export' || args[1] !== '--platform' || args[2] !== 'web' || process.env.EXPO_NO_DOTENV !== '1') process.exit(8);
const out = args[args.indexOf('--output-dir') + 1];
fs.mkdirSync(path.join(out, '_expo'), { recursive: true });
fs.writeFileSync(path.join(out, 'index.html'), '<html><head><script src="${wrongBase ? "/_expo/entry.js" : "/mobile/_expo/entry.js"}"></script></head><body>Independent Mobile</body></html>');
fs.writeFileSync(path.join(out, '_expo', 'entry.js'), 'mobile-app');
`,
  );
  return { root, dist, mobile };
}

test("combined export preserves Desktop assets, adds a prefixed independent Mobile app and a no-JS explanation", async (t) => {
  const { buildCombinedWeb } = await import(builderFile);
  const { dist, mobile } = await fixture(t);
  await buildCombinedWeb({ dist, mobile });
  const html = await readFile(path.join(dist, "index.html"), "utf8");
  assert.ok(
    html.indexOf('name="viewport"') <
      html.indexOf('src="/kk-initial-entry.js"'),
  );
  assert.ok(
    html.indexOf('src="/kk-initial-entry.js"') <
      html.indexOf('src="/assets/desktop.js"'),
  );
  assert.match(
    html,
    /<noscript>[\s\S]*href="\/mobile\/"[\s\S]*href="\/\?view=desktop"/,
  );
  assert.equal(
    await readFile(path.join(dist, "assets", "desktop.js"), "utf8"),
    "desktop-user-data-contract",
  );
  assert.match(
    await readFile(path.join(dist, "mobile", "index.html"), "utf8"),
    /src="\/mobile\/_expo\/entry.js"/,
  );
  assert.equal(
    await readFile(path.join(dist, "kk-initial-entry.js"), "utf8"),
    await readFile(entryFile, "utf8"),
  );
  await assert.rejects(buildCombinedWeb({ dist, mobile }), /already|exists/i);
});

test("failed export or unprefixed Mobile resources leave the original Desktop build intact", async (t) => {
  const { buildCombinedWeb } = await import(builderFile);
  for (const option of [{ failure: true }, { wrongBase: true }]) {
    const { dist, mobile } = await fixture(t, option);
    await assert.rejects(buildCombinedWeb({ dist, mobile }));
    assert.equal(
      await readFile(path.join(dist, "index.html"), "utf8"),
      desktopHtml,
    );
    await assert.rejects(readFile(path.join(dist, "mobile", "index.html")), {
      code: "ENOENT",
    });
  }
});

test("combined builder CLI rejects unknown arguments without exporting", () => {
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(builderFile), "--unknown", "x"],
    { encoding: "utf8" },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Expected optional --dist and --mobile paths/);
});

test("formal release builds both independent entries before the existing manifest and SSH activation", async () => {
  const workflow = await readFile(
    new URL("../../.github/workflows/web-release.yml", import.meta.url),
    "utf8",
  );
  const mobileInstall = workflow.indexOf(
    "npm ci --prefix mobile --ignore-scripts",
  );
  const desktopBuild = workflow.indexOf("npm run build");
  const combinedBuild = workflow.indexOf("node deploy/build-combined-web.mjs");
  const packageBuild = workflow.indexOf("node deploy/package-managed-web.mjs");
  assert.ok(
    mobileInstall > 0 &&
      mobileInstall < desktopBuild &&
      desktopBuild < combinedBuild &&
      combinedBuild < packageBuild,
  );
  assert.ok(packageBuild < workflow.indexOf("secrets.KK_WEB_DEPLOY_KEY"));
  const required = JSON.parse(
    /all\((\["deploy-linux"[^\]]+\])\[\]/.exec(workflow)[1],
  );
  assert.ok(required.includes("mobile"), "Mobile quality must gate activation");
});
