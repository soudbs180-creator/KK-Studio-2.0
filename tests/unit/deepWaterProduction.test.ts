import test from "node:test";
import assert from "node:assert/strict";
import {
  CameraOpticsSchema,
  compileCameraOpticsPrompt,
  CAMERA_OPTICS_PRESETS,
} from "../../src/domain/cameraOptics.ts";
import { extractContinuityBible } from "../../src/domain/storyboardPipeline.ts";
import {
  autoRepairStoryboard,
  repairStoryboardShots,
} from "../../src/features/workflows/storyboardRepair.ts";
import {
  FloorplanCanvasAdapter,
  MAX_FLOORPLAN_BYTES,
  serializeFloorplanFile,
} from "../../src/features/canvas/index.ts";
import {
  CanvasMcpServer,
  CanvasOpSchema,
  applyCanvasOperation,
} from "../../src/domain/canvasOperations.ts";
import { createCanvasOperationFixture } from "../support/canvasOperationFixture.ts";
import { bindDirectorBridge } from "../../src/features/canvas/directorBridge.ts";
import { autoLayoutCanvas } from "../../src/features/canvas/autoLayout.ts";

const shot = {
  id: "s1",
  scene: "门口",
  description: "小林穿红衣",
  dialogue: "我回来了",
  durationSeconds: 3,
  shotSize: "MS",
  cameraMovement: "固定",
  characters: ["小林"],
  props: [],
  assetIds: [],
};
const board = { title: "回家", shots: [shot, { ...shot, id: "s2" }] };
const constraints = [
  {
    characterName: "小林",
    kind: "costume" as const,
    requiredAttributes: ["红衣"],
  },
];
const review = () => ({
  script: "小林穿红衣，说：我回来了",
  constraints,
  assets: [],
  signal: new AbortController().signal,
});

test("director optics compile signed boundaries and zero values, preserve preset validity", () => {
  const optics = {
    lensMm: 85,
    aperture: "1.4",
    shotScale: "CU" as const,
    cameraAngle: "low-angle" as const,
    azimuthDeg: -180,
    elevationDeg: 0,
  };
  const prompt = compileCameraOpticsPrompt(optics);
  for (const fragment of [
    "85mm",
    "f/1.4",
    "close-up",
    "low-angle",
    "azimuth -180",
    "elevation 0",
  ])
    assert.ok(prompt.includes(fragment));
  assert.equal(
    CameraOpticsSchema.safeParse({ ...optics, elevationDeg: 91 }).success,
    false,
  );
  assert.equal(
    CameraOpticsSchema.safeParse({ ...optics, azimuthDeg: -181 }).success,
    false,
  );
  assert.equal(
    CameraOpticsSchema.safeParse({ lensMm: 50, aperture: "2.8" }).success,
    true,
  );
  CAMERA_OPTICS_PRESETS.forEach((p) => CameraOpticsSchema.parse(p.optics));
});

test("director bridge checks origin, exact node and schema and releases listener", () => {
  let listener: (e: MessageEvent) => void = () => {};
  let removed = false;
  const target = {
    location: { origin: "https://studio.test" },
    addEventListener: (_: string, fn: typeof listener) => {
      listener = fn;
    },
    removeEventListener: () => {
      removed = true;
    },
  } as unknown as Window;
  const updates: unknown[] = [],
    replies: unknown[] = [];
  const optics = { lensMm: 50, aperture: "2.8", azimuthDeg: 90 };
  const source = {
    postMessage: (data: unknown, origin: string) => {
      assert.equal(origin, "https://studio.test");
      replies.push(data);
    },
  };
  const dispose = bindDirectorBridge({
    target,
    nodeId: "a",
    read: () => optics,
    apply: (o) => updates.push(o),
  });
  const send = (data: unknown, origin = "https://studio.test") =>
    listener({ origin, source, data } as unknown as MessageEvent);
  send(
    { type: "storyai:director-apply", nodeId: "a", optics },
    "https://evil.test",
  );
  send({ type: "storyai:director-apply", nodeId: "b", optics });
  send({
    type: "storyai:director-apply",
    nodeId: "a",
    optics: { ...optics, azimuthDeg: 181 },
  });
  send({ type: "storyai:director-apply", nodeId: "a", optics, extra: true });
  assert.equal(updates.length, 0);
  send({ type: "storyai:director-apply", nodeId: "a", optics });
  assert.deepEqual(updates, [optics]);
  send({ type: "storyai:director-sync", nodeId: "a" });
  assert.deepEqual(replies, [
    { type: "storyai:director-sync", nodeId: "a", optics },
  ]);
  dispose();
  assert.equal(removed, true);
});

test("bible extraction chunks production requests and merges repeated visual facts", async () => {
  let calls = 0;
  const rows = await extractContinuityBible(
    "小林红衣。".repeat(1300),
    async (prompt) => {
      assert.ok(prompt.length <= 4000);
      calls++;
      return JSON.stringify([
        {
          characterName: "小林",
          kind: "costume",
          requiredAttributes: calls === 1 ? ["红衣"] : ["红衣", "银扣"],
        },
      ]);
    },
  );
  assert.ok(calls > 1);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].requiredAttributes, ["红衣", "银扣"]);
  await assert.rejects(
    extractContinuityBible(
      "小林",
      async () =>
        '[{"characterName":"小林","kind":"character","requiredAttributes":[]}]',
    ),
  );
});

