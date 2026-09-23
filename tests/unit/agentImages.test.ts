import test from "node:test";
import assert from "node:assert/strict";
import {
  generatedImageItems,
  generatedImageSource,
  canvasGenerationMetadata,
} from "../../src/features/agent/agentImages.ts";
import type { AgentChatItem } from "../../src/features/agent/agentTypes.ts";
test("刷新后按持久化的项目和 turn 找回生图来源，不使用另一轮卡片", () => {
  const history: AgentChatItem[] = [
    {
      id: "u1",
      role: "user",
      text: "旧卡片",
      threadId: "thread",
      turnId: "turn1",
      ...canvasGenerationMetadata("project", "source1", "image"),
    },
    {
      id: "u2",
      role: "user",
      text: "新卡片",
      threadId: "thread",
      turnId: "turn2",
      ...canvasGenerationMetadata("project", "source2", "image"),
    },
  ];
  const restored = JSON.parse(JSON.stringify(history)) as AgentChatItem[];
  const image: AgentChatItem = {
    id: "result",
    role: "tool",
    text: "image",
    threadId: "thread",
    turnId: "turn1",
  };
  assert.equal(generatedImageSource(restored, image, "project"), "source1");
  assert.equal(
    generatedImageSource(restored, image, "other-project"),
    undefined,
  );
  assert.equal(
    generatedImageSource(
      restored,
      { ...image, threadId: "other-thread" },
      "project",
    ),
    undefined,
  );
  assert.equal(
    generatedImageSource(restored, { ...image, turnId: "" }, "project"),
    undefined,
  );
});
test("只导入服务确认完成的内置生图，不把任意文本路径当作图片", () => {
  const items = generatedImageItems([
    {
      id: "a",
      role: "tool",
      text: "image",
      detail: {
        kind: "image",
        status: "completed",
        savedPath: "C:/output.png",
      },
    },
    {
      id: "b",
      role: "tool",
      text: "image",
      detail: { kind: "image", status: "failed", savedPath: "C:/old.png" },
    },
    { id: "c", role: "assistant", text: "C:/private.png" },
  ]);
  assert.deepEqual(
    items.map((item) => item.id),
    ["a"],
  );
});
