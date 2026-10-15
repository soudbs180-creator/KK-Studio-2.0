import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

const files = [
  "src/server/http.ts",
  "src/config.ts",
  "src/agent/codex-client.ts",
  "src/agent/codex-protocol.ts",
  "src/utils/logger.ts",
];
const currentToken =
  'return { ...parsed.data, token: process.env.CANVAS_AGENT_TOKEN || crypto.randomBytes(32).toString("hex") };';

for (const scenario of ["current", "legacy", "invalid"] as const) {
  test(`desktop support installer validates ${scenario} config without overwriting other integration files`, (t) => {
    const root = mkdtempSync(join(tmpdir(), "kk-agent-support-"));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const before = new Map<string, string>();
    for (const relative of files) {
      let source = readFileSync(
        join("vendor/canvas-agent", relative),
        "utf8",
      ).replaceAll("\r\n", "\n");
      if (relative === "src/config.ts") {
        assert.ok(source.includes(currentToken));
        if (scenario === "legacy")
          source = source.replace(
            currentToken,
            "const config = parsed.data;\n    if (process.env.CANVAS_AGENT_TOKEN) config.token = process.env.CANVAS_AGENT_TOKEN;\n    return config as CanvasAgentConfig;",
          );
        if (scenario === "invalid")
          source = source.replace(
            currentToken,
            "return parsed.data as CanvasAgentConfig;",
          );
      }
      const target = join(root, relative);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, source);
      before.set(relative, source);
    }
    const install = () =>
      execFileSync(
        process.execPath,
        ["scripts/agent/install-desktop-support.mjs", root],
        { windowsHide: true, encoding: "utf8", stdio: "pipe" },
      );
    if (scenario === "invalid") {
      assert.throws(
        install,
        /Unsupported Agent integration anchor: src\/config.ts/,
      );
      for (const relative of files)
        assert.equal(
          readFileSync(join(root, relative), "utf8"),
          before.get(relative),
        );
    } else {
      assert.match(install(), /verified/);
      const integrated = files.map((relative) =>
        readFileSync(join(root, relative), "utf8"),
      );
      assert.match(install(), /verified/);
      for (const [i, relative] of files.entries())
        assert.equal(readFileSync(join(root, relative), "utf8"), integrated[i]);
      if (scenario === "current")
        assert.equal(
          readFileSync(join(root, "src/config.ts"), "utf8"),
          before.get("src/config.ts"),
        );
      else
        assert.ok(
          integrated[1].includes(
            'config.token = process.env.CANVAS_AGENT_TOKEN || crypto.randomBytes(32).toString("hex");',
          ),
        );
    }
  });
}