test("bounded repair touches only violating shot and keeps the rest exactly intact", async () => {
  const bad = {
    ...board,
    shots: [{ ...shot, description: "小林穿蓝衣" }, board.shots[1]],
  };
  let calls = 0;
  const result = await autoRepairStoryboard(bad, {
    ...review(),
    generate: async (prompt) => {
      calls++;
      assert.ok(prompt.length <= 4000);
      assert.match(prompt, /红衣/);
      return JSON.stringify({ title: board.title, shots: [shot] });
    },
  });
  assert.equal(calls, 1);
  assert.equal(result.compliant, true);
  assert.deepEqual(result.storyboard.shots[1], board.shots[1]);
});

test("repair retry count is bounded and unresolved violations remain explicit", async () => {
  const bad = { ...board, shots: [{ ...shot, description: "小林穿蓝衣" }] };
  let calls = 0;
  const result = await autoRepairStoryboard(bad, {
    ...review(),
    generate: async () => {
      calls++;
      return JSON.stringify(bad);
    },
  });
  assert.equal(calls, 2);
  assert.equal(result.compliant, false);
  assert.match(result.violations.join(""), /红衣/);
});

test("repair cannot erase dialogue, rename the shot or alter other narrative identities", async () => {
  for (const change of [
    { dialogue: "" },
    { id: "invented" },
    { characters: [] },
    { scene: "新场景" },
    { props: ["新道具"] },
  ]) {
    await assert.rejects(
      repairStoryboardShots(board, ["s1"], {
        ...review(),
        generate: async () =>
          JSON.stringify({
            title: board.title,
            shots: [{ ...shot, ...change }],
          }),
      }),
    );
  }
  const controller = new AbortController();
  await assert.rejects(
    repairStoryboardShots(board, ["s1"], {
      ...review(),
      signal: controller.signal,
      generate: async () => {
        controller.abort();
        return JSON.stringify({ title: board.title, shots: [shot] });
      },
    }),
  );
});

test("Floorplan preserves media, optics, annotations, grouping, edges and coordinates on roundtrip", () => {
  const bridge = createCanvasOperationFixture(["a", "b"]),
    state = bridge.getState();
  Object.assign(state.items[0], {
    node_rev: 1,
    kind: "image",
    assetId: "asset-" + "a".repeat(24),
    parameters: {
      ratio: "1:1",
      quality: "1K",
      duration: "4",
      count: "1",
      soundEnabled: false,
      optics: { lensMm: 85, aperture: "1.4", azimuthDeg: 10 },
    },
    tags: ["hero"],
    comments: [{ id: "review", text: "保留服装", resolved: false }],
  });
  state.canvas.positions.a = { x: 1234.5, y: -5678 };
  state.canvas.edges = [
    { id: "edge", source: "a", target: "b", kind: "result" },
  ];
  state.canvas.groups = [
    {
      id: "group",
      name: "Group",
      itemIds: ["a", "b"],
      borderColor: "#21a673",
      layoutMode: "grid",
      collapseMode: "info",
      createdAt: 1,
      updatedAt: 1,
    },
  ];
  const adapter = new FloorplanCanvasAdapter();
  const document = adapter.fromCanvas(
    state.items,
    state.canvas.positions,
    state.canvas.edges,
    state.canvas.groups,
  );
  assert.equal(document.nodes.find((n) => n.id === "a")?.parent, "group");
  const empty = createCanvasOperationFixture([]);
  const restored = applyCanvasOperation(
    empty.getState(),
    adapter.toCanvas(JSON.parse(JSON.stringify(document))),
  );
  assert.deepEqual(restored.items, state.items);
  assert.deepEqual(restored.canvas.positions, state.canvas.positions);
  assert.deepEqual(restored.canvas.edges, state.canvas.edges);
  // Optional undefined fields have no JSON representation at the persistence boundary.
  assert.deepEqual(
    JSON.parse(JSON.stringify(restored.canvas.groups)),
    JSON.parse(JSON.stringify(state.canvas.groups)),
  );
  const corrupt = structuredClone(document);
  corrupt.kkStudio.items[0].parameters!.optics!.lensMm = 0;
  assert.throws(() => adapter.toCanvas(corrupt));
});

