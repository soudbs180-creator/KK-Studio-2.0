import { useState } from "react";
import { DEFAULT_COMFY_ENDPOINT } from "./comfyEndpoint.ts";
export default function ComfyWorkflowConnection({
  endpoint,
  disabled,
  onConnect,
  onStart,
}: {
  endpoint?: string;
  disabled: boolean;
  onConnect: (endpoint: string) => void;
  onStart?: () => void;
}) {
  const [value, setValue] = useState(endpoint ?? DEFAULT_COMFY_ENDPOINT);
  return (
    <details className="comfy-connection">
      <summary>本地连接设置</summary>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onConnect(value);
        }}
      >
        <fieldset className="comfy-parameters" disabled={disabled}>
          <label>
            <span>ComfyUI 地址</span>
            <input
              aria-label="ComfyUI 地址"
              type="url"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              required
            />
          </label>
          <button className="kk-button kk-button--secondary" type="submit">
            连接本机服务
          </button>
        </fieldset>
        {onStart && (
          <button
            disabled={disabled}
            className="kk-button kk-button--secondary"
            type="button"
            onClick={onStart}
          >
            启动 KK 托管服务
          </button>
        )}
      </form>
    </details>
  );
}
