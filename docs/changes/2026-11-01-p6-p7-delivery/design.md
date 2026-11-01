# P6/P7 Experience Completion Design

## Intent

Complete the missing user-facing pieces around the existing ComfyUI and image-capability contracts so a user can install or connect ComfyUI, run the three image editing actions from the image editor, and trace a generated image back to its workflow card.

## Goals

- Show an install guide next to the existing desktop-only directory picker, with the official ComfyUI download link and concise setup steps.
- Dispatch outpaint, super-resolution, and image-splitting actions through the existing `CapabilityRegistry.run` path and existing ComfyUI adapter seam.
- Show a `Workflow Source` control for ComfyUI-generated image nodes and locate/select the originating workflow card when activated.
- Capture fresh local SD/SDXL image-generation evidence on the canvas and update the delivery verification record.
- Preserve the 21 Figma audit files already present on main, merge the verified branch into main, and reclaim the temporary worktree.

## Non-goals and constraints

- Do not add a second task queue, image algorithm, provider API, or asset store.
- Do not infer or synthesize a ComfyUI workflow; actions remain bound to explicit saved API-format workflows and existing adapters.
- Do not alter unrelated Figma/layout work or discard dirty user files on main.
- Keep Desktop/Web/Mobile boundaries and existing refusal behavior for unsupported adapters/platforms.

## Approaches

1. **Reuse existing contracts (chosen):** add thin UI callbacks around the existing image capability dispatch and canvas selection/locate APIs. This is the smallest change and keeps validation, lineage, and fallback behavior centralized.
2. **Create a new image-edit service:** would duplicate task submission and adapter logic already present, increasing drift and merge risk.
3. **Embed ComfyUI-specific calls in components:** would bypass the registry and make UI responsible for provider validation; rejected by the existing architecture and security gates.

## Design

- `ComfyWorkflowNode.tsx` owns a local help popover opened beside `选择目录`. The link targets the official ComfyUI GitHub repository/download guidance; the text explains portable/desktop setup, model placement, and choosing the root directory. It is available only when the directory action is shown and does not change startup behavior.
- `EditToolbar.tsx` accepts a single capability action callback and renders the three existing actions. `ImageEditor.tsx` builds the task reference from the current archived source asset, calls the existing image capability dispatch, and reports loading/error/success through the current editor status. Unsupported or unbound adapters keep the existing refusal message.
- `Canvas.tsx` derives the selected item from `controls.selectedNode`, renders a compact right-side inspector for ComfyUI output nodes, and uses the existing `setSelectedNode`/`locateNode` functions to focus the source workflow card. No new persisted selection state is introduced.
- Add focused tests for the guide, capability dispatch callbacks, and lineage locate behavior. The real SD/SDXL run is recorded as external evidence because model/GPU output is not deterministic unit-test material.

## Verification

Run the focused unit/browser checks first, then `npm run typecheck`, `npm run lint`, `npm test`, and the relevant browser test. Run the local ComfyUI SD/SDXL workflow through the existing adapter and save the prompt/result/asset/edge evidence under `D:/kk-studio/output/p6-p7-2026-11-01/`. Merge only after the branch is clean and all required checks pass; preserve main's existing Figma audit files during the merge.
