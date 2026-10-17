export interface Point {
  x: number;
  y: number;
}
export type MaskRun = [number, number, number];
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface MaskRegion {
  id: string;
  runs: MaskRun[];
  color?: string;
  colorName?: string;
  number?: number;
  instruction?: string;
}
export interface MaskDocument {
  width: number;
  height: number;
  regions: MaskRegion[];
  colorCounters?: Record<string, number>;
}
export interface EditCrop extends Bounds {
  regionIds: string[];
}
export interface ImageEditContext {
  originalPrompt: string;
  originalAssetId?: string;
  referenceAssetIds: string[];
  lastInstruction?: string;
}
export interface ImageEditSnapshot {
  sourceAssetId: string;
  maskAssetId?: string;
  groupId: string;
  document: MaskDocument;
  crop: EditCrop;
  nativeMask: boolean;
}
