import { PLUGIN_RPC_MAX_BYTES } from "../../../packages/creation-contracts/index.ts";
import type { PluginNodeContext } from "./pluginTypes.ts";
import { createPluginRpc } from "./pluginRpc.ts";

// A trusted outer frame pins navigation of the untrusted inner frame to blob:.
// The guest's own frame-src 'none' also forbids descendants and network escape.
export function pluginSandboxDocument(source: string, token: string) {
  const policy =
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none';";
  const guestBootstrap = `
    const pending = new Map(); let counter = 0;
    window.KKPlugin = Object.freeze({ request(method, params = {}) {
      if (pending.size >= 8) return Promise.reject(new Error('Too many requests'));
      const id = String(++counter);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(id); reject(new Error('Plugin RPC timeout')); }, 16000);
        pending.set(id, { resolve, reject, timer });
        parent.postMessage(JSON.stringify({ id, method, params }), '*');
      });
    }});
    addEventListener('message', event => {
      if (event.source !== parent || typeof event.data !== 'string' || event.data.length > ${PLUGIN_RPC_MAX_BYTES}) return;
      try { const reply = JSON.parse(event.data), entry = pending.get(reply.id);
        if (!entry) return; pending.delete(reply.id); clearTimeout(entry.timer);
        reply.error ? entry.reject(new Error(reply.error.message)) : entry.resolve(reply.result);
      } catch {}
    });`;
  const script = (value: string) =>
    `<script nonce="${token}">${value.replace(/<\/script/gi, "<\\/script")}</script>`;
  const guest = `<!doctype html><meta http-equiv="Content-Security-Policy" content="${policy} frame-src 'none'"><div id="root"></div>${script(guestBootstrap)}${script(source)}`;
  const wrapper = `
    const token = ${JSON.stringify(token)}, guest = document.createElement('iframe');
    guest.sandbox = 'allow-scripts'; guest.style = 'width:100%;height:100%;border:0';
    guest.title = 'Plugin isolated content';
    const url = URL.createObjectURL(new Blob([${JSON.stringify(guest).replaceAll("<", "\\u003c")}], {type:'text/html'}));
    guest.src = url; document.body.append(guest);
    addEventListener('message', event => {
      if (event.source === guest.contentWindow && event.origin === 'null' && typeof event.data === 'string' && event.data.length <= ${PLUGIN_RPC_MAX_BYTES})
        parent.postMessage({ channel:'kk-plugin-rpc', token, body:event.data }, '*');
      else if (event.source === parent && event.data?.channel === 'kk-plugin-reply' && event.data.token === token && typeof event.data.body === 'string')
        guest.contentWindow.postMessage(event.data.body, '*');
    });
    addEventListener('unload', () => URL.revokeObjectURL(url));`;
  return `<!doctype html><meta http-equiv="Content-Security-Policy" content="${policy} frame-src blob:"><body style="margin:0">${script(wrapper)}</body>`;
}

export function mountPluginSandbox(
  frame: HTMLIFrameElement,
  source: string,
  context: () => PluginNodeContext,
  active: () => boolean,
) {
  const token = crypto.randomUUID().replaceAll("-", "");
  const rpc = createPluginRpc(context, active);
  let closed = false;
  frame.setAttribute("sandbox", "allow-scripts");
  frame.referrerPolicy = "no-referrer";
  const receive = (event: MessageEvent) => {
    const data = event.data;
    if (
      closed ||
      event.source !== frame.contentWindow ||
      event.origin !== "null" ||
      !data ||
      data.channel !== "kk-plugin-rpc" ||
      data.token !== token ||
      typeof data.body !== "string"
    )
      return;
    void rpc.dispatch(data.body).then((body) => {
      if (!closed && active())
        frame.contentWindow?.postMessage(
          { channel: "kk-plugin-reply", token, body },
          "*",
        );
    });
  };
  window.addEventListener("message", receive);
  frame.srcdoc = pluginSandboxDocument(source, token);
  return () => {
    closed = true;
    rpc.close();
    window.removeEventListener("message", receive);
    frame.removeAttribute("srcdoc");
  };
}
