import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import type { MobileAsset } from "../core/mobileModel.ts";
import { useApplication } from "../application/AppProvider.tsx";
import {
  imageSizeFromBytes,
  type ImageSize,
} from "../application/imageDerivativeDimensions.ts";
import {
  prepareImageDerivative,
  saveImageDerivative,
  type ImageDerivativePreview,
} from "../application/imageDerivativeFlow.ts";
import { renderImageDerivative } from "../application/imageDerivative";
import { createLocalPreviewSource } from "./MediaOriginalPreviewSource";
import type { LocalPreviewSource } from "./MediaOriginalPreviewResource.ts";
import { useUnsavedExit } from "./useUnsavedExit.tsx";

/** Captures account and asset once; late callbacks cannot publish into another scope. */
export function useImageDerivativeEditor(asset: MobileAsset) {
  const { app, state } = useApplication(),
    [ctx] = useState(() => app.context());
  const [size, setSize] = useState<ImageSize>(),
    [error, setError] = useState<string>(),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState<"preview" | "save">(),
    [rotation, setRotation] = useState(0),
    [width, setWidth] = useState(""),
    [cropping, setCropping] = useState(false),
    [crop, setCrop] = useState({ x: "0", y: "0", width: "", height: "" }),
    [preview, setPreview] = useState<ImageDerivativePreview>(),
    [source, setSource] = useState<LocalPreviewSource>(),
    [previewError, setPreviewError] = useState(false),
    [saved, setSaved] = useState<MobileAsset>(),
    [changed, setChanged] = useState(false),
    [resources] = useState(() => new Set<LocalPreviewSource>());
  const alive = useRef(true),
    sequence = useRef(0),
    currentSource = useRef<LocalPreviewSource>(undefined);
  const dirty = changed && !saved;
  const exit = useUnsavedExit(dirty, ctx.accountId, () => {
    sequence.current++;
  });
  useEffect(() => {
    alive.current = true;
    let pending = true;
    const timer = setTimeout(() => {
      if (pending && alive.current && app.valid(ctx)) {
        pending = false;
        setLoading(false);
        setError("读取尺寸超时，原件保留；返回后可重新打开编辑。");
      }
    }, 15000);
    void ctx.repo
      .readOriginal(asset.id)
      .then((bytes) => {
        if (!pending || !alive.current || !app.valid(ctx)) return;
        const next = imageSizeFromBytes(bytes, asset.mime);
        setSize(next);
        setCrop({
          x: "0",
          y: "0",
          width: String(next.width),
          height: String(next.height),
        });
      })
      .catch((failure: unknown) => {
        if (pending && alive.current && app.valid(ctx))
          setError(
            failure instanceof Error
              ? failure.message
              : "无法读取图片尺寸，原件保留。",
          );
      })
      .finally(() => {
        if (pending && alive.current && app.valid(ctx)) setLoading(false);
        pending = false;
        clearTimeout(timer);
      });
    return () => {
      alive.current = false;
      pending = false;
      clearTimeout(timer);
    };
  }, [app, ctx, asset.id, asset.mime]);
  useEffect(() => {
    return () => {
      for (const resource of resources) resource.dispose();
      resources.clear();
    };
  }, [resources]);
  function disposeSource() {
    const previous = currentSource.current;
    currentSource.current = undefined;
    if (previous) {
      resources.delete(previous);
      previous.dispose();
    }
  }
  function change(operation: () => void) {
    setChanged(true);
    sequence.current++;
    operation();
    disposeSource();
    setPreview(undefined);
    setSource(undefined);
    setSaved(undefined);
    setPreviewError(false);
  }
  function scope(token: number) {
    return alive.current && sequence.current === token && app.valid(ctx);
  }
  async function buildPreview() {
    const token = ++sequence.current;
    setBusy("preview");
    setError(undefined);
    setSaved(undefined);
    try {
      const next = await prepareImageDerivative(
        ctx.repo,
        asset.id,
        {
          rotation,
          ...(width.trim() ? { resizeWidth: Number(width) } : {}),
          ...(cropping
            ? {
                crop: {
                  originX: Number(crop.x),
                  originY: Number(crop.y),
                  width: Number(crop.width),
                  height: Number(crop.height),
                },
              }
            : {}),
        },
        renderImageDerivative,
        () => scope(token),
      );
      if (scope(token)) {
        const resource = createLocalPreviewSource(next.bytes, "image/png");
        if (!scope(token)) {
          resource.dispose();
          return;
        }
        disposeSource();
        resources.add(resource);
        currentSource.current = resource;
        setSource(resource);
        setPreview(next);
        setChanged(true);
        setPreviewError(false);
      }
    } catch (failure) {
      if (scope(token))
        setError(
          failure instanceof Error
            ? failure.message
            : "编辑预览失败，原件与输入保留。",
        );
    } finally {
      if (scope(token)) setBusy(undefined);
    }
  }
  async function save() {
    if (!preview || previewError) return;
    const token = ++sequence.current;
    setBusy("save");
    setError(undefined);
    try {
      let result: MobileAsset | undefined;
      await app.mutate(ctx, async (repo) => {
        result = await saveImageDerivative(repo, preview, () => scope(token));
        return repo.load();
      });
      if (scope(token) && result) {
        setChanged(false);
        setSaved(result);
      }
    } catch (failure) {
      if (scope(token))
        setError(
          failure instanceof Error
            ? failure.message
            : "保存失败，原件、预览和输入保留；可重新保存。",
        );
    } finally {
      if (scope(token)) setBusy(undefined);
    }
  }
  return {
    size,
    error,
    loading,
    busy,
    rotation,
    width,
    cropping,
    crop,
    preview,
    source,
    previewError,
    saved,
    disabled: loading || !size || Boolean(busy) || !app.valid(ctx),
    setRotation: (value: number) => change(() => setRotation(value)),
    setWidth: (value: string) => change(() => setWidth(value)),
    toggleCrop: () => change(() => setCropping(!cropping)),
    setCrop: (key: keyof typeof crop, value: string) =>
      change(() => setCrop({ ...crop, [key]: value })),
    buildPreview,
    save,
    cancelPreview() {
      sequence.current++;
      setBusy(undefined);
      setError("本次预览已取消，原图和编辑输入保留。");
    },
    reportPreviewError(resource: LocalPreviewSource) {
      if (
        alive.current &&
        app.valid(ctx) &&
        currentSource.current === resource
      ) {
        setPreviewError(true);
        setError("派生预览解码失败；原件、参数和预览字节保留，请重新预览。");
      }
    },
    openSaved() {
      if (saved && app.valid(ctx) && state.accountId === ctx.accountId)
        router.replace({
          pathname: "/materials/[id]",
          params: { id: saved.id },
        });
    },
    exitDialog: exit.dialog,
  };
}
