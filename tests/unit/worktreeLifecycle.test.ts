import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { type TestContext } from "node:test";
import { fileURLToPath } from "node:url";
import {
  assessGeneratedCandidate,
  applyReclamationPlan,
  assessWorktreeRemoval,
  buildReclamationManifest,
  buildRecoveryInventory,
  defaultReclamationOutputDirectory,
  isContainedPath,
  validateApprovedCandidates,
  verifyRecoveryBundle,
  writeApplyResult,
  writeImmutablePlan,
} from "../../scripts/governance/worktree-reclaim.mjs";
import {
  DEFAULT_WORKTREE_POLICY,
  checkWorktreeCreation,
  loadWorktreePolicy,
  measureGeneratedBytes,
} from "../../scripts/governance/worktree-policy.mjs";

test("reclamation output defaults to the dated container output directory", () => {
  assert.equal(
    defaultReclamationOutputDirectory(
      "D:/kk-studio/KK-Studio-2.0",
      new Date("2026-10-12T00:00:00Z"),
    ),
    path.join("D:/kk-studio", "output", "2026-10-12-worktree-reclamation"),
  );
});

test("worktree removal requires every task DONE and a main-reachable commit", () => {
  const base = {
    exists: true,
    inWorkspace: true,
    primary: false,
    current: false,
    dirty: 0,
    locked: false,
    branch: "codex/TASK-1",
    head: "abc123",
  };
  assert.equal(
    assessWorktreeRemoval({
      ...base,
      taskStatuses: ["DONE"],
      reachableFromMain: true,
    }).allowed,
    true,
  );
  assert.equal(
    assessWorktreeRemoval({
      ...base,
      taskStatuses: ["DONE", "PARTIAL"],
      reachableFromMain: true,
    }).allowed,
    false,
  );
  assert.equal(
    assessWorktreeRemoval({
      ...base,
      taskStatuses: ["DONE"],
      reachableFromMain: false,
    }).allowed,
    false,
  );
  assert.equal(
    assessWorktreeRemoval({
      ...base,
      current: true,
      taskStatuses: ["DONE"],
      reachableFromMain: true,
    }).allowed,
    false,
  );
});

test("candidate validation rejects escape paths, tracked content, symlinks, and evidence", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kk-worktree-"));
  const generated = path.join(root, "node_modules");
  fs.mkdirSync(generated);
  fs.writeFileSync(path.join(generated, "package.json"), "{}");
  assert.equal(isContainedPath(root, generated), true);
  assert.equal(isContainedPath(root, path.join(root, "..", "outside")), false);
  assert.equal(
    assessGeneratedCandidate({
      path: generated,
      worktreeRoot: root,
      tracked: true,
    }).allowed,
    false,
  );
  assert.equal(
    assessGeneratedCandidate({
      path: path.join(root, "evidence"),
      worktreeRoot: root,
      ignored: true,
    }).allowed,
    false,
  );
  assert.equal(
    assessGeneratedCandidate({
      path: path.join(root, "node_modules"),
      worktreeRoot: root,
      ignored: true,
    }).allowed,
    true,
  );
  fs.rmSync(root, { recursive: true, force: true });
});

