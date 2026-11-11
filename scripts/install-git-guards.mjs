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
  { upgradeReviewedV1 = false, upgradeReviewedPolicy = false } = {},
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
      existing.length === files.length &&
      files.every((file) => fs.lstatSync(file.target).isFile()) &&
      createHash("sha256")
        .update(fs.readFileSync(files[1].target))
        .digest("hex") === reviewedV1[1] &&
      ((upgradeReviewedV1 &&
        createHash("sha256")
          .update(fs.readFileSync(files[0].target))
          .digest("hex") === reviewedV1[0]) ||
        (upgradeReviewedPolicy &&
          fs.readFileSync(files[0].target).equals(files[0].content)))
    ) {
      if (
        process.platform !== "win32" &&
        !(fs.statSync(files[0].target).mode & 0o111)
      )
        throw new Error(
          "Existing pre-push is not executable; inspect its permissions before upgrading.",
        );
      const upgrades = files
        .filter((file) => !fs.readFileSync(file.target).equals(file.content))
        .map((file) => ({
          ...file,
          mode: fs.statSync(file.target).mode & 0o777,
          backup: `${file.target}.kk-studio-v1.bak`,
          temporary: `${file.target}.kk-studio-v2.tmp`,
        }));
      if (
        upgrades.some(
          (file) => fs.existsSync(file.backup) || fs.existsSync(file.temporary),
        )
      )
        throw new Error(
          "Upgrade backup or temporary path already exists; refusing to overwrite.",
        );
      const createdTemporary = [];
      try {
        for (const file of upgrades) {
          fs.writeFileSync(file.temporary, file.content, {
            flag: "wx",
            mode: file.mode,
          });
          createdTemporary.push(file.temporary);
          // Creation mode is filtered by umask; Git ignores non-executable hooks.
          fs.chmodSync(file.temporary, file.mode);
          fs.writeFileSync(file.backup, fs.readFileSync(file.target), {
            flag: "wx",
            mode: file.mode,
          });
          fs.chmodSync(file.backup, file.mode);
        }
        // Each replacement keeps a working guard active, even if a later rename fails.
        for (const file of upgrades) fs.renameSync(file.temporary, file.target);
      } catch (error) {
        for (const temporary of createdTemporary)
          if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
        throw error;
      }
      return {
        installed: true,
        upgraded: true,
        backup: upgrades.map((file) => file.backup).join(", "),
        hooks,
        worktrees,
      };
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
    if (
      args.some(
        (arg) =>
          !["--upgrade-reviewed-v1", "--upgrade-reviewed-policy"].includes(arg),
      )
    )
      throw new Error(
        "Usage: node scripts/install-git-guards.mjs [--upgrade-reviewed-v1|--upgrade-reviewed-policy]",
      );
    const result = installGitGuards(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
      {
        upgradeReviewedV1: args.includes("--upgrade-reviewed-v1"),
        upgradeReviewedPolicy: args.includes("--upgrade-reviewed-policy"),
      },
    );
    console.log(
      `${result.installed ? "Installed" : "Already installed"}: ${result.hooks}`,
    );
    if (result.upgraded)
      console.log(
        `Upgraded reviewed policy/guard; originals preserved at ${result.backup}`,
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
