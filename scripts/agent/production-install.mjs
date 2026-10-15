import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

/** Install the committed lock in an owned directory, never a shared junction. */
export async function prepareProductionAgent({
  agent,
  temporaryRoot,
  npmCli = process.env.npm_execpath ||
    path.join(
      path.dirname(process.execPath),
      "node_modules/npm/bin/npm-cli.js",
    ),
  run = promisify(execFile),
}) {
  const parent = path.resolve(temporaryRoot);
  await fs.mkdir(parent, { recursive: true });
  const staging = path.join(parent, `production-agent-${randomUUID()}`);
  await fs.mkdir(staging);
  for (const name of [
    "package.json",
    "package-lock.json",
    "agent-instructions.md",
  ])
    await fs.copyFile(path.join(agent, name), path.join(staging, name));
  await fs.cp(path.join(agent, "dist"), path.join(staging, "dist"), {
    recursive: true,
  });
  try {
    await run(
      process.execPath,
      [
        npmCli,
        "ci",
        "--omit=dev",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
      ],
      {
        cwd: staging,
        timeout: 180000,
        maxBuffer: 1024 * 1024,
        windowsHide: true,
      },
    );
  } catch {
    throw new Error(
      "Agent production installation failed; source dependencies were preserved.",
    );
  }
  return staging;
}
