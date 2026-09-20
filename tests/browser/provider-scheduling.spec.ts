import { test, expect, type Page } from "@playwright/test";
import type { ProviderConnection } from "../../src/domain/providerConnections";
const endpoint = "https://models.example.test/v1/images/generations";
const key = "kk-studio-next:provider-connections:v1";
const pixel =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
async function configure(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("button", { name: "模型供应商", exact: true }).click();
  await page.getByLabel("API Base URL").fill("https://models.example.test/v1");
  await page.getByLabel("API Key").fill("fixture-key");
  await page.getByLabel("默认模型").fill("image-test");
  await page.getByRole("button", { name: "保存供应商" }).click();
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
}
async function change(page: Page, patch: Partial<ProviderConnection>) {
  await page.evaluate(
    ({ key, patch }) => {
      const current = JSON.parse(
        localStorage.getItem(key) ?? "[]",
      ) as ProviderConnection[];
      if (!current.length) throw new Error("Missing registry fixture");
      localStorage.setItem(
        key,
        JSON.stringify(current.map((item) => ({ ...item, ...patch }))),
      );
    },
    { key, patch },
  );
}
async function connections(page: Page) {
  return page.evaluate(
    (key) =>
      JSON.parse(localStorage.getItem(key) ?? "[]") as ProviderConnection[],
    key,
  );
}
async function submit(page: Page) {
  await page.getByLabel("生成数量").selectOption("1");
  await page.getByLabel("创作提示词").fill("保留这份测试草稿");
  await page.getByRole("button", { name: "开始创建项目" }).click();
}
async function approve(page: Page) {
  await page.getByRole("button", { name: "批准并提交" }).click();
}
async function workbench(page: Page) {
  await page.getByRole("button", { name: "打开任务列表" }).click();
  await page.getByRole("button", { name: "打开任务工作台" }).click();
}
for (const state of [
  "cooldown",
  "quarantined",
  "disabled",
  "capacity",
  "capability",
] as const) {
  test(`首页${state}不创建任务且草稿保留`, async ({ page }) => {
    let requests = 0;
    await page.route(endpoint, async (route) => {
      requests++;
      await route.fulfill({ json: { data: [{ b64_json: pixel }] } });
    });
    await configure(page);
    const original = (await connections(page))[0];
    const patch: Partial<ProviderConnection> =
      state === "capacity"
        ? { activeJobs: 1, concurrencyLimit: 1 }
        : state === "capability"
          ? { capabilities: { ...original.capabilities, modalities: ["text"] } }
          : {
              state,
              cooldownUntil:
                state === "cooldown" ? Date.now() + 3600000 : undefined,
            };
    await change(page, patch);
    await submit(page);
    await expect(page.locator(".start-status")).toBeVisible();
    await expect(page.getByLabel("创作提示词")).toHaveValue("保留这份测试草稿");
    await expect(
      page.getByRole("dialog", { name: "人工审批任务" }),
    ).toHaveCount(0);
    await expect(page.locator(".start-page")).toBeVisible();
    expect(requests).toBe(0);
    expect((await connections(page))[0]).toMatchObject(
      JSON.parse(JSON.stringify(patch)),
    );
  });
}
for (const reason of ["quarantined", "capacity"] as const) {
  test(`审批等待期间${reason}阻止HTTP且不释放其他任务槽位`, async ({
    page,
  }) => {
    let requests = 0;
    await page.route(endpoint, async (route) => {
      requests++;
      await route.fulfill({ json: { data: [{ b64_json: pixel }] } });
    });
    await configure(page);
    await submit(page);
    await expect(
      page.getByRole("dialog", { name: "人工审批任务" }),
    ).toBeVisible();
    await change(
      page,
      reason === "capacity"
        ? { activeJobs: 1, concurrencyLimit: 1 }
        : { state: "quarantined", activeJobs: 1 },
    );
    await approve(page);
    await expect(page.locator(".project-task-failed")).toBeVisible();
    expect(requests).toBe(0);
    expect((await connections(page))[0].activeJobs).toBe(1);
  });
}
test("429重试等待deadline且403隔离后不再提交", async ({ page }) => {
  let requests = 0;
  await page.route(endpoint, async (route) => {
    requests++;
    await route.fulfill({
      status: requests === 1 ? 429 : 403,
      headers: {
        "Retry-After": "3600",
        "Access-Control-Expose-Headers": "Retry-After",
      },
      json: { error: { message: "fixture" } },
    });
  });
  await configure(page);
  await submit(page);
  await approve(page);
  await expect(page.locator(".project-task-failed")).toBeVisible();
  const cooldown = (await connections(page))[0];
  expect(cooldown.state).toBe("cooldown");
  expect(cooldown.cooldownUntil!).toBeGreaterThan(Date.now() + 3500000);
  await workbench(page);
  await page.getByRole("button", { name: "重试剩余", exact: true }).click();
  await approve(page);
  await expect
    .poll(async () => (await connections(page))[0].activeJobs)
    .toBe(0);
  expect(requests).toBe(1);
  await page.clock.setFixedTime(cooldown.cooldownUntil! + 1);
  await page.getByRole("button", { name: "重试剩余", exact: true }).click();
  await approve(page);
  await expect
    .poll(async () => (await connections(page))[0].state)
    .toBe("quarantined");
  expect(requests).toBe(2);
  await page.getByRole("button", { name: "重试剩余", exact: true }).click();
  await approve(page);
  await expect
    .poll(async () => (await connections(page))[0].activeJobs)
    .toBe(0);
  expect(requests).toBe(2);
});

