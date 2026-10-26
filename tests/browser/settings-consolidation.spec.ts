import { expect, test } from "@playwright/test";
import {
  openSettingsSection,
  selectSettingsSection,
  showSettingsCategories,
} from "./helpers";
import { readFile } from "node:fs/promises";

test("设置分类按用途分组，移除独立使用记录与 ComfyUI 入口", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page
      .getByRole("navigation", { name: "主导航" })
      .getByRole("button", { name: "ComfyUI 工作流", exact: true }),
  ).toHaveCount(0);
  await openSettingsSection(page, "通用设置");
  const nav = await showSettingsCategories(page);
  await expect(nav.locator(".settings-nav-group-label")).toHaveText([
    "软件系统",
    "账号与用量",
    "核心功能",
    "安全与数据",
  ]);
  await expect(nav.getByRole("button")).toHaveText([
    "通用设置",
    "快捷键管理",
    "软件更新",
    "个人主页",
    "套餐与积分",
    "模型接入",
    "记忆管理",
    "扩展与 MCP",
    "网络与代理",
    "数据管理",
    "安全中心",
  ]);
  await selectSettingsSection(page, "套餐与积分");
  await expect(
    page.getByRole("heading", { name: "使用记录", exact: true }),
  ).toBeVisible();
  await expect(page.locator("[data-usage-state]")).toBeVisible();
  await expect(page.locator(".settings-content")).toContainText(
    "套餐与积分服务尚未接入",
  );
  await selectSettingsSection(page, "通用设置");
  await expect(page.locator(".settings-content")).toContainText("软件更新");
});

