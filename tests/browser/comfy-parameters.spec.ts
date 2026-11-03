import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import path from "node:path";
import type {} from "./comfy-workflow.spec.ts";

test("workflow parameters synchronize both panels and restore without the global registry", async ({
  page,
}, info) => {
  const bundle = await build({
    entryPoints: [path.resolve("tests/support/comfyCanvasHarness.tsx")],
    bundle: true,
    write: false,
    format: "iife",
    globalName: "ComfyCanvasHarness",
    loader: { ".css": "empty" },
  });
  await page.goto("/");
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.evaluate(async () => {
    window.comfyHarness = await window.ComfyCanvasHarness.mount({
      positive: { class_type: "CLIPTextEncode", inputs: { text: "cat" } },
      negative: { class_type: "CLIPTextEncode", inputs: { text: "blur" } },
      size: {
        class_type: "EmptyLatentImage",
        inputs: { width: 512, height: 768 },
      },
      sampler: {
        class_type: "KSampler",
        inputs: {
          positive: ["positive", 0],
          negative: ["negative", 0],
          seed: 42,
          steps: 20,
          sampler_name: "euler",
        },
      },
      model: {
        class_type: "CheckpointLoaderSimple",
        inputs: { ckpt_name: "sd15.safetensors" },
      },
    });
  });
  const host = page.locator("#comfy-harness");
  const card = host.getByTestId("canvas-node-comfy-card");
  await card.focus();
  await card.press("Enter");
  const properties = host.getByRole("region", { name: "节点属性" });
  await expect(properties).toBeVisible();
  const node = card.getByTestId("comfy-workflow-node");
  await node.locator(".comfy-node-parameters summary").click();
  await node
    .getByRole("textbox", { name: /正向提示词/ })
    .fill("blue glass sphere");
  await expect(
    properties.getByRole("textbox", { name: /正向提示词/ }),
  ).toHaveValue("blue glass sphere");
  await properties.getByRole("spinbutton", { name: /Seed/ }).fill("123456");
  await expect(node.getByRole("spinbutton", { name: /Seed/ })).toHaveValue(
    "123456",
  );
  await page.evaluate(async () => {
    await window.comfyHarness.flush();
    localStorage.removeItem("kk-studio.comfyui.workflows.v1");
    window.comfyHarness.reopen();
  });
  await card.focus();
  await card.press("Enter");
  await expect(
    properties.getByRole("textbox", { name: /正向提示词/ }),
  ).toHaveValue("blue glass sphere");
  await expect(
    properties.getByRole("spinbutton", { name: /Seed/ }),
  ).toHaveValue("123456");
  await expect(
    card.getByRole("combobox", { name: "选择 ComfyUI 工作流" }),
  ).toContainText("Fixture API workflow");
  const restored = await page.evaluate(
    () => window.comfyHarness.state().items[0].comfyWorkflow?.snapshot,
  );
  expect(restored?.workflow.sampler.inputs?.negative).toEqual(["negative", 0]);
  await page.screenshot({ path: info.outputPath("parameters-restored.png") });
  await info.attach("restored-workflow", {
    body: JSON.stringify(restored),
    contentType: "application/json",
  });
  await page.evaluate(() => window.comfyHarness.close());
});
