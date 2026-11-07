import assert from "node:assert/strict";
import test from "node:test";
import {
  createProject,
  emptySnapshot,
  normalizeCreationSnapshot,
  serializeCreationSnapshot,
  type CreationSnapshot,
  type SidebarPreferences,
} from "../../src/features/creation/model.ts";
import { parseSnapshot } from "../../src/features/creation/snapshotCodec.ts";
import { applyProjectLifecycle } from "../../src/features/projects/projectLifecycle.ts";

function fixture(version: 2 | 3 = 3): CreationSnapshot {
  const project = createProject({
    prompt: "sidebar fixture",
    model: "synthetic",
    kind: "image",
    attachments: [],
  });
  project.id = "p1";
  return serializeCreationSnapshot({
    ...emptySnapshot(),
    version,
    activeProjectId: "p1",
    projects: [project],
    projectGroups: [{ id: "g1", name: "Group" }],
  });
}

const preferences: SidebarPreferences = {
  sortMode: "priority",
  pinnedProjectIds: ["p1"],
  pinnedGroupIds: ["g1"],
};

for (const version of [2, 3] as const) {
  test(`v${version} legacy snapshots do not acquire sidebar preferences on read`, () => {
    const loaded = parseSnapshot(JSON.stringify(fixture(version)));
    assert.equal(Object.hasOwn(loaded, "sidebarPreferences"), false);
    assert.equal(
      Object.hasOwn(serializeCreationSnapshot(loaded), "sidebarPreferences"),
      false,
    );
  });

  test(`v${version} sidebar preferences survive canonical JSON reload`, () => {
    const snapshot = { ...fixture(version), sidebarPreferences: preferences };
    const loaded = parseSnapshot(JSON.stringify(snapshot));
    assert.deepEqual(loaded.sidebarPreferences, preferences);
    assert.deepEqual(
      serializeCreationSnapshot(loaded).sidebarPreferences,
      preferences,
    );
  });

  test(`v${version} rejects malformed or dangling sidebar preferences without repairing them`, () => {
    for (const sidebarPreferences of [
      null,
      [],
      {},
      { ...preferences, sortMode: "alphabetical" },
      { ...preferences, pinnedProjectIds: "p1" },
      { ...preferences, pinnedGroupIds: [1] },
      { ...preferences, pinnedProjectIds: ["p1", "p1"] },
      { ...preferences, pinnedGroupIds: ["g1", "g1"] },
      { ...preferences, pinnedProjectIds: ["missing"] },
      { ...preferences, pinnedGroupIds: ["missing"] },
      { ...preferences, pinnedProjectIds: [""] },
      { ...preferences, futureSetting: true },
    ]) {
      const raw = { ...fixture(version), sidebarPreferences };
      const original = JSON.stringify(raw);
      assert.throws(() => parseSnapshot(original), original);
      assert.equal(normalizeCreationSnapshot(raw), null, original);
      assert.equal(JSON.stringify(raw), original);
    }
  });

  test(`v${version} rejects blank pin identities even when a malformed project has that ID`, () => {
    const snapshot = fixture(version);
    const raw = {
      ...snapshot,
      activeProjectId: null,
      projects: [{ ...snapshot.projects[0], id: " " }],
      sidebarPreferences: { ...preferences, pinnedProjectIds: [" "] },
    };
    assert.equal(normalizeCreationSnapshot(raw), null);
    assert.throws(() => parseSnapshot(JSON.stringify(raw)));
  });
}

test("sidebar sort and pin actions preserve project content, recency and manual order", () => {
  const initial = fixture();
  let snapshot = applyProjectLifecycle(initial, {
    type: "toggle-project-pin",
    id: "p1",
  });
  snapshot = applyProjectLifecycle(snapshot, {
    type: "toggle-group-pin",
    id: "g1",
  });
  snapshot = applyProjectLifecycle(snapshot, {
    type: "set-sidebar-sort",
    sortMode: "recent",
  });
  assert.deepEqual(snapshot.sidebarPreferences, {
    sortMode: "recent",
    pinnedProjectIds: ["p1"],
    pinnedGroupIds: ["g1"],
  });
  assert.equal(snapshot.projects, initial.projects);
  assert.equal(snapshot.projectGroups, initial.projectGroups);
  assert.equal(initial.sidebarPreferences, undefined);
  snapshot = applyProjectLifecycle(snapshot, {
    type: "toggle-project-pin",
    id: "p1",
  });
  snapshot = applyProjectLifecycle(snapshot, {
    type: "toggle-group-pin",
    id: "g1",
  });
  assert.deepEqual(snapshot.sidebarPreferences, {
    sortMode: "recent",
    pinnedProjectIds: [],
    pinnedGroupIds: [],
  });
});

test("trash and group restoration retain pins against the complete snapshot", () => {
  let snapshot: CreationSnapshot = {
    ...fixture(),
    sidebarPreferences: preferences,
  };
  snapshot = applyProjectLifecycle(snapshot, {
    type: "move-project",
    id: "p1",
    groupId: "g1",
  });
  snapshot = applyProjectLifecycle(snapshot, {
    type: "trash-project",
    id: "p1",
  });
  snapshot = applyProjectLifecycle(snapshot, {
    type: "delete-group",
    id: "g1",
  });
  snapshot = parseSnapshot(JSON.stringify(serializeCreationSnapshot(snapshot)));
  assert.deepEqual(snapshot.sidebarPreferences, preferences);
  snapshot = applyProjectLifecycle(snapshot, {
    type: "restore-project",
    id: "p1",
  });
  snapshot = applyProjectLifecycle(snapshot, {
    type: "restore-group",
    id: "g1",
  });
  assert.deepEqual(snapshot.sidebarPreferences, preferences);
  assert.equal(snapshot.projects[0].id, "p1");
  assert.equal(snapshot.projects[0].groupId, undefined);
});

test("invalid sidebar actions leave the supplied snapshot untouched", () => {
  const snapshot = fixture();
  const original = JSON.stringify(snapshot);
  for (const action of [
    { type: "toggle-project-pin", id: "missing" },
    { type: "toggle-group-pin", id: "missing" },
    { type: "set-sidebar-sort", sortMode: "invented" },
  ]) {
    assert.throws(() =>
      applyProjectLifecycle(
        snapshot,
        action as Parameters<typeof applyProjectLifecycle>[1],
      ),
    );
    assert.equal(JSON.stringify(snapshot), original);
  }
});

test("v3 sidebar edits preserve opaque root and project recovery metadata", () => {
  const snapshot = fixture();
  const raw = {
    ...snapshot,
    recoveryMetadata: { marker: "retain-root" },
    projects: snapshot.projects.map((project) => ({
      ...project,
      recoveryMetadata: { marker: "retain-project" },
    })),
    sidebarPreferences: preferences,
  };
  const updated = applyProjectLifecycle(parseSnapshot(JSON.stringify(raw)), {
    type: "set-sidebar-sort",
    sortMode: "manual",
  });
  const persisted = JSON.parse(
    JSON.stringify(serializeCreationSnapshot(updated)),
  );
  assert.deepEqual(persisted.recoveryMetadata, { marker: "retain-root" });
  assert.deepEqual(persisted.projects[0].recoveryMetadata, {
    marker: "retain-project",
  });
  assert.deepEqual(persisted.sidebarPreferences, {
    ...preferences,
    sortMode: "manual",
  });
});
