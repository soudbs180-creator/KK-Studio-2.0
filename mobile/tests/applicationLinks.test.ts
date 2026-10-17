import test from "node:test";
import assert from "node:assert/strict";
import { safeNativePath } from "../src/application/nativeLinks.ts";
const owned = {
  tasks: new Set(["task-owned"]),
  assets: new Set(["asset-1234567890abcdef12345678"]),
  connections: new Set(["connection-owned"]),
};
test("advanced routes preserve owned project/material/job links and clear ownership on logout", async () => {
  const { updateLinkOwnership, getNativeLinkOwnership } =
    await import("../src/application/nativeLinks.ts");
  const local = { ...owned, projects: new Set(["project-owned"]) };
  for (const path of [
    "/canvas/project-owned",
    "/proposals/project-owned",
    "/extensions",
    "/comfy",
    "/comfy/new",
    "/comfy/connection-owned",
    "/comfy/tasks/task-owned",
    "/materials/asset-1234567890abcdef12345678/edit",
  ])
    assert.equal(safeNativePath(path, local), path);
  for (const path of [
    "/comfy/tasks/task-other",
    "/comfy/connection-other",
    "/canvas/project-other",
    "/proposals/project-owned/edit",
    "/comfy/tasks/task-owned?token=secret",
    "/comfy/%FE%FF",
  ])
    assert.equal(safeNativePath(path, local), "/link-error");
  updateLinkOwnership(null);
  for (const path of [
    "/canvas/project-owned",
    "/comfy/connection-owned",
    "/comfy/tasks/task-owned",
    "/materials/asset-1234567890abcdef12345678/edit",
  ])
    assert.equal(safeNativePath(path, getNativeLinkOwnership()), "/link-error");
});
test("KK native links preserve only known routes and account-owned details", () => {
  assert.equal(
    safeNativePath("kkstudio-mobile://projects", owned),
    "/projects",
  );
  assert.equal(
    safeNativePath("https://kkai.plus/tasks/task-owned", owned),
    "/tasks/task-owned",
  );
  assert.equal(
    safeNativePath("/materials/asset-1234567890abcdef12345678", owned),
    "/materials/asset-1234567890abcdef12345678",
  );
  assert.equal(safeNativePath("/tasks/task-other", owned), "/link-error");
  assert.equal(
    safeNativePath("https://other.example/tasks/task-owned", owned),
    "/link-error",
  );
});
test("library and message links require current account ownership and reject secret queries", () => {
  const local = {
    ...owned,
    library: new Set(["entry-owned"]),
    messages: new Set(["message-owned"]),
  };
  for (const path of [
    "/search",
    "/library",
    "/library/new",
    "/library/entry-owned",
    "/library/entry-owned/edit",
    "/messages/message-owned",
  ])
    assert.equal(safeNativePath(path, local), path);
  for (const path of [
    "/library/entry-other",
    "/messages/message-other",
    "/messages/message-owned/edit",
    "/library/entry-owned?token=private",
    "/library/%FE%FF",
  ])
    assert.equal(safeNativePath(path, local), "/link-error");
  assert.equal(safeNativePath("/library/entry-owned", owned), "/link-error");
});
test("project management links require an owned project and preserve the static message list", () => {
  const local = { ...owned, projects: new Set(["project-owned"]) };
  assert.equal(
    safeNativePath("/projects/project-owned", local),
    "/projects/project-owned",
  );
  assert.equal(safeNativePath("/messages", local), "/messages");
  assert.equal(safeNativePath("/projects/project-other", local), "/link-error");
  assert.equal(
    safeNativePath("/projects/project-owned/edit", local),
    "/link-error",
  );
});
test(
  "malformed percent data and encoded secret query never reach a fallback decoder",
  { timeout: 1000 },
  () => {
    for (const path of [
      "/tasks/%",
      "/tasks/%GG",
      "/tasks/" + "%FE%FF".repeat(30),
      "/settings?%74oken=private",
      "/settings?access_token=x",
      "/settings#token=x",
      "/tasks/%2525",
      "/../settings",
      "/settings\\login",
      "/" + "x".repeat(3000),
    ])
      assert.equal(safeNativePath(path, owned), "/link-error");
  },
);
test("development transport is explicit, restricted and stripped before route parsing", () => {
  assert.equal(
    safeNativePath("exp://127.0.0.1:8081/--/tasks/task-owned", owned),
    "/link-error",
  );
  assert.equal(
    safeNativePath("exp://127.0.0.1:8081/--/tasks/task-owned", owned, true),
    "/tasks/task-owned",
  );
  assert.equal(
    safeNativePath(
      "kkstudio-mobile://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A8081",
      owned,
      true,
    ),
    "/",
  );
  assert.equal(
    safeNativePath(
      "kkstudio-mobile://expo-development-client/?url=https%3A%2F%2Fother.example",
      owned,
      true,
    ),
    "/link-error",
  );
});