test("reclamation protects the target index and rejects a plan after HEAD changes", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kk-worktree-apply-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const physicalRoot = path.join(root, "physical");
  const aliasedRoot = path.join(root, "alias");
  fs.mkdirSync(physicalRoot);
  fs.symlinkSync(physicalRoot, aliasedRoot, "junction");
  const repo = path.join(aliasedRoot, "project");
  const target = path.join(repo, ".worktrees", "topic");
  fs.mkdirSync(repo);
  const env = {
    ...process.env,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : os.devNull,
  };
  const git = (cwd: string, ...args: string[]) =>
    execFileSync("git", args, {
      cwd,
      env,
      encoding: "utf8",
      stdio: "pipe",
    }).trim();
  git(repo, "init", "-qb", "main");
  git(repo, "config", "user.email", "fixture@example.test");
  git(repo, "config", "user.name", "Worktree fixture");
  const write = (directory: string, file: string, value: string) => {
    const destination = path.join(directory, file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, value);
  };
  write(
    repo,
    ".gitignore",
    ".worktrees/\n.tmp/\ndist/\nnode_modules/\ntest-results/\n",
  );
  git(repo, "add", ".gitignore");
  git(repo, "commit", "-qm", "workspace rules");
  git(repo, "update-ref", "refs/remotes/origin/main", "HEAD");
  git(repo, "worktree", "add", "-qb", "fixture-topic", target);
  write(target, "dist/tracked.txt", "committed on topic only");
  git(target, "add", "-f", "--", "dist/tracked.txt");
  git(target, "commit", "-qm", "track generated path as source");
  write(target, ".tmp/output/receipt.json", "{}");
  write(target, "node_modules/disposable.txt", "ignored");
  write(target, "test-results/another.txt", "independently reviewed");
  const outside = path.join(root, "outside");
  const escape = path.join(repo, ".worktrees", "escape");
  fs.mkdirSync(outside);
  fs.symlinkSync(outside, escape, "junction");
  const external = path.join(escape, "topic");
  git(repo, "worktree", "add", "-qb", "external-topic", external, "main");
  write(external, "node_modules/retained.txt", "outside the approved root");
  assert.equal(
    defaultReclamationOutputDirectory(repo, new Date("2026-11-25T00:00:00Z")),
    path.join(repo, ".tmp", "2026-11-25-worktree-reclamation"),
  );
  const bundle = path.join(root, "topic.bundle");
  git(repo, "bundle", "create", bundle, "refs/heads/fixture-topic");
  const plannedHead = git(target, "rev-parse", "HEAD");
  assert.equal(verifyRecoveryBundle(bundle, repo, plannedHead), true);

  const manifest = buildReclamationManifest(repo);
  const entry = manifest.worktrees.find(
    (item) => item.branch === "fixture-topic",
  );
  assert.ok(entry);
  assert.equal(entry.inWorkspace, true);
  const escaped = manifest.worktrees.find(
    (item) => item.branch === "external-topic",
  );
  assert.ok(escaped?.removal.reasons.includes("EXTERNAL_WORKTREE"));
  assert.equal(escaped?.generatedPaths.length, 0);
  assert.equal(
    entry.generatedPaths.find((item) => item.path.endsWith("/dist"))?.tracked,
    true,
  );
  assert.equal(
    entry.generatedPaths.find((item) => item.path.endsWith("/.tmp"))?.evidence,
    true,
  );
  assert.ok(entry.removal.reasons.includes("WORKTREE_CONTAINS_EVIDENCE"));
  const plan = JSON.parse(
    fs.readFileSync(writeImmutablePlan(manifest, root), "utf8"),
  );
  const candidate = plan.candidates.find((item) =>
    item.path.endsWith("/node_modules"),
  );
  const other = plan.candidates.find((item) =>
    item.path.endsWith("/test-results"),
  );
  assert.ok(candidate && other);
  const apply = (currentPlan: unknown, candidateId: string) =>
    applyReclamationPlan(currentPlan, {
      repoRoot: repo,
      approvedCandidates: [candidateId],
    });
  const forged = { ...plan, candidates: [{ ...other, id: candidate.id }] };
  const swapped = apply(forged, candidate.id);
  assert.deepEqual(swapped.removed, []);
  assert.equal(swapped.failed[0]?.reason, "CANDIDATE_IDENTITY_CHANGED");
  assert.ok(fs.existsSync(path.join(target, "test-results/another.txt")));

  const coord = path.join(repo, ".worktrees", "TASK-COORD-LEDGER");
  git(repo, "worktree", "add", "-qb", "coord/ledger", coord, "main");
  const completed = {
    id: "FIXTURE",
    branch: "fixture-topic",
    worktree: target,
    status: "DONE",
  };
  const conflictingLease = {
    id: "OTHER",
    branch: "different-branch",
    worktree: "unallocated",
    status: "IN_PROGRESS",
    lock: { branch: "different-branch", worktree: target },
  };
  write(coord, "ledger.json", JSON.stringify([completed, conflictingLease]));
  git(coord, "add", "ledger.json");
  git(coord, "commit", "-qm", "initial ledger");
  const locked = buildReclamationManifest(repo).worktrees.find(
    (item) => item.branch === "fixture-topic",
  );
  assert.ok(locked?.removal.reasons.includes("ACTIVE_TASK"));
  const active = apply(plan, candidate.id);
  assert.deepEqual(active.removed, []);
  assert.equal(active.failed[0]?.reason, "WORKTREE_STATE_CHANGED");
  const leaseAlias = path.join(repo, ".tmp", "lease-alias");
  fs.mkdirSync(path.dirname(leaseAlias));
  fs.symlinkSync(target, leaseAlias, "junction");
  write(
    coord,
    "ledger.json",
    JSON.stringify([
      completed,
      {
        ...conflictingLease,
        lock: { ...conflictingLease.lock, worktree: leaseAlias },
      },
    ]),
  );
  const aliased = buildReclamationManifest(repo).worktrees.find(
    (item) => item.branch === "fixture-topic",
  );
  assert.ok(aliased?.removal.reasons.includes("ACTIVE_TASK"));
  assert.equal(
    apply(plan, candidate.id).failed[0]?.reason,
    "WORKTREE_STATE_CHANGED",
  );
  write(coord, "ledger.json", JSON.stringify([completed]));

  git(
    target,
    "commit",
    "--allow-empty",
    "-qm",
    "move topic without changing files",
  );
  assert.equal(
    verifyRecoveryBundle(bundle, repo, git(target, "rev-parse", "HEAD")),
    false,
  );
  const result = apply(plan, candidate.id);
  assert.deepEqual(result.removed, []);
  assert.deepEqual(result.failed, [
    { path: candidate.path, reason: "WORKTREE_REGISTRATION_CHANGED" },
  ]);
  assert.ok(fs.existsSync(path.join(target, "node_modules/disposable.txt")));
  const refreshed = buildReclamationManifest(repo);
  const updated = JSON.parse(
    fs.readFileSync(writeImmutablePlan(refreshed, root), "utf8"),
  );
  const next = updated.candidates.find((item) =>
    item.path.endsWith("/node_modules"),
  );
  assert.ok(next);
  const accepted = apply(updated, next.id);
  assert.deepEqual(accepted.failed, []);
  assert.deepEqual(accepted.removed, [next.path]);
  assert.ok(fs.existsSync(path.join(target, "dist/tracked.txt")));
  assert.ok(fs.existsSync(path.join(target, ".tmp/output/receipt.json")));
  assert.ok(fs.existsSync(path.join(external, "node_modules/retained.txt")));

  const tool = fileURLToPath(
    new URL("../../scripts/governance/worktree-reclaim.mjs", import.meta.url),
  );
  const unused = path.join(root, "unexpected-output");
  execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      "import { pathToFileURL } from 'node:url'; await import(pathToFileURL(process.argv[1]));",
      tool,
    ],
    { cwd: repo, env: { ...env, KK_CONTAINER_ROOT: unused }, stdio: "pipe" },
  );
  assert.equal(fs.existsSync(unused), false);
});

