import { expect, test, type Page } from "@playwright/test";
import { openWorkspace } from "./helpers";

type SpeechMockWindow = Window & {
  __kkSpeechMock?: {
    emit: (transcript: string) => void;
    error: (error: string) => void;
    start: () => void;
    end: () => void;
  };
  SpeechRecognition?: unknown;
  webkitSpeechRecognition?: unknown;
};

async function installSpeechMock(
  page: Page,
  mode:
    | "immediate"
    | "deferred-start"
    | "deferred-stop"
    | "throw-once" = "immediate",
): Promise<void> {
  await page.addInitScript((mockMode) => {
    class MockRecognition {
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;
      onresult:
        | ((event: {
            resultIndex: number;
            results: ArrayLike<{
              isFinal: boolean;
              0: { transcript: string };
            }>;
          }) => void)
        | null = null;
      lang = "";
      continuous = false;
      interimResults = false;
      maxAlternatives = 1;
      start(): void {
        if (mockMode === "throw-once" && !startedOnce) {
          startedOnce = true;
          throw new Error("mock start failure");
        }
        if (mockMode !== "deferred-start") this.onstart?.();
      }
      stop(): void {
        if (mockMode !== "deferred-stop") this.onend?.();
      }
      abort(): void {
        this.onend?.();
      }
      emit(transcript: string): void {
        const results = {
          0: { isFinal: true, 0: { transcript } },
          length: 1,
        } as unknown as ArrayLike<{
          isFinal: boolean;
          0: { transcript: string };
        }>;
        this.onresult?.({ resultIndex: 0, results });
      }
    }
    const speechWindow = window as SpeechMockWindow;
    const instances: MockRecognition[] = [];
    let startedOnce = false;
    speechWindow.SpeechRecognition = MockRecognition;
    speechWindow.webkitSpeechRecognition = MockRecognition;
    // The app constructs one instance per mounted composer. Forward the test
    // event to every instance so hidden and visible routes can be exercised.
    class TestRecognition extends MockRecognition {
      constructor() {
        super();
        instances.push(this);
        speechWindow.__kkSpeechMock = {
          emit: (text) => instances.forEach((instance) => instance.emit(text)),
          error: (error) =>
            instances.forEach((instance) => instance.onerror?.({ error })),
          start: () => instances.forEach((instance) => instance.onstart?.()),
          end: () => instances.forEach((instance) => instance.onend?.()),
        };
      }
    }
    speechWindow.SpeechRecognition = TestRecognition;
    speechWindow.webkitSpeechRecognition = TestRecognition;
  }, mode);
}

test("首页语音可以开启、识别并关闭，结果写入提示词", async ({ page }) => {
  await installSpeechMock(page);
  await page.goto("/");
  const prompt = page.getByLabel("创作提示词");
  await prompt.fill("夜晚的城市");
  const voice = page.locator(".start-mic-button");
  await expect(voice).toHaveAttribute("aria-label", "开启语音输入");

  await voice.click();
  await expect(voice).toHaveAttribute("aria-label", "关闭语音输入");
  await expect(voice).toHaveAttribute("aria-pressed", "true");
  await expect(voice).toHaveAttribute("data-voice-state", "on");
  await page.evaluate((text) => {
    (window as SpeechMockWindow).__kkSpeechMock?.emit(text);
  }, "霓虹灯");
  await expect(prompt).toHaveValue("夜晚的城市 霓虹灯");

  await voice.click();
  await expect(voice).toHaveAttribute("aria-label", "开启语音输入");
  await expect(voice).toHaveAttribute("aria-pressed", "false");
  await expect(voice).toHaveAttribute("data-voice-state", "off");
});

test("首页模型名称保持单行并在过长时省略", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "kk-studio-next:model-provider:v1",
      JSON.stringify({
        version: 1,
        name: "本地兼容服务",
        baseUrl: "https://models.example.test/v1",
        model: "kk-image-model-with-a-very-long-display-name",
      }),
    );
  });
  await page.goto("/");
  const button = page.locator(".start-model-picker .start-tool-button");
  const name = button.locator("span");
  await expect(name).toHaveText("kk-image-model-with-a-very-long-display-name");
  await expect(name).toHaveCSS("white-space", "nowrap");
  await expect(name).toHaveCSS("text-overflow", "ellipsis");
  const box = await button.boundingBox();
  expect(box?.width).toBeLessThanOrEqual(260);
});

