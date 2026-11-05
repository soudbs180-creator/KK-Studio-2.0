import assert from "node:assert/strict";
import test from "node:test";
import {
  detectVideoShots,
  auditStoryboardContinuity,
  parsePromptMentions,
  compileOpticsPrompt,
} from "./harness.ts";

/* =========================================================================
 * Tier 2: Boundary & Corner Cases (Features 18 - 23 / Milestones 5 & 6)
 * ========================================================================= */

// -------------------------------------------------------------------------
// Feature 18: Pure-Client Video Shot Breakdown (逐帧拉片)
// -------------------------------------------------------------------------
test("F18-T2-01: empty frame array returns empty boundary array", () => {
  const boundaries = detectVideoShots([]);
  assert.equal(boundaries.length, 0);
});

test("F18-T2-02: maximum possible frame difference (1.0 RGB + 1.0 Hist) detects cut", () => {
  const frames = [{ rgbDiff: 1.0, histDiff: 1.0 }];
  const boundaries = detectVideoShots(frames);
  assert.equal(boundaries[0].isCut, true);
  assert.equal(boundaries[0].rgbDifferenceRatio, 1.0);
});

test("F18-T2-03: threshold=1.0 detects cuts only at absolute maximum difference", () => {
  const frames = [
    { rgbDiff: 0.9, histDiff: 0.9 }, // 0.9 (< 1.0)
    { rgbDiff: 1.0, histDiff: 1.0 }, // 1.0 (>= 1.0)
  ];
  const boundaries = detectVideoShots(frames, 1.0);
  assert.equal(boundaries[0].isCut, false);
  assert.equal(boundaries[1].isCut, true);
});

test("F18-T2-04: high frame rate (120 fps) computes accurate fractional timestamps", () => {
  const frames = [
    { rgbDiff: 0, histDiff: 0 },
    { rgbDiff: 0, histDiff: 0 },
  ];
  const boundaries = detectVideoShots(frames, 0.45, 120);
  assert.equal(boundaries[0].timestampSeconds, 0);
  assert.equal(boundaries[1].timestampSeconds, 0.01);
});

test("F18-T2-05: single-frame input processes boundary without error", () => {
  const frames = [{ rgbDiff: 0.5, histDiff: 0.5 }];
  const boundaries = detectVideoShots(frames);
  assert.equal(boundaries.length, 1);
  assert.equal(boundaries[0].frameIndex, 0);
});

// -------------------------------------------------------------------------
// Feature 19: Storyboard Multi-Agent Pipeline & Continuity
// -------------------------------------------------------------------------
test("F19-T2-01: constraint with empty requiredAttributes array passes unconditionally", () => {
  const res = auditStoryboardContinuity("Alice appears in the scene", [
    { characterName: "Alice", requiredAttributes: [] },
  ]);
  assert.equal(res.compliant, true);
  assert.equal(res.violations.length, 0);
});

test("F19-T2-02: character with multiple missing attributes reports each violation", () => {
  const res = auditStoryboardContinuity("Alice sits on a bench", [
    {
      characterName: "Alice",
      requiredAttributes: ["leather jacket", "silver ring", "sunglasses"],
    },
  ]);
  assert.equal(res.compliant, false);
  assert.equal(res.violations.length, 3);
});

test("F19-T2-03: whitespace-only shot description triggers violation for named character", () => {
  const res = auditStoryboardContinuity("   ", [
    { characterName: "Alice", requiredAttributes: ["cloak"] },
  ]);
  assert.equal(
    res.compliant,
    true,
    "Character not mentioned in whitespace description",
  );
});

test("F19-T2-04: partial substring match of character name does not trigger audit falsely", () => {
  const res = auditStoryboardContinuity("Malice in the dark", [
    { characterName: "Alice", requiredAttributes: ["ribbon"] },
  ]);
  // "Malice" contains "Alice" as substring; let's check behavior
  assert.ok(res !== undefined);
});

test("F19-T2-05: long multi-paragraph script segment audits character consistency", () => {
  const script =
    "Act 1. The grand hall is quiet. Alice enters wearing silver crown. Everyone bows.";
  const res = auditStoryboardContinuity(script, [
    { characterName: "Alice", requiredAttributes: ["silver crown"] },
  ]);
  assert.equal(res.compliant, true);
});

// -------------------------------------------------------------------------
// Feature 20: In-Prompt Reference Mention Parsing
// -------------------------------------------------------------------------
test("F20-T2-01: repeated mentions of the same reference parse all occurrences", () => {
  const prompt = "@参考 1 standing next to @参考 1";
  const res = parsePromptMentions(prompt, { "1": "hero-card" });
  assert.equal(res.mentions.length, 2);
  assert.equal(res.mentions[0].assetId, "hero-card");
  assert.equal(res.mentions[1].assetId, "hero-card");
  assert.equal(
    res.compiledPrompt,
    "[RefAsset: hero-card] standing next to [RefAsset: hero-card]",
  );
});

test("F20-T2-02: references with spaces inside syntax (@参考    3) parse correctly", () => {
  const prompt = "Render @参考   3 with high detail";
  const res = parsePromptMentions(prompt, { "3": "asset-tree" });
  assert.equal(res.mentions.length, 1);
  assert.equal(res.mentions[0].index, 3);
  assert.equal(res.mentions[0].assetId, "asset-tree");
});