for (const width of [390, 1099, 1920]) {
  test(`分类与紧凑设置在实际页面内可见可点 ${width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
    await page.goto("/");
    await openSettingsSection(page, "通用设置");
    const panel = page.locator(".settings-panel");
    await page.getByLabel("主题外观", { exact: true }).selectOption("light");
    await selectSettingsSection(page, "快捷键管理");
    await expect(
      page.getByRole("heading", { name: "快捷键管理", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("搜索快捷键...", { exact: true }),
    ).toBeVisible();
    await selectSettingsSection(page, "个人主页");
    await expect(page.locator(".settings-content")).toContainText("本地创作者");
    await expect(page.locator(".settings-content")).toContainText(
      "本地离线模式",
    );
    await selectSettingsSection(page, "通用设置");
    await expect(page.getByLabel("主题外观", { exact: true })).toHaveValue(
      "light",
    );
    const geometry = await panel.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const content = element.querySelector(".settings-content")!;
      const input = content.querySelector("select")!;
      return {
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        viewport: { width: innerWidth, height: innerHeight },
        overflow: content.scrollWidth - content.clientWidth,
        inputHeight: input.getBoundingClientRect().height,
        loadedScripts: [...document.scripts]
          .map((script) => script.src)
          .filter(Boolean),
        theme: document.documentElement.dataset.theme,
      };
    });
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(width);
    expect(geometry.bottom).toBeLessThanOrEqual(width === 390 ? 844 : 1080);
    expect(geometry.overflow).toBeLessThanOrEqual(1);
    expect([32, 40]).toContain(geometry.inputHeight);
    expect(
      geometry.loadedScripts.some((script) =>
        script.includes("/assets/index-"),
      ),
    ).toBe(true);
    await info.attach(`settings-geometry-${width}`, {
      body: JSON.stringify(geometry, null, 2),
      contentType: "application/json",
    });
    await page.screenshot({
      path: info.outputPath(`settings-consolidated-${width}.png`),
      animations: "disabled",
    });
  });
}

test("本地检测仅点击后执行，网页明确需要本机能力", async ({ page }) => {
  await page.goto("/");
  await openSettingsSection(page, "模型接入");
  await page
    .getByRole("tab", { name: "本地模型 Offline", exact: true })
    .click();
  const hardware = page.getByRole("region", { name: "电脑配置与本地模型推荐" });
  await expect(
    hardware.getByText("当前网页无法直接检测电脑配置", { exact: false }),
  ).toHaveCount(0);
  await hardware
    .getByRole("button", { name: "检测电脑配置", exact: true })
    .click();
  await expect(hardware.getByRole("status")).toContainText(
    "请在桌面版使用本机检测",
  );
  await expect(
    page.getByRole("combobox", { name: "认证方式", exact: true }),
  ).toHaveValue("none");
  await expect(page.getByLabel("接口地址", { exact: true })).toHaveValue(
    "http://127.0.0.1:8080/v1",
  );
});

test("硬件快照建议与本地草稿在连续缩放中保留，不发起安装或推理", async ({
  page,
}, info) => {
  const calls: string[] = [];
  await page.exposeFunction("__recordHardwareCall", (command: string) =>
    calls.push(command),
  );
  await page.goto("/");
  await openSettingsSection(page, "模型接入");
  await page
    .getByRole("tab", { name: "本地模型 Offline", exact: true })
    .click();
  await page.evaluate(() => {
    Object.assign(window, {
      isTauri: true,
      __TAURI_INTERNALS__: {
        invoke: async (command: string) => {
          await (
            window as unknown as {
              __recordHardwareCall: (command: string) => Promise<void>;
            }
          ).__recordHardwareCall(command);
          if (command === "agent_runtime_status")
            return {
              available: false,
              running: false,
              healthy: false,
              reason: "只读 UI 夹具，不启动 Agent",
            };
          if (command !== "detect_local_hardware")
            throw new Error("unexpected IPC fixture");
          return {
            version: 1,
            status: "supported",
            platform: "windows",
            measuredAtMs: Date.now(),
            cpu: { name: "Hardware UI fixture", logicalCores: 24 },
            memory: {
              usableBytes: 64 * 1024 ** 3,
              availableBytes: 40 * 1024 ** 3,
            },
            os: { name: "Windows fixture", architecture: "x86_64" },
            gpus: [
              {
                name: "GPU UI fixture",
                dedicatedBytes: 17_094_934_528,
                freeBytes: 12 * 1024 ** 3,
                driverVersion: "610.88",
                computeCapability: "12.0",
                computeBackend: "cuda-reported",
              },
            ],
            disks: [
              {
                drive: "C:",
                totalBytes: 1000 * 1024 ** 3,
                freeBytes: 300 * 1024 ** 3,
              },
            ],
            errors: [],
          };
        },
      },
    });
  });
  expect(calls).toEqual([]);
  await page.getByRole("button", { name: "检测电脑配置", exact: true }).click();
  await expect(
    page.getByText("Hardware UI fixture", { exact: true }),
  ).toBeVisible();
  expect(
    calls.filter((command) => command === "detect_local_hardware"),
  ).toHaveLength(1);
  expect(
    calls.every((command) =>
      ["detect_local_hardware", "agent_runtime_status"].includes(command),
    ),
  ).toBe(true);
  await page.getByRole("radio", { name: /Qwen3.8-27B/ }).check();
  await page.getByText("H3 视频模型候选", { exact: true }).click();
  await expect(page.locator(".settings-content")).toContainText("64.73 GB");
  await expect(page.locator(".settings-content")).toContainText(
    "容量符合作者建议 · 待实测",
  );
  await expect(
    page.getByRole("button", { name: "安装服务未接入", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("提供商", { exact: true }).fill("本地草稿需要保留");
  for (const width of [1099, 767, 480, 390, 900, 1920]) {
    await page.setViewportSize({ width, height: width <= 767 ? 844 : 1080 });
    await expect(page.getByLabel("提供商", { exact: true })).toHaveValue(
      "本地草稿需要保留",
    );
    await expect(
      page.getByRole("radio", { name: /Qwen3.8-27B/ }),
    ).toBeChecked();
    expect(
      await page
        .locator(".settings-content")
        .evaluate((element) => element.scrollWidth - element.clientWidth),
    ).toBeLessThanOrEqual(1);
  }
  await page.getByLabel("提供商", { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({
    path: info.outputPath("settings-local-hardware-draft.png"),
    animations: "disabled",
  });
  expect(
    calls.filter((command) => command === "detect_local_hardware"),
  ).toHaveLength(1);
  expect(
    calls.every((command) =>
      ["detect_local_hardware", "agent_runtime_status"].includes(command),
    ),
  ).toBe(true);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "Hardware UI fixture",
  );
});

test("原工作流可导出，取消删除与保存失败不丢记录", async ({ page }, info) => {
  const workflow = {
    id: "kept-workflow",
    name: "保留工作流",
    description: "original",
    source: "imported",
    tags: [],
    workflow: {
      "1": { class_type: "SaveImage", inputs: { filename_prefix: "keep" } },
    },
    createdAt: 1,
    updatedAt: 1,
  };
  await page.addInitScript(
    (record) =>
      localStorage.setItem(
        "kk-studio.comfyui.workflows.v1",
        JSON.stringify([record]),
      ),
    workflow,
  );
  await page.goto("/");
  await openSettingsSection(page, "模型接入");
  await page
    .getByRole("tab", { name: "本地模型 Offline", exact: true })
    .click();
  await page.getByText("ComfyUI 工作流 · 1 个", { exact: true }).click();
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "导出 保留工作流", exact: true })
    .click();
  const download = await downloadEvent;
  const output = info.outputPath("kept-workflow.json");
  await download.saveAs(output);
  expect(JSON.parse(await readFile(output, "utf8"))).toEqual(workflow.workflow);
  await page
    .getByRole("button", { name: "删除 保留工作流", exact: true })
    .click();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await expect(page.getByText("保留工作流", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "kk-studio.comfyui.workflows.v1")
        throw new DOMException("fixture quota", "QuotaExceededError");
      set.call(this, key, value);
    };
  });
  await page
    .getByRole("button", { name: "删除 保留工作流", exact: true })
    .click();
  await page.getByRole("button", { name: "确认删除", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("删除未能保存");
  await expect(page.getByText("保留工作流", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("kk-studio.comfyui.workflows.v1")!),
    ),
  ).toEqual([workflow]);
  await expect(
    page.getByRole("button", { name: "运行未接通", exact: true }),
  ).toBeDisabled();
});

test("硬件检测失败保留本地草稿并释放导航锁，不显示底层路径", async ({
  page,
}) => {
  await page.goto("/");
  await openSettingsSection(page, "模型接入");
  await page
    .getByRole("tab", { name: "本地模型 Offline", exact: true })
    .click();
  await page.getByLabel("提供商", { exact: true }).fill("检测失败也要保留");
  await page.evaluate(() => {
    Object.assign(window, {
      isTauri: true,
      __TAURI_INTERNALS__: {
        invoke: async (command: string) => {
          if (command === "agent_runtime_status")
            return { available: false, running: false, healthy: false };
          throw new Error("C:\\private-fixture\\fixture-token");
        },
      },
    });
  });
  await page.getByRole("button", { name: "检测电脑配置", exact: true }).click();
  const hardware = page.getByRole("region", { name: "电脑配置与本地模型推荐" });
  await expect(hardware.getByRole("alert")).toContainText(
    "本机硬件检测不可用，请重试",
  );
  await expect(page.getByLabel("提供商", { exact: true })).toHaveValue(
    "检测失败也要保留",
  );
  await expect(
    page.getByRole("button", { name: "关闭设置", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".settings-panel")).not.toContainText(
    "private-fixture",
  );
});

for (const existingChat of [false, true]) {
  test(`本地对话编辑器不改写已有 ComfyUI 连接与旧认证状态 ${existingChat}`, async ({
    page,
  }) => {
    const comfy = {
      id: "preserved-comfy",
      provider: "既有 Comfy",
      kind: "local_comfyui",
      displayName: "既有 Comfy",
      baseUrl: "http://127.0.0.1:8188",
      capabilities: {
        modalities: ["image"],
        operations: ["generate"],
        async: true,
      },
      state: "active",
      concurrencyLimit: 1,
    };
    const chat = {
      ...comfy,
      id: "preserved-chat",
      provider: "既有本地对话",
      displayName: "既有本地对话",
      kind: "user_byok",
      baseUrl: "http://127.0.0.1:1234/v1",
      credentialRef: "preserved_local_ref",
      model: "qwen-kept",
      capabilities: {
        modalities: ["text"],
        operations: ["chat"],
        async: false,
      },
    };
    const connections = existingChat ? [comfy, chat] : [comfy];
    await page.addInitScript(
      ({ connections, comfy }) => {
        localStorage.setItem(
          "kk-studio-next:provider-connections:v1",
          JSON.stringify(connections),
        );
        localStorage.setItem(
          "kk-studio-next:model-provider:v1",
          JSON.stringify({
            version: 1,
            connectionId: comfy.id,
            name: comfy.provider,
            baseUrl: comfy.baseUrl,
            model: "legacy-comfy-model",
          }),
        );
      },
      { connections, comfy },
    );
    await page.goto("/");
    await openSettingsSection(page, "模型接入");
    await page
      .getByRole("tab", { name: "本地模型 Offline", exact: true })
      .click();
    await expect(page.getByLabel("提供商", { exact: true })).toHaveValue(
      existingChat ? chat.provider : "本地对话服务",
    );
    await expect(page.getByLabel("接口地址", { exact: true })).toHaveValue(
      existingChat ? chat.baseUrl : "http://127.0.0.1:8080/v1",
    );
    await expect(
      page.getByRole("combobox", { name: "认证方式", exact: true }),
    ).toHaveValue(existingChat ? "api-key" : "none");
    const listed = page.locator('.provider-connection-list [role="listitem"]');
    await expect(listed).toHaveCount(existingChat ? 1 : 0);
    await expect(listed.filter({ hasText: "既有 Comfy" })).toHaveCount(0);
    expect(
      await page.evaluate(() =>
        JSON.parse(
          localStorage.getItem("kk-studio-next:provider-connections:v1")!,
        ),
      ),
    ).toEqual(connections);
  });
}