function reclamationFixture(t: TestContext) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kk-worktree-lease-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const repo = path.join(root, "repo");
  const target = path.join(repo, ".worktrees", "topic");
  const coord = path.join(repo, ".worktrees", "TASK-COORD-LEDGER");
  const write = (directory: string, file: string, value: string) => {
    const destination = path.join(directory, file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, value);
  };
  const git = (cwd: string, ...args: string[]) =>
    execFileSync("git", args, { cwd, stdio: "pipe" });
  fs.mkdirSync(repo);
  git(repo, "init", "--template=", "-qb", "main");
  git(repo, "config", "user.email", "fixture@example.test");
  git(repo, "config", "user.name", "Worktree fixture");
  git(repo, "config", "commit.gpgsign", "false");
  write(repo, ".gitignore", ".worktrees/\nnode_modules/\n");
  git(repo, "add", ".gitignore");
  git(repo, "commit", "-qm", "fixture");
  git(repo, "update-ref", "refs/remotes/origin/main", "HEAD");
  git(repo, "worktree", "add", "-qb", "fixture-topic", target);
  const snapshot = (...tasks: object[]) =>
    write(repo, "docs/governance/task-ledger.json", JSON.stringify(tasks));
  const addCoordinator = (checkout: string, ...tasks: object[]) => {
    git(repo, "worktree", "add", "-qb", "coord/ledger", checkout, "main");
    write(checkout, "ledger.json", JSON.stringify(tasks));
    git(checkout, "add", "ledger.json");
    git(checkout, "commit", "-qm", "initial ledger");
  };
  const done = {
    id: "LEASE",
    branch: "fixture-topic",
    worktree: target,
    status: "DONE",
  };
  const active = {
    ...done,
    status: "IN_PROGRESS",
    lock: { branch: done.branch, worktree: target },
  };
  const topic = () =>
    buildReclamationManifest(repo).worktrees.find(
      ({ branch }) => branch === done.branch,
    );
  const generated = "node_modules/disposable.txt";
  write(target, generated, "fixture bytes");
  return {
    root,
    repo,
    target,
    coord,
    git,
    write,
    snapshot,
    addCoordinator,
    done,
    active,
    topic,
    generated,
  };
}

