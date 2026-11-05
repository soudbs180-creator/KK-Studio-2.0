import assert from "node:assert/strict";
import test from "node:test";
import {
  detectVideoShots,
  auditStoryboardContinuity,
  parsePromptMentions,
  compileOpticsPrompt,
} from "./harness.ts";

/* =========================================================================
 * Tier 1: Feature Coverage (Features 18 - 23 / Milestones 5 & 6)
 * ========================================================================= */

// -------------------------------------------------------------------------
// Feature 18: Pure-Client Video Shot Breakdown (逐帧拉片)
// Formula: 0.75 * deltaRGB + 0.25 * deltaHist >= threshold
// -------------------------------------------------------------------------
test("F18-T1-01: detects cut boundary when combined score exceeds default threshold 0.45", () => {
  const frames = [
    { rgbDiff: 0.05, histDiff: 0.04 }, // 0.75*0.05 + 0.25*0.04 = 0.0475
    { rgbDiff: 0.6, histDiff: 0.5 }, // 0.75*0.60 + 0.25*0.50 = 0.575 (CUT)
    { rgbDiff: 0.02, histDiff: 0.01 },
  ];
  const boundaries = detectVideoShots(frames);
  assert.equal(boundaries.length, 3);
  assert.equal(boundaries[0].isCut, false);
  assert.equal(boundaries[1].isCut, true);
  assert.equal(boundaries[2].isCut, false);
});

test("F18-T1-02: calculates accurate timestamps based on frame index and fps", () => {
  const frames = [
    { rgbDiff: 0.1, histDiff: 0.1 },
    { rgbDiff: 0.1, histDiff: 0.1 },
    { rgbDiff: 0.1, histDiff: 0.1 },
  ];
  const boundaries = detectVideoShots(frames, 0.45, 24);
  assert.equal(boundaries[0].timestampSeconds, 0);
  assert.equal(boundaries[1].timestampSeconds, 0.04);
  assert.equal(boundaries[2].timestampSeconds, 0.08);
});

test("F18-T1-03: handles gradual transition without false positive cut trigger", () => {
  const frames = [
    { rgbDiff: 0.3, histDiff: 0.2 }, // score: 0.275 (< 0.45)
    { rgbDiff: 0.35, histDiff: 0.3 }, // score: 0.3375 (< 0.45)
  ];
  const boundaries = detectVideoShots(frames, 0.45);
  assert.equal(boundaries[0].isCut, false);
  assert.equal(boundaries[1].isCut, false);
});

test("F18-T1-04: identical consecutive frames yield zero difference ratios", () => {
  const frames = [{ rgbDiff: 0, histDiff: 0 }];
  const boundaries = detectVideoShots(frames);
  assert.equal(boundaries[0].rgbDifferenceRatio, 0);
  assert.equal(boundaries[0].histogramDifferenceRatio, 0);
  assert.equal(boundaries[0].isCut, false);
});

test("F18-T1-05: custom threshold parameter configures detection sensitivity", () => {
  const frames = [{ rgbDiff: 0.4, histDiff: 0.4 }]; // score: 0.40
  const strict = detectVideoShots(frames, 0.5); // higher threshold
  assert.equal(strict[0].isCut, false);

  const sensitive = detectVideoShots(frames, 0.3); // lower threshold
  assert.equal(sensitive[0].isCut, true);
});

// -------------------------------------------------------------------------
// Feature 19: Storyboard Multi-Agent Pipeline & Continuity
// -------------------------------------------------------------------------
test("F19-T1-01: passes continuity audit when character has all required attributes", () => {
  const res = auditStoryboardContinuity(
    "Alice wears a red cloak holding a silver locket in the forest",
    [
      {
        characterName: "Alice",
        requiredAttributes: ["red cloak", "silver locket"],
      },
    ],
  );
  assert.equal(res.compliant, true);
  assert.equal(res.violations.length, 0);
});

test("F19-T1-02: flags violation when character is missing a required continuity trait", () => {
  const res = auditStoryboardContinuity(
    "Alice walks in the forest holding nothing",
    [{ characterName: "Alice", requiredAttributes: ["silver locket"] }],
  );
  assert.equal(res.compliant, false);
  assert.ok(
    res.violations.some((v) =>
      v.includes("missing required continuity attribute: silver locket"),
    ),
  );
});

