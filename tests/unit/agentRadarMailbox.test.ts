import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  readMessages,
  writeMessages,
  sendAgentMessage,
  markMessageRead,
} from "../../scripts/governance/agent-radar.mjs";

const TEST_MAILBOX_DIR = path.resolve("docs/governance/ai-memory/inbox");
const TEST_MESSAGES_FILE = path.join(TEST_MAILBOX_DIR, "messages.json");

test("Agent Mailbox can send, read and mark messages as read", () => {
  // Backup existing messages if any
  const backup = fs.existsSync(TEST_MESSAGES_FILE)
    ? fs.readFileSync(TEST_MESSAGES_FILE, "utf8")
    : null;

  try {
    writeMessages({ messages: [] });

    const sent = sendAgentMessage({
      from: "UnitTester",
      to: "Cursor",
      taskId: "TASK-TEST-001",
      subject: "Test Handoff Notice",
      body: "Please verify and pickup task.",
      action: {
        command: "npm run test:fast",
      },
    });

    assert.ok(sent.id.startsWith("MSG-"));
    assert.equal(sent.from, "UnitTester");
    assert.equal(sent.to, "Cursor");
    assert.equal(sent.read, false);

    const data = readMessages();
    assert.equal(data.messages.length, 1);
    assert.equal(data.messages[0].id, sent.id);

    const ok = markMessageRead(sent.id);
    assert.equal(ok, true);

    const updated = readMessages();
    assert.equal(updated.messages[0].read, true);
  } finally {
    // Restore backup
    if (backup !== null) {
      fs.writeFileSync(TEST_MESSAGES_FILE, backup, "utf8");
    }
  }
});
