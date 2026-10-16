import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SlashCommandRegistry,
  BUILTIN_SLASH_COMMANDS,
} from "../../src/features/commands/slashCommandRegistry.ts";

describe("SlashCommandRegistry", () => {
  it("空查询或仅输入斜杠时返回全量命令列表", () => {
    const registry = new SlashCommandRegistry(BUILTIN_SLASH_COMMANDS);
    const all = registry.match("");
    assert.equal(all.length, BUILTIN_SLASH_COMMANDS.length);

    const slashOnly = registry.match("/");
    assert.equal(slashOnly.length, BUILTIN_SLASH_COMMANDS.length);
  });

  it("支持输入前几个字母精准前缀匹配补齐", () => {
    const registry = new SlashCommandRegistry(BUILTIN_SLASH_COMMANDS);

    // /i -> /image
    const matchI = registry.match("/i");
    assert.ok(matchI.length > 0);
    assert.equal(matchI[0].slash, "/image");

    // /mod -> /model
    const matchMod = registry.match("/mod");
    assert.ok(matchMod.length > 0);
    assert.equal(matchMod[0].slash, "/model");

    // /ed -> /edit
    const matchEd = registry.match("/ed");
    assert.ok(matchEd.length > 0);
    assert.equal(matchEd[0].slash, "/edit");

    // /sk -> /skill
    const matchSk = registry.match("/sk");
    assert.ok(matchSk.length > 0);
    assert.equal(matchSk[0].slash, "/skill");

    // /cl -> /clear
    const matchCl = registry.match("/cl");
    assert.ok(matchCl.length > 0);
    assert.equal(matchCl[0].slash, "/clear");
  });

  it("支持别名和中文别名快速匹配", () => {
    const registry = new SlashCommandRegistry(BUILTIN_SLASH_COMMANDS);

    const matchChinese = registry.match("生图");
    assert.ok(matchChinese.length > 0);
    assert.equal(matchChinese[0].slash, "/image");

    const matchAlias = registry.match("img");
    assert.ok(matchAlias.length > 0);
    assert.equal(matchAlias[0].slash, "/image");
  });

  it("执行命令触发对应 handler", () => {
    const registry = new SlashCommandRegistry(BUILTIN_SLASH_COMMANDS);
    const clearCmd = registry.get("cmd-clear");
    assert.ok(clearCmd);

    let clearedText = "something";
    let statusMsg = "";
    clearCmd.execute({
      prompt: clearedText,
      setPrompt: (text) => {
        clearedText = text;
      },
      setStatus: (msg) => {
        statusMsg = msg;
      },
    });

    assert.equal(clearedText, "");
    assert.equal(statusMsg, "草稿已清空。");
  });
});
