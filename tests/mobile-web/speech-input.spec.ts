import { expect, test, type Page } from "@playwright/test";

type SpeechFixture = {
  count: () => number;
  aborts: () => number;
  emit: (text: string, stale?: boolean) => void;
  error: (code: string) => void;
  start: () => void;
  end: () => void;
};
type SpeechFixtureWindow = Window & { __kkMobileSpeech: SpeechFixture };
const errors = new WeakMap<Page, string[]>();
const requests = new WeakMap<Page, string[]>();

test.beforeEach(async ({ context, page, baseURL }) => {
  errors.set(page, []);
  requests.set(page, []);
  page.on("pageerror", (error) => errors.get(page)!.push(error.message));
  await context.route("**/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (
      url.origin !== baseURL ||
      !["GET", "HEAD"].includes(request.method()) ||
      /^\/(?:mobile\/)?(?:api|v1|kk-agent|gateway)(?:\/|$)/.test(url.pathname)
    ) {
      requests
        .get(page)!
        .push(`${request.method()} ${url.origin}${url.pathname}`);
      await route.abort("blockedbyclient");
    } else await route.continue();
  });
  await context.routeWebSocket(/.*/, (socket) => {
    requests.get(page)!.push(`WebSocket ${socket.url()}`);
    socket.close();
  });
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page), "no runtime errors").toEqual([]);
  expect(
    requests.get(page),
    "speech fixture makes no provider or external requests",
  ).toEqual([]);
});

async function installSpeech(page: Page, mode = "immediate") {
  // Replace browser speech before the app loads: these tests never capture a microphone.
  await page.addInitScript((mode) => {
    type Result = { results: { 0: { transcript: string } }[] };
    class Recognition {
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;
      onresult: ((event: Result) => void) | null = null;
      lateResult: ((event: Result) => void) | null = null;
      lang = "";
      continuous = false;
      interimResults = false;
      maxAlternatives = 0;
      aborted = 0;
      start() {
        this.lateResult = this.onresult;
        if (mode !== "deferred") this.onstart?.();
      }
      stop() {
        this.onend?.();
      }
      abort() {
        this.aborted++;
        this.onend?.();
      }
      constructor() {
        instances.push(this);
      }
    }
    const instances: Recognition[] = [];
    const browser = window as SpeechFixtureWindow & {
      SpeechRecognition?: typeof Recognition;
      webkitSpeechRecognition?: typeof Recognition;
    };
    Object.defineProperty(browser, "SpeechRecognition", {
      configurable: true,
      value: mode === "unsupported" ? undefined : Recognition,
    });
    Object.defineProperty(browser, "webkitSpeechRecognition", {
      configurable: true,
      value: undefined,
    });
    browser.__kkMobileSpeech = {
      count: () => instances.length,
      aborts: () =>
        instances.reduce((total, instance) => total + instance.aborted, 0),
      emit: (text, stale = false) => {
        const current = instances.at(-1)!;
        (stale ? current.lateResult : current.onresult)?.({
          results: [{ 0: { transcript: text } }],
        });
      },
      error: (error) => instances.at(-1)!.onerror?.({ error }),
      start: () => instances.at(-1)!.onstart?.(),
      end: () => instances.at(-1)!.onend?.(),
    };
  }, mode);
}

async function openCreation(page: Page) {
  await page.goto("/mobile/", { waitUntil: "domcontentloaded" });
  await page
    .getByRole("button", { name: "新创作", exact: true })
    .first()
    .click();
  const input = page.getByRole("textbox", { name: "创作输入", exact: true });
  await expect(input).toBeVisible();
  return input;
}
const startButton = (page: Page) =>
  page.getByRole("button", { name: "开启语音输入", exact: true });
const stopButton = (page: Page) =>
  page.getByRole("button", { name: "关闭语音输入", exact: true });

test("phone voice requires a gesture, appends text and leaves sending to the user", async ({
  page,
}) => {
  await installSpeech(page);
  const input = await openCreation(page);
  await input.fill("保留草稿");
  expect(
    await page.evaluate(() =>
      (window as SpeechFixtureWindow).__kkMobileSpeech.count(),
    ),
  ).toBe(0);
  await startButton(page).click();
  await expect(stopButton(page)).toBeVisible();
  await page.evaluate(() =>
    (window as SpeechFixtureWindow).__kkMobileSpeech.emit("语音文字"),
  );
  await expect(input).toHaveValue("保留草稿 语音文字");
  await expect(page.getByText(/正在听取语音.*不会自动发送/)).toBeVisible();
  await stopButton(page).click();
  await expect(startButton(page)).toBeVisible();
  await expect(input).toHaveValue("保留草稿 语音文字");
  await page.screenshot({
    path: test.info().outputPath("phone-speech-draft.png"),
  });
});

