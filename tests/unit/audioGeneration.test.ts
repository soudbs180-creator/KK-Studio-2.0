import assert from "node:assert/strict";
import test from "node:test";

import {
  audioFormatLabel,
  audioMimeType,
  audioSpeedLabel,
  audioVoiceLabel,
  normalizeAudioFormatValue,
  normalizeAudioSpeedValue,
  normalizeAudioVoiceValue,
  requestAudioGeneration,
  type AudioGenerationConfig,
} from "../../src/features/creation/audioGeneration.ts";

/** 音频生成选项与 TTS 请求（src/features/creation/audioGeneration.ts）单元测试。 */

test("音色/格式/语速规范化：非法值回退默认", () => {
  assert.equal(normalizeAudioVoiceValue("alloy"), "alloy");
  assert.equal(normalizeAudioVoiceValue("不存在"), "alloy");
  assert.equal(normalizeAudioFormatValue("wav"), "wav");
  assert.equal(normalizeAudioFormatValue("exe"), "mp3");
  assert.equal(normalizeAudioSpeedValue("1.5"), "1.5");
  assert.equal(normalizeAudioSpeedValue("99"), "4");
  assert.equal(normalizeAudioSpeedValue("0"), "0.25");
  assert.equal(normalizeAudioSpeedValue("abc"), "1");
});

test("展示标签与 MIME 映射", () => {
  assert.equal(audioVoiceLabel("shimmer"), "Shimmer");
  assert.equal(audioVoiceLabel("x"), "Alloy");
  assert.equal(audioFormatLabel("opus"), "Opus");
  assert.equal(audioSpeedLabel("2.5"), "2.5x");
  assert.equal(audioMimeType("wav"), "audio/wav");
  assert.equal(audioMimeType("mp3"), "audio/mpeg");
  assert.equal(audioMimeType("unknown"), "audio/mpeg");
});

test("requestAudioGeneration 构造正确的 /audio/speech 请求", async () => {
  const calls: Array<{ url: string; headers: Headers; body: unknown }> = [];
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      url: String(input),
      headers: new Headers(init?.headers),
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    return new Response(new Blob(["audio-bytes"], { type: "audio/mpeg" }), {
      status: 200,
    });
  }) as typeof fetch;

  const config: AudioGenerationConfig = {
    baseUrl: "https://api.example.com/v1",
    apiKey: "key-123",
    model: "tts-1",
    voice: "nova",
    format: "wav",
    speed: "1.25",
    instructions: "轻声",
  };

  const blob = await requestAudioGenerationWith(config, "你好", fetcher);
  assert.ok(blob.type.startsWith("audio/"));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.example.com/v1/audio/speech");
  assert.equal(calls[0].headers.get("authorization"), "Bearer key-123");
  const body = calls[0].body as Record<string, unknown>;
  assert.equal(body.model, "tts-1");
  assert.equal(body.input, "你好");
  assert.equal(body.voice, "nova");
  assert.equal(body.response_format, "wav");
  assert.equal(body.speed, 1.25);
  assert.equal(body.instructions, "轻声");
});

test("requestAudioGeneration 支持本地转发代理地址拼接", async () => {
  const seenUrls: string[] = [];
  const fetcher = (async (input: RequestInfo | URL) => {
    seenUrls.push(String(input));
    return new Response(new Blob(["x"], { type: "audio/mpeg" }), {
      status: 200,
    });
  }) as typeof fetch;
  await requestAudioGenerationWith(
    {
      baseUrl: "https://api.example.com/v1",
      apiKey: "k",
      model: "tts-1",
      localProxyUrl: "http://127.0.0.1:23210",
    },
    "hi",
    fetcher,
  );
  assert.equal(
    seenUrls[0],
    "http://127.0.0.1:23210/https://api.example.com/v1/audio/speech",
  );
});

test("requestAudioGeneration 校验必填项与空文本", async () => {
  const fetcher = (async () =>
    new Response(new Blob(["x"], { type: "audio/mpeg" }), {
      status: 200,
    })) as typeof fetch;
  await assert.rejects(
    () =>
      requestAudioGenerationWith(
        { baseUrl: "", apiKey: "", model: "" },
        "文本",
        fetcher,
      ),
    /模型/,
  );
  await assert.rejects(
    () =>
      requestAudioGenerationWith(
        { baseUrl: "https://x", apiKey: "k", model: "m" },
        "   ",
        fetcher,
      ),
    /文本/,
  );
});

test("requestAudioGeneration 透出服务端错误信息", async () => {
  const fetcher = (async () =>
    new Response(JSON.stringify({ error: { message: "配额不足" } }), {
      status: 429,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;
  await assert.rejects(
    () =>
      requestAudioGenerationWith(
        { baseUrl: "https://x", apiKey: "k", model: "m" },
        "hi",
        fetcher,
      ),
    /配额不足/,
  );
});

/** 便于注入 fetcher 的封装（模块函数直接走全局 fetch）。 */
async function requestAudioGenerationWith(
  config: AudioGenerationConfig,
  text: string,
  fetcher: typeof fetch,
) {
  const original = globalThis.fetch;
  globalThis.fetch = fetcher as typeof globalThis.fetch;
  try {
    return await requestAudioGeneration(config, text);
  } finally {
    globalThis.fetch = original;
  }
}
