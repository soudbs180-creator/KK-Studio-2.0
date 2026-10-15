import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chromium } from "@playwright/test";
import config from "../../playwright.config.ts";

assert.equal(
  process.platform,
  "win32",
  "This regression requires Windows Edge",
);
const browser = await chromium.launch({
  channel: config.use.channel,
  ...config.use.launchOptions,
  args: [...(config.use.launchOptions?.args ?? []), "--enable-automation"],
});
try {
  const session = await browser.newBrowserCDPSession();
  const command = await session.send("Browser.getBrowserCommandLine");
  const switches = command.arguments.filter((arg) =>
    arg.startsWith("--disable-features="),
  );
  assert.equal(
    switches.length,
    1,
    "conflicting feature switches overwrite defaults",
  );
  const disabled = new Set(switches[0].split("=")[1].split(","));
  assert(
    disabled.has("msWindowTabManagerPublic"),
    "headless tests must not register Shell tab proxies",
  );
  for (const feature of [
    "AvoidUnnecessaryBeforeUnloadCheckSync",
    "ThirdPartyStoragePartitioning",
    "msForceBrowserSignIn",
    "msEdgeUpdateLaunchServicesPreferredVersion",
  ]) {
    assert(disabled.has(feature), `Playwright default ${feature} was lost`);
  }
  assert(command.arguments.includes("--headless"));
  const page = await browser.newPage();
  await page.setContent("<title>KK owned headless launch regression</title>");
  const { processInfo } = await session.send("SystemInfo.getProcessInfo");
  const renderers = processInfo.filter(
    (process) => process.type === "renderer",
  );
  assert(renderers.length > 0);
  for (const renderer of renderers) {
    assert(Number.isSafeInteger(renderer.id));
    const rendererCommand = execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `Get-CimInstance Win32_Process -Filter "ProcessId=${renderer.id}" | Select-Object -ExpandProperty CommandLine`,
      ],
      { encoding: "utf8", windowsHide: true, timeout: 10_000 },
    );
    const effective = rendererCommand
      .match(/--disable-features=(\S+)/)?.[1]
      .split(",");
    assert(effective, "Owned renderer must expose its effective features");
    for (const feature of disabled) {
      assert(effective.includes(feature), `Renderer lost ${feature}`);
    }
  }
  console.log(
    JSON.stringify({
      passed: true,
      disabledFeatures: [...disabled],
      renderers: renderers.length,
    }),
  );
} finally {
  await browser.close();
}
