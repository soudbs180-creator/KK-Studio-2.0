import assert from "node:assert/strict";
import test from "node:test";
import {
  prepareAgentAttachments,
  type AgentDraftAttachment,
} from "../../src/features/agent/agentAttachments.ts";
import type { StoredGeneratedAsset } from "../../src/features/creation/assetRepository.ts";

const image: AgentDraftAttachment = {
  id: "a",
  name: "image.png",
  mime: "image/png",
  size: 99,
  dataUrl: "data:image/png;base64,aGVsbG8=",
};
const options = () => ({
  signal: new AbortController().signal,
  inspect: async () => ({ width: 12, height: 13 }),
});
test("附件从校验过的原件读取，按实际字节计量并去重", async () => {
  const result = await prepareAgentAttachments(
    [
      { ...image, assetId: "asset-one", dataUrl: "data:image/png;base64,b2xk" },
      { ...image, id: "b" },
    ],
    {
      ...options(),
      read: async () =>
        ({
          assetId: "asset-one",
          mime: "image/png",
          preview: image.dataUrl,
        }) as StoredGeneratedAsset,
    },
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].size, 5);
  assert.equal(result[0].dataUrl, image.dataUrl);
  assert.equal(result[0].width, 12);
});
test("缺失或错配原件不能退化成发送缩略图，远程 URL 不会被抓取", async () => {
  await assert.rejects(
    prepareAgentAttachments([{ ...image, assetId: "asset-one" }], {
      ...options(),
      read: async () => null,
    }),
    /原件缺失/,
  );
  await assert.rejects(
    prepareAgentAttachments(
      [{ ...image, assetId: "asset-one", dataUrl: "kk-asset:asset-other" }],
      options(),
    ),
    /身份不一致/,
  );
  await assert.rejects(
    prepareAgentAttachments(
      [{ ...image, dataUrl: "https://example.com/private.png" }],
      options(),
    ),
    /格式无效/,
  );
  await assert.rejects(
    prepareAgentAttachments(
      [{ ...image, dataUrl: "data:image/svg+xml;base64,aGVsbG8=" }],
      options(),
    ),
    /格式无效/,
  );
});
test("数量、真实字节、编码总量及尺寸限制在发送前拒绝", async () => {
  await assert.rejects(
    prepareAgentAttachments(
      Array.from({ length: 7 }, () => image),
      options(),
    ),
    /最多添加 6/,
  );
  await assert.rejects(
    prepareAgentAttachments(
      [
        {
          ...image,
          dataUrl: "data:image/png;base64," + "a".repeat(12 * 1024 * 1024),
        },
      ],
      options(),
    ),
    /8 MiB/,
  );
  const many = ["a", "b", "c", "d"].map((prefix) => ({
    ...image,
    id: prefix,
    dataUrl: "data:image/png;base64," + prefix.repeat(8 * 1024 * 1024),
  }));
  await assert.rejects(prepareAgentAttachments(many, options()), /28 MiB/);
  await assert.rejects(
    prepareAgentAttachments([image], {
      ...options(),
      inspect: async () => ({ width: 0, height: 12 }),
    }),
    /尺寸无效/,
  );
});
test("读取原件时取消不解码、不发送后续内容", async () => {
  const controller = new AbortController();
  let inspectCalls = 0;
  await assert.rejects(
    prepareAgentAttachments([{ ...image, assetId: "asset-one" }], {
      signal: controller.signal,
      read: async () => {
        controller.abort();
        return {
          assetId: "asset-one",
          mime: "image/png",
          preview: image.dataUrl,
        } as StoredGeneratedAsset;
      },
      inspect: async () => {
        inspectCalls++;
        return { width: 1, height: 1 };
      },
    }),
    /abort/i,
  );
  assert.equal(inspectCalls, 0);
});
