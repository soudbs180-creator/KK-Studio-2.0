import { expect, test, type Page } from "@playwright/test";
import {
  CREATION_STORAGE_KEY,
  createProject,
  emptyDraft,
  emptySnapshot,
  projectChatView,
  serializeCreationSnapshot,
  type CreationSnapshot,
} from "../../src/features/creation/model";
import { MODEL_PROVIDER_STORAGE_KEY } from "../../src/domain/modelProvider";
import { PROVIDER_CONNECTIONS_STORAGE_KEY } from "../../src/features/creation/providerRegistry";
import { expandSidebar } from "./helpers";

const endpoint = "http://127.0.0.1:61999/v1";
const model = "scope-text-fixture";
const pixel =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

type SaveGate = { pending: () => number; release: () => void };

async function stored(page: Page): Promise<CreationSnapshot> {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open("kk-studio-next", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const read = db
            .transaction("creation")
            .objectStore("creation")
            .get("snapshot");
          read.onerror = () => {
            db.close();
            reject(read.error);
          };
          read.onsuccess = () => {
            db.close();
            resolve(read.result);
          };
        };
      }),
  );
}

async function holdAcceptedSave(page: Page) {
  await page.evaluate(() => {
    const prototype = IDBTransaction.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(
      prototype,
      "oncomplete",
    )!;
    const originalPut = IDBObjectStore.prototype.put;
    const held = new WeakSet<IDBTransaction>();
    const pending: (() => void)[] = [];
    let armed = true;
    Object.defineProperty(prototype, "oncomplete", {
      ...descriptor,
      set(handler: ((this: IDBTransaction, event: Event) => void) | null) {
        descriptor.set!.call(
          this,
          function (this: IDBTransaction, event: Event) {
            const finish = () => handler?.call(this, event);
            if (held.has(this)) pending.push(finish);
            else finish();
          },
        );
      },
    });
    IDBObjectStore.prototype.put = function (value, key) {
      if (
        armed &&
        this.name === "creation" &&
        key === "snapshot" &&
        value?.projects?.some(
          (project: { tasks: { status: string; originChatId?: string }[] }) =>
            project.tasks.some(
              (task) => task.status === "queued" && task.originChatId === "A",
            ),
        )
      ) {
        armed = false;
        held.add(this.transaction);
      }
      return originalPut.call(this, value, key);
    };
    (
      window as unknown as { conversationSaveGate: SaveGate }
    ).conversationSaveGate = {
      pending: () => pending.length,
      release() {
        IDBObjectStore.prototype.put = originalPut;
        Object.defineProperty(prototype, "oncomplete", descriptor);
        pending.splice(0).forEach((finish) => finish());
      },
    };
  });
}