function approveGeneratedFixture({
  root,
  repo,
}: Pick<ReturnType<typeof reclamationFixture>, "root" | "repo">) {
  const plan = JSON.parse(
    fs.readFileSync(
      writeImmutablePlan(buildReclamationManifest(repo), root),
      "utf8",
    ),
  );
  const candidate = plan.candidates.find((entry: { path: string }) =>
    entry.path.endsWith("/node_modules"),
  );
  assert.ok(candidate);
  return {
    plan,
    candidatePath: candidate.path,
    approvedCandidates: [candidate.id],
  };
}

test("historical paths protect active leases without proving current branch completion", (t) => {
  const { root, target, snapshot, done, active, topic } = reclamationFixture(t);
  const alias = path.join(root, "historic-alias");
  fs.symlinkSync(target, alias, "junction");
  snapshot({ ...done, branch: "retired-branch", worktree: alias });
  assert.deepEqual(topic()?.taskStatuses, []);
  assert.ok(topic()?.removal.reasons.includes("TASK_NOT_DONE"));
  assert.equal(topic()?.active, false);
  snapshot({
    ...active,
    branch: "another-branch",
    lock: { branch: "another-branch", worktree: alias },
  });
  assert.ok(topic()?.removal.reasons.includes("ACTIVE_TASK"));
  snapshot(done);
  assert.equal(topic()?.removal.allowed, true);
});

test("only the safe repository coordination checkout can override the snapshot", (t) => {
  const {
    root,
    repo,
    target,
    coord,
    git,
    write,
    snapshot,
    addCoordinator,
    done,
    active,
    topic,
    generated,
  } = reclamationFixture(t);
  snapshot(done);
  const { plan, approvedCandidates } = approveGeneratedFixture({ root, repo });
  snapshot(active);
  const external = path.join(root, "external-coord");
  addCoordinator(external, done);
  assert.throws(() => buildReclamationManifest(repo), /coordination ledger/i);
  write(
    repo,
    "config/coord.json",
    JSON.stringify({ path: "../external-coord" }),
  );
  assert.throws(() => buildReclamationManifest(repo), /coordination ledger/i);
  assert.throws(
    () =>
      applyReclamationPlan(plan, {
        repoRoot: repo,
        approvedCandidates,
      }),
    /coordination ledger/i,
  );
  assert.equal(
    fs.readFileSync(path.join(target, generated), "utf8"),
    "fixture bytes",
  );

  const other = path.join(repo, ".worktrees", "other-coordinator");
  git(repo, "worktree", "move", external, other);
  assert.throws(() => buildReclamationManifest(repo), /coordination ledger/i);
  write(
    repo,
    "config/coord.json",
    JSON.stringify({ path: ".worktrees/other-coordinator" }),
  );
  assert.equal(topic()?.removal.allowed, true);
  git(repo, "worktree", "move", other, coord);
  write(
    repo,
    "config/coord.json",
    JSON.stringify({ path: ".worktrees/TASK-COORD-LEDGER" }),
  );
  write(coord, "ledger.json", JSON.stringify([done, done]));
  assert.throws(() => buildReclamationManifest(repo), /coordination ledger/i);
  write(coord, "ledger.json", JSON.stringify([{ ...done, status: "OTHER" }]));
  assert.throws(() => buildReclamationManifest(repo), /coordination ledger/i);
  write(coord, "ledger.json", JSON.stringify([{ ...done, worktree: null }]));
  assert.throws(() => buildReclamationManifest(repo), /coordination ledger/i);
  const ledger = path.join(coord, "ledger.json");
  fs.renameSync(ledger, path.join(coord, "saved-ledger.json"));
  fs.symlinkSync(root, ledger, "junction");
  assert.throws(() => buildReclamationManifest(repo), /coordination ledger/i);
});

