import { createContext, useContext, useMemo, useRef, useEffect } from "react";
import {
  CanvasMcpServer,
  CanvasOpSchema,
  type CanvasOperationBridge,
} from "../domain/canvasOperations.ts";
import {
  exportCanvasImage,
  autoLayoutCanvas,
} from "../features/canvas/index.ts";
import { storeGeneratedAsset } from "../features/creation/index.ts";

export interface CanvasOperationsRuntime {
  flush(): Promise<void>;
  getState: CanvasOperationBridge["getState"];
  executeOperation(
    raw: unknown,
  ): Promise<ReturnType<CanvasMcpServer["executeOp"]>>;
}
export const CanvasOperationsContext =
  createContext<CanvasOperationsRuntime | null>(null);
export const useCanvasOperations = () => useContext(CanvasOperationsContext);

export function useCanvasOperationsRuntime(
  bridge: Omit<CanvasOperationBridge, "exportImage">,
  options: {
    scope: string;
    disabledReason?: string;
    flush?: () => Promise<void>;
  },
) {
  const current = useRef({ bridge, options });
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  current.current = { bridge, options };
  return useMemo<CanvasOperationsRuntime>(() => {
    let pending = false;
    return {
      async flush() {
        if (!mounted.current || current.current.options.disabledReason)
          throw new Error(
            current.current.options.disabledReason ?? "画布已关闭",
          );
        await current.current.options.flush?.();
      },
      getState: () => current.current.bridge.getState(),
      async executeOperation(raw) {
        const { bridge, options } = current.current;
        if (
          !mounted.current ||
          pending ||
          options.disabledReason ||
          !options.scope
        )
          return {
            success: false,
            op: "unknown",
            error: options.disabledReason ?? "画布正在保存或尚未打开项目",
          };
        pending = true;
        try {
          const parsed = CanvasOpSchema.safeParse(raw);
          const png =
            parsed.success &&
            ["export_canvas_image", "export_canvas_png"].includes(
              parsed.data.op,
            )
              ? await exportCanvasImage(bridge.getState())
              : undefined;
          const artifact = png
            ? await storeGeneratedAsset({
                source: png,
                sourceKind: "upload",
                isAiGenerated: false,
                tags: ["画布导出"],
              })
            : undefined;
          if (
            !mounted.current ||
            options.scope !== current.current.options.scope
          )
            throw new Error("项目已切换，画布操作已停止");
          const server = new CanvasMcpServer({
            ...bridge,
            autoLayout: (ids, direction) =>
              bridge.commit(
                autoLayoutCanvas(bridge.getState(), ids, direction),
              ),
            exportImage: () => {
              if (!png) throw new Error("画布图片尚未准备完成");
              return { assetId: artifact!.assetId, mime: "image/png" };
            },
          });
          const result = server.executeOp(raw);
          if (
            result.data !== undefined &&
            new TextEncoder().encode(JSON.stringify(result.data)).length >
              1024 * 1024
          )
            throw new Error(
              "导出数据超过工具回执上限，请减少节点后重试或使用项目归档",
            );
          if (result.success) await options.flush?.();
          if (options.scope !== current.current.options.scope)
            throw new Error("项目已切换，请在原项目核对执行结果");
          return result;
        } catch (error) {
          return {
            success: false,
            op: "unknown",
            error: error instanceof Error ? error.message : "画布保存失败",
          };
        } finally {
          pending = false;
        }
      },
    };
  }, []);
}
