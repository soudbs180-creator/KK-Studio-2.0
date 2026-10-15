import { spawn } from "node:child_process";
import { closeSync, fstatSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { setTimeout as delay } from "node:timers/promises";

// Only the native owner supplies this inherited, already-flocked description.
// Keep it open until the isolated writer group has gone, including after the
// native application is killed and its private control pipe reaches EOF.
const ownerFd = Number(process.env.KK_AGENT_OWNER_FD);
if (
  !["darwin", "linux"].includes(process.platform) ||
  !Number.isSafeInteger(ownerFd) ||
  ownerFd < 3 ||
  !path.isAbsolute(process.argv[2] || "")
)
  process.exit(1);
try {
  if (!fstatSync(ownerFd).isFile()) process.exit(1);
} catch {
  process.exit(1);
}

const control = createInterface({ input: process.stdin, crlfDelay: Infinity });
let child;
let childExited;
let cleanupPromise;
let started = false;
let ready = false;
let pending = "";
let lines = 0;

function groupExists() {
  if (!child?.pid) return false;
  try {
    process.kill(-child.pid, 0);
    return true;
  } catch (error) {
    if (error.code === "ESRCH") return false;
    throw Error("Cannot confirm the owned Agent group has exited", {
      cause: error,
    });
  }
}

function signalGroup(signal) {
  try {
    process.kill(-child.pid, signal);
  } catch (error) {
    if (error.code !== "ESRCH")
      throw Error("Cannot stop the owned Agent group", { cause: error });
  }
}

function cleanup() {
  if (cleanupPromise) return cleanupPromise;
  cleanupPromise = (async () => {
    if (child?.pid) {
      child.stdin.end();
      if (groupExists()) signalGroup("SIGTERM");
      const deadline = Date.now() + 1000;
      let forceSent = false;
      while (groupExists()) {
        if (!forceSent && Date.now() >= deadline) {
          signalGroup("SIGKILL");
          forceSent = true;
        }
        await delay(25);
      }
      await childExited;
    }
    closeSync(ownerFd);
    process.exit(0);
  })().catch(() => {
    // Failed cleanup cannot release the lease or make another writer available.
    // Keep the guardian alive; native reports bounded-wait failure explicitly.
    process.stderr.write(
      "KK Agent cleanup is incomplete; its owner lease is retained.\n",
    );
    setInterval(() => {}, 1000);
  });
  return cleanupPromise;
}

control.once("close", cleanup);
process.stdout.on("error", cleanup);
process.stdout.once("close", cleanup);
process.stderr.on("error", cleanup);
process.once("SIGTERM", cleanup);
process.once("SIGINT", cleanup);
control.on("line", (line) => {
  if (started || line !== "start") {
    void cleanup();
    return;
  }
  started = true;
  child = spawn(process.execPath, [process.argv[2]], {
    cwd: process.cwd(),
    env: { ...process.env, KK_AGENT_OWNER_FD: "3" },
    detached: true,
    stdio: ["pipe", "pipe", "ignore", ownerFd],
  });
  childExited = new Promise((resolve) => {
    child.once("exit", resolve);
    child.once("error", resolve);
  });
  child.once("exit", cleanup);
  child.once("error", cleanup);
  child.stdin.on("error", cleanup);
  child.stdout.on("error", cleanup);
  child.stdout.on("data", (chunk) => {
    if (cleanupPromise) return;
    if (ready) {
      process.stdout.write(chunk);
      return;
    }
    pending += chunk.toString("utf8");
    if (Buffer.byteLength(pending) > 8192) {
      void cleanup();
      return;
    }
    while (pending.includes("\n")) {
      const newline = pending.indexOf("\n");
      const line = pending.slice(0, newline).replace(/\r$/, "");
      pending = pending.slice(newline + 1);
      if (++lines > 32) {
        void cleanup();
        return;
      }
      if (!line.startsWith("KK_AGENT_READY ")) continue;
      try {
        const connection = JSON.parse(line.slice("KK_AGENT_READY ".length));
        if (connection.pid !== child.pid)
          throw Error("Owned child identity mismatch");
        // Native readiness remains bound to the process it created: this guardian.
        connection.pid = process.pid;
        process.stdout.write(`KK_AGENT_READY ${JSON.stringify(connection)}\n`);
        ready = true;
        if (pending) process.stdout.write(pending);
        pending = "";
        return;
      } catch {
        void cleanup();
        return;
      }
    }
  });
  child.stdin.write("start\n");
});
