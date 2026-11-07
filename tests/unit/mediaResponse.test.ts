import assert from "node:assert/strict";
import test from "node:test";
import { requestAudioGeneration } from "../../src/features/creation/audioGeneration.ts";

test("strict speech rejects JSON disguised as success and wrong output format", async () => {
  const original = globalThis.fetch;
  try {
    for (const [type, body] of [
      ["application/json", "{}"],
      ["audio/mpeg", "bad"],
      ["audio/wav", "RIFF0000WAVEdata"],
    ]) {
      globalThis.fetch = async () =>
        new Response(body, { headers: { "Content-Type": type } });
      await assert.rejects(
        requestAudioGeneration(
          {
            baseUrl: "https://api.example.test/v1",
            apiKey: "secret",
            model: "tts-1",
            format: "mp3",
            voice: "alloy",
            speed: "1",
          },
          "text",
          { strictMedia: true },
        ),
        /格式|MIME|原件/,
      );
    }
  } finally {
    globalThis.fetch = original;
  }
});