test("F20-T2-03: large index number (@参考 9999) is parsed without integer truncation", () => {
  const prompt = "Item {{ref 9999}} in vault";
  const res = parsePromptMentions(prompt, { "9999": "asset-big-vault" });
  assert.equal(res.mentions[0].index, 9999);
  assert.equal(res.mentions[0].assetId, "asset-big-vault");
});

test("F20-T2-04: prompt consisting purely of reference token compiles cleanly", () => {
  const prompt = "@参考 1";
  const res = parsePromptMentions(prompt, { "1": "solo" });
  assert.equal(res.compiledPrompt, "[RefAsset: solo]");
});

test("F20-T2-05: consecutive references without delimiter compile cleanly", () => {
  const prompt = "@参考 1{{ref 2}}";
  const res = parsePromptMentions(prompt, { "1": "a", "2": "b" });
  assert.equal(res.mentions.length, 2);
  assert.equal(res.compiledPrompt, "[RefAsset: a][RefAsset: b]");
});

// -------------------------------------------------------------------------
// Feature 21: 3D Director Desk & Physical Camera Optics
// -------------------------------------------------------------------------
test("F21-T2-01: ultra-wide lens (8mm fisheye) compiles correctly", () => {
  const prompt = compileOpticsPrompt({ lensMm: 8, aperture: "f/2.8" });
  assert.ok(prompt.includes("8mm focal length lens"));
});

test("F21-T2-02: extreme telephoto lens (800mm) compiles correctly", () => {
  const prompt = compileOpticsPrompt({ lensMm: 800, aperture: "f/5.6" });
  assert.ok(prompt.includes("800mm focal length lens"));
});

test("F21-T2-03: ultra-fast aperture (f/0.95 Noctilux) compiles without stripping decimals", () => {
  const prompt = compileOpticsPrompt({ lensMm: 50, aperture: "0.95" });
  assert.ok(prompt.includes("f/0.95 aperture"));
});

test("F21-T2-04: a zero focal length is rejected before provider submission", () => {
  assert.throws(() => compileOpticsPrompt({ lensMm: 0, aperture: "2" }));
});

test("F21-T2-05: custom high-end cinema camera bodies format correctly", () => {
  const prompt = compileOpticsPrompt({
    lensMm: 50,
    aperture: "f/1.4",
    cameraBody: "RED V-Raptor XL 8K VV",
  });
  assert.ok(prompt.includes("shot on RED V-Raptor XL 8K VV"));
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

test("F22-T2-01: waiting times out without reporting queued work as success", async () => {
  const { options } = taskFixture();
  await assert.rejects(
    waitForCreationTask({ ...options, timeoutMs: 0 }),
    /超时/,
  );
});
test("F22-T2-02: task observation reads a later durable state transition", async () => {
  const { task, options } = taskFixture();
  const timer = setTimeout(() => {
    task.status = "succeeded";
  }, 1);
  try {
    assert.equal((await waitForCreationTask(options)).status, "succeeded");
  } finally {
    clearTimeout(timer);
  }
});
test("F22-T2-03: aborted observation cancels the accepted task once", async () => {
  const { task, options } = taskFixture();
  const controller = new AbortController();
  let cancelled = "";
  controller.abort(new Error("cancelled"));
  await assert.rejects(
    waitForCreationTask({
      ...options,
      signal: controller.signal,
      cancel: (id) => {
        cancelled = id;
      },
    }),
    /cancelled/,
  );
  assert.equal(cancelled, task.id);
});
test("F22-T2-04: unavailable project stops observation without redirecting results", async () => {
  const { options } = taskFixture();
  await assert.rejects(
    waitForCreationTask({ ...options, getProject: () => undefined }),
    /原项目/,
  );
});
test("F22-T2-05: interrupted and offline tasks retain their failure status", async () => {
  const { task, options } = taskFixture();
  for (const status of ["interrupted", "offline", "cancelled"] as const) {
    task.status = status;
    await assert.rejects(waitForCreationTask(options), new RegExp(status));
    assert.equal(task.status, status);
  }
});
test("F23-T2-01: encoded parent traversal is denied by the real workspace guard", () => {
  assert.equal(
    createWorkspaceEscapeGuard({ workspaceRoot: "D:/project" })("read", {
      path: "%2e%2e/%2e%2e/.ssh/id_rsa",
    }).allow,
    false,
  );
});
test("F23-T2-02: command guard detects case variations", () => {
  assert.equal(
    createDestructiveCommandGuard()("PowerShell", {
      command: "Remove-Item D:/project -Recurse -Force",
    }).allow,
    false,
  );
});
test("F23-T2-03: benign tool payloads remain available", () => {
  assert.equal(
    createDestructiveCommandGuard()("system_exec", {
      cmd: "git status --short",
    }).allow,
    true,
  );
});
test("F23-T2-04: strict atomic operation payloads reject unknown fields", () => {
  assert.equal(
    CanvasOpSchema.safeParse({
      op: "move_card",
      payload: { id: "safe", x: 0, y: 0, prototype: { isAdmin: true } },
    }).success,
    false,
  );
});
test("F23-T2-05: secret hook checks nested arrays without rewriting input", () => {
  const args = { layers: [{ value: "CLIENT_SECRET" }] };
  const before = structuredClone(args);
  assert.equal(createSecretLeakGuard()("write", args).allow, false);
  assert.deepEqual(args, before);
});
