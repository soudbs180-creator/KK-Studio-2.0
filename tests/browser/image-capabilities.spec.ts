import { expect, test } from "@playwright/test";
import { build } from "esbuild";
import path from "node:path";
import { createHash } from "node:crypto";
import { imageSpec } from "../fixtures/image-capability.ts";
declare global {
  interface Window {
    ImageCapabilityHarness: typeof import("../support/imageCapabilityHarness.tsx");
    capabilityTest: Awaited<
      ReturnType<typeof import("../support/imageCapabilityHarness.tsx").start>
    >;
  }
}

for (const mode of [
  "disabled",
  "upload-failure",
  "unknown",
  "cancel",
  "timeout",
] as const) {
  test(`image capability ${mode} does not fall back or submit twice`, async ({
    page,
  }) => {
    let prompts = 0,
      uploads = 0,
      cancellations = 0;
    await page.route("http://127.0.0.1:8188/**", async (route) => {
      const url = new URL(route.request().url());
      const headers = {
        "access-control-allow-origin": "*",
        "content-type": "application/json",
      };
      if (url.pathname === "/upload/image") {
        uploads++;
        await route.fulfill({
          headers,
          status: mode === "upload-failure" ? 500 : 200,
          body: JSON.stringify({ name: "original.png", type: "input" }),
        });
      } else if (url.pathname === "/prompt") {
        prompts++;
        if (mode === "unknown") await route.abort("failed");
        else
          await route.fulfill({
            headers,
            body: JSON.stringify({ prompt_id: "cancel-job" }),
          });
      } else if (url.pathname === "/api/jobs/cancel-job/cancel") {
        cancellations++;
        await route.fulfill({
          headers,
          body: JSON.stringify({ cancelled: true }),
        });
      } else await route.fulfill({ headers, body: "{}" });
    });
    await page.goto("/");
    if (mode === "timeout")
      await page.evaluate(() => {
        const original = AbortSignal.timeout.bind(AbortSignal);
        AbortSignal.timeout = (ms) => original(ms === 180_000 ? 300 : ms);
      });
    await page.addScriptTag({ content: harness });
    const reason = await page.evaluate(
      async ({ spec, source, disabled }) => {
        window.capabilityTest = await window.ImageCapabilityHarness.start(
          spec,
          source,
          disabled ? { "image.outpaint": false } : {},
        );
        return window.capabilityTest.reason;
      },
      {
        spec: imageSpec(),
        source: `data:image/png;base64,${png}`,
        disabled: mode === "disabled",
      },
    );
    if (mode === "disabled") {
      expect(reason).toBeTruthy();
      expect(
        await page.evaluate(
          () => window.capabilityTest.snapshot().projects[0].tasks.length,
        ),
      ).toBe(0);
      expect(uploads).toBe(0);
    } else {
      expect(reason).toBeUndefined();
      if (mode === "cancel") {
        await expect.poll(() => prompts).toBe(1);
        await page.evaluate(() => window.capabilityTest.cancel());
        await expect.poll(() => cancellations).toBe(1);
      }
      await expect
        .poll(() =>
          page.evaluate(
            () => window.capabilityTest.snapshot().projects[0].tasks[0]?.status,
          ),
        )
        .toBe(mode === "upload-failure" ? "failed" : "unknown");
      if (mode === "timeout") await expect.poll(() => cancellations).toBe(1);
    }
    expect(prompts).toBe(
      mode === "disabled" || mode === "upload-failure" ? 0 : 1,
    );
    await page.evaluate(() => window.capabilityTest.close());
  });
}

const png =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=";
let harness: string;
test.beforeAll(async () => {
  const result = await build({
    entryPoints: [path.resolve("tests/support/imageCapabilityHarness.tsx")],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    globalName: "ImageCapabilityHarness",
    loader: { ".css": "empty" },
    define: { "import.meta.env.VITE_CAPABILITIES_INPAINT": "false" },
  });
  harness = result.outputFiles[0].text;
});
for (const id of ["image.outpaint", "image.upscale", "image.layer-split"]) {
  test(`${id} uses the actual task queue and archives/reloads the exact capability and lineage`, async ({
    page,
  }, info) => {
    let submits = 0,
      uploads = 0;
    await page.route("http://127.0.0.1:8188/**", async (route) => {
      const request = route.request(),
        url = new URL(request.url());
      const headers = {
        "access-control-allow-origin": "*",
        "content-type": "application/json",
      };
      if (url.pathname === "/upload/image") {
        uploads++;
        await route.fulfill({
          headers,
          body: JSON.stringify({
            name: "original.png",
            subfolder: "",
            type: "input",
          }),
        });
      } else if (url.pathname === "/prompt") {
        submits++;
        const graph = request.postDataJSON().prompt;
        expect(graph["1"].inputs.image).toBe("original.png");
        expect(graph["2"].inputs.text).toBe("Exact prompt\n保留原图");
        if (id === "image.outpaint") expect(graph["2"].inputs.left).toBe(64);
        if (id === "image.upscale") expect(graph["2"].inputs.scale).toBe(2);
        await route.fulfill({
          headers,
          body: JSON.stringify({ prompt_id: "capability-job" }),
        });
      } else if (url.pathname === "/history/capability-job")
        await route.fulfill({
          headers,
          body: JSON.stringify({
            "capability-job": {
              outputs: {
                "4": { images: [{ filename: "layer-two.png" }] },
                "3": { images: [{ filename: "result.png" }] },
              },
            },
          }),
        });
      else if (url.pathname === "/view")
        await route.fulfill({
          headers: {
            "access-control-allow-origin": "*",
            "content-type": "image/png",
          },
          body: Buffer.from(png, "base64"),
        });
      else await route.fulfill({ status: 404, headers, body: "{}" });
    });
    await page.goto("/");
    await page.addScriptTag({ content: harness });
    const reason = await page.evaluate(
      async ({ spec, source }) => {
        const runtime = await window.ImageCapabilityHarness.start(spec, source);
        window.capabilityTest = runtime;
        return runtime.reason;
      },
      { spec: imageSpec(id), source: `data:image/png;base64,${png}` },
    );
    expect(reason).toBeUndefined();
    await expect
      .poll(() =>
        page.evaluate(
          () => window.capabilityTest.snapshot().projects[0].tasks[0]?.status,
        ),
      )
      .toBe("succeeded");
    const state = await page.evaluate(async () => ({
      snapshot: window.capabilityTest.snapshot(),
      reloaded: window.capabilityTest.reload(),
      assets: await window.capabilityTest.assets(),
      original: await window.capabilityTest.original(),
    }));
    const task = state.reloaded.projects[0].tasks[0];
    expect(task.imageCapability.capabilityId).toBe(id);
    expect(task.completedOutputs).toBe(id === "image.layer-split" ? 2 : 1);
    expect(submits).toBe(1);
    expect(uploads).toBe(1);
    expect(state.original.preview).toBe(`data:image/png;base64,${png}`);
    const hash = createHash("sha256")
      .update("Exact prompt\n保留原图")
      .digest("hex");
    expect(
      state.assets.some((asset) =>
        (asset.origins ?? [asset]).some(
          (origin) =>
            origin.promptHash === hash &&
            origin.parentId === state.original.assetId &&
            origin.sourceJobId === task.id,
        ),
      ),
    ).toBe(true);
    await info.attach("image-capability-state", {
      body: JSON.stringify(state),
      contentType: "application/json",
    });
    await page.evaluate(() => window.capabilityTest.close());
  });
}
