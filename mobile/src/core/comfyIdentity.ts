/** Validated JSON: object key order is irrelevant; array order and every field/value matter. */
export function sameComfyJson(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (Array.isArray(left) || Array.isArray(right))
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => sameComfyJson(value, right[index]))
    );
  if (
    left === null ||
    right === null ||
    typeof left !== "object" ||
    typeof right !== "object"
  )
    return false;
  const a = left as Record<string, unknown>,
    b = right as Record<string, unknown>,
    names = Object.keys(a);
  return (
    names.length === Object.keys(b).length &&
    names.every(
      (name) =>
        Object.prototype.hasOwnProperty.call(b, name) &&
        sameComfyJson(a[name], b[name]),
    )
  );
}
/** Stable upstream identity; no origin, authentication, signed URL or transient list index. */
export function comfyOutputKey(output: {
  nodeId: string;
  filename: string;
  subfolder: string;
  type: "output" | "temp";
}): string {
  return JSON.stringify([
    output.nodeId,
    output.filename,
    output.subfolder,
    output.type,
  ]);
}
