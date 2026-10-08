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
  await page.getByLabel("接口地址").fill("https://models.example.test/v1");
  await page.getByLabel("API Key").fill("fixture-key");
  await page.getByLabel("模型名称").fill("image-test");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
}

async function submitHome(
  page: Page,
  { approve = true }: { approve?: boolean } = {},
): Promise<void> {
  await page.getByLabel("创作提示词").fill("T5 durable intent fixture");
  await page.getByRole("button", { name: "开始创建项目" }).click();
  // The approval is rendered only after the durable intent write completes.
  // A synchronous count can miss it and leave the task queued indefinitely.
  if (approve) await page.getByRole("button", { name: "批准并提交" }).click();
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
  await page
    .locator(".project-library-card")
    .filter({ hasText: "T5 durable intent" })
    .click();
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
  await page.getByRole("button", { name: "打开任务列表" }).click();
  await page.getByRole("button", { name: "打开任务工作台" }).click();
}

async function fulfillPixel(route: Route): Promise<void> {
  await route.fulfill({ json: { data: [{ b64_json: pixel }] } });
}

for (const scenario of [
  { mode: "task identity", phase: "submit" },
  { mode: "key identity", phase: "submit" },
  { mode: "task identity", phase: "poll" },
  { mode: "key identity", phase: "poll" },
  { mode: "duplicate outputs", phase: "submit" },
  { mode: "unexpected output", phase: "submit" },
  { mode: "missing output", phase: "submit" },
]) {
  test(`native ${scenario.phase} fences ${scenario.mode}, stops live polling and remains fenced after reload`, async ({
    page,
  }) => {
    let providerPosts = 0;
    await page.route(generationsEndpoint, async (route) => {
      providerPosts++;
      await fulfillPixel(route);
    });
    await page.addInitScript(({ mode, phase }) => {
      type Receipt = {
        taskId: string;
        idempotencyKey: string;
        status: string;
        outputIndices: number[];
        outputs: Array<{ index: number; status: string; assetId?: string }>;
        updatedAt: number;
      };
      const storageKey = "native-receipt-test";
      const state = JSON.parse(
        sessionStorage.getItem(storageKey) ?? "null",
      ) as {
        saved: unknown;
        receipt: Receipt | null;
        submissions: number;
        polls: number;
        livePolls: number;
        recoveryProbes: number;
        assetReads: number;
      } | null;
      const current = state ?? {
        saved: null,
        receipt: null,
        submissions: 0,
        polls: 0,
        livePolls: 0,
        recoveryProbes: 0,
        assetReads: 0,
      };
      let recoveryProbe = false;
      const save = () =>
        sessionStorage.setItem(storageKey, JSON.stringify(current));
      const invalid = (record: Receipt): Receipt => {
        if (mode === "task identity")
          return { ...record, taskId: "foreign-task" };
        if (mode === "key identity")
          return { ...record, idempotencyKey: "foreign-key" };
        if (mode === "duplicate outputs")
          return {
            ...record,
            status: "failed",
            outputs: [
              { index: 0, status: "succeeded", assetId: "asset-foreign" },
              { index: 0, status: "failed" },
            ],
          };
        if (mode === "unexpected output")
          return {
            ...record,
            status: "failed",
            outputs: [
              { index: 0, status: "failed" },
              { index: 1, status: "failed" },
            ],
          };
        return { ...record, status: "failed", outputs: [] };
      };
      Object.assign(window, {
        nativeReceiptTest: current,
        __TAURI_INTERNALS__: {
          invoke: async (
            command: string,
            args?: {
              snapshot?: unknown;
              request?: {
                taskId: string;
                idempotencyKey: string;
                outputIndices: number[];
              };
            },
          ) => {
            if (command === "read_creation_snapshot")
              return {
                status: current.saved ? "loaded" : "missing",
                snapshot: current.saved,
              };
            if (command === "write_creation_snapshot") {
              current.saved = args!.snapshot!;
              save();
              return;
            }
            if (command === "credential_get") return null;
            if (command === "credential_set") return true;
            if (command === "task_host_list") {
              // Recovery reads the index before probing a task. Live polling
              // reads the task directly, while its controller is still active.
              recoveryProbe = current.receipt != null;
              return current.receipt ? [invalid(current.receipt)] : [];
            }
            if (command === "task_host_submit") {
              current.submissions++;
              const request = args!.request!;
              current.receipt = {
                taskId: request.taskId,
                idempotencyKey: request.idempotencyKey,
                status: "submitted",
                outputIndices: request.outputIndices,
                outputs: request.outputIndices.map((index) => ({
                  index,
                  status: "pending",
                })),
                updatedAt: 42,
              };
              save();
              return phase === "submit"
                ? invalid(current.receipt)
                : current.receipt;
            }
            if (command === "task_host_get") {
              current.polls++;
              if (recoveryProbe) current.recoveryProbes++;
              else current.livePolls++;
              recoveryProbe = false;
              save();
              return current.receipt ? invalid(current.receipt) : null;
            }
            if (command === "asset_read") {
              current.assetReads++;
              save();
              return null;
            }
            throw new Error(`Unexpected native receipt IPC: ${command}`);
          },
        },
      });
    }, scenario);
    const state = () =>
      page.evaluate(
        () =>
          (
            window as Window & {
              nativeReceiptTest: {
                saved: {
                  projects: Array<{
                    items: Array<{ id: string }>;
                    tasks: StoredTask[];
                  }>;
                };
                submissions: number;
                polls: number;
                livePolls: number;
                recoveryProbes: number;
                assetReads: number;
              };
            }
          ).nativeReceiptTest,
      );
    await configure(page);
    await submitHome(page);
    await expect
      .poll(async () => (await state()).saved.projects[0].tasks[0].status)
      .toBe("unknown");
    await page.getByRole("button", { name: "打开任务列表" }).click();
    await page.getByRole("button", { name: "打开任务工作台" }).click();
    await expect(page.getByTestId("task-workbench")).toContainText(
      "受理状态不明",
    );
    await expect(page.getByRole("button", { name: "重试剩余" })).toHaveCount(0);
    // The controller must be released before the background recovery read can
    // run; this proves the live polling loop has exited after quarantine.
    await expect
      .poll(async () => (await state()).recoveryProbes)
      .toBeGreaterThan(0);
    const beforeReload = await state();
    expect(beforeReload.submissions).toBe(1);
    expect(beforeReload.livePolls).toBe(scenario.phase === "poll" ? 1 : 0);
    expect(beforeReload.assetReads).toBe(0);
    expect(beforeReload.saved.projects[0].tasks[0].submissionState).toBe(
      "unknown",
    );
    expect(
      beforeReload.saved.projects[0].items.filter((item) =>
        item.id.includes("-result-"),
      ),
    ).toHaveLength(0);
    await page.reload();
    await openSeededProject(page);
    await expect(page.getByTestId("task-workbench")).toContainText(
      "受理状态不明",
    );
    await expect(page.getByRole("button", { name: "重试剩余" })).toHaveCount(0);
    await expect
      .poll(
        async () => (await state()).saved.projects[0].tasks[0].submissionState,
      )
      .toBe("unknown");
    expect((await state()).submissions).toBe(1);
    expect((await state()).assetReads).toBe(0);
    expect(providerPosts).toBe(0);
  });
}

