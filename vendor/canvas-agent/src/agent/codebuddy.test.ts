import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runCodeBuddy, validateCodeBuddyCliPath } from "./codebuddy.js";

async function fakeCli(t: test.TestContext, source: string) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "kk-codebuddy-test-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const cliPath = path.join(dir, "codebuddy.js");
  await writeFile(cliPath, source);
  return cliPath;
}

test("only an existing absolute CodeBuddy script can be selected", async (t) => {
  const cliPath = await fakeCli(t, "process.stdout.write('{}');");
  assert.equal(await validateCodeBuddyCliPath(cliPath), cliPath);
  await assert.rejects(
    () => validateCodeBuddyCliPath("relative/codebuddy.js"),
    /绝对路径/,
  );
  await assert.rejects(
    () => validateCodeBuddyCliPath(path.join(path.dirname(cliPath), "other.js")),
    /CodeBuddy CLI/,
  );
});

test("single-shot call disables tools, omits KK secrets and returns JSON result", async (t) => {
  const cliPath = await fakeCli(
    t,
    `process.stdout.write(JSON.stringify({type:"result",result:JSON.stringify({args:process.argv.slice(2),secret:process.env.CANVAS_AGENT_TOKEN || ""}),model:"test-model"}));`,
  );
  const prior = process.env.CANVAS_AGENT_TOKEN;
  process.env.CANVAS_AGENT_TOKEN = "must-not-reach-child";
  try {
    const response = await runCodeBuddy({ cliPath, prompt: "写一条海报标题" });
    const result = JSON.parse(response.text) as { args: string[]; secret: string };
    assert.equal(result.secret, "");
    assert.equal(result.args.at(-1), "写一条海报标题");
    assert.deepEqual(result.args.slice(0, -1), [
      "--print",
      "--output-format", "json",
      "--tools", "",
      "--permission-mode", "dontAsk",
      "--no-session-persistence",
      "--max-turns", "1",
    ]);
    assert.equal(response.model, "test-model");
  } finally {
    if (prior === undefined) delete process.env.CANVAS_AGENT_TOKEN;
    else process.env.CANVAS_AGENT_TOKEN = prior;
  }
});

test("non-JSON, failed and empty CLI results fail closed", async (t) => {
  for (const [source, expected] of [
    ["process.stdout.write('not json');", /格式无效/],
    ["process.exit(7);", /退出/],
    ["process.stdout.write(JSON.stringify({type:'result',result:''}));", /空回复/],
  ] as const) {
    const cliPath = await fakeCli(t, source);
    await assert.rejects(
      () => runCodeBuddy({ cliPath, prompt: "短问题" }),
      expected,
    );
  }
});

test("installed CLI's JSON event array uses only its final result", async (t) => {
  const cliPath = await fakeCli(t,
    "process.stdout.write(JSON.stringify([{type:'message',content:'internal'}, {type:'result',subtype:'success',is_error:false,result:'poster title'}]));",
  );
  const result = await runCodeBuddy({ cliPath, prompt: "标题" });
  assert.equal(result.text, "poster title");
  const failedPath = await fakeCli(t,
    "process.stdout.write(JSON.stringify([{type:'message',content:'internal'}, {type:'result',subtype:'error',is_error:true,result:'account detail'}]));",
  );
  await assert.rejects(() => runCodeBuddy({ cliPath: failedPath, prompt: "标题" }), /未完成/);
});

test("hung CLI is terminated and a second call cannot overlap", async (t) => {
  const cliPath = await fakeCli(t, "setInterval(() => {}, 1000);");
  const first = runCodeBuddy({ cliPath, prompt: "短问题", timeoutMs: 150 });
  await assert.rejects(
    () => runCodeBuddy({ cliPath, prompt: "第二个问题" }),
    /正在处理/,
  );
  await assert.rejects(() => first, /超时/);
});

test("an aborted consultation kills the CLI and releases the slot", async (t) => {
  const cliPath = await fakeCli(t, "setInterval(() => {}, 1000);");
  const controller = new AbortController();
  const running = runCodeBuddy({ cliPath, prompt: "短问题", signal: controller.signal });
  setTimeout(() => controller.abort(), 60);
  await assert.rejects(() => running, /已取消/);
  const replyPath = await fakeCli(t, "process.stdout.write(JSON.stringify({result:'OK'}));");
  assert.equal((await runCodeBuddy({ cliPath: replyPath, prompt: "再试" })).text, "OK");
});

test("oversized output and prompt are rejected", async (t) => {
  const cliPath = await fakeCli(
    t,
    "process.stdout.write('x'.repeat(150000));",
  );
  await assert.rejects(
    () => runCodeBuddy({ cliPath, prompt: "短问题" }),
    /输出过大/,
  );
  await assert.rejects(
    () => runCodeBuddy({ cliPath, prompt: "字".repeat(3001) }),
    /过长/,
  );
});
