import {
  nativeComfyRuntime,
  normalizeComfyEndpoint,
} from "../comfyui/index.ts";
export function comfyNodeChoices(
  value: unknown,
  node: string,
  input: string,
): string[] {
  const field = (
    value as Record<
      string,
      { input?: { required?: Record<string, unknown[]> } }
    >
  )[node]?.input?.required?.[input];
  const choices = Array.isArray(field?.[0])
    ? field[0]
    : (field?.[1] as { options?: unknown[] } | undefined)?.options;
  return Array.isArray(choices)
    ? choices.filter((choice): choice is string => typeof choice === "string")
    : [];
}
export async function readComfyImageModels(value: string, signal: AbortSignal) {
  const endpoint = normalizeComfyEndpoint(value);
  const deadline = AbortSignal.any([signal, AbortSignal.timeout(10_000)]);
  async function options(node: string, input: string): Promise<string[]> {
    const path = `/object_info/${node}`;
    try {
      let value: unknown;
      if (nativeComfyRuntime.desktop)
        value = await nativeComfyRuntime.json(path, undefined, endpoint);
      else {
        const response = await fetch(endpoint + path, {
          signal: deadline,
          credentials: "omit",
          redirect: "error",
        });
        if (response.status === 404) return [];
        if (!response.ok) throw new Error(`ComfyUI HTTP ${response.status}`);
        value = await response.json();
      }
      deadline.throwIfAborted();
      return comfyNodeChoices(value, node, input);
    } catch (error) {
      if (String(error).includes("HTTP 404")) return [];
      throw error;
    }
  }
  const [checkpoints, upscaleModels, backgroundModels] = await Promise.all([
    options("CheckpointLoaderSimple", "ckpt_name"),
    options("UpscaleModelLoader", "model_name"),
    options("LoadBackgroundRemovalModel", "bg_removal_name"),
  ]);
  return { checkpoints, upscaleModels, backgroundModels };
}