test("工作台语音识别结果会写入当前对话并可停止", async ({ page }) => {
  await installSpeechMock(page);
  await openWorkspace(page);
  const input = page.getByLabel("对话内容");
  await input.fill("把画面改成");
  const voice = page.locator(".chat-composer [data-voice-state]");

  await expect(voice).toHaveAttribute("aria-label", "开启语音输入");
  await voice.click();
  await expect(voice).toHaveAttribute("aria-label", "关闭语音输入");
  await page.evaluate(() => {
    (window as SpeechMockWindow).__kkSpeechMock?.emit("蓝色");
  });
  await expect(input).toHaveValue("把画面改成 蓝色");
  await voice.click();
  await expect(voice).toHaveAttribute("data-voice-state", "off");
});

test("语音启动中取消后，迟到事件不会改写提示词", async ({ page }) => {
  await installSpeechMock(page, "deferred-start");
  await page.goto("/");
  const prompt = page.getByLabel("创作提示词");
  await prompt.fill("保留这句");
  const voice = page.locator(".start-mic-button");

  await voice.click();
  await expect(voice).toHaveAttribute("data-voice-state", "starting");
  await voice.click();
  await expect(voice).toHaveAttribute("data-voice-state", "off");
  await page.evaluate(() => {
    const mock = (window as SpeechMockWindow).__kkSpeechMock;
    mock?.start();
    mock?.emit("迟到文字");
  });
  await expect(prompt).toHaveValue("保留这句");
});

test("语音启动失败会回到关闭状态，并允许再次尝试", async ({ page }) => {
  await installSpeechMock(page, "throw-once");
  await page.goto("/");
  const voice = page.locator(".start-mic-button");

  await voice.click();
  await expect(voice).toHaveAttribute("data-voice-state", "off");
  await expect(page.getByRole("status")).toContainText("启动失败");
  await voice.click();
  await expect(voice).toHaveAttribute("data-voice-state", "on");
  await voice.click();
  await expect(voice).toHaveAttribute("data-voice-state", "off");
});

test("输入文字或离开工作台会结束语音会话并丢弃迟到结果", async ({ page }) => {
  await installSpeechMock(page);
  await openWorkspace(page);
  const input = page.getByLabel("对话内容");
  const voice = page.locator(".chat-composer [data-voice-state]");

  await voice.click();
  await expect(voice).toHaveAttribute("data-voice-state", "on");
  await input.fill("用户刚刚改过");
  await expect(voice).toHaveAttribute("data-voice-state", "off");
  await page.evaluate(() => {
    (window as SpeechMockWindow).__kkSpeechMock?.emit("不应追加");
  });
  await expect(input).toHaveValue("用户刚刚改过");

  await voice.click();
  await expect(voice).toHaveAttribute("data-voice-state", "on");
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await expect(voice).toHaveAttribute("data-voice-state", "disabled");
  await expect(voice).toBeDisabled();
  await page.evaluate(() => {
    (window as SpeechMockWindow).__kkSpeechMock?.emit("另一个项目");
  });
  await expect(input).toHaveValue("用户刚刚改过");
});

test("网络错误会关闭语音会话并保留可重试入口", async ({ page }) => {
  await installSpeechMock(page);
  await page.goto("/");
  const voice = page.locator(".start-mic-button");

  await voice.click();
  await expect(voice).toHaveAttribute("data-voice-state", "on");
  await page.evaluate(() => {
    (window as SpeechMockWindow).__kkSpeechMock?.error("network");
  });
  await expect(voice).toHaveAttribute("data-voice-state", "off");
  await expect(page.getByRole("status")).toContainText("网络不可用");
});

test("语音识别结果遵守首页提示词长度上限", async ({ page }) => {
  await installSpeechMock(page);
  await page.goto("/");
  const prompt = page.getByLabel("创作提示词");
  const voice = page.locator(".start-mic-button");

  await voice.click();
  await page.evaluate(() => {
    (window as SpeechMockWindow).__kkSpeechMock?.emit("a".repeat(5000));
  });
  await expect.poll(async () => (await prompt.inputValue()).length).toBe(4000);
  await expect(voice).toHaveAttribute("data-voice-state", "off");
});