test("F19-T1-03: multiple character rules audited concurrently in the same shot", () => {
  const description = "Alice in red cloak speaks to Bob who has an eyepatch";
  const res = auditStoryboardContinuity(description, [
    { characterName: "Alice", requiredAttributes: ["red cloak"] },
    { characterName: "Bob", requiredAttributes: ["eyepatch", "scar"] },
  ]);
  assert.equal(res.compliant, false);
  assert.equal(res.violations.length, 1);
  assert.ok(
    res.violations[0].includes(
      "Bob missing required continuity attribute: scar",
    ),
  );
});

test("F19-T1-04: characters not present in shot description do not trigger violations", () => {
  const res = auditStoryboardContinuity(
    "Camera pans across the empty desert horizon",
    [{ characterName: "Alice", requiredAttributes: ["red cloak"] }],
  );
  assert.equal(res.compliant, true);
  assert.equal(res.violations.length, 0);
});

test("F19-T1-05: empty continuity rules array passes audit unconditionally", () => {
  const res = auditStoryboardContinuity("Any random description", []);
  assert.equal(res.compliant, true);
});

// -------------------------------------------------------------------------
// Feature 20: In-Prompt Reference Mention Parsing
// -------------------------------------------------------------------------
test("F20-T1-01: parses @参考 1 syntax and maps to asset ID", () => {
  const res = parsePromptMentions("生成主角肖像 @参考 1", {
    "1": "asset-hero-portrait",
  });
  assert.equal(res.mentions.length, 1);
  assert.equal(res.mentions[0].index, 1);
  assert.equal(res.mentions[0].assetId, "asset-hero-portrait");
  assert.equal(
    res.compiledPrompt,
    "生成主角肖像 [RefAsset: asset-hero-portrait]",
  );
});

test("F20-T1-02: parses {{ref 2}} mustache syntax correctly", () => {
  const res = parsePromptMentions(
    "City skyline at night {{ref 2}} with neon glow",
    { "2": "asset-skyline" },
  );
  assert.equal(res.mentions.length, 1);
  assert.equal(res.mentions[0].assetId, "asset-skyline");
  assert.equal(
    res.compiledPrompt,
    "City skyline at night [RefAsset: asset-skyline] with neon glow",
  );
});

test("F20-T1-03: parses multiple mixed mentions in single prompt", () => {
  const prompt = "Character @参考 1 stands in front of background {{ref 2}}";
  const res = parsePromptMentions(prompt, { "1": "char-1", "2": "bg-2" });
  assert.equal(res.mentions.length, 2);
  assert.equal(res.mentions[0].assetId, "char-1");
  assert.equal(res.mentions[1].assetId, "bg-2");
  assert.equal(
    res.compiledPrompt,
    "Character [RefAsset: char-1] stands in front of background [RefAsset: bg-2]",
  );
});

test("F20-T1-04: missing reference rejects rather than inventing an asset identity", () => {
  assert.throws(
    () => parsePromptMentions("Test missing @参考 99", {}),
    /参考 99 不存在/,
  );
});

test("F20-T1-05: prompt without mentions returns unchanged text and empty mentions", () => {
  const text = "A serene mountain lake at sunrise";
  const res = parsePromptMentions(text, {});
  assert.equal(res.compiledPrompt, text);
  assert.equal(res.mentions.length, 0);
});

// -------------------------------------------------------------------------
// Feature 21: 3D Director Desk & Physical Camera Optics
// -------------------------------------------------------------------------
test("F21-T1-01: compileOpticsPrompt includes lens focal length in mm", () => {
  const prompt = compileOpticsPrompt({ lensMm: 35, aperture: "f/1.8" });
  assert.ok(prompt.includes("35mm focal length lens"));
});

test("F21-T1-02: compileOpticsPrompt formats aperture f-stop correctly", () => {
  const prompt = compileOpticsPrompt({ lensMm: 50, aperture: "1.4" });
  assert.ok(prompt.includes("f/1.4 aperture"));
});

