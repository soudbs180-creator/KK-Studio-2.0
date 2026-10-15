import assert from "node:assert/strict";
import test from "node:test";
import {
  copyMessageText,
  conversationMarkdownFilename,
  downloadConversationMarkdown,
  formatConversationMarkdown,
  type ConversationDownloadEnvironment,
} from "../../src/features/conversation/conversationShare.ts";

test("conversation Markdown preserves visible user/assistant originals and excludes internal roles", () => {
  const content =
    "中文 🌏\n\n" +
    String.fromCharCode(96).repeat(3) +
    "js\nconst 值 = 1;\n" +
    String.fromCharCode(96).repeat(3);
  const output = formatConversationMarkdown({
    title: "研究报告",
    messages: [
      { role: "user", content: "完整问题" },
      { role: "tool", content: "secret internal arguments" },
      { role: "system", content: "private policy" },
      { role: "error", content: "credential details" },
      { role: "assistant", content },
    ],
  });
  assert.equal(
    output,
    "# 研究报告\n\n## 用户\n\n完整问题\n\n---\n\n## 助手\n\n" + content + "\n",
  );
  assert.equal(output.includes("secret"), false);
  assert.equal(output.includes("credential"), false);
});

test("filename keeps Unicode while removing path separators and Windows reserved names", () => {
  assert.equal(
    conversationMarkdownFilename("创意/🌏:方案?"),
    "创意_🌏_方案_.md",
  );
  assert.equal(conversationMarkdownFilename("CON"), "对话-CON.md");
  assert.equal(conversationMarkdownFilename(" ... "), "对话.md");
  assert.equal(conversationMarkdownFilename("现有.md"), "现有.md");
  assert.equal(
    conversationMarkdownFilename("🌏".repeat(150)),
    "🌏".repeat(100) + ".md",
  );
});

test("clipboard success copies the exact original, without rendering or trimming", async () => {
  let written = "";
  const content = "  **原文**\n🌏\n";
  const result = await copyMessageText(content, {
    async writeText(value) {
      written = value;
    },
  });
  assert.equal(result.ok, true);
  assert.equal(written, content);
});

test("clipboard rejection and absent clipboard report failure without throwing or false success", async () => {
  const denied = await copyMessageText("原文", {
    async writeText() {
      throw new Error("permission denied");
    },
  });
  assert.equal(denied.ok, false);
  assert.ok(denied.message);
  assert.equal((await copyMessageText("原文")).ok, false);
});

function environment(fail = false) {
  const events: string[] = [];
  const releases: Array<() => void> = [];
  let receivedBlob: Blob | undefined;
  const runtime: ConversationDownloadEnvironment = {
    createObjectURL(blob) {
      receivedBlob = blob;
      events.push("create");
      return "blob:fixture";
    },
    revokeObjectURL(url) {
      events.push("revoke:" + url);
    },
    clickDownload(url, filename) {
      events.push("download:" + url + ":" + filename);
      if (fail) throw new Error("download denied");
    },
    scheduleRelease(callback) {
      releases.push(callback);
    },
  };
  return { runtime, events, releases, blob: () => receivedBlob };
}

test("Markdown download creates complete UTF-8 file and releases its Blob URL after dispatch", async () => {
  const fixture = environment();
  const filename = downloadConversationMarkdown(
    {
      title: "保存 🌏",
      messages: [
        { role: "assistant", content: "全部正文\n" + "长".repeat(40000) },
      ],
    },
    fixture.runtime,
  );
  assert.equal(filename, "保存 🌏.md");
  assert.deepEqual(fixture.events, [
    "create",
    "download:blob:fixture:保存 🌏.md",
  ]);
  assert.equal(fixture.blob()?.type, "text/markdown;charset=utf-8");
  assert.ok(
    (await fixture.blob()?.text())?.endsWith("长".repeat(40000) + "\n"),
  );
  assert.equal(fixture.releases.length, 1);
  fixture.releases[0]();
  assert.equal(fixture.events.at(-1), "revoke:blob:fixture");
});

test("a failed download still releases the URL and an empty visible conversation creates none", () => {
  const fixture = environment(true);
  assert.throws(
    () =>
      downloadConversationMarkdown(
        {
          title: "报告",
          messages: [{ role: "user", content: "正文" }],
        },
        fixture.runtime,
      ),
    /download denied/,
  );
  assert.equal(fixture.releases.length, 1);
  fixture.releases[0]();
  assert.equal(fixture.events.at(-1), "revoke:blob:fixture");
  const empty = environment();
  assert.throws(() =>
    downloadConversationMarkdown(
      {
        title: "报告",
        messages: [{ role: "tool", content: "private" }],
      },
      empty.runtime,
    ),
  );
  assert.deepEqual(empty.events, []);
});