for (const condition of ["quarantined", "removed"] as const) {
  test(`对话固定连接${condition}不回退且保留草稿`, async ({ page }) => {
    let requests = 0;
    await page.route(endpoint, async (route) => {
      requests++;
      await route.fulfill({ json: { data: [{ b64_json: pixel }] } });
    });
    await configure(page);
    await submit(page);
    await approve(page);
    await expect(page.locator(".project-task-succeeded")).toBeVisible();
    await page.evaluate(
      ({ key, condition }) => {
        const [bound] = JSON.parse(
          localStorage.getItem(key) ?? "[]",
        ) as ProviderConnection[];
        const alternate = {
          ...bound,
          id: "other-available",
          state: "active",
          activeJobs: 0,
        };
        localStorage.setItem(
          key,
          JSON.stringify(
            condition === "removed"
              ? [alternate]
              : [{ ...bound, state: "quarantined" }, alternate],
          ),
        );
      },
      { key, condition },
    );
    await page.getByLabel("对话内容").fill("固定连接草稿不丢失");
    await page.getByRole("button", { name: "发送消息", exact: true }).click();
    await expect(page.locator(".chat-status")).toContainText(
      condition === "removed" ? "移除" : "隔离",
    );
    await expect(page.getByLabel("对话内容")).toHaveValue("固定连接草稿不丢失");
    await expect(
      page.getByRole("dialog", { name: "人工审批任务" }),
    ).toHaveCount(0);
    expect(requests).toBe(1);
  });
}
test("新建未绑定空项目可以首次使用可用连接", async ({ page }) => {
  let requests = 0;
  await page.route(endpoint, async (route) => {
    requests++;
    await route.fulfill({ json: { data: [{ b64_json: pixel }] } });
  });
  await configure(page);
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await page.getByLabel("对话内容").fill("新项目首发");
  await page.getByRole("button", { name: "发送消息", exact: true }).click();
  await approve(page);
  await expect(page.locator(".project-task-succeeded")).toBeVisible();
  expect(requests).toBe(1);
});

test("5xx退化连接仅显式重试恢复并保留原绑定", async ({ page }) => {
  let requests = 0;
  await page.route(endpoint, async (route) => {
    requests++;
    await route.fulfill(
      requests === 1
        ? { status: 503, json: { error: "fixture" } }
        : { json: { data: [{ b64_json: pixel }] } },
    );
  });
  await configure(page);
  await submit(page);
  await approve(page);
  await expect(page.locator(".project-task-failed")).toBeVisible();
  const bound = (await connections(page))[0];
  expect(bound.state).toBe("degraded");
  await page.getByLabel("对话内容").fill("失败后保留");
  await page.getByRole("button", { name: "发送消息", exact: true }).click();
  await expect(page.locator(".chat-status")).toContainText("显式重试");
  expect(requests).toBe(1);
  await workbench(page);
  await page.getByRole("button", { name: "重试剩余", exact: true }).click();
  await approve(page);
  await expect
    .poll(async () => (await connections(page))[0].state)
    .toBe("active");
  expect((await connections(page))[0].id).toBe(bound.id);
  expect(requests).toBe(2);
});
