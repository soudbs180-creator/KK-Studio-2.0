import { expect, test, type Page } from "@playwright/test";
import {
  CREATION_STORAGE_KEY,
  emptySnapshot,
  type CreationSnapshot,
} from "../../src/features/creation/model";

const pixel =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

async function pendingBoot(page: Page) {
  const snapshot = emptySnapshot();
  snapshot.revision = 8;
  snapshot.homeDraft = {
    ...snapshot.homeDraft,
    prompt: "磁盘中的提示词",
    model: "saved-image-model",
    providerConnectionId: "saved-route",
    outputCount: 4,
    approvalMode: "ask",
    privacyMode: "byok_local",
    attachments: [
      {
        id: "saved-reference",
        name: "saved-reference.png",
        mime: "image/png",
        size: Buffer.from(pixel, "base64").length,
        dataUrl: `data:image/png;base64,${pixel}`,
      },
    ],
  };
  await page.addInitScript(
    ({ key, snapshot }) => {
      if (sessionStorage.getItem("home-loading-seeded")) return;
      sessionStorage.setItem("home-loading-seeded", "true");
      localStorage.setItem(key, JSON.stringify(snapshot));
      const original = indexedDB.open;
      const success = Object.getOwnPropertyDescriptor(
        IDBRequest.prototype,
        "onsuccess",
      )!;
      const pending: (() => void)[] = [];
      Object.assign(window, {
        pendingCreationReads: () => pending.length,
        releaseCreationReads: () => {
          indexedDB.open = original;
          pending.splice(0).forEach((release) => release());
        },
      });
      indexedDB.open = function (name, version) {
        const request = Reflect.apply(
          original,
          this,
          version === undefined ? [name] : [name, version],
        ) as IDBOpenDBRequest;
        if (name === "kk-studio-next")
          Object.defineProperty(request, "onsuccess", {
            set(handler: IDBOpenDBRequest["onsuccess"]) {
              success.set!.call(request, function (event: Event) {
                pending.push(() => handler?.call(request, event));
              });
            },
          });
        return request;
      };
    },
    { key: CREATION_STORAGE_KEY, snapshot },
  );
  await page.goto("/");
  await expect(page.getByLabel("创作提示词")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as unknown as { pendingCreationReads: () => number }
        ).pendingCreationReads(),
      ),
    )
    .toBeGreaterThan(0);
  return snapshot;
}

async function release(page: Page) {
  await page.evaluate(() =>
    (
      window as unknown as { releaseCreationReads: () => void }
    ).releaseCreationReads(),
  );
}

async function durableSnapshot(page: Page): Promise<CreationSnapshot> {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open("kk-studio-next", 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const read = db
            .transaction("creation")
            .objectStore("creation")
            .get("snapshot");
          read.onsuccess = () => {
            db.close();
            resolve(read.result);
          };
          read.onerror = () => {
            db.close();
            reject(read.error);
          };
        };
      }),
  );
}

test("首页初读期间显式输入和默认选项保留，未修改的已存参数及附件仍在", async ({
  page,
}, testInfo) => {
  const saved = await pendingBoot(page);
  await page.getByLabel("创作提示词").fill("读取期间正在输入");
  await page.getByRole("button", { name: "当前模式：自动" }).click();
  await page.getByRole("menuitemradio", { name: "自动", exact: true }).click();
  await page
    .locator('.start-composer input[type="file"]')
    .setInputFiles("public/fixtures/demo/blue-hour.png");
  await expect(page.getByLabel("已添加的参考素材")).toContainText(
    "blue-hour.png",
  );
  await release(page);
  await expect(page.getByLabel("创作提示词")).toHaveValue("读取期间正在输入");
  await expect(
    page.getByRole("button", { name: "当前模式：自动" }),
  ).toBeVisible();
  await expect
    .poll(
      async () => (await durableSnapshot(page))?.homeDraft.attachments.length,
    )
    .toBe(2);
  const stored = await durableSnapshot(page);
  expect(stored.homeDraft).toMatchObject({
    prompt: "读取期间正在输入",
    approvalMode: "auto",
    outputCount: 4,
    privacyMode: "byok_local",
    providerConnectionId: "saved-route",
    model: "saved-image-model",
  });
  expect(stored.homeDraft.attachments[0]).toEqual(
    saved.homeDraft.attachments[0],
  );
  await testInfo.attach("loaded-draft-runtime", {
    body: JSON.stringify(
      await page.evaluate(() => ({
        route: location.href,
        entry: [...document.scripts]
          .map((script) => script.src)
          .filter(Boolean),
        mode: document.querySelector<HTMLElement>(".app")?.dataset.runtimeMode,
        composer: document
          .querySelector(".start-composer")
          ?.getBoundingClientRect(),
      })),
    ),
    contentType: "application/json",
  });
  await page.screenshot({ path: testInfo.outputPath("loaded-draft.png") });
  await page.reload();
  await expect(page.getByLabel("创作提示词")).toHaveValue("读取期间正在输入");
  expect((await durableSnapshot(page)).homeDraft.outputCount).toBe(4);
});

test("首页没有用户编辑时，启动默认值不能覆盖保存的数量、模式和模型", async ({
  page,
}) => {
  const saved = await pendingBoot(page);
  await release(page);
  await expect(page.getByLabel("创作提示词")).toHaveValue(
    saved.homeDraft.prompt,
  );
  await expect(
    page.getByRole("button", { name: "当前模式：询问" }),
  ).toBeVisible();
  const stored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!) as CreationSnapshot,
    CREATION_STORAGE_KEY,
  );
  expect(stored.homeDraft).toEqual(saved.homeDraft);
});
