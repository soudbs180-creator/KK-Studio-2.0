import { useEffect, useRef, useState } from "react";
import {
  analyzeVideoSource,
  type VideoShotReference,
} from "../../features/workflows/index.ts";
import {
  storeGeneratedAsset,
  loadStoredAsset,
} from "../../features/creation/index.ts";
import { useCanvasOperations } from "../../runtime/canvasCommandRuntime.tsx";
import type { CanvasOperation } from "../../domain/canvasOperations.ts";

export default function VideoShotBreakdownControl({
  source,
  sourceId,
}: {
  source: string;
  sourceId: string;
}) {
  const operations = useCanvasOperations();
  const [shots, setShots] = useState<VideoShotReference[]>([]);
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const request = useRef<AbortController>();
  const document =
    useRef<Extract<CanvasOperation, { op: "import_canvas_json" }>>();
  useEffect(() => {
    setShots([]);
    document.current = undefined;
    setNotice("");
    return () => request.current?.abort();
  }, [source, sourceId]);
  async function analyze() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setNotice("");
    setShots([]);
    document.current = undefined;
    try {
      const original = source.startsWith("kk-asset:")
        ? (await loadStoredAsset(source.slice(9)))?.preview
        : source;
      controller.signal.throwIfAborted();
      if (!original) throw new Error("视频原件无法恢复，请在资产面板核对");
      const result = await analyzeVideoSource(original, {
        signal: controller.signal,
        onProgress: (seconds) =>
          setNotice(`正在解码 ${seconds.toFixed(1)} 秒…`),
      });
      controller.signal.throwIfAborted();
      setShots(result);
      setNotice(`已提取 ${result.length} 个镜头参考帧，请展开到画布。`);
    } catch (error) {
      setNotice(
        controller.signal.aborted
          ? "拉片已取消，原视频保留。"
          : error instanceof Error
            ? error.message
            : "拉片失败，原视频保留。",
      );
    } finally {
      request.current = undefined;
      setBusy(false);
    }
  }
  async function expand() {
    if (!operations || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    try {
      if (!document.current) {
        const namespace = crypto.randomUUID();
        const cards = [];
        for (const [index, shot] of shots.entries()) {
          controller.signal.throwIfAborted();
          const asset = await storeGeneratedAsset({
            source: shot.preview,
            sourceKind: "upload",
            isAiGenerated: false,
            sourceJobId: `video-shot-${sourceId}-${namespace}-${index}`,
            tags: ["视频拉片", `${shot.timestampSeconds.toFixed(2)}s`],
            signal: controller.signal,
          });
          cards.push({
            id: `shot-${namespace}-${index}`,
            kind: "image" as const,
            title: `镜头 ${index + 1} · ${shot.timestampSeconds.toFixed(2)}s`,
            description: `来自视频 ${sourceId} · frame ${shot.frameIndex}`,
            assetId: asset.assetId,
            referenceOnly: true,
            referenceSlot: "构图" as const,
          });
        }
        document.current = {
          op: "import_canvas_json",
          payload: {
            document: {
              version: 1,
              cards,
              positions: Object.fromEntries(
                cards.map((c, i) => [
                  c.id,
                  { x: 82 + (i % 3) * 650, y: 107 + Math.floor(i / 3) * 520 },
                ]),
              ),
              edges: [],
            },
          },
        };
      }
      controller.signal.throwIfAborted();
      const existing = operations.getState().items;
      const alreadyImported = document.current.payload.document.cards.every(
        (card) =>
          existing.some(
            (item) => item.id === card.id && item.assetId === card.assetId,
          ),
      );
      if (alreadyImported) await operations.flush();
      else {
        const receipt = await operations.executeOperation(document.current);
        if (!receipt.success) throw new Error(receipt.error);
      }
      setShots([]);
      setNotice("切镜参考卡已归档并添加到画布，原视频保留。");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "参考卡保存失败，请在画布核对后重试。",
      );
    } finally {
      request.current = undefined;
      setBusy(false);
    }
  }
  return (
    <div
      className="video-shot-actions"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="ui-button"
        disabled={busy || !source || !operations}
        onClick={() => void analyze()}
      >
        逐帧拉片
      </button>
      {busy && (
        <button
          type="button"
          className="ui-button"
          onClick={() => request.current?.abort()}
        >
          取消拉片
        </button>
      )}
      {shots.length > 0 && (
        <button
          type="button"
          className="primary-button"
          disabled={busy}
          onClick={() => void expand()}
        >
          展开为画布参考卡
        </button>
      )}
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}
