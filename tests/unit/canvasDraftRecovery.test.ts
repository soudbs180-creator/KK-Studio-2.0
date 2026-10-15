import test from "node:test";
import assert from "node:assert/strict";
import { createProjectCanvas } from "../../src/domain/projectCanvas.ts";
import {
  createProject,
  emptySnapshot,
  normalizeCreationSnapshot,
} from "../../src/features/creation/model.ts";

for (const kind of ["video", "audio"] as const) {
  test(`${kind} node keeps the accepted 7500-character draft when reopened`, () => {
    const project = createProject({
      prompt: "",
      model: "fixture",
      kind: "image",
      attachments: [],
    });
    const prompt = "可恢复草稿".repeat(2000).slice(0, 7500);
    project.items = [
      {
        id: `added-${kind}-recovery`,
        title: "旧项目草稿",
        kind,
        description: "",
        prompt: prompt + "超限",
      },
    ];
    project.canvas = createProjectCanvas(project.items);
    const snapshot = normalizeCreationSnapshot({
      ...emptySnapshot(),
      projects: [project],
    });
    assert.equal(snapshot?.projects[0].items[0].prompt, prompt);
  });
}
