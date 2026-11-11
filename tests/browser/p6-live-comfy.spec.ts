import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import path from "node:path";

const liveEnabled = process.env.KK_RUN_LIVE_COMFY === "1";
const comfyUrl = (process.env.KK_COMFY_URL ?? "http://127.0.0.1:18188").replace(
  /\/+$/,
  "",
);
test.describe.configure({ retries: 0 });

async function readLiveJson(pathname: string) {
  try {
    const response = await fetch(`${comfyUrl}${pathname}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok)
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    return await response.json();
  } catch (error) {
    throw new Error(
      `无法访问已运行的 ComfyUI（${comfyUrl}${pathname}）：${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

test("P6.1 live SD15 ComfyUI output is archived onto the canvas", async ({
  page,
}, info) => {
  test.skip(
    !liveEnabled,
    "真实 ComfyUI 测试默认跳过；设置 KK_RUN_LIVE_COMFY=1 后显式启用",
  );
  const checkpoint = process.env.KK_COMFY_CHECKPOINT;
  expect(
    checkpoint,
    "启用真实 ComfyUI 测试时必须设置 KK_COMFY_CHECKPOINT",
  ).toBeTruthy();
  await readLiveJson("/system_stats");
  const objectInfo = await readLiveJson("/object_info/CheckpointLoaderSimple");
  const checkpoints =
    objectInfo?.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0];
  expect(
    checkpoints,
    "ComfyUI 未返回 CheckpointLoaderSimple checkpoint 列表",
  ).toEqual(expect.arrayContaining([checkpoint]));

  await page.route(`${comfyUrl}/**`, async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "Content-Type",
        "access-control-allow-methods": "GET,POST,OPTIONS",
      },
    });
  });
  const bundle = await build({
    entryPoints: [path.resolve("tests/support/comfyCanvasLiveHarness.tsx")],
    bundle: true,
    write: false,
    format: "iife",
    globalName: "ComfyCanvasHarness",
    loader: { ".css": "empty" },
    define: {
      "import.meta.env.VITE_CAPABILITIES_INPAINT": "false",
      __COMFY_URL__: JSON.stringify(comfyUrl),
      __COMFY_CHECKPOINT__: JSON.stringify(checkpoint),
    },
  });
  await page.goto("/");
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.evaluate(async () => {
    // @ts-expect-error evidence-only harness global
    window.comfyHarness = await window.ComfyCanvasHarness.mount();
  });
  const host = page.locator("#comfy-harness");
  await expect(host.getByTestId("comfy-workflow-node")).toBeVisible();
  await host.getByRole("button", { name: "选择目录", exact: true }).click();
  await expect(
    host.getByRole("button", { name: "快速生成", exact: true }),
  ).toBeEnabled();
  await host.getByRole("button", { name: "快速生成", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await page.evaluate(() => window.comfyHarness.state())).items.filter(
          (item) => item.kind === "image",
        ).length,
      { timeout: 180_000, intervals: [2000, 4000, 8000] },
    )
    .toBe(1);
  const state = await page.evaluate(() => window.comfyHarness.state());
  const output = state.items.find((item) => item.kind === "image");
  expect(output?.assetId).toMatch(/^asset-/);
  expect(output?.comfyWorkflowSourceId).toBe("comfy-card");
  expect(state.canvas.edges).toContainEqual(
    expect.objectContaining({
      source: "comfy-card",
      target: output?.id,
      kind: "result",
    }),
  );
  await page.evaluate(() => window.comfyHarness.flush());
  await page.screenshot({
    path: info.outputPath("sd15-live-canvas.png"),
    fullPage: true,
  });
  await info.attach("sd15-live-canvas-state", {
    body: JSON.stringify(state),
    contentType: "application/json",
  });
  console.log(
    JSON.stringify({
      boundary: "external ComfyUI endpoint archive path only",
      outputId: output?.id,
      assetId: output?.assetId,
      edges: state.canvas.edges,
    }),
  );
});
