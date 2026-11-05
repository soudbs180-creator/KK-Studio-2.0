/** Shared bound includes embedded media and must agree at both file boundaries. */
export const MAX_FLOORPLAN_BYTES = 64 * 1024 * 1024;

export function serializeFloorplanFile(input: unknown): string {
  const json = JSON.stringify(input, null, 2);
  if (new TextEncoder().encode(json).byteLength > MAX_FLOORPLAN_BYTES)
    throw new Error("蓝图超过64MB，请分组导出或使用项目归档；已有数据保留");
  return json;
}