test("permission refusal preserves text and the next gesture can retry", async ({
  page,
}) => {
  await installSpeech(page);
  const input = await openCreation(page);
  await input.fill("不能丢失");
  await startButton(page).click();
  await page.evaluate(() =>
    (window as SpeechFixtureWindow).__kkMobileSpeech.error("not-allowed"),
  );
  await expect(page.getByText(/麦克风权限被拒绝/)).toBeVisible();
  await expect(input).toHaveValue("不能丢失");
  await startButton(page).click();
  await expect(stopButton(page)).toBeVisible();
  expect(
    await page.evaluate(() =>
      (window as SpeechFixtureWindow).__kkMobileSpeech.count(),
    ),
  ).toBe(2);
});

test("unsupported browsers show a reason and keep keyboard input available", async ({
  page,
}) => {
  await installSpeech(page, "unsupported");
  const input = await openCreation(page);
  await startButton(page).click();
  await expect(page.getByText(/当前浏览器不支持语音识别/)).toBeVisible();
  await input.fill("仍可键盘输入");
  await expect(input).toHaveValue("仍可键盘输入");
  expect(
    await page.evaluate(() =>
      (window as SpeechFixtureWindow).__kkMobileSpeech.count(),
    ),
  ).toBe(0);
});

test("editing the draft aborts voice and queued browser text is ignored", async ({
  page,
}) => {
  await installSpeech(page);
  const input = await openCreation(page);
  await startButton(page).click();
  await input.fill("用户手动编辑");
  await expect(startButton(page)).toBeVisible();
  await page.evaluate(() =>
    (window as SpeechFixtureWindow).__kkMobileSpeech.emit("迟到文字", true),
  );
  await expect(input).toHaveValue("用户手动编辑");
});

test("cancelling a pending startup rejects its later results", async ({
  page,
}) => {
  await installSpeech(page, "deferred");
  const input = await openCreation(page);
  await input.fill("保留输入");
  await startButton(page).click();
  await stopButton(page).click();
  await page.evaluate(() => {
    const fixture = (window as SpeechFixtureWindow).__kkMobileSpeech;
    fixture.start();
    fixture.emit("过期结果", true);
  });
  await expect(input).toHaveValue("保留输入");
  await expect(startButton(page)).toBeVisible();
});

test("recognition end does not automatically restart the microphone", async ({
  page,
}) => {
  await installSpeech(page);
  await openCreation(page);
  await startButton(page).click();
  await page.evaluate(() =>
    (window as SpeechFixtureWindow).__kkMobileSpeech.end(),
  );
  await expect(startButton(page)).toBeVisible();
  expect(
    await page.evaluate(() =>
      (window as SpeechFixtureWindow).__kkMobileSpeech.count(),
    ),
  ).toBe(1);
  await startButton(page).click();
  await expect(stopButton(page)).toBeVisible();
  expect(
    await page.evaluate(() =>
      (window as SpeechFixtureWindow).__kkMobileSpeech.count(),
    ),
  ).toBe(2);
});

test("leaving chat through the app menu aborts speech and rejects queued text before returning", async ({
  page,
}) => {
  await installSpeech(page);
  const input = await openCreation(page);
  const chatURL = page.url();
  await input.fill("离开页面也要保留的草稿");
  await startButton(page).click();
  await expect(stopButton(page)).toBeVisible();
  await page.getByRole("button", { name: "打开菜单", exact: true }).click();
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await expect(page).toHaveURL(/\/mobile\/settings$/);
  await expect(
    page.getByRole("button", { name: "连接账号（可选）", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as SpeechFixtureWindow).__kkMobileSpeech.aborts(),
      ),
    )
    .toBe(1);
  await page.evaluate(() =>
    (window as SpeechFixtureWindow).__kkMobileSpeech.emit(
      "离开后的旧识别文字",
      true,
    ),
  );
  await page.getByRole("button", { name: "返回", exact: true }).click();
  await expect(page).toHaveURL(chatURL);
  await expect(input).toHaveValue("离开页面也要保留的草稿");
  await startButton(page).click();
  await expect(stopButton(page)).toBeVisible();
  expect(
    await page.evaluate(() =>
      (window as SpeechFixtureWindow).__kkMobileSpeech.count(),
    ),
  ).toBe(2);
  await expect(input).toHaveValue("离开页面也要保留的草稿");
});
