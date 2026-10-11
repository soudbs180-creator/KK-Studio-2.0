import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

function git(cwd, args, missingAllowed = false) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (missingAllowed && result.status === 1) return null;
  if (result.status !== 0)
    throw new Error(`Git inspection failed (${args[0]}).`);
  return result.stdout.trim();
}

/** Install into common Git storage, independent of the task worktree lifetime. */
export function installGitGuards(
  projectRoot,
  { upgradeReviewedV1 = false } = {},
) {
  const root = git(projectRoot, ["rev-parse", "--show-toplevel"]);
  const common = git(projectRoot, [
    "rev-parse",
    "--path-format=absolute",
    "--git-common-dir",
  ]);
  const hooks = path.join(common, "hooks");
  const worktrees = git(projectRoot, ["worktree", "list", "--porcelain", "-z"])
    .split("\0")
    .filter((field) => field.startsWith("worktree "))
    .map((field) => field.slice(9));
  for (const worktree of worktrees) {
    if (!fs.existsSync(worktree))
      throw new Error(
        "A registered worktree is unavailable; inspect/prune its registration before installing.",
      );
    const configured = git(
      worktree,
      ["config", "--get", "core.hooksPath"],
      true,
    );
    if (configured !== null)
      throw new Error(
        `An existing core.hooksPath applies to ${worktree}; refusing to override or disable existing hooks.`,
      );
  }
  const files = [
    { name: "pre-push", source: path.join(root, ".githooks", "pre-push") },
    {
      name: "kk-studio-push-policy.mjs",
      source: path.join(root, "scripts", "governance", "push-policy.mjs"),
    },
  ].map((file) => ({
    ...file,
    target: path.join(hooks, file.name),
    content: Buffer.from(
      fs.readFileSync(file.source, "utf8").replaceAll("\r\n", "\n"),
    ),
  }));
  const existing = files.filter((file) => fs.existsSync(file.target));
  if (existing.length) {
    // Only this exact reviewed pair may be upgraded. A marker/comment is not
    // sufficient: modified or third-party hooks and policy files stay intact.
    const reviewedV1 = [
      "721724694dfcee9f9fc5e30cdc721a57fe22bc06f7f41279521f99fe44f39592",
      "2d595c0063121910526a92259de75611c47bddffa58ac7160be695b08b8dafd7",
    ];
    if (
      upgradeReviewedV1 &&
      existing.length === files.length &&
      files.every((file) => fs.lstatSync(file.target).isFile()) &&
      files.every(
        (file, index) =>
          createHash("sha256")
            .update(fs.readFileSync(file.target))
            .digest("hex") === reviewedV1[index],
      ) &&
      fs.readFileSync(files[1].target).equals(files[1].content)
    ) {
      const hook = files[0];
      const mode = fs.statSync(hook.target).mode;
      if (process.platform !== "win32" && !(mode & 0o111))
        throw new Error(
          "Existing pre-push is not executable; inspect its permissions before upgrading.",
        );
      const backup = `${hook.target}.kk-studio-v1.bak`;
      const temporary = `${hook.target}.kk-studio-v2.tmp`;
      if (fs.existsSync(backup) || fs.existsSync(temporary))
        throw new Error(
          "Upgrade backup or temporary path already exists; refusing to overwrite.",
        );
      let createdTemporary = false;
      try {
        fs.writeFileSync(temporary, hook.content, {
          flag: "wx",
          mode: mode & 0o777,
        });
        createdTemporary = true;
        // Creation mode is filtered by umask; Git ignores non-executable hooks.
        fs.chmodSync(temporary, mode & 0o777);
        fs.writeFileSync(backup, fs.readFileSync(hook.target), {
          flag: "wx",
          mode: mode & 0o777,
        });
        fs.chmodSync(backup, mode & 0o777);
        // Until the atomic replacement succeeds, the old guard remains active.
        fs.renameSync(temporary, hook.target);
      } catch (error) {
        if (createdTemporary && fs.existsSync(temporary))
          fs.unlinkSync(temporary);
        throw error;
      }
      return { installed: true, upgraded: true, backup, hooks, worktrees };
    }
    if (
      existing.length !== files.length ||
      existing.some(
        (file) => !fs.readFileSync(file.target).equals(file.content),
      )
    )
      throw new Error(
        "Existing pre-push or policy files differ; refusing to overwrite. Review and preserve them before an explicit upgrade.",
      );
    if (
      process.platform !== "win32" &&
      !(fs.statSync(files[0].target).mode & 0o111)
    )
      throw new Error(
        "Existing pre-push is not executable; inspect its permissions before reinstalling.",
      );
    return { installed: false, hooks, worktrees };
  }
  fs.mkdirSync(hooks, { recursive: true });
  const created = [];
  try {
    // Install the dependency first. Exclusive creation protects existing hooks.
    for (const file of [...files].reverse()) {
      fs.writeFileSync(file.target, file.content, { flag: "wx", mode: 0o755 });
      created.push(file.target);
    }
  } catch (error) {
    for (const file of created) fs.unlinkSync(file);
    throw error;
  }
  return { installed: true, hooks, worktrees };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    const args = process.argv.slice(2);
    if (args.some((arg) => arg !== "--upgrade-reviewed-v1"))
      throw new Error(
        "Usage: node scripts/install-git-guards.mjs [--upgrade-reviewed-v1]",
      );
    const result = installGitGuards(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
      { upgradeReviewedV1: args.includes("--upgrade-reviewed-v1") },
    );
    console.log(
      `${result.installed ? "Installed" : "Already installed"}: ${result.hooks}`,
    );
    if (result.upgraded)
      console.log(
        `Upgraded reviewed v1; original hook preserved at ${result.backup}`,
      );
    console.log(
      `Scope: common Git hooks shared by ${result.worktrees.length} registered worktree(s); no local, worktree or global Git config was changed.`,
    );
    console.log(
      "Existing hooks are preserved. Local hooks can be bypassed and are not a substitute for hosting branch/tag protection.",
    );
  } catch (error) {
    console.error(`[KK Studio git guards] ${error.message}`);
    process.exitCode = 1;
  }
}
