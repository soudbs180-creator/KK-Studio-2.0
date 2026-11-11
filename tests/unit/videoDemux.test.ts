import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { demuxVideo } from "../../src/features/workflows/videoDemuxAdapter.ts";

test("real MP4 and WebM samples preserve every frame and cluster timestamps", () => {
  for (const [path, count, last] of [
    ["../fixtures/media/client-shots.mp4", 12, 1_000_000],
    ["../../public/fixtures/demo/blue-hour-motion.webm", 135, 5_900_000],
  ] as const) {
    const buffer = readFileSync(new URL(path, import.meta.url));
    const result = demuxVideo(
      buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      ),
    );
    assert.equal(result.packets.length, count);
    assert.ok(result.packets.at(-1)!.timestamp > last);
    assert.ok(result.config.codedWidth! > 0);
    assert.equal(result.packets[0].type, "key");
  }
  assert.throws(() => demuxVideo(new ArrayBuffer(4)));
});
