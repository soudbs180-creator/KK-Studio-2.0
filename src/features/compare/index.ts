// Public contract entry for feature: compare
export { default as ImageCompareProvider } from "./ImageCompareProvider.tsx";
export { useImageCompare } from "./ImageCompareProvider.tsx";
export {
  compareImage,
  reconcileCompareSelection,
  toggleCompareSelection,
} from "./imageCompare.ts";
export type { CompareImage } from "./imageCompare.ts";
