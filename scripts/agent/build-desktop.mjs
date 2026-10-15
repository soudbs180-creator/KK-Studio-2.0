import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  createPatchelfSession,
  cliValues,
  shouldProtectAppImage,
  withPatchelfSession,
} from "./appimage-runtime-patchelf.mjs";

function configuration(root, args) {
  let config = JSON.parse(
    fs.readFileSync(path.join(root, "src-tauri/tauri.conf.json"), "utf8"),
  );
  const platformConfig = path.join(root, "src-tauri/tauri.linux.conf.json");
  const overrides = cliValues(args, "--config", "-c");
  if (fs.existsSync(platformConfig)) overrides.unshift(platformConfig);
  for (const override of overrides) {
    const extra = override.startsWith("{")
      ? JSON.parse(override)
      : JSON.parse(fs.readFileSync(path.resolve(root, override), "utf8"));
    config = {
      ...config,
      ...extra,
      bundle: { ...config.bundle, ...extra.bundle },
    };
  }
  return config;
}

function run(command, args, root, env) {
  const result = spawnSync(command, args, {
    cwd: root,
    env,
    stdio: "inherit",
    shell: false,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

export function buildDesktop(args, root = process.cwd(), env = process.env) {
  root = fs.realpathSync(root);
  const cli = path.join(root, "node_modules/@tauri-apps/cli/tauri.js");
  assert(
    fs.statSync(cli).isFile(),
    "The existing locked Tauri CLI is required",
  );
  if (!shouldProtectAppImage(args, process.platform))
    return run(process.execPath, [cli, "build", ...args], root, env);
  const config = configuration(root, args);
  const protect =
    config.bundle?.active !== false &&
    shouldProtectAppImage(
      args,
      process.platform,
      config.bundle?.targets ?? "all",
    );
  if (!protect)
    return run(process.execPath, [cli, "build", ...args], root, env);
  assert(
    !env.CARGO_TARGET_DIR ||
      path.resolve(root, env.CARGO_TARGET_DIR) ===
        path.join(root, "src-tauri/target"),
    "AppImage protection requires the declared source target directory",
  );
  // Establish fresh frontend inputs before the packaging fence. Tauri's existing
  // beforeBuildCommand remains enabled and must produce the same input hash.
  const npmCli = env.npm_execpath;
  assert(
    npmCli && path.isAbsolute(npmCli) && fs.statSync(npmCli).isFile(),
    "The existing npm CLI is required for the frontend build",
  );
  const frontendStatus = run(
    process.execPath,
    [npmCli, "run", "build"],
    root,
    env,
  );
  if (frontendStatus !== 0) return frontendStatus;
  const session = createPatchelfSession(
    root,
    config.productName,
    env,
    cliValues(args, "--target", "-t").at(-1) ?? "",
    { args, configuration: config },
  );
  console.log(
    `Production AppImage runtime protection: ${session.policy.runId}, ${session.policy.before.sourceHead}`,
  );
  return withPatchelfSession(session, env, (childEnv) =>
    run(process.execPath, [cli, "build", ...args], root, childEnv),
  );
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  try {
    process.exitCode = buildDesktop(process.argv.slice(2));
  } catch (error) {
    console.error(`Desktop build failed: ${error.message}`);
    process.exitCode = 1;
  }
}
