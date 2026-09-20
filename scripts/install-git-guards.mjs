import { spawnSync } from "node:child_process";
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
export function installGitGuards(projectRoot) {
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
    const result = installGitGuards(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
    );
    console.log(
      `${result.installed ? "Installed" : "Already installed"}: ${result.hooks}`,
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
