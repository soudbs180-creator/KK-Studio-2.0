import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
// Reuse Playwright's pinned ws implementation; never emulate WebSocket framing.
const require = createRequire(import.meta.url);
const { wsServer } = require(
  path.join(process.argv[2], "node_modules/playwright-core/lib/utilsBundle.js"),
);
const image = fs.readFileSync(
  path.join(process.argv[2], "public/fixtures/demo/blue-hour.png"),
);
const history = {},
  clients = new Map(),
  state = { pid: process.pid, clients: [], prompts: [], wsSent: 0 };
const record = () => fs.writeFileSync(process.argv[3], JSON.stringify(state));
const server = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (req.url === "/system_stats") {
    res.end(JSON.stringify({ system: { fixture: true }, devices: [] }));
    return;
  }
  if (req.url?.startsWith("/history")) {
    res.end(JSON.stringify(history));
    return;
  }
  if (req.url?.startsWith("/view")) {
    res.setHeader("Content-Type", "image/png");
    res.end(image);
    return;
  }
  if (req.url === "/prompt") {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    const id = "fixture-job-" + (state.prompts.length + 1);
    state.prompts.push({ id, client: body.client_id });
    const output = {
      images: [{ filename: id + ".png", subfolder: "", type: "output" }],
    };
    history[id] = {
      prompt: [
        0,
        id,
        body.prompt,
        { ...body.extra_data, client_id: body.client_id },
      ],
      status: { completed: true, status_str: "success" },
      outputs: { 3: output },
    };
    const message = JSON.stringify({
      type: "executed",
      data: { prompt_id: id, node: "3", output },
    });
    clients.get(body.client_id)?.send(message);
    state.wsSent++;
    record();
    res.end(JSON.stringify({ prompt_id: id }));
    return;
  }
  res.setHeader("Content-Type", "text/html");
  res.end(
    '<html><body><h1>ComfyUI native fixture (no GPU)</h1><button id="queue">Queue Prompt</button><script>const ws=new WebSocket("ws://127.0.0.1:8188/ws?clientId="+encodeURIComponent(window.name));document.querySelector("#queue").onclick=()=>{window.fixtureClicked=true;return fetch("/prompt",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({client_id:window.name,prompt:{"1":{class_type:"FixtureOutput",inputs:{}}}})});};</script></body></html>',
  );
});
const wss = new wsServer({ server });
wss.on("connection", (socket, req) => {
  const id = new URL(req.url, "http://127.0.0.1").searchParams.get("clientId");
  clients.set(id, socket);
  state.clients.push(id);
  record();
  socket.send(JSON.stringify({ type: "status", data: { sid: id } }));
  socket.on("close", () => {
    if (clients.get(id) === socket) clients.delete(id);
  });
});
server.listen(8188, "127.0.0.1", record);
