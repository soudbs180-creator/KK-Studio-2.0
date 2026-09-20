import assert from "node:assert/strict";
import test from "node:test";
import { storeGeneratedAsset } from "../../src/features/creation/assetRepository.ts";

const source =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

test("归档没有可用存储时必须拒绝成功", async () => {
  await assert.rejects(storeGeneratedAsset({ source }), /存储|归档/);
});

test("Desktop 归档发送原件与无预览元数据，错误不会回退到浏览器", async () => {
  const calls: Array<{
    command: string;
    args: {
      dataBase64: string;
      metadata: { sha256: string; [key: string]: unknown };
    };
  }> = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      __TAURI_INTERNALS__: {
        invoke: async (
          command: string,
          args: {
            dataBase64: string;
            metadata: { sha256: string; [key: string]: unknown };
          },
        ) => {
          calls.push({ command, args });
          throw new Error("synthetic native failure");
        },
      },
    },
  });
  try {
    await assert.rejects(
      storeGeneratedAsset({ source }),
      /synthetic native failure/,
    );
    assert.equal(calls[0].command, "asset_store");
    assert.equal(calls[0].args.dataBase64, source.split(",")[1]);
    assert.equal("preview" in calls[0].args.metadata, false);
    assert.match(calls[0].args.metadata.sha256, /^[a-f0-9]{64}$/);
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});
