// KK Studio canvas bridge v1 — installed through the official ComfyUI extension loader.
const { app } = await import(
  new URL("../../scripts/app.js", import.meta.url).href
);
const { api } = await import(
  new URL("../../scripts/api.js", import.meta.url).href
);

let peer,
  nonce,
  clientId,
  ready = false;
const allowed = new Set([
  "http://tauri.localhost",
  "https://tauri.localhost",
  "tauri://localhost",
  "http://127.0.0.1:1421",
  "http://127.0.0.1:1423",
]);
const reply = (op, data = {}) =>
  peer &&
  window.parent.postMessage(
    { source: "kk-comfy-bridge", version: 1, nonce, op, ...data },
    peer,
  );
const originalQueue = api.queuePrompt;
api.queuePrompt = function (...args) {
  if (clientId) this.clientId = clientId;
  return originalQueue.apply(this, args);
};
let busy = false;
window.addEventListener("message", async (event) => {
  const message = event.data;
  if (
    event.source !== window.parent ||
    !allowed.has(event.origin) ||
    !message ||
    message.source !== "kk-studio" ||
    message.version !== 1 ||
    typeof message.nonce !== "string" ||
    !/^[a-f0-9-]{36}$/.test(message.nonce)
  )
    return;
  if (message.op === "hello") {
    if (peer && (peer !== event.origin || nonce !== message.nonce)) return;
    peer = event.origin;
    nonce = message.nonce;
    if (ready) reply("ready");
    return;
  }
  if (event.origin !== peer || message.nonce !== nonce || !ready || busy)
    return;
  busy = true;
  try {
    if (message.op === "load") {
      if (
        JSON.stringify(message.record).length > 1024 * 1024 ||
        typeof message.clientId !== "string" ||
        !/^kk-comfy-[\w-]+-editor$/.test(message.clientId)
      )
        throw new Error("卡片工作流无效");
      clientId = message.clientId;
      if (message.record.editorWorkflow) {
        await app.loadGraphData(message.record.editorWorkflow);
        for (const node of app.graph._nodes) {
          const inputs = message.record.workflow[String(node.id)]?.inputs ?? {};
          for (const widget of node.widgets ?? []) {
            const value = inputs[widget.name];
            if (
              typeof value === "string" ||
              typeof value === "number" ||
              typeof value === "boolean"
            )
              widget.value = value;
          }
        }
        app.graph.setDirtyCanvas(true, true);
      } else
        await app.loadApiJson(message.record.workflow, `KK-${clientId}.json`);
      reply("loaded", { requestId: message.requestId });
    } else if (message.op === "read") {
      const graph = await app.graphToPrompt();
      reply("snapshot", {
        requestId: message.requestId,
        workflow: graph.output,
        editorWorkflow: graph.workflow,
      });
    }
  } catch (error) {
    reply("error", {
      requestId: message.requestId,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    busy = false;
  }
});
app.registerExtension({
  name: "KKStudio.CanvasBridge",
  setup() {
    ready = true;
    reply("ready");
  },
});
