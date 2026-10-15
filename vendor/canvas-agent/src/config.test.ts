import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { type TestContext } from "node:test";
import { randomUUID } from "node:crypto";

import { writeConfigFile, type CanvasAgentConfig } from "./config.js";

const sample: CanvasAgentConfig = { url: "http://127.0.0.1:17371", token: "test-token" };

function makeTempBase(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), "canvas-agent-config-test-"));
}


async function isolatedConfig(t: TestContext) {
    const directory = makeTempBase();
    const previous = {
        KK_AGENT_CONFIG_DIR: process.env.KK_AGENT_CONFIG_DIR,
        CANVAS_AGENT_TOKEN: process.env.CANVAS_AGENT_TOKEN,
        PORT: process.env.PORT,
    };
    process.env.KK_AGENT_CONFIG_DIR = directory;
    process.env.CANVAS_AGENT_TOKEN = "synthetic-config-token";
    delete process.env.PORT;
    t.after(() => {
        t.mock.restoreAll();
        for (const [name, value] of Object.entries(previous)) {
            if (value === undefined) delete process.env[name];
            else process.env[name] = value;
        }
        fs.rmSync(directory, { recursive: true, force: true });
    });
    const api = await import(new URL("./config.ts?config-test=" + randomUUID(), import.meta.url).href) as typeof import("./config.js");
    return { directory, file: api.CONFIG_FILE, api };
}

// POSIX-only: chmod semantics differ on Windows, where these modes are advisory.
const posix = process.platform === "win32" ? { skip: true } : {};

test("writeConfigFile creates directory 0700 and file 0600", posix, () => {
    const base = makeTempBase();
    const dir = path.join(base, "nested-config");
    const file = path.join(dir, "canvas-agent.json");
    try {
        writeConfigFile(dir, file, sample);
        assert.equal(fs.statSync(dir).mode & 0o777, 0o700);
        assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    } finally {
        fs.rmSync(base, { recursive: true, force: true });
    }
});

test("writeConfigFile tightens existing loose permissions", posix, () => {
    const base = makeTempBase();
    const dir = path.join(base, "existing-config");
    const file = path.join(dir, "canvas-agent.json");
    fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
    fs.writeFileSync(file, "{}", { mode: 0o644 });
    try {
        writeConfigFile(dir, file, sample);
        assert.equal(fs.statSync(dir).mode & 0o777, 0o700);
        assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    } finally {
        fs.rmSync(base, { recursive: true, force: true });
    }
});

test("writeConfigFile persists the config content", () => {
    const base = makeTempBase();
    const file = path.join(base, "canvas-agent.json");
    try {
        writeConfigFile(base, file, sample);
        assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf8")), sample);
    } finally {
        fs.rmSync(base, { recursive: true, force: true });
    }
});


test("only a missing Agent configuration may initialize defaults", async (t) => {
    const { api, file } = await isolatedConfig(t);
    api.loadConfig(false);
    assert.equal(fs.existsSync(file), false);
    api.loadConfig(true);
    assert.equal(JSON.parse(fs.readFileSync(file, "utf8")).token, "");
});

test("invalid Agent JSON or known structure leaves original bytes intact", async (t) => {
    const { api, file } = await isolatedConfig(t);
    for (const raw of [
        "{", "null", "[]", "{}",
        JSON.stringify({ ...sample, url: 7 }),
        JSON.stringify({ ...sample, origins: [1] }),
        JSON.stringify({ ...sample, workspace: null }),
        JSON.stringify({ ...sample, workspace: { workspacePath: "", pinnedThreadIds: [1] } }),
        JSON.stringify({ ...sample, codebuddy: "invalid" }),
    ]) {
        for (const create of [false, true]) {
            fs.writeFileSync(file, raw);
            assert.throws(() => api.loadConfig(create));
            assert.equal(fs.readFileSync(file, "utf8"), raw);
        }
    }
});

test("non-ENOENT Agent read failures never rewrite the configuration", async (t) => {
    const { api, file } = await isolatedConfig(t);
    const original = JSON.stringify({ ...sample, codebuddy: { cliPath: "saved-codebuddy.js" } });
    fs.writeFileSync(file, original);
    const readFileSync = fs.readFileSync;
    let fault = "EACCES";
    t.mock.method(fs, "readFileSync", (...args: Parameters<typeof fs.readFileSync>) => {
        if (args[0] === file) throw Object.assign(new Error("synthetic read failure"), { code: fault });
        return Reflect.apply(readFileSync, fs, args);
    });
    for (fault of ["EACCES", "EPERM", "EIO", "EBUSY"]) {
        for (const create of [false, true]) {
            assert.throws(() => api.loadConfig(create));
            assert.equal(readFileSync(file, "utf8"), original);
        }
    }
});

