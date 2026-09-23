import { spawn, execFileSync } from "node:child_process";
import path from "node:path";
import { once } from "node:events";

export function processes() {
  const output = execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      "@(Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name) | ConvertTo-Json -Compress",
    ],
    { windowsHide: true, encoding: "utf8" },
  );
  return JSON.parse(output);
}

export function ownedTree(pid) {
  const all = processes();
  const found = new Set([pid]);
  let previous;
  do {
    previous = found.size;
    for (const item of all)
      if (found.has(item.ParentProcessId)) found.add(item.ProcessId);
  } while (previous !== found.size);
  return all.filter((item) => found.has(item.ProcessId));
}

/** Call the actual packaged stdio MCP with the audit instance's in-memory secret. */
export async function checkPackagedMcp(exe, data, token) {
  const runtime = path.join(path.dirname(exe), "agent-runtime");
  const child = spawn(
    path.join(runtime, "node.exe"),
    [path.join(runtime, "agent/dist/index.js"), "mcp"],
    {
      cwd: data,
      windowsHide: true,
      env: {
        ...process.env,
        CANVAS_AGENT_TOKEN: token,
        KK_AGENT_CONFIG_DIR: path.join(data, "app/agent"),
      },
      stdio: ["pipe", "pipe", "ignore"],
    },
  );
  const exited = once(child, "exit");
  let buffer = "",
    id = 0;
  const pending = new Map();
  child.stdout.on("data", (data) => {
    buffer += data;
    let index;
    while ((index = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 1);
      const message = JSON.parse(line);
      pending.get(message.id)?.(message);
    }
  });
  async function request(method, params) {
    const current = ++id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(current);
        reject(Error("Packaged MCP response timed out"));
      }, 20000);
      pending.set(current, (message) => {
        clearTimeout(timer);
        pending.delete(current);
        if (message.error) reject(Error("Packaged MCP request failed"));
        else resolve(message.result);
      });
      child.stdin.write(
        JSON.stringify({ jsonrpc: "2.0", id: current, method, params }) + "\n",
      );
    });
  }
  try {
    await request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "kk-desktop-audit", version: "1.0.0" },
    });
    child.stdin.write(
      JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) +
        "\n",
    );
    const result = await request("tools/call", {
      name: "canvas_get_state",
      arguments: {},
    });
    if (result.isError) throw Error("Packaged canvas MCP returned an error");
    const state = JSON.parse(
      result.content.find((item) => item.type === "text").text,
    );
    if (!Array.isArray(state.nodes))
      throw Error("Packaged MCP did not return actual canvas nodes");
    return { tool: "canvas_get_state", nodes: state.nodes.length };
  } finally {
    child.kill();
    await exited;
  }
}