function applyAfterInventoryRead(
  t: TestContext,
  fixture: ReturnType<typeof reclamationFixture>,
  changeRegistration: () => void,
) {
  const { repo, target, snapshot, done, generated } = fixture;
  snapshot(done);
  const { plan, candidatePath, approvedCandidates } =
    approveGeneratedFixture(fixture);
  const receipt = path.join(target, generated);
  const inventoryReceipt = path.join(candidatePath, path.basename(receipt));
  assert.equal(
    fs.realpathSync.native(inventoryReceipt),
    fs.realpathSync.native(receipt),
  );
  const readFile = fs.readFileSync;
  let changed = false;
  t.mock.method(fs, "readFileSync", (...args: Parameters<typeof readFile>) => {
    if (
      !changed &&
      typeof args[0] === "string" &&
      path.relative(inventoryReceipt, args[0]) === ""
    ) {
      changed = true;
      changeRegistration();
    }
    return readFile(...args);
  });
  const result = applyReclamationPlan(plan, {
    repoRoot: repo,
    approvedCandidates,
  });
  assert.equal(changed, true);
  assert.deepEqual(result.removed, []);
  assert.equal(result.failed[0]?.reason, "WORKTREE_STATE_CHANGED");
  assert.equal(readFile(receipt, "utf8"), "fixture bytes");
}

test("apply consults a coordinator registered after the initial reread", (t) => {
  const fixture = reclamationFixture(t);
  applyAfterInventoryRead(t, fixture, () =>
    fixture.addCoordinator(fixture.coord, fixture.active),
  );
});

test("apply retains a target whose Git registration becomes prunable", (t) => {
  const fixture = reclamationFixture(t);
  const { git, root, repo, target } = fixture;
  const gitDir = git(target, "rev-parse", "--absolute-git-dir")
    .toString("utf8")
    .trim();
  const head = git(target, "rev-parse", "HEAD").toString("utf8");
  applyAfterInventoryRead(t, fixture, () => {
    fs.writeFileSync(
      path.join(gitDir, "gitdir"),
      path.join(root, "missing", ".git") + "\n",
    );
    assert.match(
      git(repo, "worktree", "list", "--porcelain").toString("utf8"),
      /^prunable /m,
    );
    assert.equal(git(target, "rev-parse", "HEAD").toString("utf8"), head);
  });
});

test("an existing coordination ledger cannot be ignored after its branch switches", (t) => {
  const fixture = reclamationFixture(t);
  const {
    repo,
    target,
    coord,
    git,
    snapshot,
    write,
    addCoordinator,
    done,
    active,
    generated,
  } = fixture;
  snapshot(done);
  addCoordinator(coord, done);
  const { plan, approvedCandidates } = approveGeneratedFixture(fixture);
  write(coord, "ledger.json", JSON.stringify([active]));
  git(coord, "commit", "-qam", "record new fixture lease");
  git(coord, "switch", "-qc", "coord/maintenance");
  assert.throws(() => buildReclamationManifest(repo), /coordination ledger/i);
  assert.throws(
    () => applyReclamationPlan(plan, { repoRoot: repo, approvedCandidates }),
    /coordination ledger/i,
  );
  assert.equal(
    fs.readFileSync(path.join(target, generated), "utf8"),
    "fixture bytes",
  );
});

test("apply retains an approved target if its original coordinator is no longer registered", (t) => {
  const fixture = reclamationFixture(t);
  const {
    root,
    repo,
    target,
    coord,
    git,
    snapshot,
    addCoordinator,
    done,
    generated,
  } = fixture;
  snapshot(done);
  addCoordinator(coord, done);
  const { plan, approvedCandidates } = approveGeneratedFixture(fixture);
  git(coord, "switch", "-qc", "coord/maintenance");
  git(repo, "worktree", "move", coord, path.join(root, "moved-coordinator"));
  assert.equal(fs.existsSync(coord), false);
  assert.doesNotThrow(() => buildReclamationManifest(repo));
  assert.throws(
    () => applyReclamationPlan(plan, { repoRoot: repo, approvedCandidates }),
    /coordination ledger/i,
  );
  assert.equal(
    fs.readFileSync(path.join(target, generated), "utf8"),
    "fixture bytes",
  );
});

