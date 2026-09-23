import assert from "node:assert/strict";
import test from "node:test";
import { prepareImageTask } from "../../src/features/creation/imageTaskCommand.ts";
import { createProject } from "../../src/features/creation/model.ts";
import {
  connectionFromModelProfile,
  writeProviderConnections,
} from "../../src/features/creation/providerRegistry.ts";
import { setSessionApiKey } from "../../src/features/creation/providerCredentials.ts";
import { saveModelCatalog } from "../../src/features/models/modelCatalog.ts";

test("显式模型选择绑定具体账号；旧项目不覆盖新选择，尺寸必须属于所选模型", async () => {
  const before = ["window", "localStorage"].map(
    (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
  );
  const memory = new Map<string, string>();
  const storage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
  };
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: storage, dispatchEvent: () => true },
  });
  const a = connectionFromModelProfile({
    version: 1,
    name: "A",
    baseUrl: "https://a.example/v1",
    model: "image-same",
  });
  const b = connectionFromModelProfile({
    version: 1,
    name: "B",
    baseUrl: "https://b.example/v1",
    model: "image-same",
  });
  try {
    writeProviderConnections([a, b]);
    setSessionApiKey("fixture-a", a.baseUrl!, a.credentialRef);
    setSessionApiKey("fixture-b", b.baseUrl!, b.credentialRef);
    const input = {
      prompt: "test",
      model: "image-same",
      kind: "image" as const,
      attachments: [],
      providerConnectionId: b.id,
    };
    const old = createProject({
      ...input,
      providerBaseUrl: a.baseUrl,
      providerCredentialRef: a.credentialRef,
    });
    assert.equal((await prepareImageTask(input, old)).id, b.id);
    old.composerDraft.providerConnectionId = b.id;
    assert.equal(
      (
        await prepareImageTask(
          { ...input, providerConnectionId: undefined },
          old,
        )
      ).id,
      b.id,
    );
    assert.equal(
      (await prepareImageTask({ ...input, providerConnectionId: a.id }, old))
        .id,
      a.id,
    );
    await assert.rejects(
      () =>
        prepareImageTask({ ...input, providerConnectionId: "removed" }, old),
      /移除/,
    );
    saveModelCatalog(
      b,
      [{ id: "image-same", kind: "image", sizes: ["1024x1024"] }],
      true,
    );
    assert.equal(
      (await prepareImageTask({ ...input, imageSize: "1024x1024" }, old)).id,
      b.id,
    );
    await assert.rejects(
      () => prepareImageTask({ ...input, imageSize: "4096x2304" }, old),
      /尺寸/,
    );
  } finally {
    setSessionApiKey("", a.baseUrl!, a.credentialRef);
    setSessionApiKey("", b.baseUrl!, b.credentialRef);
    for (const [key, descriptor] of before) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
