import assert from "node:assert/strict";
import test from "node:test";
import * as policy from "../../scripts/governance/push-policy.mjs";

const tip = "a".repeat(40);
const zero = "0".repeat(40);
const repo = "owner/studio";
const ref = "refs/heads/fix/merged";
const deletion = `(delete) ${zero} ${ref} ${tip}`;
const merged = {
  state: "closed",
  merged_at: "2026-11-09T00:00:00Z",
  head: { sha: tip, ref: "fix/merged", repo: { full_name: repo } },
  base: { ref: "main", repo: { full_name: repo } },
};

async function collect(
  pulls: unknown[],
  input = deletion,
  url = "https://github.com/owner/studio.git",
) {
  assert.equal(
    typeof policy.collectMergedTopicTips,
    "function",
    "merged-PR verification must exist",
  );
  return policy.collectMergedTopicTips(input, url, async (request: string) => {
    assert.equal(new URL(request).origin, "https://api.github.com");
    assert.equal(new URL(request).pathname, "/repos/owner/studio/pulls");
    return new Response(JSON.stringify(pulls));
  });
}

test("merged PR cleanup supports merge, squash and SSH remotes at the exact original head", async () => {
  assert.deepEqual(await collect([merged]), new Map([[ref, tip]]));
  assert.deepEqual(
    await collect([merged], deletion, "git@github.com:owner/studio.git"),
    new Map([[ref, tip]]),
  );
});

test("cleanup refuses unmerged, reused and cross-repository branch tips", async () => {
  for (const pull of [
    { ...merged, merged_at: null },
    { ...merged, state: "open" },
    { ...merged, head: { ...merged.head, sha: "b".repeat(40) } },
    { ...merged, head: { ...merged.head, repo: { full_name: "fork/studio" } } },
    {
      ...merged,
      base: { ...merged.base, repo: { full_name: "other/studio" } },
    },
  ])
    assert.deepEqual(await collect([pull]), new Map());
});

test("an open head PR or stacked base PR retains a previously merged branch", async () => {
  for (const open of [
    { ...merged, state: "open", merged_at: null },
    {
      ...merged,
      state: "open",
      head: { ...merged.head, ref: "fix/next" },
      base: { ...merged.base, ref: "fix/merged" },
    },
  ])
    assert.deepEqual(await collect([merged, open]), new Map());
});

test("untrusted URLs and pushes without topic deletions do not trigger an API request", async () => {
  assert.equal(typeof policy.collectMergedTopicTips, "function");
  for (const [input, url] of [
    [deletion, "https://github.com.attacker.invalid/owner/studio.git"],
    [deletion, "https://user:secret@github.com/owner/studio.git"],
    [deletion, "file:///remote.git"],
    [`HEAD ${tip} ${ref} ${zero}`, "https://github.com/owner/studio.git"],
    [
      `(delete) ${zero} refs/heads/main ${tip}`,
      "https://github.com/owner/studio.git",
    ],
    ["bad input", "https://github.com/owner/studio.git"],
  ])
    assert.deepEqual(
      await policy.collectMergedTopicTips(input, url, async () => {
        throw new Error("unexpected network request");
      }),
      new Map(),
    );
});

test("API failures and malformed responses cannot authorize deletion", async () => {
  assert.equal(typeof policy.collectMergedTopicTips, "function");
  for (const request of [
    async () => new Response("rate limited", { status: 403 }),
    async () => new Response("{}"),
    async () => {
      throw new Error("offline");
    },
  ])
    await assert.rejects(
      policy.collectMergedTopicTips(
        deletion,
        "https://github.com/owner/studio.git",
        request,
      ),
    );
});

test("pagination includes older open dependencies before permitting deletion", async () => {
  assert.equal(typeof policy.collectMergedTopicTips, "function");
  let page = 0;
  const tips = await policy.collectMergedTopicTips(
    deletion,
    "https://github.com/owner/studio.git",
    async () => {
      page += 1;
      return new Response(
        JSON.stringify(
          page === 1
            ? Array.from({ length: 100 }, () => merged)
            : [{ ...merged, state: "open", merged_at: null }],
        ),
      );
    },
  );
  assert.equal(page, 2);
  assert.deepEqual(tips, new Map());
});
