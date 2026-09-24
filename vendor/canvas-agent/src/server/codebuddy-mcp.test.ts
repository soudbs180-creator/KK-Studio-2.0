import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

test("MCP exposes a bounded CodeBuddy consult tool and returns its real result", async (t) => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "kk-codebuddy-mcp-"));
    t.after(() => rm(dir, { recursive: true, force: true }));
    const cliPath = path.join(dir, "codebuddy.js");
    await writeFile(cliPath, "console.log(JSON.stringify({result:'draft title',model:'test-model'}))");
    await writeFile(path.join(dir, "canvas-agent.json"), JSON.stringify({
        url: "http://127.0.0.1:17371", token: "", codebuddy: { cliPath },
    }));
    const tsx = fileURLToPath(new URL("../../node_modules/tsx/dist/cli.mjs", import.meta.url));
    const entry = fileURLToPath(new URL("../index.ts", import.meta.url));
    const transport = new StdioClientTransport({
        command: process.execPath,
        args: [tsx, entry, "mcp"],
        env: { ...process.env, KK_AGENT_CONFIG_DIR: dir },
    });
    const client = new Client({ name: "kk-codebuddy-test", version: "1" });
    t.after(() => client.close());
    await client.connect(transport);
    const listed = await client.listTools();
    assert.ok(listed.tools.some((tool) => tool.name === "codebuddy_consult"));
    const result = await client.callTool({ name: "codebuddy_consult", arguments: { prompt: "Give one short design title" } });
    assert.equal(result.isError, undefined);
    assert.equal(result.content[0].type, "text");
    if (result.content[0].type === "text") {
        const body = JSON.parse(result.content[0].text) as { text: string; model: string };
        assert.equal(body.text, "draft title");
        assert.equal(body.model, "test-model");
    }
});
