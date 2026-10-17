import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import {
  applicationComfyFixture,
  comfyGraph,
} from "./applicationComfyFixture.ts";
import { getComfyWorkflows } from "../src/application/comfyWorkflows.ts";

test("unknown workflow cannot escape original-job recovery through unordered node keys", async () => {
  const f = await applicationComfyFixture();
  try {
    const flow = getComfyWorkflows(f.app),
      ctx = f.app.context(),
      scope = ctx.accountId,
      projectId = ctx.snapshot.projects[0].id;
    const connection = await flow.saveConnection(
      { name: "Public", baseUrl: f.baseUrl },
      "PUBLIC-REVIEW-ONLY",
      scope,
    );
    const graph = {
      source: { class_type: "FixtureImage", inputs: { model: "fixture" } },
      output: {
        class_type: "SaveImage",
        inputs: { images: ["source", 0] as [string, number] },
      },
    };
    const first = await flow.prepare(projectId, connection, graph, 1, 1, scope);
    f.dropSubmit(true);
    await assert.rejects(flow.submit(first));
    assert.equal(f.raw().projects[0].tasks[0].submissionState, "unknown");
    const reordered = { output: graph.output, source: graph.source };
    assert.deepEqual(reordered, graph);
    assert.notEqual(JSON.stringify(reordered), JSON.stringify(graph));
    let rejected = false;
    f.dropSubmit(false);
    try {
      const second = await flow.prepare(
        projectId,
        connection,
        reordered,
        2,
        1,
        scope,
      );
      await flow.submit(second);
    } catch {
      rejected = true;
    }
    const count = f.calls.filter((c) => c === "POST /prompt").length;
    console.log(
      JSON.stringify({
        probe: "unordered-unknown-duplicate",
        postCount: count,
        rejected,
        firstState: f.raw().projects[0].tasks[0].submissionState,
        recordedTasks: f.raw().projects[0].tasks.length,
      }),
    );
    assert.equal(
      count,
      1,
      "a semantically equal graph must not create a second possible paid submission while the first is unknown",
    );
    assert.equal(rejected, true);
  } finally {
    await f.close();
  }
});

