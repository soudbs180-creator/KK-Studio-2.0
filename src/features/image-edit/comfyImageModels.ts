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
  async function options(node: string, input: string): Promise<string[]> {
    const path = `/object_info/${node}`;
    const value = nativeComfyRuntime.desktop
      ? await nativeComfyRuntime.json(path, undefined, endpoint)
      : await (
          await fetch(endpoint + path, {
            signal,
            credentials: "omit",
            redirect: "error",
          })
        ).json();
    signal.throwIfAborted();
    return comfyNodeChoices(value, node, input);
  }
  const [checkpoints, upscaleModels, backgroundModels] = await Promise.all([
    options("CheckpointLoaderSimple", "ckpt_name"),
    options("UpscaleModelLoader", "model_name"),
    options("LoadBackgroundRemovalModel", "bg_removal_name"),
  ]);
  return { checkpoints, upscaleModels, backgroundModels };
}
