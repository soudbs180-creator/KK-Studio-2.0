import { useEffect, useRef, useState } from "react";
import {
  CANVAS_KIND_LABELS,
  type CanvasItemKind,
  type DemoResult,
} from "../../domain/canvasItems";
import { DEMO_MEDIA } from "../../domain/demoMedia";
import UiIcon from "../UiIcon";

type Phase = "idle" | "loading" | "success" | "error" | "cancelled" | "offline";
export default function DemoRunButton({
  kind,
  onResult,
}: {
  kind: CanvasItemKind;
  onResult: (result: DemoResult) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  async function run(): Promise<void> {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const sample = DEMO_MEDIA.find((item) => item.kind === kind)!;
    if (!navigator.onLine && kind !== "text") {
      setPhase("offline");
      return;
    }
    setPhase("loading");
    try {
      const delay = new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(resolve, 800);
        controller.signal.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(new DOMException("Cancelled", "AbortError"));
          },
          { once: true },
        );
      });
      const load =
        kind === "text"
          ? Promise.resolve()
          : fetch(sample.src!, { signal: controller.signal }).then(
              async (response) => {
                if (!response.ok) throw new Error("示范资源不可用");
                const data = await response.blob();
                if (!data.size) throw new Error("示范资源为空");
              },
            );
      await Promise.all([delay, load]);
      if (controller.signal.aborted || request.current !== controller) return;
      setPhase("success");
      onResult({ ...sample });
    } catch {
      if (request.current !== controller || controller.signal.aborted) return;
      setPhase(navigator.onLine ? "error" : "offline");
    }
  }
  const messages: Record<Phase, string> = {
    idle: "本地示范，不消耗积分",
    loading: "演示处理中，可取消",
    success: "示范结果已放入下游卡片",
    cancelled: "已取消，可重新试用示范。",
    error: "示范资源加载失败，请重试。",
    offline: "当前离线，恢复连接后可重试加载示范资源。",
  };
  return (
    <div className="demo-run" data-phase={phase}>
      {phase === "loading" ? (
        <button
          className="ui-button"
          aria-label="取消示范处理"
          onClick={() => {
            request.current?.abort();
            setPhase("cancelled");
          }}
        >
          取消
        </button>
      ) : (
        <button
          className="ui-button"
          aria-label={`试用${CANVAS_KIND_LABELS[kind]}示范`}
          onClick={run}
        >
          <UiIcon name={kind} size={16} />
          试用示范
        </button>
      )}
      <span role="status">{messages[phase]}</span>
    </div>
  );
}
