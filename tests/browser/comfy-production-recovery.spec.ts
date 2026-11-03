import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import path from "node:path";

async function bundle() {
  return (
    await build({
      entryPoints: [path.resolve("tests/support/comfyProductionHarness.tsx")],
      bundle: true,
      write: false,
      format: "iife",
      globalName: "ComfyProductionHarness",
      loader: { ".css": "empty" },
    })
  ).outputFiles[0].text;
}

test("failed editor load never overwrites the card when returning", async ({
  page,
}) => {
  await page.goto("/");
  await page.addScriptTag({ content: await bundle() });
  await page.evaluate(() =>
    (
      window as unknown as { ComfyProductionHarness: { mountEditor(): void } }
    ).ComfyProductionHarness.mountEditor(),
  );
  const host = page.locator("#comfy-production-harness");
  await expect(host.getByTestId("message")).toContainText(
    "fixture graph load rejected",
  );
  await host.getByRole("button", { name: "返回测试画布" }).click();
  await expect(host.getByTestId("back")).toHaveText("true");
  await expect(host.getByTestId("saved")).toHaveText("0");
});

test("reopening image settings retains scale, prompt, explicit binding and custom graph", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem(
      "kk-studio-next:provider-connections:v1",
      JSON.stringify([
        {
          id: "local-fixture",
          provider: "ComfyUI",
          displayName: "Fixture",
          kind: "local_comfyui",
          authMode: "none",
          baseUrl: "http://127.0.0.1:18189",
          state: "active",
          concurrencyLimit: 1,
          capabilities: {
            modalities: ["image"],
            operations: ["generate"],
            maxOutputs: 16,
            async: true,
          },
        },
      ]),
    ),
  );
  await page.route("http://127.0.0.1:18189/object_info/**", (route) =>
    route.fulfill({ contentType: "application/json", body: "{}" }),
  );
  await page.addScriptTag({ content: await bundle() });
  await page.evaluate(() => {
    const w = window as unknown as {
      ComfyProductionHarness: { mountCapability(): unknown };
      capabilityHarness: unknown;
    };
    w.capabilityHarness = w.ComfyProductionHarness.mountCapability();
  });
  const dialog = page.getByRole("dialog", { name: "高清修复", exact: true });
  await expect(dialog.getByLabel("放大倍数")).toHaveValue("4");
  await expect(dialog.getByLabel("编辑描述")).toHaveValue("saved description");
  await expect(dialog.getByLabel("图片编辑工作流")).toContainText(
    "已保存的画布配置",
  );
  await dialog.getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByRole("button", { name: "重新打开", exact: true }).click();
  await expect(dialog.getByLabel("放大倍数")).toHaveValue("4");
  await dialog.getByRole("button", { name: "提交任务", exact: true }).click();
  await expect(dialog.getByRole("status")).toContainText(
    "fixture request captured",
  );
  const submitted = await page.evaluate(() =>
    (
      window as unknown as {
        capabilityHarness: {
          submitted(): {
            imageCapability: {
              workflow: { bindings: unknown; nodes: Record<string, unknown> };
              parameters: unknown;
            };
          };
        };
      }
    ).capabilityHarness.submitted(),
  );
  expect(submitted.imageCapability.parameters).toEqual({ scale: 4 });
  expect(submitted.imageCapability.workflow.bindings.image).toEqual({
    nodeId: "1",
    input: "image",
  });
  expect(submitted.imageCapability.workflow.nodes.other).toBeTruthy();
});
