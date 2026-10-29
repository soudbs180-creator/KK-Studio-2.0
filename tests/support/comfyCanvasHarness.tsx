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

export async function mount() {
  const fixture = {
    id: "api-fixture",
    name: "Fixture API workflow",
    description: "HTTP fixture",
    source: "imported" as const,
    tags: [],
    createdAt: 1,
    updatedAt: 1,
    workflow: { "1": { class_type: "FixtureOutput", inputs: {} } },
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
    selectRoot: async () => "D:/fixture-ComfyUI",
    async start() {
      ready = true;
      return this.status();
    },
    async stop() {
      ready = false;
    },
    status: async () => ({
      pid: ready ? 123 : null,
      owned: ready,
      ready,
      root: ready ? "D:/fixture-ComfyUI" : null,
    }),
    async json(path, body) {
      const response = await fetch("http://127.0.0.1:8188" + path, {
        method: body ? "POST" : "GET",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) throw new Error("fixture HTTP failure");
      return response.json();
    },
    async readOutput(output) {
      const response = await fetch(
        "http://127.0.0.1:8188/view?filename=" +
          encodeURIComponent(output.filename),
      );
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(blob);
      });
    },
  };
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
        onFlush={async () => {
          localStorage.setItem(
            "comfy-fixture-durable",
            JSON.stringify(persisted),
          );
        }}
      />
    );
  }
  const element = document.createElement("div");
  element.id = "comfy-harness";
  element.style.cssText = "position:fixed;inset:0;z-index:50;";
  document.body.append(element);
  const root = createRoot(element);
  root.render(<Harness />);
  return {
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