test("F21-T1-03: compileOpticsPrompt formats camera body and focal distance", () => {
  const prompt = compileOpticsPrompt({
    lensMm: 85,
    aperture: "f/2.8",
    focalDistance: "2 meters",
    cameraBody: "ARRI Alexa Mini",
  });
  assert.ok(prompt.includes("shot on ARRI Alexa Mini"));
  assert.ok(prompt.includes("focal distance 2 meters"));
});

test("F21-T1-04: compileOpticsPrompt handles minimal optics configuration", () => {
  const prompt = compileOpticsPrompt({ lensMm: 24, aperture: "f/4" });
  assert.equal(prompt, "24mm focal length lens, f/4 aperture");
});

test("F21-T1-05: compileOpticsPrompt handles anamorphic/wide lens mm tiers", () => {
  const prompt = compileOpticsPrompt({ lensMm: 12, aperture: "f/5.6" });
  assert.ok(prompt.includes("12mm focal length lens"));
});

import { createProject, createTask } from "../../src/domain/creationModel.ts";
import {
  waitForCreationTask,
  createWorkspaceEscapeGuard,
  createDestructiveCommandGuard,
  createSecretLeakGuard,
  CanvasOpSchema,
} from "./harness.ts";
function taskFixture() {
  const project = createProject({
    prompt: "test",
    model: "test-model",
    kind: "text",
    attachments: [],
  });
  const task = createTask(project);
  project.tasks = [task];
  return {
    project,
    task,
    options: {
      getProject: () => project,
      taskId: task.id,
      signal: new AbortController().signal,
      cancel: () => {},
    },
  };
}

test("F22-T1-01: task observation returns durable success without mutating the record", async () => {
  const { task, options } = taskFixture();
  task.status = "succeeded";
  const result = await waitForCreationTask(options);
  assert.deepEqual(result, task);
  assert.notEqual(result, task);
});
test("F22-T1-02: failed task cannot pass the result gate", async () => {
  const { task, options } = taskFixture();
  task.status = "failed";
  task.error = "provider failure";
  await assert.rejects(waitForCreationTask(options), /provider failure/);
});
test("F22-T1-03: partial output cannot pass the complete result gate", async () => {
  const { task, options } = taskFixture();
  task.status = "partial";
  await assert.rejects(waitForCreationTask(options), /partial/);
});
test("F22-T1-04: unknown submission cannot become a successful result", async () => {
  const { task, options } = taskFixture();
  task.status = "unknown";
  await assert.rejects(waitForCreationTask(options), /unknown/);
});
test("F22-T1-05: missing durable task fails instead of fabricating output", async () => {
  const { project, options } = taskFixture();
  project.tasks = [];
  await assert.rejects(waitForCreationTask(options), /不存在/);
});
test("F23-T1-01: creative text remains intact through the real secret boundary", () => {
  const prompt =
    "Write a film script about SELECT * FROM stars and <script> as literal text";
  const args = { prompt };
  assert.equal(createSecretLeakGuard()("generate", args).allow, true);
  assert.equal(args.prompt, prompt);
});
test("F23-T1-02: workspace guard rejects absolute system paths", () => {
  assert.equal(
    createWorkspaceEscapeGuard({ workspaceRoot: "D:/project" })("read", {
      path: "C:/Windows/System32/config",
    }).allow,
    false,
  );
});
test("F23-T1-03: destructive commands are rejected at invocation", () => {
  assert.equal(
    createDestructiveCommandGuard()("system_exec", { cmd: "rm -rf /" }).allow,
    false,
  );
});
test("F23-T1-04: prototype pollution keys are rejected by the atomic operation schema", () => {
  assert.equal(
    CanvasOpSchema.safeParse({
      op: "move_card",
      payload: { id: "__proto__", x: 0, y: 0 },
    }).success,
    false,
  );
});
test("F23-T1-05: nested credential payloads cannot enter a tool", () => {
  assert.equal(
    createSecretLeakGuard()("write", {
      data: { text: "-----BEGIN PRIVATE KEY-----" },
    }).allow,
    false,
  );
});
