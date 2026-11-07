import { useState } from "react";
import { DEFAULT_LOCAL_CONNECTION } from "../../domain/providerConnections.ts";
import {
  normalizeComfyEndpoint,
  nativeComfyRuntime,
} from "../comfyui/index.ts";
import { saveProviderConnection } from "../../integrations/providers/connectionSaveRecovery.ts";
export default function LocalComfyConnection({
  onSaved,
}: {
  onSaved?: (id: string) => void;
}) {
  const [address, setAddress] = useState("http://127.0.0.1:8188"),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const baseUrl = normalizeComfyEndpoint(address);
      const stats = nativeComfyRuntime.desktop
        ? await nativeComfyRuntime.json("/system_stats", undefined, baseUrl)
        : await (
            await fetch(baseUrl + "/system_stats", {
              signal: AbortSignal.timeout(5000),
              credentials: "omit",
              redirect: "error",
            })
          ).json();
      if (!(stats as { system?: unknown }).system)
        throw new Error("服务不是 ComfyUI，请核对地址。");
      const id = `comfy-${new URL(baseUrl).host.replace(/[^a-z0-9]/gi, "-")}`;
      await saveProviderConnection({
        ...DEFAULT_LOCAL_CONNECTION,
        id,
        baseUrl,
        authMode: "none",
        model: "ComfyUI",
        capabilities: {
          modalities: ["image"],
          operations: ["generate"],
          maxReferences: 1,
          maxOutputs: 16,
          async: true,
        },
      });
      setMessage("连接已保存，可选择本地图片编辑工作流。");
      onSaved?.(id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="comfy-connection">
      <summary>连接本地 ComfyUI</summary>
      <fieldset className="comfy-parameters" disabled={busy}>
        <label>
          <span>ComfyUI 服务地址</span>
          <input
            aria-label="保存 ComfyUI 服务地址"
            type="url"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
        </label>
        <button
          className="kk-button kk-button--secondary"
          onClick={() => void save()}
        >
          检测并保存连接
        </button>
        <p role="status">
          {busy
            ? "正在检测本机服务…"
            : message ||
              "本机服务无需 API Key。可以先在画布工作流节点选择目录启动。"}
        </p>
      </fieldset>
    </details>
  );
}