test("reloaded native image task can cancel and exposes no inactive pause", async ({
  page,
}) => {
  const value = task("running", "submitted");
  await page.addInitScript(
    ({ seeded, taskId, idempotencyKey }) => {
      const state = {
        saved: seeded,
        cancellations: 0,
        status: "submitted",
      };
      const receipt = () => ({
        taskId,
        idempotencyKey,
        status: state.status,
        outputIndices: [0],
        outputs: [{ index: 0, status: "pending" }],
        failure:
          state.status === "unknown" ? "取消后供应商状态仍需核对。" : undefined,
        updatedAt: 42,
      });
      Object.assign(window, {
        nativeTaskTest: state,
        __TAURI_INTERNALS__: {
          invoke: async (
            command: string,
            args?: { snapshot?: typeof seeded },
          ) => {
            if (command === "read_creation_snapshot")
              return { status: "loaded", snapshot: state.saved };
            if (command === "write_creation_snapshot") {
              state.saved = args!.snapshot!;
              return;
            }
            if (command === "task_host_list") return [receipt()];
            if (command === "task_host_get") return receipt();
            if (command === "task_host_cancel") {
              state.cancellations++;
              state.status = "unknown";
              return receipt();
            }
            if (command === "credential_get") return null;
            throw new Error(`Unexpected native task IPC: ${command}`);
          },
        },
      });
    },
    {
      seeded: snapshot(value),
      taskId: value.id,
      idempotencyKey: value.idempotencyKey,
    },
  );
  await page.goto("/");
  await openSeededProject(page);
  await expect(
    page
      .getByTestId("task-workbench")
      .getByText("生成中", { exact: true })
      .last(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "暂停", exact: true }),
  ).toHaveCount(0);
  await page
    .getByTestId("task-workbench")
    .getByRole("button", { name: "取消", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { nativeTaskTest: { cancellations: number } })
            .nativeTaskTest.cancellations,
      ),
    )
    .toBe(1);
  await expect(page.getByTestId("task-workbench")).toContainText(
    "受理状态不明",
  );
  await expect(page.getByRole("button", { name: "重试剩余" })).toHaveCount(0);
});

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
  await submitHome(page, { approve: false });
  await expect(
    page.locator('.creation-storage-notice[role="alert"]'),
  ).toContainText(/写入|失败|io/i);
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
