/** Optional declarations; omission means unknown, never an inferred model feature. */
export const imageModelOperations = [
  "generate",
  "edit",
  "inpaint",
  "outpaint",
] as const;
export type ImageModelOperation = (typeof imageModelOperations)[number];
export type ImageModelCapabilities = Partial<
  Record<ImageModelOperation, boolean>
> & {
  maxReferences?: number;
  /** Maximum outputs in one KK task, separate from a provider's HTTP n limit. */
  maxGenerationCount?: number;
};

export function parseImageModelCapabilities(
  value: unknown,
): ImageModelCapabilities | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  const input = value as Record<string, unknown>;
  const result: ImageModelCapabilities = {};
  for (const operation of imageModelOperations)
    if (typeof input[operation] === "boolean")
      result[operation] = input[operation];
  for (const key of ["maxReferences", "maxGenerationCount"] as const) {
    const number = input[key];
    if (
      typeof number === "number" &&
      Number.isInteger(number) &&
      number >= (key === "maxReferences" ? 0 : 1) &&
      number <= 64
    )
      result[key] = number;
  }
  return Object.keys(result).length ? result : undefined;
}
