import { expect, test, type Page, type Route } from "@playwright/test";

const generationsEndpoint = "https://models.example.test/v1/images/generations";
const creationKey = "kk-studio-next:creation:v1";
const pixel =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

type StoredTask = {
  id: string;
  status: string;
  submissionState?: string;
  submittedAt?: number;
  idempotencyKey: string;
  retryOfTaskId?: string;
  prompt: string;
  model: string;
  kind: "image";
  createdAt: number;
  updatedAt: number;
  attachments: [];
  attempt: number;
  requestedOutputs: number;
  completedOutputs: number;
  privacyMode: "byok_local";
  providerBaseUrl?: string;
  providerName?: string;
  providerCredentialRef?: string;
  outputs: Array<{
    index: number;
    status: string;
    model: string;
    createdAt: number;
  }>;
};

function task(
  status: string,
  submissionState: string,
  id = "t5-task-1",
): StoredTask {
  return {
    id,
    status,
    submissionState,
    idempotencyKey: "t5-stable-intent-key",
    prompt: "T5 持久任务意图",
    model: "image-test",
    kind: "image",
    createdAt: 1,
    updatedAt: 1,
    attachments: [],
    attempt: 1,
    requestedOutputs: 1,
    completedOutputs: 0,
    privacyMode: "byok_local",
    providerBaseUrl: "https://models.example.test/v1",
    providerName: "Fixture Provider",
    providerCredentialRef: "fixture-ref",
    outputs: [
      {
        index: 0,
        status: "waiting",
        model: "image-test",
        createdAt: 1,
      },
    ],
  };
}

function snapshot(taskValue: StoredTask) {
  return {
    version: 2,
    revision: 1,
    activeProjectId: "t5-project",
    homeDraft: {
      prompt: "",
      model: "",
      kind: "image",
      attachments: [],
      approvalMode: "auto",
      privacyMode: "byok_local",
      outputCount: 1,
      updatedAt: 1,
    },
    projects: [
      {
        id: "t5-project",
        name: "T5 durable intent",
        prompt: taskValue.prompt,
        model: taskValue.model,
        kind: "image",
        attachments: [],
        providerBaseUrl: taskValue.providerBaseUrl,
        providerName: taskValue.providerName,
        providerCredentialRef: taskValue.providerCredentialRef,
        items: [
          {
            id: "t5-project-prompt",
            title: "图片创作",
            description: "Fixture Provider · 待执行",
            kind: "image",
            prompt: taskValue.prompt,
            model: taskValue.model,
          },
        ],
        messages: [],
        tasks: [taskValue],
        favoriteIds: [],
        likedIds: [],
        composerDraft: {
          prompt: "",
          model: taskValue.model,
          kind: "image",
          attachments: [],
          approvalMode: "auto",
          privacyMode: "byok_local",
          outputCount: 1,
          updatedAt: 1,
        },
        createdAt: 1,
        updatedAt: 1,
      },
    ],
  };
}

async function configure(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("button", { name: "模型供应商", exact: true }).click();
  await page.getByLabel("API Base URL").fill("https://models.example.test/v1");
  await page.getByLabel("API Key").fill("fixture-key");
  await page.getByLabel("默认模型").fill("image-test");
  await page.getByRole("button", { name: "保存供应商" }).click();
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
}

async function submitHome(page: Page): Promise<void> {
  await page.getByLabel("生成数量").selectOption("1");
  await page.getByLabel("创作提示词").fill("T5 durable intent fixture");
  await page.getByRole("button", { name: "开始创建项目" }).click();
  const approval = page.getByRole("button", { name: "批准并提交" });
  if (await approval.count()) await approval.click();
}

async function storedSnapshot(page: Page): Promise<{
  projects: Array<{ id: string; tasks: StoredTask[] }>;
}> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "{}"),
    creationKey,
  );
}

async function durableSnapshot(page: Page): Promise<unknown> {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open("kk-studio-next", 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const request = db
            .transaction("creation", "readonly")
            .objectStore("creation")
            .get("snapshot");
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            db.close();
            resolve(request.result ?? null);
          };
        };
      }),
  );
}

async function seed(page: Page, value: StoredTask): Promise<void> {
  await page.addInitScript(
    ({ key, value: seeded }) => {
      localStorage.setItem(key, JSON.stringify(seeded));
    },
    { key: creationKey, value: snapshot(value) },
  );
}

async function openSeededProject(page: Page): Promise<void> {
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: /T5 durable intent/ }).click();
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
  await page.getByRole("button", { name: "打开任务列表" }).click();
  await page.getByRole("button", { name: "打开任务工作台" }).click();
}

async function fulfillPixel(route: Route): Promise<void> {
  await route.fulfill({ json: { data: [{ b64_json: pixel }] } });
}