test("recovery inventory is deterministic and hashes source files", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kk-inventory-"));
  fs.writeFileSync(path.join(root, "a.txt"), "alpha");
  const first = buildRecoveryInventory(root);
  const second = buildRecoveryInventory(root);
  assert.deepEqual(first, second);
  assert.equal(first.files[0].sha256.length, 64);
  fs.rmSync(root, { recursive: true, force: true });
});

test("only candidates present in an immutable plan may be approved", () => {
  const plan = {
    schemaVersion: 2,
    immutable: true,
    candidates: [
      {
        id: "candidate-1",
        path: "D:/kk-studio/.worktrees/a/node_modules",
        action: "PRUNE_GENERATED",
      },
    ],
  };
  assert.deepEqual(validateApprovedCandidates(plan, ["candidate-1"]), {
    ok: true,
    candidates: [plan.candidates[0]],
  });
  assert.equal(validateApprovedCandidates(plan, ["candidate-2"]).ok, false);
});

test("apply results are written as unique audit records", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kk-result-"));
  const plan = { planId: "plan-1" };
  const resultPath = writeApplyResult(
    {
      removed: [],
      failed: [],
      removedWorktrees: [],
      appliedAt: "2026-10-09T00:00:00Z",
    },
    plan,
    root,
  );
  assert.equal(fs.existsSync(resultPath), true);
  assert.equal(
    JSON.parse(fs.readFileSync(resultPath, "utf8")).planId,
    "plan-1",
  );
  fs.rmSync(root, { recursive: true, force: true });
});

test("immutable plan captures source hashes and never overwrites the same run", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kk-plan-"));
  const worktree = path.join(root, "worktree");
  const generated = path.join(worktree, "node_modules");
  fs.mkdirSync(generated, { recursive: true });
  fs.writeFileSync(path.join(generated, "marker.txt"), "keep me recoverable");
  const plan = {
    planId: "fixture-plan",
    schemaVersion: 2,
    immutable: false,
    allowedWorktreeRoot: root,
    candidates: [
      {
        id: "candidate-1",
        path: generated,
        worktreePath: worktree,
        action: "PRUNE_GENERATED",
      },
    ],
    worktrees: [],
    summary: {},
  };
  const planPath = writeImmutablePlan(plan, root);
  const written = JSON.parse(fs.readFileSync(planPath, "utf8"));
  assert.equal(written.immutable, true);
  assert.equal(
    written.candidates[0].sourceInventory.files[0].sha256.length,
    64,
  );
  assert.throws(() => writeImmutablePlan(plan, root), /EEXIST|already exists/i);
  fs.rmSync(root, { recursive: true, force: true });
});

test("worktree creation enforces the active and generated budgets while reusing a branch", () => {
  assert.equal(DEFAULT_WORKTREE_POLICY.maxActiveWorktrees, 4);
  const policy = loadWorktreePolicy({
    maxActiveWorktrees: 1,
    maxGeneratedBytes: 10,
  });
  const reused = checkWorktreeCreation({
    policy,
    activeWorktrees: [
      { path: "D:/kk-studio/.worktrees/existing", branch: "codex/TASK-1" },
    ],
    generatedBytes: 999,
    requestedBranch: "codex/TASK-1",
  });
  assert.equal(reused.allowed, true);
  assert.equal(reused.action, "REUSE_EXISTING_BRANCH");
  const denied = checkWorktreeCreation({
    policy,
    activeWorktrees: [
      { path: "D:/kk-studio/.worktrees/one", branch: "codex/OTHER" },
    ],
    generatedBytes: 10,
    requestedBranch: "codex/TASK-2",
  });
  assert.equal(denied.allowed, false);
  assert.match(denied.reason, /budget/i);
});

test("worktree storage accounting includes temporary agent output", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kk-worktree-policy-"));
  fs.mkdirSync(path.join(root, ".tmp"));
  fs.writeFileSync(
    path.join(root, ".tmp", "agent-runtime-previous.bin"),
    "12345",
  );
  assert.equal(measureGeneratedBytes(root), 5);
  fs.rmSync(root, { recursive: true, force: true });
});
