import { useEffect, useRef, useState } from "react";
import {
  CANVAS_KIND_LABELS,
  type CanvasItemKind,
  type DemoResult,
} from "../../domain/canvasItems";
import { loadLocalDemo } from "../../domain/localGeneration";

type Phase = "idle" | "loading" | "success" | "error" | "cancelled" | "offline";
export function useLocalGeneration(
  kind: CanvasItemKind,
  onResults?: (results: DemoResult[]) => void,
) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const request = useRef<AbortController | null>(null);
  const deliver = useRef(onResults);
  deliver.current = onResults;
  useEffect(() => () => request.current?.abort(), []);
  function cancel(): void {
    request.current?.abort();
    request.current = null;
    setPhase("cancelled");
  }
  async function run(prompt: string, count = 1): Promise<void> {
    if (request.current || !deliver.current) return;
    if (!prompt.trim()) {
      setError(`请先填写${CANVAS_KIND_LABELS[kind]}描述。`);
      setPhase("error");
      return;
    }
    const copies = [1, 2, 4, 6, 8].includes(count) ? count : 1;
    setQuantity(copies);
    const controller = new AbortController();
    request.current = controller;
    setPhase("loading");
    setError("");
    try {
      /* Keep the reserved cards visible for a short, cancellable frame so a
         send action has a clear waiting state even when the bundled asset is
         already cached by the browser. */
      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(resolve, 180);
        controller.signal.addEventListener(
          "abort",
          () => {
            window.clearTimeout(timer);
            reject(
              controller.signal.reason ??
                new DOMException("已取消", "AbortError"),
            );
          },
          { once: true },
        );
      });
      const sample = await loadLocalDemo(kind, controller.signal);
      if (controller.signal.aborted || request.current !== controller) return;
      const results = Array.from({ length: copies }, (_, index) => ({
        ...sample,
        title:
          copies === 1
            ? sample.title
            : `${sample.title}（演示 ${index + 1}/${copies}）`,
      }));
      setPhase("success");
      deliver.current?.(results);
    } catch {
      if (controller.signal.aborted || request.current !== controller) return;
      setError("本地测试素材加载失败，请重试。");
      setPhase(navigator.onLine ? "error" : "offline");
    } finally {
      if (request.current === controller) request.current = null;
    }
  }
  const messages: Record<Phase, string> = {
    idle: "本地演示 · 固定测试素材，提示词与参数不改变素材；不消耗积分，不上传或保存到服务器。",
    loading: `正在加载本地演示素材，将添加 ${quantity} 份相同素材；可取消。`,
    success: `已添加 ${quantity} 份本地演示结果；本次会话可用。`,
    error,
    cancelled: "已取消本地演示，可再次生成。",
    offline:
      "当前离线，本地媒体未能加载；恢复连接后可重试。文案演示可离线使用。",
  };
  return {
    phase,
    message: messages[phase],
    run,
    cancel,
    available: Boolean(onResults),
  };
}