test("provider request only arrives after durable submitted intent with stable key", async ({
  page,
}) => {
  let requestCount = 0;
  let durableAtRequest: unknown;
  let requestKey = "";
  await page.route(generationsEndpoint, async (route) => {
    requestCount++;
    requestKey = route.request().headers()["idempotency-key"] ?? "";
    durableAtRequest = await durableSnapshot(page);
    await fulfillPixel(route);
  });
  await configure(page);
  await submitHome(page);
  await expect(page.locator(".project-task-succeeded")).toBeVisible();
  expect(requestCount).toBe(1);
  const durable = durableAtRequest as {
    projects: Array<{ tasks: StoredTask[] }>;
  };
  const durableTask = durable.projects[0].tasks.at(-1)!;
  expect(durableTask.submissionState).toBe("submitted");
  expect(durableTask.status).toBe("running");
  expect(durableTask.submittedAt).toEqual(expect.any(Number));
  expect(requestKey).toBe(`${durableTask.idempotencyKey}-remaining-0-part-1`);
});

test("durable intent write failure prevents every provider POST", async ({
  page,
}) => {
  let requests = 0;
  await page.addInitScript(() => {
    const state = { writes: 0 };
    Object.assign(window, {
      t5StorageTest: state,
      __TAURI_INTERNALS__: {
        invoke: async (command: string) => {
          if (command === "read_creation_snapshot")
            return { status: "missing", snapshot: null };
          if (command === "credential_get") return null;
          if (command === "credential_set") return true;
          if (command === "write_creation_snapshot") {
            state.writes++;
            throw new Error("io: synthetic durable write failure");
          }
          throw new Error(`Unexpected IPC: ${command}`);
        },
      },
    });
  });
  await page.route(generationsEndpoint, async (route) => {
    requests++;
    await fulfillPixel(route);
  });
  await configure(page);
  await submitHome(page);
  await expect(page.locator(".start-status")).toContainText(/写入|失败|io/i);
  const writes = await page.evaluate(
    () =>
      (window as Window & { t5StorageTest: { writes: number } }).t5StorageTest
        .writes,
  );
  expect(writes).toBeGreaterThan(0);
  expect(requests).toBe(0);
});

test("aborted provider response is unknown, cannot retry normally, and does not resubmit after refresh", async ({
  page,
}) => {
  let requestCount = 0;
  await page.route(generationsEndpoint, async (route) => {
    requestCount++;
    await route.abort("connectionreset");
  });
  await configure(page);
  await submitHome(page);
  await expect
    .poll(
      async () => (await storedSnapshot(page)).projects[0].tasks.at(-1)?.status,
      { timeout: 15_000 },
    )
    .toBe("unknown");
  await expect(page.locator(".project-task-unknown")).toBeVisible({
    timeout: 10_000,
  });
  const before = await storedSnapshot(page);
  const first = before.projects[0].tasks.at(-1)!;
  expect(first.status).toBe("unknown");
  expect(first.submissionState).toBe("unknown");
  await expect(
    page.getByRole("button", { name: "重试", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect
    .poll(
      async () => (await storedSnapshot(page)).projects[0].tasks.at(-1)?.status,
    )
    .toBe("unknown");
  const after = await storedSnapshot(page);
  const same = after.projects[0].tasks.at(-1)!;
  expect(same.id).toBe(first.id);
  expect(same.idempotencyKey).toBe(first.idempotencyKey);
  expect(requestCount).toBe(1);
});

test("running submitted intent recovers to unknown without automatic submit", async ({
  page,
}) => {
  const value = task("running", "submitted");
  await seed(page, value);
  let requests = 0;
  await page.route(generationsEndpoint, async (route) => {
    requests++;
    await fulfillPixel(route);
  });
  await page.goto("/");
  await expect
    .poll(async () => (await storedSnapshot(page)).projects[0].tasks[0]?.status)
    .toBe("unknown");
  const recovered = (await storedSnapshot(page)).projects[0].tasks[0];
  expect(recovered.id).toBe(value.id);
  expect(recovered.idempotencyKey).toBe(value.idempotencyKey);
  expect(recovered.submissionState).toBe("unknown");
  expect(requests).toBe(0);
  await openSeededProject(page);
  await expect(
    page.getByText("受理状态不明 · 需核对供应商").first(),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "重试剩余" })).toHaveCount(0);
});

test("queued intent recovers as interrupted and retry keeps its original identity", async ({
  page,
}) => {
  const value = task("queued", "intent");
  await seed(page, value);
  let requests = 0;
  await page.route(generationsEndpoint, async (route) => {
    requests++;
    await fulfillPixel(route);
  });
  await page.goto("/");
  await expect
    .poll(async () => (await storedSnapshot(page)).projects[0].tasks[0]?.status)
    .toBe("interrupted");
  const interrupted = (await storedSnapshot(page)).projects[0].tasks[0];
  expect(interrupted.id).toBe(value.id);
  expect(interrupted.idempotencyKey).toBe(value.idempotencyKey);
  await openSeededProject(page);
  await expect(page.getByRole("button", { name: "重试剩余" })).toBeVisible();
  await page.getByRole("button", { name: "重试剩余" }).click();
  await expect
    .poll(async () => (await storedSnapshot(page)).projects[0].tasks.length)
    .toBe(2);
  const retried = (await storedSnapshot(page)).projects[0].tasks.at(-1)!;
  expect(retried.idempotencyKey).toBe(value.idempotencyKey);
  expect(retried.retryOfTaskId).toBe(value.id);
  expect(requests).toBe(0);
});
