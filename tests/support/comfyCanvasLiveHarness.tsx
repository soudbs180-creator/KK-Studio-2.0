import { createRoot } from "react-dom/client";
import { useState } from "react";
import Canvas from "../../src/components/Canvas.tsx";
import {
  createProject,
  normalizeCreationSnapshot,
  emptySnapshot,
  loadStoredAsset,
} from "../../src/features/creation/index.ts";
import {
  writeLocalWorkflows,
  type ComfyRuntimePort,
} from "../../src/features/comfyui/index.ts";
import type { CanvasCollectionItem } from "../../src/domain/canvasItems.ts";
import type { ProjectCanvas } from "../../src/domain/projectCanvas.ts";

declare const __COMFY_URL__: string;
declare const __COMFY_CHECKPOINT__: string;

const comfyUrl = __COMFY_URL__.replace(/\/+$/, "");

export async function mount() {
  const fixture = {
    id: "sd15-live",
    name: "SD1.5 live workflow",
    description: "Real local ComfyUI SD1.5 workflow",
    source: "imported" as const,
    tags: [],
    createdAt: 1,
    updatedAt: 1,
    workflow: {
      "1": {
        class_type: "CheckpointLoaderSimple",
        inputs: { ckpt_name: __COMFY_CHECKPOINT__ },
      },
      "2": {
        class_type: "CLIPTextEncode",
        inputs: {
          text: "a small red apple on a studio table, soft light",
          clip: ["1", 1],
        },
      },
      "3": {
        class_type: "CLIPTextEncode",
        inputs: { text: "blurry, low quality", clip: ["1", 1] },
      },
      "4": {
        class_type: "EmptyLatentImage",
        inputs: { width: 512, height: 512, batch_size: 1 },
      },
      "5": {
        class_type: "KSampler",
        inputs: {
          seed: 1,
          steps: 4,
          cfg: 7.0,
          sampler_name: "euler",
          scheduler: "normal",
          denoise: 1.0,
          model: ["1", 0],
          positive: ["2", 0],
          negative: ["3", 0],
          latent_image: ["4", 0],
        },
      },
      "6": {
        class_type: "VAEDecode",
        inputs: { samples: ["5", 0], vae: ["1", 2] },
      },
      "7": {
        class_type: "SaveImage",
        inputs: { filename_prefix: "kk-p6-p7-live", images: ["6", 0] },
      },
    },
  };
  writeLocalWorkflows([fixture]);
  let ready = false;
  const project = createProject({
    kind: "image",
    prompt: "fixture",
    model: "fixture",
    attachments: [],
  });
  const source: CanvasCollectionItem = {
    id: "comfy-card",
    kind: "text",
    title: "ComfyUI 工作流",
    description: "",
    comfyWorkflow: { workflowId: fixture.id },
  };
  let persisted = {
    items: [source],
    canvas: {
      version: 1,
      positions: { "comfy-card": { x: 80, y: 120 } },
      edges: [],
      viewport: { x: 0, y: 0, scale: 1 },
    } as ProjectCanvas,
  };
  const runtime: ComfyRuntimePort = {
    desktop: true,
    selectRoot: async () => "external-ComfyUI",
    async start() {
      const response = await fetch(`${comfyUrl}/system_stats`);
      if (!response.ok) throw new Error(`ComfyUI HTTP ${response.status}`);
      ready = true;
      return this.status();
    },
    async stop() {
      ready = false;
    },
    status: async () => ({
      pid: ready ? 123 : null,
      owned: false,
      ready,
      root: ready ? "external-ComfyUI" : null,
    }),
    async json(path, body) {
      const response = await fetch(comfyUrl + path, {
        method: body ? "POST" : "GET",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) throw new Error("fixture HTTP failure");
      return response.json();
    },
    async readOutput(output) {
      const response = await fetch(
        comfyUrl +
          "/view?filename=" +
          encodeURIComponent(output.filename) +
          "&subfolder=" +
          encodeURIComponent(output.subfolder) +
          "&type=" +
          output.type,
      );
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(blob);
      });
    },
  };
  async function flush() {
    localStorage.setItem("comfy-fixture-durable", JSON.stringify(persisted));
  }
  function Harness() {
    const [items, setItems] = useState(persisted.items);
    const [canvas, setCanvas] = useState(persisted.canvas);
    persisted = { items, canvas };
    return (
      <Canvas
        projectId={project.id}
        items={items}
        onItemsChange={setItems}
        initialCanvas={canvas}
        onCanvasChange={setCanvas}
        likedIds={new Set()}
        onToggleLike={() => {}}
        onOpenChat={() => {}}
        comfyRuntime={runtime}
        onFlush={flush}
      />
    );
  }
  const element = document.createElement("div");
  element.id = "comfy-harness";
  element.style.cssText = "position:fixed;inset:0;z-index:50;";
  document.body.append(element);
  const root = createRoot(element);
  let mountId = 0;
  root.render(<Harness />);
  return {
    flush,
    reopen() {
      persisted = JSON.parse(localStorage.getItem("comfy-fixture-durable")!);
      root.render(<Harness key={++mountId} />);
    },
    state: () => structuredClone(persisted),
    durable: () => JSON.parse(localStorage.getItem("comfy-fixture-durable")!),
    reload: () =>
      normalizeCreationSnapshot({
        ...emptySnapshot(),
        projects: [
          {
            ...project,
            ...JSON.parse(localStorage.getItem("comfy-fixture-durable")!),
          },
        ],
      }),
    asset: loadStoredAsset,
    close: () => {
      root.unmount();
      element.remove();
    },
  };
}
