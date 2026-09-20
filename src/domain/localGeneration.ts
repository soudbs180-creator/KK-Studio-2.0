import { DEMO_MEDIA } from "./demoMedia";
import type { CanvasItemKind, DemoResult } from "./canvasItems";

/** Load a bundled test asset. Prompt and model parameters do not alter this asset. */
export async function loadLocalDemo(
  kind: CanvasItemKind,
  signal: AbortSignal,
): Promise<DemoResult> {
  const sample = DEMO_MEDIA.find((item) => item.kind === kind);
  if (!sample) throw new Error("缺少本地测试素材");
  signal.throwIfAborted();
  if (kind !== "text") {
    const response = await fetch(sample.src!, { signal });
    if (!response.ok || !(await response.blob()).size)
      throw new Error("本地测试素材无法加载");
  }
  signal.throwIfAborted();
  return { ...sample };
}
