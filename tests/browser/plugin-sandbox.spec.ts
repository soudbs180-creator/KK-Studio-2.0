import { expect, test } from "@playwright/test";
import { build } from "esbuild";
import path from "node:path";

let harness: string;
test.beforeAll(async () => {
  const result = await build({
    entryPoints: [path.resolve("tests/support/pluginSandboxHarness.ts")],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    globalName: "PluginSandboxHarness",
  });
  harness = result.outputFiles[0].text;
});

test("experimental T1 isolates the host and blocks HTTP/script/navigation while enforcing RPC grants", async ({
  page,
}, info) => {
  let escapes = 0;
  const consoleMessages: string[] = [];
  page.on("console", (message) => consoleMessages.push(message.text()));
  await page.route("https://escape.invalid/**", async (route) => {
    escapes++;
    await route.fulfill({ body: "escape" });
  });
  await page.goto("/");
  await page.addScriptTag({ content: harness });
  await page.evaluate(() => {
    const source = `
      (async () => {
        const probe = {};
        try { parent.document.body; } catch { probe.parentBlocked = true; }
        try { top.localStorage.getItem('canvas-plugins'); } catch { probe.hostStorageBlocked = true; }
        try { localStorage.setItem('escape', 'no'); } catch { probe.ownStorageBlocked = true; }
        probe.ipcAbsent = !window.__TAURI_INTERNALS__ && !window.__TAURI__;
        try { await fetch('https://escape.invalid/fetch'); } catch { probe.fetchBlocked = true; }
        const script = document.createElement('script');
        script.nonce = document.querySelector('script').nonce;
        script.src = 'https://escape.invalid/script'; document.body.append(script);
        const img = new Image(); img.src = 'https://escape.invalid/image';
        try {
          await new Promise((resolve, reject) => {
            const worker = new Worker(URL.createObjectURL(new Blob(['postMessage("executed");fetch("https://escape.invalid/worker")'])));
            worker.onerror = event => { event.preventDefault(); worker.terminate(); resolve(); };
            worker.onmessage = () => { worker.terminate(); reject(new Error('Worker executed')); };
          });
          probe.workerBlocked = true;
        } catch (error) { probe.workerBlocked = error.name === 'SecurityError'; }
        probe.nodes = await KKPlugin.request('canvas.read');
        try { await KKPlugin.request('ai.text', { prompt: 'unauthorized' }); }
        catch (error) { probe.denied = error.message; }
        top.postMessage({ channel: 'kk-plugin-rpc', token: document.querySelector('script').nonce,
          body: JSON.stringify({ id:'spoofed', method:'node.patch', params:{title:'escape'} }) }, '*');
        document.body.textContent = JSON.stringify(probe);
      })();`;
    (window as unknown as { sandboxTest: unknown }).sandboxTest = (
      window as unknown as {
        PluginSandboxHarness: {
          start(code: string, grants: string[]): unknown;
        };
      }
    ).PluginSandboxHarness.start(source, ["canvas:read"]);
  });
  const guest = page
    .frameLocator('[data-testid="plugin-security-frame"]')
    .frameLocator("iframe");
  await expect(guest.locator("body")).toContainText('"parentBlocked":true');
  await expect(guest.locator("body")).toContainText(
    '"hostStorageBlocked":true',
  );
  await expect(guest.locator("body")).toContainText('"ownStorageBlocked":true');
  await expect(guest.locator("body")).toContainText('"ipcAbsent":true');
  await expect(guest.locator("body")).toContainText('"fetchBlocked":true');
  await expect(guest.locator("body")).toContainText('"workerBlocked":true');
  await expect(guest.locator("body")).toContainText('"fixture-node"');
  await expect(guest.locator("body")).toContainText("未获授权");
  expect(escapes).toBe(0);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { sandboxTest: { calls: string[] } }).sandboxTest
          .calls,
    ),
  ).toEqual(["read"]);
  await info.attach("sandbox-probe", {
    body: (await guest.locator("body").textContent())!,
    contentType: "application/json",
  });
  await guest.locator("body").evaluate(() => {
    location.href = "https://escape.invalid/navigation";
  });
  await expect
    .poll(() =>
      page.frames().some((frame) => frame.url().startsWith("chrome-error://")),
    )
    .toBe(true);
  await info.attach("sandbox-console", {
    body: JSON.stringify(consoleMessages),
    contentType: "application/json",
  });
  expect(escapes).toBe(0);
  await expect(
    page.getByRole("button", { name: "打开设置", exact: true }),
  ).toBeVisible();
  await page.evaluate(() =>
    (window as unknown as { sandboxTest: { stop(): void } }).sandboxTest.stop(),
  );
  await expect(page.getByTestId("plugin-security-frame")).toHaveCount(0);
});

test("verified package mounts through the real loader and reads the latest host context", async ({
  page,
}) => {
  await page.goto("/");
  await page.addScriptTag({ content: harness });
  await page.evaluate(async () => {
    const source = `
      const button = document.createElement('button'); button.textContent = 'Read canvas';
      const output = document.createElement('output');
      button.onclick = async () => { output.textContent = JSON.stringify(await KKPlugin.request('canvas.read')); };
      document.body.append(button, output);`;
    (window as unknown as { packageTest: unknown }).packageTest = await (
      window as unknown as {
        PluginSandboxHarness: {
          startInstalled(code: string): Promise<unknown>;
        };
      }
    ).PluginSandboxHarness.startInstalled(source);
  });
  const outer = page.getByTestId("plugin-package-host").locator("iframe");
  const guest = page
    .frameLocator('[data-testid="plugin-package-host"] > iframe')
    .frameLocator("iframe");
  await guest.getByRole("button", { name: "Read canvas" }).click();
  await expect(guest.locator("output")).toContainText("initial");
  const document = await outer.getAttribute("srcdoc");
  await page.evaluate(() =>
    (
      window as unknown as { packageTest: { update(): void } }
    ).packageTest.update(),
  );
  await guest.getByRole("button", { name: "Read canvas" }).click();
  await expect(guest.locator("output")).toContainText("updated");
  expect(await outer.getAttribute("srcdoc")).toBe(document);
  await page.evaluate(() =>
    (
      window as unknown as { packageTest: { stop(): Promise<void> } }
    ).packageTest.stop(),
  );
  await expect(page.getByTestId("plugin-package-host")).toHaveCount(0);
});