test("requested MCP aliases, tags, comments, grid and layout change real state atomically", () => {
  const bridge = createCanvasOperationFixture(["a", "b"]),
    server = new CanvasMcpServer({
      ...bridge,
      autoLayout: (ids, direction) =>
        bridge.commit(autoLayoutCanvas(bridge.getState(), ids, direction)),
    });
  const ops = [
    { op: "tag_card", payload: { id: "a", tag: "hero" } },
    { op: "add_comment", payload: { id: "review", cardId: "a", text: "fix" } },
    { op: "resolve_comment", payload: { id: "review", cardId: "a" } },
    { op: "set_grid_mode", payload: { mode: "grid" } },
    { op: "set_snap_to_grid", payload: { enabled: true } },
    { op: "duplicate_cards", payload: { items: [{ id: "a", newId: "copy" }] } },
    { op: "select_cards", payload: { ids: ["copy"] } },
    {
      op: "connect_ports",
      payload: { id: "edge", source: "a", target: "b", kind: "result" },
    },
    { op: "update_edge", payload: { id: "edge", patch: { target: "copy" } } },
    { op: "auto_layout", payload: { direction: "TB" } },
  ];
  for (const op of ops)
    assert.equal(server.executeOp(op).success, true, JSON.stringify(op));
  const state = bridge.getState();
  assert.deepEqual(state.items[0].tags, ["hero"]);
  assert.equal(state.items[0].comments![0].resolved, true);
  assert.equal(state.gridMode, "grid");
  assert.equal(state.snapEnabled, true);
  assert.equal(state.canvas.edges[0].target, "copy");
  assert.deepEqual(state.selectedNodeIds, ["copy"]);
  const before = bridge.getState();
  assert.equal(
    server.executeOp({
      op: "batch_apply",
      payload: {
        operations: [
          { op: "remove_card", payload: { id: "a" } },
          { op: "move_card", payload: { id: "missing", x: 1, y: 2 } },
        ],
      },
    }).success,
    false,
  );
  assert.deepEqual(bridge.getState(), before);
  assert.equal(
    CanvasOpSchema.safeParse({
      op: "tag_card",
      payload: { id: "a", tag: "x", surprise: true },
    }).success,
    false,
  );
});

test("blueprint group overflow rejects before publishing an unsavable canvas", () => {
  const bridge = createCanvasOperationFixture(
    Array.from({ length: 100 }, (_, i) => `n${i}`),
  );
  const current = bridge.getState();
  current.canvas.groups = current.items.map((item, i) => ({
    id: `g${i}`,
    name: `G${i}`,
    itemIds: [item.id],
    borderColor: "#21a673",
    layoutMode: "grid",
    collapseMode: "info",
    createdAt: 1,
    updatedAt: 1,
  }));
  bridge.commit(current);
  const source = createCanvasOperationFixture(["imported"]).getState();
  source.canvas.groups = [
    {
      id: "extra",
      name: "Extra",
      itemIds: ["imported"],
      borderColor: "#21a673",
      layoutMode: "grid",
      collapseMode: "info",
      createdAt: 1,
      updatedAt: 1,
    },
  ];
  const adapter = new FloorplanCanvasAdapter();
  const op = adapter.toCanvas(
    adapter.fromCanvas(
      source.items,
      source.canvas.positions,
      source.canvas.edges,
      source.canvas.groups,
    ),
  );
  const before = bridge.getState();
  assert.equal(new CanvasMcpServer(bridge).executeOp(op).success, false);
  assert.deepEqual(bridge.getState(), before);
});

test("blueprint file limits support real media sizes at both boundaries without truncation", () => {
  const source = createCanvasOperationFixture(["media"]).getState();
  source.items[0].kind = "image";
  source.items[0].preview =
    "data:image/png;base64," + "a".repeat(3 * 1024 * 1024);
  const adapter = new FloorplanCanvasAdapter();
  const file = serializeFloorplanFile(
    adapter.fromCanvas(source.items, source.canvas.positions, []),
  );
  assert.ok(
    Buffer.byteLength(file) > 2 * 1024 * 1024 &&
      Buffer.byteLength(file) < MAX_FLOORPLAN_BYTES,
  );
  const restored = applyCanvasOperation(
    createCanvasOperationFixture([]).getState(),
    adapter.toCanvas(JSON.parse(file)),
  );
  assert.equal(restored.items[0].preview === source.items[0].preview, true);
  assert.throws(
    () => serializeFloorplanFile({ preview: "a".repeat(MAX_FLOORPLAN_BYTES) }),
    /64MB/,
  );
});

test("Floorplan import-export restores the original architecture kinds, paths and parent identity", () => {
  const architecture = {
    nodes: [
      {
        id: "root",
        label: "API",
        kind: "service",
        paths: ["src/api/**"],
        summary: "API server",
      },
      {
        id: "child",
        label: "Queue",
        kind: "worker",
        parent: "root",
        paths: ["src/jobs/**"],
        summary: "Background jobs",
      },
    ],
    edges: [],
  };
  const adapter = new FloorplanCanvasAdapter();
  const state = applyCanvasOperation(
    createCanvasOperationFixture([]).getState(),
    adapter.toCanvas(architecture, "topology"),
  );
  const output = adapter.fromCanvas(
    state.items,
    state.canvas.positions,
    state.canvas.edges,
    state.canvas.groups,
  );
  const root = output.nodes.find((n) => n.label === "API")!,
    child = output.nodes.find((n) => n.label === "Queue")!;
  assert.equal(root.kind, "service");
  assert.deepEqual(root.paths, ["src/api/**"]);
  assert.equal(root.summary, "API server");
  assert.equal(child.kind, "worker");
  assert.equal(child.parent, root.id);
  assert.deepEqual(child.paths, ["src/jobs/**"]);
});
