// Public contract entry for feature: image-edit
export { default as ColorInstruction } from "./ColorInstruction.tsx";
export { default as EditComposer } from "./EditComposer.tsx";
export { default as EditToolbar } from "./EditToolbar.tsx";
export { EDIT_COLORS } from "./EditToolbar.tsx";
export { default as ImageCanvasLayers } from "./ImageCanvasLayers.tsx";
export { default as ImageEditor } from "./ImageEditor.tsx";
export { default as ImageLightbox } from "./ImageLightbox.tsx";
export { default as ImageLightboxStage } from "./ImageLightboxStage.tsx";
export { default as RegionPromptOverlay } from "./RegionPromptOverlay.tsx";
export { default as RegionRetryList } from "./RegionRetryList.tsx";
export { imageResultContext } from "./context.ts";
export {
  prepareEditInputs,
  composeEditResult,
  composeNativeEditAsset,
} from "./editTasks.ts";
export type { ImageEditRequest } from "./editTasks.ts";
export {
  ImageEditMappingError,
  makeCanvas,
  context2d,
  decodeImage,
  cropImage,
  drawMask,
  annotateImage,
  composePixels,
  resolveCanvasMime,
  canvasToDataUrl,
  calculateAdaptiveResize,
  detectAlphaTransparency,
  resolveTargetImageMime,
} from "./imageProcessing.ts";
export {
  MAX_EDIT_PIXELS,
  assertImageDimensions,
  maskBounds,
  rectangleMask,
  mergeRuns,
  subtractRuns,
  brushMask,
  containsMask,
  floodMask,
  nextColorLabel,
  readMaskDocument,
} from "./mask.ts";
export type {
  Point,
  MaskRun,
  MaskRegion,
  MaskDocument,
  Bounds,
} from "./mask.ts";
export { maskEdges, drawMaskAnnotation } from "./maskAnnotation.ts";
export { blendMaskedPixels } from "./pixels.ts";
export { compileEditPrompt, formatEditPrompt } from "./prompt.ts";
export type { RegionInstruction } from "./prompt.ts";
export { editReceiptReason } from "./recovery.ts";
export { imageRegeneration } from "./regeneration.ts";
export {
  planEditRegions,
  qualityForSide,
  nativeAnnotationOverhead,
  chooseEditSize,
} from "./regions.ts";
export type { EditCrop } from "./regions.ts";
export { assertEditShape } from "./schema.ts";
export {
  readImageEditSnapshot,
  readImageEditContext,
  editCapabilityReason,
} from "./snapshot.ts";
export type { ImageEditSnapshot, ImageEditContext } from "./snapshot.ts";
export { useAvailableImageHeight } from "./useAvailableImageHeight.ts";
export { useImageViewport } from "./useImageViewport.ts";
export type { ImageTool } from "./useImageViewport.ts";
export { useMaskDocument } from "./useMaskDocument.ts";
export { useMaskDrawing } from "./useMaskDrawing.ts";
export { validateEdit } from "./validateEdit.ts";
