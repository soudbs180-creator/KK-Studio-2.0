import assert from "node:assert/strict";
import test from "node:test";
import { originsFromEnvironment } from "../../src/features/local-service/main.ts";

test("configured companion origins accept exact URL origins and reject paths", () => {
  const previous = process.env.KK_STUDIO_COMPANION_ORIGINS;
  try {
    process.env.KK_STUDIO_COMPANION_ORIGINS =
      "http://127.0.0.1:1421,https://studio.example.test,https://studio.example.test/path,https://studio.example.test/?token=x";
    assert.deepEqual(originsFromEnvironment(), [
      "http://127.0.0.1:1421",
      "https://studio.example.test",
    ]);
  } finally {
    if (previous === undefined) delete process.env.KK_STUDIO_COMPANION_ORIGINS;
    else process.env.KK_STUDIO_COMPANION_ORIGINS = previous;
  }
});