for (const edit of ["other chat", "sending chat"] as const) {
  test(`delayed direct acceptance preserves the ${edit} draft and origin through real UI and persistence`, async ({
    page,
  }, info) => {
    const session = await page.context().newCDPSession(page);
    await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.addInitScript(() => {
      const mismatches: { chat: string; prompt: string }[] = [];
      Object.assign(window, { crossChatDraftFrames: mismatches });
      const inspect = () => {
        const chat = document
          .querySelector('[role="tab"][aria-selected="true"]')
          ?.textContent?.trim();
        const input = document.querySelector<HTMLTextAreaElement>(
          'textarea[aria-label="对话内容"]',
        );
        if (
          input &&
          !input.disabled &&
          ((chat === "Direct A" && input.value === "Unsent B draft") ||
            (chat === "Direct B" && input.value === "Original A request"))
        )
          mismatches.push({ chat, prompt: input.value });
        requestAnimationFrame(inspect);
      };
      requestAnimationFrame(inspect);
    });
    const created = createProject({
      prompt: "",
      kind: "text",
      model,
      attachments: [],
    });
    created.name = "Direct scoped receipt fixture";
    const original = created.chats![created.activeChatId!];
    const draft = {
      ...emptyDraft(),
      kind: "text" as const,
      model,
      conversationChannel: "direct" as const,
      providerConnectionId: "direct-scope-fixture",
    };
    const project = projectChatView({
      ...created,
      activeChatId: "A",
      chats: {
        A: {
          ...original,
          id: "A",
          name: "Direct A",
          mainAgent: "direct",
          draft: { ...draft, prompt: "Original A request" },
        },
        B: {
          ...original,
          id: "B",
          name: "Direct B",
          mainAgent: "direct",
          draft: {
            ...draft,
            prompt: "Unsent B draft",
            attachments: [
              {
                id: "B-reference",
                name: "B-reference.png",
                mime: "image/png",
                size: 68,
                dataUrl: pixel,
              },
            ],
          },
        },
      },
    });
    const snapshot = serializeCreationSnapshot({
      ...emptySnapshot(),
      version: 3,
      activeProjectId: project.id,
      projects: [project],
    });
    const provider = {
      id: "direct-scope-fixture",
      provider: "Local scoped fixture",
      displayName: "Local scoped fixture",
      model,
      baseUrl: endpoint,
      credentialRef: "direct-scope-fixture-credential",
      protocol: "openai-chat",
      authMode: "none",
      kind: "user_byok",
      state: "active",
      concurrencyLimit: 1,
      capabilities: {
        modalities: ["text"],
        operations: ["chat", "generate"],
        async: false,
      },
    };
    await page.addInitScript(
      ({ snapshot, provider, keys }) => {
        localStorage.setItem(keys.creation, JSON.stringify(snapshot));
        localStorage.setItem(keys.connections, JSON.stringify([provider]));
        localStorage.setItem(
          keys.profile,
          JSON.stringify({
            version: 1,
            name: provider.provider,
            model: provider.model,
            baseUrl: provider.baseUrl,
            connectionId: provider.id,
            protocol: provider.protocol,
            authMode: provider.authMode,
          }),
        );
      },
      {
        snapshot,
        provider,
        keys: {
          creation: CREATION_STORAGE_KEY,
          connections: PROVIDER_CONNECTIONS_STORAGE_KEY,
          profile: MODEL_PROVIDER_STORAGE_KEY,
        },
      },
    );
    const requests: unknown[] = [];
    await page.route(`${endpoint}/**`, async (route) => {
      requests.push(route.request().postDataJSON());
      expect(route.request().url()).toBe(`${endpoint}/chat/completions`);
      expect(route.request().postDataJSON()).toEqual({
        model,
        messages: [{ role: "user", content: "Original A request" }],
        stream: true,
      });
      expect(route.request().headers()["authorization"]).toBeUndefined();
      expect(route.request().headers()["idempotency-key"]).toBeTruthy();
      await route.fulfill({
        contentType: "text/event-stream",
        body: `data: ${JSON.stringify({
          choices: [
            {
              delta: { content: "Original A fixture result" },
              finish_reason: "stop",
            },
          ],
        })}\n\ndata: [DONE]\n\n`,
      });
    });
    await page.goto("/");
    await expandSidebar(page);
    await page.getByRole("button", { name: "项目库", exact: true }).click();
    await page
      .locator(".project-library-card")
      .filter({ hasText: project.name })
      .click();
    const input = page.getByRole("textbox", { name: "对话内容", exact: true });
    await expect(input).toHaveValue("Original A request");
    await expect(input).toBeEnabled();
    await holdAcceptedSave(page);
    try {
      await page.getByRole("button", { name: "发送消息", exact: true }).click();
      await expect
        .poll(() =>
          page.evaluate(() =>
            (
              window as unknown as { conversationSaveGate: SaveGate }
            ).conversationSaveGate.pending(),
          ),
        )
        .toBe(1);
      const accepted = (await stored(page)).projects[0];
      expect(accepted.tasks).toHaveLength(1);
      expect(accepted.tasks[0]).toMatchObject({
        status: "queued",
        originChatId: "A",
      });
      expect(accepted.chats!.A.draft.prompt).toBe("Original A request");
      expect(requests).toHaveLength(0);
      await page.getByRole("tab", { name: "Direct B", exact: true }).click();
      await expect(input).toBeEnabled();
      await expect(input).toHaveValue("Unsent B draft");
      await expect(
        page.getByRole("button", {
          name: "移除素材 B-reference.png",
          exact: true,
        }),
      ).toBeVisible();
      if (edit === "sending chat") {
        await page.getByRole("tab", { name: "Direct A", exact: true }).click();
        await expect(input).toBeEnabled();
      }
      const unsent =
        edit === "other chat"
          ? "Edited B while A saves"
          : "Edited A after switching back";
      await input.fill(unsent);
      await page.evaluate(() =>
        (
          window as unknown as { conversationSaveGate: SaveGate }
        ).conversationSaveGate.release(),
      );
      await expect
        .poll(async () => (await stored(page)).projects[0].tasks[0].status)
        .toBe("succeeded");
      await expect(input).toHaveValue(unsent);
      await expect(input).toBeEnabled();
      expect(
        await page.evaluate(
          () =>
            (window as unknown as { crossChatDraftFrames: unknown[] })
              .crossChatDraftFrames,
        ),
      ).toEqual([]);
      expect(requests).toHaveLength(1);
      const saved = (await stored(page)).projects[0];
      expect(saved.tasks[0].originChatId).toBe("A");
      expect(saved.chats!.A.draft.prompt).toBe(
        edit === "other chat" ? "" : unsent,
      );
      expect(saved.chats!.B.draft.prompt).toBe(
        edit === "other chat" ? unsent : "Unsent B draft",
      );
      expect(saved.chats!.B.draft.attachments?.map((item) => item.id)).toEqual([
        "B-reference",
      ]);
      expect(
        saved.chats!.A.messages.some(
          (message) => message.content === "Original A fixture result",
        ),
      ).toBe(true);
      expect(
        saved.chats!.B.messages.some(
          (message) => message.content === "Original A fixture result",
        ),
      ).toBe(false);
      await page.screenshot({
        path: info.outputPath(`direct-scope-${edit.replaceAll(" ", "-")}.png`),
      });
    } finally {
      await page.evaluate(() =>
        (
          window as unknown as { conversationSaveGate: SaveGate }
        ).conversationSaveGate.release(),
      );
    }
  });
}
