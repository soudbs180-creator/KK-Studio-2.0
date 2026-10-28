// Public contract entry for feature: image-edit
export { default as ColorInstruction } from "./ColorInstruction.tsx";
export { imageResultContext } from "./context.ts";
export { default as EditComposer } from "./EditComposer.tsx";
export { createImageEditRuntime } from "./editTasks.ts";
export type { ImageEditAssets, ImageEditRequest } from "./editTasks.ts";
export { EDIT_COLORS, default as EditToolbar } from "./EditToolbar.tsx";
export { default as ImageCanvasLayers } from "./ImageCanvasLayers.tsx";
export { default as ImageEditor } from "./ImageEditor.tsx";
export { default as ImageLightbox } from "./ImageLightbox.tsx";
export { default as ImageLightboxStage } from "./ImageLightboxStage.tsx";
export {
  ImageEditMappingError,
  annotateImage,
  calculateAdaptiveResize,
  canvasToDataUrl,
  composePixels,
  context2d,
  cropImage,
  decodeImage,
  detectAlphaTransparency,
  drawMask,
  makeCanvas,
  resolveCanvasMime,
  resolveTargetImageMime,
} from "./imageProcessing.ts";
export {
  MAX_EDIT_PIXELS,
  assertImageDimensions,
  brushMask,
  containsMask,
  floodMask,
  maskBounds,
  mergeRuns,
  nextColorLabel,
  readMaskDocument,
  rectangleMask,
  subtractRuns,
} from "./mask.ts";
export type {
  Bounds,
  MaskDocument,
  MaskRegion,
  MaskRun,
  Point,
} from "./mask.ts";
export { drawMaskAnnotation, maskEdges } from "./maskAnnotation.ts";
export { blendMaskedPixels } from "./pixels.ts";
export { compileEditPrompt, formatEditPrompt } from "./prompt.ts";
export type { RegionInstruction } from "./prompt.ts";
export { editReceiptReason } from "./recovery.ts";
export { imageRegeneration } from "./regeneration.ts";
export { default as RegionPromptOverlay } from "./RegionPromptOverlay.tsx";
export { default as RegionRetryList } from "./RegionRetryList.tsx";
export {
  chooseEditSize,
  nativeAnnotationOverhead,
  planEditRegions,
  qualityForSide,
} from "./regions.ts";
export type { EditCrop } from "./regions.ts";
export { assertEditShape } from "./schema.ts";
export {
  editCapabilityReason,
  readImageEditContext,
  readImageEditSnapshot,
} from "./snapshot.ts";
export type { ImageEditContext, ImageEditSnapshot } from "./snapshot.ts";
export { useAvailableImageHeight } from "./useAvailableImageHeight.ts";
export { useImageViewport } from "./useImageViewport.ts";
export type { ImageTool } from "./useImageViewport.ts";
export { useMaskDocument } from "./useMaskDocument.ts";
export { useMaskDrawing } from "./useMaskDrawing.ts";
export { validateEdit } from "./validateEdit.ts";

export {
  CanvasImageCommandContext,
  CanvasImageNodeContext,
  useCanvasImageGeneration,
} from "../../runtime/canvasCommandRuntime.tsx";
export type { CanvasImageRequest } from "../../runtime/canvasCommandRuntime.tsx";