test("partial archive restart preserves node/file identity when equivalent history object keys reorder", async () => {
  const f = await applicationComfyFixture();
  const calls: string[] = [];
  const actualId = randomUUID();
  let reorderedHistory = false;
  const a = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
    "base64",
  );
  const b = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aPZQAAAAASUVORK5CYII=",
    "base64",
  );
  assert.notDeepEqual(a, b);
  const server = createServer((request, response) => {
    calls.push(`${request.method} ${request.url}`);
    if (request.url?.startsWith("/view?")) {
      response.writeHead(200, { "content-type": "image/png" });
      const isB =
        new URL(request.url, "http://fixture").searchParams.get("filename") ===
        "B.png";
      if (isB && !reorderedHistory) f.failOriginal(true);
      response.end(isB ? b : a);
      return;
    }
    response.writeHead(200, { "content-type": "application/json" });
    if (request.url === "/object_info")
      response.end(
        JSON.stringify({
          FixtureImage: {
            input: { required: { model: [["fixture"]] } },
            output: ["IMAGE"],
            output_node: false,
          },
          SaveImage: {
            input: { required: { images: ["IMAGE"] } },
            output: [],
            output_node: true,
          },
        }),
      );
    else if (request.url === "/prompt")
      response.end(
        JSON.stringify({ prompt_id: actualId, number: 1, node_errors: {} }),
      );
    else if (request.url === `/history/${actualId}`)
      response.end(
        JSON.stringify({
          [actualId]: {
            status: { completed: true, status_str: "success", messages: [] },
            outputs: reorderedHistory
              ? {
                  a: {
                    images: [
                      { filename: "B.png", subfolder: "", type: "output" },
                    ],
                  },
                  z: {
                    images: [
                      { filename: "A.png", subfolder: "", type: "output" },
                    ],
                  },
                }
              : {
                  z: {
                    images: [
                      { filename: "A.png", subfolder: "", type: "output" },
                    ],
                  },
                  a: {
                    images: [
                      { filename: "B.png", subfolder: "", type: "output" },
                    ],
                  },
                },
          },
        }),
      );
    else response.end(JSON.stringify({ queue_running: [], queue_pending: [] }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    const flow = getComfyWorkflows(f.app),
      ctx = f.app.context(),
      scope = ctx.accountId,
      projectId = ctx.snapshot.projects[0].id;
    const connection = await flow.saveConnection(
      {
        name: "Independent public",
        baseUrl: `http://127.0.0.1:${address.port}`,
      },
      "PUBLIC-REVIEW-ONLY",
      scope,
    );
    const graph = {
      source: { class_type: "FixtureImage", inputs: { model: "fixture" } },
      z: {
        class_type: "SaveImage",
        inputs: { images: ["source", 0] as [string, number] },
      },
      a: {
        class_type: "SaveImage",
        inputs: { images: ["source", 0] as [string, number] },
      },
    };
    const plan = await flow.prepare(projectId, connection, graph, 1, 2, scope);
    const id = await flow.submit(plan);
    await assert.rejects(flow.poll(id, scope), /disk full|write/i);
    assert.equal(f.raw().projects[0].tasks[0].completedOutputs, 1);
    const original = f.raw().projects[0].tasks[0].outputs[0].assetId;
    f.failOriginal(false);
    reorderedHistory = true;
    const resumed = f.create();
    await resumed.start();
    const beforeRecover = calls.length;
    const result = await getComfyWorkflows(resumed).recover(id, scope);
    const task = f.raw().projects[0].tasks[0],
      assets = f.raw().assets;
    const recoveryViewCalls = calls
      .slice(beforeRecover)
      .filter((c) => c.includes("/view?"));
    console.log(
      JSON.stringify({
        probe: "partial-output-reindex-after-restart",
        resultStatus: result.status,
        completed: task.completedOutputs,
        outputAssetIds: task.outputs.map((o: { assetId: string }) => o.assetId),
        assets: assets.map((a: { name: string }) => a.name),
        recoveryViewCalls,
        postCount: calls.filter((c) => c === "POST /prompt").length,
      }),
    );
    assert.equal(
      task.outputs[0].assetId,
      original,
      "the successful original slot must remain immutable",
    );
    assert.equal(calls.filter((c) => c === "POST /prompt").length, 1);
    assert.ok(
      recoveryViewCalls.some((c) => c.includes("filename=B.png")),
      "unarchived B original must be recovered instead of skipping its reordered index",
    );
    assert.notEqual(
      task.outputs[0].assetId,
      task.outputs[1].assetId,
      "two distinct provider originals must not both resolve to the already archived A image",
    );
    assert.equal(assets.length, 2);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await f.close();
  }
});

test("accepted receipt pending after CAS failure stays scoped across account changes and readonly restores make zero HTTP", async () => {
  const f = await applicationComfyFixture();
  try {
    const flow = getComfyWorkflows(f.app),
      ctx = f.app.context(),
      aliceScope = ctx.accountId,
      projectId = ctx.snapshot.projects[0].id;
    const connection = await flow.saveConnection(
      { name: "Public", baseUrl: f.baseUrl },
      "PUBLIC-REVIEW-ONLY",
      aliceScope,
    );
    const plan = await flow.prepare(
      projectId,
      connection,
      comfyGraph(),
      1,
      1,
      aliceScope,
    );
    f.onSubmit(() => {
      const p = f.raw(aliceScope).projects[0];
      assert.equal(p.tasks[0].submissionState, "submitted");
      assert.equal(p.executionReceipts[0].comfy.promptIdConfirmed, false);
      assert.equal(
        p.executionReceipts[0].comfy.identity.capturedAt,
        plan.capturedAt,
      );
      f.failCas(true);
    });
    await assert.rejects(flow.submit(plan));
    f.failCas(false);
    await f.app.logout();
    await f.app.login("bob", "fixture", "https://identity.example");
    const bobScope = f.app.context().accountId,
      before = f.calls.length;
    assert.notEqual(bobScope, aliceScope);
    await assert.rejects(flow.recover(plan.submissionId, bobScope));
    await assert.rejects(flow.requestCancel(plan.submissionId, bobScope));
    assert.equal(f.calls.length, before);
    assert.equal(f.raw(bobScope).projects.length, 0);
    await f.app.login("alice", "fixture", "https://identity.example");
    await flow.recover(plan.submissionId, aliceScope);
    const p = f.raw(aliceScope).projects[0];
    assert.equal(p.executionReceipts[0].providerRequestId, f.actualId);
    assert.equal(p.tasks[0].status, "succeeded");
    assert.ok(f.calls.includes(`GET /history/${f.actualId}`));
    assert.ok(!f.calls.includes(`GET /history/${plan.submissionId}`));
    assert.equal(f.calls.filter((c) => c === "POST /prompt").length, 1);
    const current = f.app.context(),
      backup = await current.repo.backup(projectId);
    await f.app.mutate(current, (repo) => repo.restore(backup));
    const historical = current.snapshot.projects.at(-1)!.tasks[0].id,
      beforeHistory = f.calls.length;
    await assert.rejects(flow.recover(historical, aliceScope));
    await assert.rejects(flow.requestCancel(historical, aliceScope));
    assert.equal(f.calls.length, beforeHistory);
  } finally {
    await f.close();
  }
});
