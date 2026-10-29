import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import path from "node:path";
declare global {
  interface Window {
    ComfyCanvasHarness: typeof import("../support/comfyCanvasHarness.tsx");
    comfyHarness: Awaited<
      ReturnType<typeof import("../support/comfyCanvasHarness.tsx").mount>
    >;
  }
}
const png =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=";
test("P6.1 fixture: choose root, open/return native frame, archive output once and persist its result edge", async ({
  page,
}, info) => {
  let client = "",
    prompts = 0,
    polls = 0;
  const history: Record<string, unknown> = {};
  await page.route("http://127.0.0.1:8188/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      headers = {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      };
    if (req.method() === "OPTIONS") {
      await route.fulfill({
        headers: {
          ...headers,
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        },
        body: "{}",
      });
      return;
    }
    if (url.pathname === "/prompt") {
      prompts++;
      const body = req.postDataJSON();
      client = body.client_id;
      history["job-" + prompts] = {
        prompt: [0, "job-" + prompts, body.prompt, { client_id: client }],
        status: { completed: true },
        outputs: {
          "3": {
            images: [
              { filename: "result-" + prompts + ".png", type: "output" },
            ],
          },
        },
      };
      history.other = {
        prompt: [0, "other", {}, { client_id: "unrelated" }],
        outputs: {
          "3": { images: [{ filename: "wrong.png", type: "output" }] },
        },
      };
      await route.fulfill({
        headers,
        body: JSON.stringify({ prompt_id: "job-" + prompts }),
      });
    } else if (url.pathname.startsWith("/history")) {
      polls++;
      await route.fulfill({ headers, body: JSON.stringify(history) });
    } else if (url.pathname === "/view")
      await route.fulfill({
        headers: { ...headers, "Content-Type": "image/png" },
        body: Buffer.from(png, "base64"),
      });
    else
      await route.fulfill({
        headers: { ...headers, "Content-Type": "text/html" },
        body: '<html><body><h1>ComfyUI native fixture</h1><input aria-label="Workflow prompt"><button id="queue">Queue Prompt</button><script>document.querySelector("#queue").onclick=()=>fetch("/prompt",{method:"POST",body:JSON.stringify({client_id:window.name,prompt:{}})});</script></body></html>',
      });
  });
  const bundle = await build({
    entryPoints: [path.resolve("tests/support/comfyCanvasHarness.tsx")],
    bundle: true,
    write: false,
    format: "iife",
    globalName: "ComfyCanvasHarness",
    loader: { ".css": "empty" },
    define: { "import.meta.env.VITE_CAPABILITIES_INPAINT": "false" },
  });
  await page.goto("/");
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.evaluate(async () => {
    window.comfyHarness = await window.ComfyCanvasHarness.mount();
  });
  const host = page.locator("#comfy-harness");
  await expect(host.getByTestId("comfy-workflow-node")).toBeVisible();
  await host.getByRole("button", { name: "选择目录", exact: true }).click();
  await expect(
    host.getByRole("button", { name: "进入工作流", exact: true }),
  ).toBeEnabled();
  await host.getByRole("button", { name: "进入工作流", exact: true }).click();
  await expect(
    page
      .frameLocator('iframe[title="ComfyUI 原生编辑器"]')
      .getByText("ComfyUI native fixture"),
  ).toBeVisible();
  await page
    .frameLocator('iframe[title="ComfyUI 原生编辑器"]')
    .getByLabel("Workflow prompt")
    .fill("preserve unsaved workflow");
  await page.getByRole("button", { name: "← 返回画布", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "ComfyUI 原生工作流" }),
  ).toHaveCount(0);
  await host.getByRole("button", { name: "快速生成", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.comfyHarness.state().items.filter((i) => i.kind === "image")
            .length,
      ),
    )
    .toBe(1);
  expect(prompts).toBe(1);
  const state = await page.evaluate(() => window.comfyHarness.state());
  expect(state.canvas.edges).toEqual([
    expect.objectContaining({ source: "comfy-card", kind: "result" }),
  ]);
  const output = state.items.find((i) => i.kind === "image")!;
  expect(output.assetId).toMatch(/^asset-/);
  expect(output.comfyWorkflowSourceId).toBe("comfy-card");
  expect(output.preview).toBe(`data:image/png;base64,${png}`);
  await info.attach("persisted-before-reload", {
    body: JSON.stringify(
      await page.evaluate(() => window.comfyHarness.durable()),
    ),
    contentType: "application/json",
  });
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.comfyHarness.reload().projects[0].items.some((i) => i.assetId),
      ),
    )
    .toBe(true);
  await host.getByRole("button", { name: "进入工作流", exact: true }).click();
  await expect(
    page
      .frameLocator('iframe[title="ComfyUI 原生编辑器"]')
      .getByLabel("Workflow prompt"),
  ).toHaveValue("preserve unsaved workflow");
  await page
    .frameLocator('iframe[title="ComfyUI 原生编辑器"]')
    .getByRole("button", { name: "Queue Prompt" })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.comfyHarness.state().items.filter((i) => i.kind === "image")
            .length,
      ),
    )
    .toBe(2);
  expect(client).toMatch(/-editor$/);
  expect(prompts).toBe(2);
  await page.getByRole("button", { name: "← 返回画布", exact: true }).click();
  const before = polls;
  await expect.poll(() => polls).toBeGreaterThan(before);
  expect(
    (await page.evaluate(() => window.comfyHarness.state())).canvas.edges,
  ).toHaveLength(2);
  await page.screenshot({ path: info.outputPath("comfy-card-output.png") });
  await info.attach("canvas-state", {
    body: JSON.stringify(state),
    contentType: "application/json",
  });
  await host
    .getByRole("button", { name: "从ComfyUI 工作流添加下游", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "ComfyUI 工作流", exact: true })
    .click();
  await expect(host.getByTestId("comfy-workflow-node")).toHaveCount(2);
  const afterAdd = await page.evaluate(() => window.comfyHarness.state());
  const next = afterAdd.items.find(
    (i) => i.comfyWorkflow && i.id !== "comfy-card",
  );
  await expect
    .poll(
      async () =>
        (await page.evaluate(() => window.comfyHarness.state())).canvas.edges,
    )
    .toContainEqual(
      expect.objectContaining({ source: "comfy-card", target: next!.id }),
    );
  const resultId = output.id;
  const node = host.getByTestId(`canvas-node-${resultId}`);
  await node.focus();
  await node.press("Delete");
  await expect(node).toHaveCount(0);
  const beforeDeleteReplay = polls;
  await expect.poll(() => polls).toBeGreaterThan(beforeDeleteReplay);
  expect(
    (await page.evaluate(() => window.comfyHarness.state())).items.some(
      (item) => item.id === resultId,
    ),
  ).toBe(false);
  await page.evaluate(() => window.comfyHarness.flush());
  const restored = await page.evaluate(
    () => window.comfyHarness.reload().projects[0],
  );
  expect(
    restored.items.find((item) => item.id === "comfy-card")?.comfyWorkflow
      ?.dismissedOutputIds,
  ).toContain(resultId);
  await page.evaluate(() => window.comfyHarness.reopen());
  const beforeReopenReplay = polls;
  await expect.poll(() => polls).toBeGreaterThan(beforeReopenReplay);
  expect(
    (await page.evaluate(() => window.comfyHarness.state())).items.some(
      (item) => item.id === resultId,
    ),
  ).toBe(false);
  await page.evaluate(() => window.comfyHarness.close());
});