test("an interrupted Agent configuration write preserves the saved file", async (t) => {
    const { api, file, directory } = await isolatedConfig(t);
    const original = JSON.stringify(sample);
    fs.writeFileSync(file, original);
    const writeFileSync = fs.writeFileSync;
    t.mock.method(fs, "writeFileSync", (...args: Parameters<typeof fs.writeFileSync>) => {
        if (typeof args[0] === "string" && path.dirname(args[0]) === directory) {
            writeFileSync(args[0], "partial fixture bytes");
            throw Object.assign(new Error("synthetic interrupted write"), { code: "EIO" });
        }
        return Reflect.apply(writeFileSync, fs, args);
    });
    assert.throws(() => api.saveConfig(sample));
    assert.equal(fs.readFileSync(file, "utf8"), original);
});

test("a failed Agent configuration rename preserves the saved file", async (t) => {
    const { api, file } = await isolatedConfig(t);
    const original = JSON.stringify(sample);
    fs.writeFileSync(file, original);
    const renameSync = fs.renameSync;
    t.mock.method(fs, "renameSync", (...args: Parameters<typeof fs.renameSync>) => {
        if (args[1] === file) throw Object.assign(new Error("synthetic rename failure"), { code: "EACCES" });
        return Reflect.apply(renameSync, fs, args);
    });
    assert.throws(() => api.saveConfig(sample));
    assert.equal(fs.readFileSync(file, "utf8"), original);
});

test("a failed workspace save keeps the current thread and saved bytes", async (t) => {
    const { api, file, directory } = await isolatedConfig(t);
    const original = JSON.stringify({ ...sample, workspace: { workspacePath: path.join(directory, "workspace"), activeThreadId: "old-thread", pinnedThreadIds: ["pinned"] } });
    fs.writeFileSync(file, original);
    const current = api.loadConfig();
    const previousWorkspace = current.workspace;
    const renameSync = fs.renameSync;
    t.mock.method(fs, "renameSync", (...args: Parameters<typeof fs.renameSync>) => {
        if (args[1] === file) throw Object.assign(new Error("synthetic rename failure"), { code: "EACCES" });
        return Reflect.apply(renameSync, fs, args);
    });
    assert.throws(() => api.updateSiteWorkspace(current, { activeThreadId: "new-thread" }));
    assert.equal(current.workspace, previousWorkspace);
    assert.equal(current.workspace?.activeThreadId, "old-thread");
    assert.equal(fs.readFileSync(file, "utf8"), original);
});

test("a failed initial workspace save does not publish the workspace", async (t) => {
    const { api, file } = await isolatedConfig(t);
    const original = JSON.stringify(sample);
    fs.writeFileSync(file, original);
    const current = api.loadConfig();
    const renameSync = fs.renameSync;
    t.mock.method(fs, "renameSync", (...args: Parameters<typeof fs.renameSync>) => {
        if (args[1] === file) throw Object.assign(new Error("synthetic rename failure"), { code: "EACCES" });
        return Reflect.apply(renameSync, fs, args);
    });
    assert.throws(() => api.ensureSiteWorkspace(current));
    assert.equal(current.workspace, undefined);
    assert.equal(fs.readFileSync(file, "utf8"), original);
});

test("Agent configuration preserves old and unknown fields without persisting the runtime token", async (t) => {
    const { api, file, directory } = await isolatedConfig(t);
    const original = {
        ...sample,
        codebuddy: { cliPath: path.join(directory, "codebuddy.js"), futureCli: true },
        workspace: { workspacePath: path.join(directory, "workspace"), activeThreadId: "old-thread", pinnedThreadIds: ["pinned"], futureWorkspace: true },
        origins: ["http://localhost:1423"],
        futureRoot: { retained: true },
    };
    const bytes = JSON.stringify(original);
    fs.writeFileSync(file, bytes);
    const current = api.loadConfig(true);
    assert.equal(current.token, "synthetic-config-token");
    assert.equal(fs.readFileSync(file, "utf8"), bytes);
    api.saveConfig(current);
    assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf8")), { ...original, token: "" });
    api.updateSiteWorkspace(current, { activeThreadId: "new-thread" });
    assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf8")), {
        ...original,
        token: "",
        workspace: { ...original.workspace, activeThreadId: "new-thread" },
    });
});
