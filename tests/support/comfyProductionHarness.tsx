import { createRoot } from "react-dom/client";
import { useRef, useState } from "react";
import {
  useComfyEditorBridge,
  type ComfyRuntimePort,
} from "../../src/features/comfyui/index.ts";
import { ImageCapabilityDialog } from "../../src/features/image-edit/index.ts";
import {
  CanvasImageCommandContext,
  type CanvasImageRequest,
} from "../../src/runtime/canvasCommandRuntime.tsx";
import type { CanvasCollectionItem } from "../../src/domain/canvasItems.ts";
import { imageSpec } from "../fixtures/image-capability.ts";

function root() {
  const host = document.createElement("div");
  host.id = "comfy-production-harness";
  document.body.append(host);
  return createRoot(host);
}

export function mountEditor() {
  function Editor() {
    const frame = useRef<HTMLIFrameElement>(null);
    const [saved, setSaved] = useState(0),
      [back, setBack] = useState(false);
    const [record] = useState({
      id: "original",
      name: "Original",
      description: "",
      source: "created" as const,
      tags: [],
      createdAt: 1,
      updatedAt: 1,
      workflow: { save: { class_type: "SaveImage", inputs: {} } },
    });
    const bridge = useComfyEditorBridge({
      frame,
      record,
      open: true,
      clientId: "fixture",
      runtime: { endpoint: location.origin } as ComfyRuntimePort,
      onSave: async () => setSaved((count) => count + 1),
      onBack: () => setBack(true),
    });
    return (
      <>
        <iframe
          ref={frame}
          title="failed graph load"
          onLoad={bridge.onLoad}
          srcDoc={`<script>addEventListener('message',({data,origin})=>parent.postMessage({...data,source:'kk-comfy-bridge',op:data.op==='hello'?'ready':'error',error:'fixture graph load rejected'},origin))</script>`}
        />
        <p data-testid="message">{bridge.message}</p>
        <p data-testid="saved">{saved}</p>
        <p data-testid="back">{String(back)}</p>
        <button disabled={bridge.busy} onClick={() => void bridge.back()}>
          返回测试画布
        </button>
      </>
    );
  }
  root().render(<Editor />);
}

export function mountCapability() {
  let submitted: CanvasImageRequest | undefined;
  const initial = imageSpec("image.upscale");
  initial.parameters = { scale: 4 };
  initial.workflow.nodes.other = {
    class_type: "LoadImage",
    inputs: { image: "unrelated.png" },
  };
  function Capability() {
    const [open, setOpen] = useState(true);
    const [source, setSource] = useState<CanvasCollectionItem>({
      id: "original",
      kind: "image",
      title: "Original",
      description: "",
      assetId: initial.sourceAssetId,
      imageCapability: initial,
      imageCapabilityConnectionId: "local-fixture",
      imageCapabilityPrompt: "saved description",
    });
    return (
      <CanvasImageCommandContext.Provider
        value={{
          model: "ComfyUI",
          models: [],
          tasks: [],
          cancel() {},
          updateItem: (_id, patch) =>
            setSource((value) => ({ ...value, ...patch })),
          submit: async (request) => {
            submitted = request;
            return "fixture request captured";
          },
        }}
      >
        <button onClick={() => setOpen(true)}>重新打开</button>
        {open && (
          <ImageCapabilityDialog
            source={source}
            capabilityId="image.upscale"
            onClose={() => setOpen(false)}
          />
        )}
      </CanvasImageCommandContext.Provider>
    );
  }
  root().render(<Capability />);
  return { submitted: () => submitted };
}
